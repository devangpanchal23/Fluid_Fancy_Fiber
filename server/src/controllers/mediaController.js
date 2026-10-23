import Media from "../models/Media.js";
import Product from "../models/Product.js";
import Variant from "../models/Variant.js";
import Category from "../models/Category.js";
import Person from "../models/Person.js";
import ConeProduct from "../models/ConeProduct.js";
import VideoAsset from "../models/VideoAsset.js";
import Video from "../models/Video.js";
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
        .limit(limitNum)
        .lean(),
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
    const { media } = await saveImage(req.file.buffer, req.file.originalname, req.file.mimetype, {
      alt: req.body?.alt
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

  const [products, variants, categories, people, coneProducts] = await Promise.all([
    Product.find(byRef, { name: 1 }),
    Variant.find(byRef, { name: 1 }),
    Category.find(byRefSingle, { name: 1 }),
    Person.find(byRefSingle, { name: 1 }),
    ConeProduct.find(byRefSingle, { productName: 1 })
  ]);

  return { products, variants, categories, people, coneProducts };
}

function describeUsage(usage) {
  const parts = [];
  if (usage.products.length) parts.push(`${usage.products.length} product(s)`);
  if (usage.variants.length) parts.push(`${usage.variants.length} variant(s)`);
  if (usage.categories.length) parts.push(`${usage.categories.length} categor${usage.categories.length === 1 ? "y" : "ies"}`);
  if (usage.people.length) parts.push(`${usage.people.length} people entr${usage.people.length === 1 ? "y" : "ies"}`);
  if (usage.coneProducts.length) parts.push(`${usage.coneProducts.length} cone library product(s)`);
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
    Person.updateMany(byRefSingle, { $set: { image: null } }),
    ConeProduct.updateMany(byRefSingle, { $set: { image: null } })
  ]);
}

export async function deleteMedia(req, res, next) {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ success: false, message: "Media item not found." });

    const usage = await findUsage(media);
    const inUse = usage.products.length + usage.variants.length + usage.categories.length + usage.people.length + usage.coneProducts.length > 0;

    if (inUse && req.query.force !== "true") {
      return res.status(409).json({
        success: false,
        message: `This image is still used by ${describeUsage(usage)}. Delete anyway to remove it from all of them, or unassign it first.`,
        data: {
          usage: {
            products: usage.products.map((p) => ({ id: p._id, name: p.name })),
            variants: usage.variants.map((v) => ({ id: v._id, name: v.name })),
            categories: usage.categories.map((c) => ({ id: c._id, name: c.name })),
            people: usage.people.map((p) => ({ id: p._id, name: p.name })),
            coneProducts: usage.coneProducts.map((c) => ({ id: c._id, name: c.productName }))
          }
        }
      });
    }

    if (inUse) await removeFromAllUses(media);
    // deleteImage removes the Media document itself (the bytes live on it) —
    // no separate media.deleteOne() needed.
    await deleteImage(media.filename);

    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

// Scans all dependent collections (Products, Variants, Categories, People,
// Cone Products, Video Assets, and Videos) to find every Media document currently in use.
async function findAllInUseMedia() {
  const [
    productMediaIds,
    productUrls,
    variantMediaIds,
    variantUrls,
    categoryMediaIds,
    categoryUrls,
    personMediaIds,
    personUrls,
    coneMediaIds,
    coneUrls,
    videoAssetThumbUrls,
    videoThumbUrls
  ] = await Promise.all([
    Product.distinct("images.media", { "images.media": { $ne: null } }),
    Product.distinct("images.url", { "images.url": { $ne: null } }),
    Variant.distinct("images.media", { "images.media": { $ne: null } }),
    Variant.distinct("images.url", { "images.url": { $ne: null } }),
    Category.distinct("image.media", { "image.media": { $ne: null } }),
    Category.distinct("image.url", { "image.url": { $ne: null } }),
    Person.distinct("image.media", { "image.media": { $ne: null } }),
    Person.distinct("image.url", { "image.url": { $ne: null } }),
    ConeProduct.distinct("image.media", { "image.media": { $ne: null } }),
    ConeProduct.distinct("image.url", { "image.url": { $ne: null } }),
    VideoAsset.distinct("thumbnail.url", { "thumbnail.url": { $ne: null } }),
    Video.distinct("thumbnail.url", { "thumbnail.url": { $ne: null } })
  ]);

  const allMediaIds = [
    ...productMediaIds,
    ...variantMediaIds,
    ...categoryMediaIds,
    ...personMediaIds,
    ...coneMediaIds
  ].filter(Boolean);

  const allUrls = [
    ...productUrls,
    ...variantUrls,
    ...categoryUrls,
    ...personUrls,
    ...coneUrls,
    ...videoAssetThumbUrls,
    ...videoThumbUrls
  ].filter(Boolean);

  if (allMediaIds.length === 0 && allUrls.length === 0) {
    return { inUseMedia: [], usageCounts: {} };
  }

  const queryOr = [];
  if (allMediaIds.length > 0) queryOr.push({ _id: { $in: allMediaIds } });
  if (allUrls.length > 0) queryOr.push({ url: { $in: allUrls } });

  const inUseMedia = await Media.find({ $or: queryOr }, { _id: 1, url: 1, filename: 1 }).lean();

  return {
    inUseMedia,
    usageCounts: {
      products: productMediaIds.length || productUrls.length,
      variants: variantMediaIds.length || variantUrls.length,
      categories: categoryMediaIds.length || categoryUrls.length,
      people: personMediaIds.length || personUrls.length,
      coneProducts: coneMediaIds.length || coneUrls.length,
      videoAssets: videoAssetThumbUrls.length,
      videos: videoThumbUrls.length
    }
  };
}

