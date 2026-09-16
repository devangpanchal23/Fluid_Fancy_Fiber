import Media from "../models/Media.js";
import Product from "../models/Product.js";
import Variant from "../models/Variant.js";
import Category from "../models/Category.js";
import Person from "../models/Person.js";
import { saveImage, deleteImage } from "../utils/imageStorage.js";

export async function listMedia(req, res, next) {
  try {
    const { q, page = 1, limit = 24 } = req.query;
    const filter = {};
    if (q && String(q).trim()) {
      const re = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ filename: re }, { originalName: re }, { alt: re }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 24));

    const [items, total] = await Promise.all([
      Media.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Media.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: { items, total, page: pageNum, pages: Math.max(1, Math.ceil(total / limitNum)) }
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadMedia(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No image file was provided." });
    const { url, filename } = await saveImage(req.file.buffer, req.file.originalname, req.file.mimetype);
    const media = await Media.create({
      url,
      filename,
      originalName: req.file.originalname || "",
      alt: (req.body?.alt || "").trim(),
      mimeType: req.file.mimetype,
      size: req.file.size
    });
    res.status(201).json({ success: true, data: { media } });
  } catch (err) {
    next(err);
  }
}

export async function updateMedia(req, res, next) {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ success: false, message: "Media item not found." });
    if (req.body?.alt !== undefined) media.alt = String(req.body.alt).trim();
    await media.save();
    res.json({ success: true, data: { media } });
  } catch (err) {
    next(err);
  }
}

// Every place a Media item's url/id could be referenced. Category/Person
// carry a single `image`, Product/Variant carry an `images` array — checked
// by both the denormalized `url` (covers images attached before this field
// existed, or attached directly rather than through the picker) and the
// `media` id (the precise link once an image was picked from the library).
async function findUsage(media) {
  const byRef = { $or: [{ "images.media": media._id }, { "images.url": media.url }] };
  const byRefSingle = { $or: [{ "image.media": media._id }, { "image.url": media.url }] };

  const [products, variants, categories, people] = await Promise.all([
    Product.find(byRef, { name: 1 }),
    Variant.find(byRef, { name: 1 }),
    Category.find(byRefSingle, { name: 1 }),
    Person.find(byRefSingle, { name: 1 })
  ]);

  return { products, variants, categories, people };
}

function describeUsage(usage) {
  const parts = [];
  if (usage.products.length) parts.push(`${usage.products.length} product(s)`);
  if (usage.variants.length) parts.push(`${usage.variants.length} variant(s)`);
  if (usage.categories.length) parts.push(`${usage.categories.length} categor${usage.categories.length === 1 ? "y" : "ies"}`);
  if (usage.people.length) parts.push(`${usage.people.length} people entr${usage.people.length === 1 ? "y" : "ies"}`);
  return parts.join(", ");
}

async function removeFromAllUses(media) {
  const byRef = { $or: [{ "images.media": media._id }, { "images.url": media.url }] };
  const byRefSingle = { $or: [{ "image.media": media._id }, { "image.url": media.url }] };
  const pullMatch = { $or: [{ media: media._id }, { url: media.url }] };

  await Promise.all([
    Product.updateMany(byRef, { $pull: { images: pullMatch } }),
    Variant.updateMany(byRef, { $pull: { images: pullMatch } }),
    Category.updateMany(byRefSingle, { $set: { image: null } }),
    Person.updateMany(byRefSingle, { $set: { image: null } })
  ]);
}

export async function deleteMedia(req, res, next) {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ success: false, message: "Media item not found." });

    const usage = await findUsage(media);
    const inUse = usage.products.length + usage.variants.length + usage.categories.length + usage.people.length > 0;

    if (inUse && req.query.force !== "true") {
      return res.status(409).json({
        success: false,
        message: `This image is still used by ${describeUsage(usage)}. Delete anyway to remove it from all of them, or unassign it first.`,
        data: {
          usage: {
            products: usage.products.map((p) => ({ id: p._id, name: p.name })),
            variants: usage.variants.map((v) => ({ id: v._id, name: v.name })),
            categories: usage.categories.map((c) => ({ id: c._id, name: c.name })),
            people: usage.people.map((p) => ({ id: p._id, name: p.name }))
          }
        }
      });
    }

    if (inUse) await removeFromAllUses(media);
    await deleteImage(media.filename);
    await media.deleteOne();

    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
