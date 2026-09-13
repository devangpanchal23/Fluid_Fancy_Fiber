import Category from "../models/Category.js";
import Product from "../models/Product.js";
import { slugify } from "../utils/slugify.js";

export async function listCategories(req, res, next) {
  try {
    const filter = {};
    if (req.query.activeOnly === "true") filter.isActive = true;
    const categories = await Category.find(filter).sort({ name: 1 });
    res.json({ success: true, data: { categories } });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req, res, next) {
  try {
    const { name, description = "", isActive = true } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: "Category name is required." });
    }
    const slug = slugify(name);
    const existing = await Category.findOne({ slug });
    if (existing) {
      return res.status(409).json({ success: false, message: "A category with this name already exists." });
    }
    const category = await Category.create({ name: String(name).trim(), slug, description, isActive });
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
    const { name, description, isActive } = req.body || {};
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
    await category.save();
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