// Safely removes media references from all referencing collections without
// deleting any parent products, variants, categories, people, video assets, or videos.
async function removeAllUses(mediaList) {
  if (!mediaList || mediaList.length === 0) return;
  const mediaIds = mediaList.map((m) => m._id);
  const urls = mediaList.map((m) => m.url).filter(Boolean);

  const pullMatch = { $or: [{ media: { $in: mediaIds } }, { url: { $in: urls } }] };
  const singleMatch = { $or: [{ "image.media": { $in: mediaIds } }, { "image.url": { $in: urls } }] };
  const arrayMatch = { $or: [{ "images.media": { $in: mediaIds } }, { "images.url": { $in: urls } }] };

  await Promise.all([
    Product.updateMany(arrayMatch, { $pull: { images: pullMatch } }),
    Variant.updateMany(arrayMatch, { $pull: { images: pullMatch } }),
    Category.updateMany(singleMatch, { $set: { image: null } }),
    Person.updateMany(singleMatch, { $set: { image: null } }),
    ConeProduct.updateMany(singleMatch, { $set: { image: null } }),
    VideoAsset.updateMany({ "thumbnail.url": { $in: urls } }, { $set: { thumbnail: null } }),
    Video.updateMany({ "thumbnail.url": { $in: urls } }, { $set: { thumbnail: null } })
  ]);
}

// Permanently deletes all media records, strictly isolated to the Media collection.
// Enforces admin authorization, protects referenced assets from collateral deletion,
// blocks non-forced deletion when media is in active use, and batches deletions for safety.
export async function deleteAllMedia(req, res, next) {
  try {
    const totalCount = await Media.countDocuments();
    if (totalCount === 0) {
      return res.json({
        success: true,
        message: "Media Library is already empty.",
        data: { deletedCount: 0 }
      });
    }

    const { inUseMedia, usageCounts } = await findAllInUseMedia();
    const inUse = inUseMedia.length > 0;

    if (inUse && req.query.force !== "true") {
      const parts = [];
      if (usageCounts.products) parts.push("products");
      if (usageCounts.variants) parts.push("variants");
      if (usageCounts.categories) parts.push("categories");
      if (usageCounts.people) parts.push("people entries");
      if (usageCounts.coneProducts) parts.push("cone library products");
      if (usageCounts.videoAssets || usageCounts.videos) parts.push("video thumbnails");
      const usageDesc = parts.length > 0 ? parts.join(", ") : "catalogue items";

      return res.status(409).json({
        success: false,
        message: `${inUseMedia.length} of ${totalCount} image(s) in the Media Library are currently in use by ${usageDesc}. Delete anyway to remove them from all uses, or keep them.`,
        data: {
          inUseCount: inUseMedia.length,
          totalCount
        }
      });
    }

    if (inUse) {
      await removeAllUses(inUseMedia);
    }

    // Safely delete exclusively from the Media collection with bounded batching
    const BATCH_SIZE = 500;
    let deletedCount = 0;

    if (totalCount <= BATCH_SIZE) {
      const result = await Media.deleteMany({ _id: { $exists: true } });
      deletedCount = result.deletedCount || 0;
    } else {
      while (true) {
        const batch = await Media.find({}, { _id: 1 }).limit(BATCH_SIZE).lean();
        if (!batch.length) break;
        const ids = batch.map((doc) => doc._id);
        const result = await Media.deleteMany({ _id: { $in: ids } });
        deletedCount += result.deletedCount || 0;
        if (batch.length < BATCH_SIZE) break;
      }
    }

    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} image${deletedCount === 1 ? "" : "s"} from the Media Library.`,
      data: { deletedCount }
    });
  } catch (err) {
    next(err);
  }
}
