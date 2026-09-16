import Variant from "../models/Variant.js";
import Product from "../models/Product.js";

async function assertProductExists(productId) {
  const product = await Product.findById(productId).catch(() => null);
  if (!product) {
    const err = new Error("Selected product does not exist.");
    err.status = 400;
    throw err;
  }
  return product;
}

export async function listVariants(req, res, next) {
  try {
    const isAdmin = Boolean(req.admin);
    const { product, page = 1, limit = 100, sort = "order" } = req.query;
    if (!product && !isAdmin) {
      return res.status(400).json({ success: false, message: "?product=<id> is required." });
    }

    const filter = {};
    if (product) filter.product = product;
    if (!isAdmin) filter.isActive = true;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 100));

    const [items, total] = await Promise.all([
      Variant.find(filter)
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Variant.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: { items, total, page: pageNum, pages: Math.max(1, Math.ceil(total / limitNum)) }
    });
  } catch (err) {
    next(err);
  }
}

export async function getVariant(req, res, next) {
  try {
    const isAdmin = Boolean(req.admin);
    const variant = await Variant.findById(req.params.id);
    if (!variant || (!isAdmin && !variant.isActive)) {
      return res.status(404).json({ success: false, message: "Variant not found." });
    }
    res.json({ success: true, data: { variant } });
  } catch (err) {
    next(err);
  }
}

function validateVariantBody(body, { partial = false } = {}) {
  const errors = {};
  const required = ["product", "name", "sku"];
  if (!partial) {
    for (const field of required) {
      if (!body[field] || !String(body[field]).trim()) errors[field] = "Required.";
    }
  }
  if (body.specs && !Array.isArray(body.specs)) errors.specs = "Specs must be a list.";
  if (body.images && !Array.isArray(body.images)) errors.images = "Images must be a list.";
  return errors;
}

export async function createVariant(req, res, next) {
  try {
    const body = req.body || {};
    const errors = validateVariantBody(body);
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, message: "Please fix the highlighted fields.", errors });
    }
    await assertProductExists(body.product);

    const sku = String(body.sku).trim().toUpperCase();
    const skuClash = await Variant.findOne({ sku });
    if (skuClash) return res.status(409).json({ success: false, message: "A variant with this SKU already exists.", errors: { sku: "Already in use." } });

    const count = await Variant.countDocuments({ product: body.product });
    const variant = await Variant.create({
      product: body.product,
      name: String(body.name).trim(),
      sku,
      specs: body.specs || [],
      images: body.images || [],
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      order: body.order !== undefined ? body.order : count
    });

    res.status(201).json({ success: true, data: { variant } });
  } catch (err) {
    next(err);
  }
}

export async function updateVariant(req, res, next) {
  try {
    const variant = await Variant.findById(req.params.id);
    if (!variant) {
      return res.status(404).json({ success: false, message: "Variant not found." });
    }
    const body = req.body || {};
    const errors = validateVariantBody(body, { partial: true });
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, message: "Please fix the highlighted fields.", errors });
    }
    if (body.product) await assertProductExists(body.product);

    if (body.sku) {
      const sku = String(body.sku).trim().toUpperCase();
      const clash = await Variant.findOne({ sku, _id: { $ne: variant._id } });
      if (clash) return res.status(409).json({ success: false, message: "A variant with this SKU already exists.", errors: { sku: "Already in use." } });
      variant.sku = sku;
    }

    const assignable = ["product", "name", "specs", "images", "isActive", "order"];
    for (const field of assignable) {
      if (body[field] !== undefined) variant[field] = body[field];
    }

    await variant.save();
    res.json({ success: true, data: { variant } });
  } catch (err) {
    next(err);
  }
}

export async function reorderVariant(req, res, next) {
  try {
    const variant = await Variant.findById(req.params.id);
    if (!variant) {
      return res.status(404).json({ success: false, message: "Variant not found." });
    }
    const { direction } = req.body || {};
    if (direction !== "up" && direction !== "down") {
      return res.status(400).json({ success: false, message: "direction must be 'up' or 'down'." });
    }
    const neighbor = await Variant.findOne({
      product: variant.product,
      order: { [direction === "up" ? "$lt" : "$gt"]: variant.order }
    }).sort({ order: direction === "up" ? -1 : 1 });
    if (!neighbor) {
      return res.json({ success: true, data: { variant } });
    }
    const tmp = variant.order;
    variant.order = neighbor.order;
    neighbor.order = tmp;
    await Promise.all([variant.save(), neighbor.save()]);
    res.json({ success: true, data: { variant } });
  } catch (err) {
    next(err);
  }
}

export async function deleteVariant(req, res, next) {
  try {
    const variant = await Variant.findById(req.params.id);
    if (!variant) {
      return res.status(404).json({ success: false, message: "Variant not found." });
    }
    await variant.deleteOne();
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
