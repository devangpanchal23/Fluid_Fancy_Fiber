import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Variant from "../models/Variant.js";
import { slugify } from "../utils/slugify.js";

const STATUSES = ["draft", "active", "archived"];

async function assertCategoryExists(categoryId) {
  const category = await Category.findById(categoryId).catch(() => null);
  if (!category) {
    const err = new Error("Selected category does not exist.");
    err.status = 400;
    throw err;
  }
  return category;
}

export async function listProducts(req, res, next) {
  try {
    const isAdmin = Boolean(req.admin);
    const { q, category, status, featured, page = 1, limit = 20, sort = "order -featured" } = req.query;

    const filter = {};
    if (!isAdmin) {
      filter.status = "active";
    } else if (status && STATUSES.includes(status)) {
      filter.status = status;
    }
    if (category) filter.category = category;
    if (featured !== undefined) filter.featured = featured === "true";
    if (q && String(q).trim()) filter.$text = { $search: String(q).trim() };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const [items, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name slug")
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Product.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: { items, total, page: pageNum, pages: Math.max(1, Math.ceil(total / limitNum)) }
    });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req, res, next) {
  try {
    const isAdmin = Boolean(req.admin);
    const product = await Product.findById(req.params.id).populate("category", "name slug");
    if (!product || (!isAdmin && product.status !== "active")) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    res.json({ success: true, data: { product } });
  } catch (err) {
    next(err);
  }
}

function validateProductBody(body, { partial = false } = {}) {
  const errors = {};
  const required = ["name", "category"];
  if (!partial) {
    for (const field of required) {
      if (!body[field] || !String(body[field]).trim()) errors[field] = "Required.";
    }
  }
  if (body.status && !STATUSES.includes(body.status)) errors.status = "Invalid status.";
  if (body.features && !Array.isArray(body.features)) errors.features = "Features must be a list.";
  if (body.images && !Array.isArray(body.images)) errors.images = "Images must be a list.";
  return errors;
}

export async function createProduct(req, res, next) {
  try {
    const body = req.body || {};
    const errors = validateProductBody(body);
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, message: "Please fix the highlighted fields.", errors });
    }
    await assertCategoryExists(body.category);

    const slug = body.slug ? slugify(body.slug) : slugify(body.name);
    const slugClash = await Product.findOne({ slug });
    if (slugClash) return res.status(409).json({ success: false, message: "A product with this slug already exists.", errors: { slug: "Already in use." } });

    const count = await Product.countDocuments();
    const product = await Product.create({
      slug,
      name: String(body.name).trim(),
      category: body.category,
      tag: body.tag || "",
      shortDescription: body.shortDescription || "",
      description: body.description || "",
      features: body.features || [],
      images: body.images || [],
      status: body.status || "draft",
      featured: Boolean(body.featured),
      order: body.order !== undefined ? body.order : count
    });

    res.status(201).json({ success: true, data: { product } });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    const body = req.body || {};
    const errors = validateProductBody(body, { partial: true });
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, message: "Please fix the highlighted fields.", errors });
    }
    if (body.category) await assertCategoryExists(body.category);

    if (body.slug || body.name) {
      const slug = slugify(body.slug || body.name);
      const clash = await Product.findOne({ slug, _id: { $ne: product._id } });
      if (clash) return res.status(409).json({ success: false, message: "A product with this slug already exists.", errors: { slug: "Already in use." } });
      product.slug = slug;
    }

    const assignable = ["name", "category", "tag", "shortDescription", "description", "features", "images", "status", "featured", "order"];
    for (const field of assignable) {
      if (body[field] !== undefined) product[field] = body[field];
    }

    await product.save();
    res.json({ success: true, data: { product } });
  } catch (err) {
    next(err);
  }
}

export async function reorderProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    const { direction } = req.body || {};
    if (direction !== "up" && direction !== "down") {
      return res.status(400).json({ success: false, message: "direction must be 'up' or 'down'." });
    }
    const neighbor = await Product.findOne({ order: { [direction === "up" ? "$lt" : "$gt"]: product.order } }).sort({
      order: direction === "up" ? -1 : 1
    });
    if (!neighbor) {
      return res.json({ success: true, data: { product } });
    }
    const tmp = product.order;
    product.order = neighbor.order;
    neighbor.order = tmp;
    await Promise.all([product.save(), neighbor.save()]);
    res.json({ success: true, data: { product } });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    if (req.query.hard === "true") {
      await Promise.all([product.deleteOne(), Variant.deleteMany({ product: product._id })]);
      return res.json({ success: true, data: null });
    }
    product.status = "archived";
    await product.save();
    res.json({ success: true, data: { product } });
  } catch (err) {
    next(err);
  }
}
