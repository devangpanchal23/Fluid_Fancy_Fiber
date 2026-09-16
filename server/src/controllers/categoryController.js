import Category from "../models/Category.js";
import Product from "../models/Product.js";
import { slugify } from "../utils/slugify.js";

export async function listCategories(req, res, next) {
  try {
    const filter = {};
    if (req.query.activeOnly === "true") filter.isActive = true;
    const categories = await Category.find(filter).sort({ order: 1, name: 1 });
    res.json({ success: true, data: { categories } });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req, res, next) {
  try {
    const { name, description = "", isActive = true, image = null, order } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: "Category name is required." });
    }
    const slug = slugify(name);
    const existing = await Category.findOne({ slug });
    if (existing) {
      return res.status(409).json({ success: false, message: "A category with this name already exists." });
    }
    const count = await Category.countDocuments();
    const category = await Category.create({
      name: String(name).trim(),
      slug,
      description,
      image,
      order: order !== undefined ? order : count,
      isActive
    });
    res.status(201).json({ success: true, data: { category } });
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }
    const { name, description, isActive, image, order } = req.body || {};
    if (name && String(name).trim() && String(name).trim() !== category.name) {
      const slug = slugify(name);
      const clash = await Category.findOne({ slug, _id: { $ne: category._id } });
      if (clash) {
        return res.status(409).json({ success: false, message: "A category with this name already exists." });
      }
      category.name = String(name).trim();
      category.slug = slug;
    }
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = Boolean(isActive);
    if (image !== undefined) category.image = image;
    if (order !== undefined) category.order = order;
    await category.save();
    res.json({ success: true, data: { category } });
  } catch (err) {
    next(err);
  }
}

export async function reorderCategory(req, res, next) {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }
    const { direction } = req.body || {};
    if (direction !== "up" && direction !== "down") {
      return res.status(400).json({ success: false, message: "direction must be 'up' or 'down'." });
    }
    const neighbor = await Category.findOne({ order: { [direction === "up" ? "$lt" : "$gt"]: category.order } }).sort({
      order: direction === "up" ? -1 : 1
    });
    if (!neighbor) {
      return res.json({ success: true, data: { category } });
    }
    const tmp = category.order;
    category.order = neighbor.order;
    neighbor.order = tmp;
    await Promise.all([category.save(), neighbor.save()]);
    res.json({ success: true, data: { category } });
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }
    const inUse = await Product.countDocuments({ category: category._id });
    if (inUse > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete: ${inUse} product(s) still use this category. Reassign them first.`
      });
    }
    await category.deleteOne();
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
