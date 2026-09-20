import ConeProduct, { CONE_NAME_MAX, CONE_DETAILS_MAX } from "../models/ConeProduct.js";
import { normalizeImage } from "../utils/normalizeImage.js";

// Ascending `order`, oldest first on a tie — so records that share an order
// (or predate it) still have one stable, deterministic position.
function displayCompare(a, b) {
  return (a.order ?? 0) - (b.order ?? 0) || new Date(a.createdAt) - new Date(b.createdAt);
}

// Visitors must see an admin edit on their next page load, never a cached grid.
function noStore(res) {
  res.set("Cache-Control", "no-store");
}

function fail(res, errors) {
  return res.status(400).json({ success: false, message: "Please fix the highlighted fields.", errors });
}

// All three fields are mandatory. On update, a field that is sent must still
// be valid (you can change it, never blank it); omitted fields are untouched.
function validateText(body, { partial }) {
  const errors = {};
  const rules = [
    ["productName", "Product name", CONE_NAME_MAX],
    ["productDetails", "Product details", CONE_DETAILS_MAX]
  ];
  for (const [field, label, max] of rules) {
    if (partial && body[field] === undefined) continue;
    const value = typeof body[field] === "string" ? body[field].trim() : "";
    if (!value) errors[field] = `${label} is required.`;
    else if (value.length > max) errors[field] = `${label} must be ${max} characters or fewer.`;
  }
  return errors;
}

async function validateImage(image, errors) {
  if (!image || typeof image !== "object" || !image.url) {
    errors.image = "Product image is required.";
    return null;
  }
  const normalized = await normalizeImage(image);
  if (normalized.error) {
    errors.image = normalized.error;
    return null;
  }
  return normalized.image;
}

export async function listConeProducts(req, res, next) {
  try {
    noStore(res);
    const all = (await ConeProduct.find()).sort(displayCompare);
    // A product whose image was force-removed from the Media Library can't be
    // rendered, so the public site skips it; the admin still sees it to fix.
    const items = req.admin ? all : all.filter((p) => p.image?.url);
    res.json({ success: true, data: { items, total: items.length } });
  } catch (err) {
    next(err);
  }
}

export async function getConeProduct(req, res, next) {
  try {
    noStore(res);
    const product = await ConeProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found." });
    res.json({ success: true, data: { product } });
  } catch (err) {
    next(err);
  }
}

export async function createConeProduct(req, res, next) {
  try {
    const body = req.body || {};
    const errors = validateText(body, { partial: false });
    const image = await validateImage(body.image, errors);
    if (Object.keys(errors).length) return fail(res, errors);

    const last = await ConeProduct.find();
    const nextOrder = last.reduce((max, p) => Math.max(max, p.order ?? 0), -1) + 1;

    const product = await ConeProduct.create({
      image,
      productName: body.productName.trim(),
      productDetails: body.productDetails.trim(),
      order: nextOrder
    });
    res.status(201).json({ success: true, data: { product } });
  } catch (err) {
    next(err);
  }
}

export async function updateConeProduct(req, res, next) {
  try {
    const product = await ConeProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found." });

    const body = req.body || {};
    const errors = validateText(body, { partial: true });
    let image;
    if (body.image !== undefined) image = await validateImage(body.image, errors);
    if (Object.keys(errors).length) return fail(res, errors);

    if (body.productName !== undefined) product.productName = body.productName.trim();
    if (body.productDetails !== undefined) product.productDetails = body.productDetails.trim();
    if (image) product.image = image;

    // A record left without an image (its file was force-deleted from the
    // library) can't be saved again until a new one is picked.
    if (!product.image?.url) return fail(res, { image: "Product image is required." });

    await product.save();
    res.json({ success: true, data: { product } });
  } catch (err) {
    next(err);
  }
}

// Moves a product one place up/down. Orders are renumbered 0..n first so a
// swap works even when records share the same `order` value.
export async function reorderConeProduct(req, res, next) {
  try {
    const product = await ConeProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found." });

    const { direction } = req.body || {};
    if (direction !== "up" && direction !== "down") {
      return res.status(400).json({ success: false, message: "direction must be 'up' or 'down'." });
    }

    const all = (await ConeProduct.find()).sort(displayCompare);
    const index = all.findIndex((p) => p._id.equals(product._id));
    const target = direction === "up" ? index - 1 : index + 1;
    if (target >= 0 && target < all.length) {
      [all[index], all[target]] = [all[target], all[index]];
    }

    await ConeProduct.bulkWrite(all.map((p, i) => ({ updateOne: { filter: { _id: p._id }, update: { $set: { order: i } } } })));
    res.json({ success: true, data: { items: (await ConeProduct.find()).sort(displayCompare) } });
  } catch (err) {
    next(err);
  }
}

export async function deleteConeProduct(req, res, next) {
  try {
    const product = await ConeProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found." });
    await product.deleteOne();
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
