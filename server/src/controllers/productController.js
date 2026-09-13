import Product from "../models/Product.js";
import Category from "../models/Category.js";
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
    const { q, category, status, featured, page = 1, limit = 20, sort = "-createdAt" } = req.query;

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
  const required = ["sku", "name", "category"];
  if (!partial) {
    for (const field of required) {
      if (!body[field] || !String(body[field]).trim()) errors[field] = "Required.";
    }
  }
  if (body.status && !STATUSES.includes(body.status)) errors.status = "Invalid status.";
  if (body.images && !Array.isArray(body.images)) errors.images = "Images must be a list.";
  if (body.specs && !Array.isArray(body.specs)) errors.specs = "Specs must be a list.";
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

    const sku = String(body.sku).trim().toUpperCase();
    const slug = body.slug ? slugify(body.slug) : slugify(body.name);

    const [skuClash, slugClash] = await Promise.all([
      Product.findOne({ sku }),
      Product.findOne({ slug })
    ]);
    if (skuClash) return res.status(409).json({ success: false, message: "A product with this SKU already exists.", errors: { sku: "Already in use." } });
    if (slugClash) return res.status(409).json({ success: false, message: "A product with this slug already exists.", errors: { slug: "Already in use." } });

    const product = await Product.create({
      sku,
      slug,
      name: String(body.name).trim(),
      category: body.category,
      tag: body.tag || "",
      shortDescription: body.shortDescription || "",
      description: body.description || "",
      yarnType: body.yarnType || "",
      composition: body.composition || "",
      count: body.count || "",
      specs: body.specs || [],
      features: body.features || [],
      applications: body.applications || [],
      images: body.images || [],
      status: body.status || "draft",
      featured: Boolean(body.featured)
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

    if (body.sku) {
      const sku = String(body.sku).trim().toUpperCase();
      const clash = await Product.findOne({ sku, _id: { $ne: product._id } });
      if (clash) return res.status(409).json({ success: false, message: "A product with this SKU already exists.", errors: { sku: "Already in use." } });
      product.sku = sku;
    }
    if (body.slug || body.name) {
      const slug = slugify(body.slug || body.name);
      const clash = await Product.findOne({ slug, _id: { $ne: product._id } });
      if (clash) return res.status(409).json({ success: false, message: "A product with this slug already exists.", errors: { slug: "Already in use." } });
      product.slug = slug;
    }

    const assignable = [
      "name", "category", "tag", "shortDescription", "description", "yarnType",
      "composition", "count", "specs", "features", "applications", "images",
      "status", "featured"
    ];
    for (const field of assignable) {
      if (body[field] !== undefined) product[field] = body[field];
    }

    await product.save();
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
      await product.deleteOne();
      return res.json({ success: true, data: null });
    }
    product.status = "archived";
    await product.save();
    res.json({ success: true, data: { product } });
  } catch (err) {
    next(err);
  }
}
