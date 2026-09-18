// One-off backfill for the Media Library: every Product/Variant/Category/
// Person image that already points at a locally-stored `/uploads/<file>`
// but has no `media` link yet gets a matching Media record created for it
// (deduplicated by url, so the same uploaded file shared across several
// entities becomes ONE library entry, not several) and its `media` field is
// set to point at it.
//
// Deliberately non-destructive: an image's own {url, alt} is left exactly
// as-is, so nothing changes in what renders if this script is never run, or
// is run more than once (already-linked images and bundled/external urls —
// anything not starting with "/uploads/" — are skipped every time). A file
// that no longer exists on disk is skipped with a warning rather than
// crashing the run, since Media requires a real `size`/`mimeType`.
// Run with: npm run migrate:media
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Media from "../models/Media.js";
import Product from "../models/Product.js";
import Variant from "../models/Variant.js";
import Category from "../models/Category.js";
import Person from "../models/Person.js";

// Images now live in MongoDB (see imageStorage.js), but this script's job is
// reading files that still only exist on local disk from an old run — so it
// keeps its own reference to that legacy directory rather than importing it
// from imageStorage.js (which no longer touches disk at all).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif"
};

function isLocalUpload(url) {
  return typeof url === "string" && url.startsWith("/uploads/");
}

async function mediaForUrl(url, cache) {
  if (cache.has(url)) return cache.get(url);

  let media = await Media.findOne({ url }).select("+data");
  const filename = path.basename(url);
  const filePath = path.join(UPLOAD_DIR, filename);

  if (media && media.data) {
    cache.set(url, media);
    return media;
  }

  let fileBuffer;
  let stat;
  try {
    fileBuffer = await fs.readFile(filePath);
    stat = await fs.stat(filePath);
  } catch {
    console.warn(`[migrate:media] Skipping ${url} — file not found on local disk (already migrated to MongoDB, or never existed here).`);
    cache.set(url, media || null);
    return media || null;
  }

  if (media) {
    // Existing record from before images moved into MongoDB — backfill the
    // bytes it's missing rather than creating a duplicate.
    media.data = fileBuffer;
    await media.save();
  } else {
    const ext = path.extname(filename).toLowerCase();
    media = await Media.create({
      url,
      filename,
      originalName: "",
      alt: "",
      mimeType: MIME_BY_EXT[ext] || "application/octet-stream",
      size: stat.size,
      data: fileBuffer
    });
  }
  cache.set(url, media);
  return media;
}

// Shared by the {images: [...]} owners (Product, Variant) — returns how many
// image subdocuments on this one document were newly linked.
async function linkArrayImages(doc, cache) {
  let linked = 0;
  for (const image of doc.images) {
    if (image.media || !isLocalUpload(image.url)) continue;
    const media = await mediaForUrl(image.url, cache);
    if (!media) continue;
    image.media = media._id;
    if (!image.filename) image.filename = media.filename;
    linked += 1;
  }
  if (linked) await doc.save();
  return linked;
}

// Shared by the {image: {...} | null} owners (Category, Person).
async function linkSingleImage(doc, cache) {
  const image = doc.image;
  if (!image || image.media || !isLocalUpload(image.url)) return 0;
  const media = await mediaForUrl(image.url, cache);
  if (!media) return 0;
  image.media = media._id;
  if (!image.filename) image.filename = media.filename;
  doc.markModified("image");
  await doc.save();
  return 1;
}

export async function migrateImagesToMedia({
  ProductModel = Product,
  VariantModel = Variant,
  CategoryModel = Category,
  PersonModel = Person
} = {}) {
  const cache = new Map();
  let mediaLinked = 0;
  let docsUpdated = 0;

  for (const [Model, linker] of [
    [ProductModel, linkArrayImages],
    [VariantModel, linkArrayImages],
    [CategoryModel, linkSingleImage],
    [PersonModel, linkSingleImage]
  ]) {
    const docs = await Model.find({});
    for (const doc of docs) {
      const linked = await linker(doc, cache);
      if (linked) {
        mediaLinked += linked;
        docsUpdated += 1;
      }
    }
  }

  const mediaCreated = [...cache.values()].filter(Boolean).length;
  return { mediaCreated, mediaLinked, docsUpdated };
}

async function main() {
  await connectDB();
  const result = await migrateImagesToMedia();
  console.log(
    `[migrate:media] Done. Ensured ${result.mediaCreated} Media record(s) exist, linked ${result.mediaLinked} image reference(s) across ${result.docsUpdated} document(s).`
  );
  await mongoose.disconnect();
  process.exit(0);
}

if (process.argv[1] && process.argv[1].endsWith("migrateImagesToMedia.js")) {
  main().catch((err) => {
    console.error("[migrate:media] Failed:", err.message);
    process.exit(1);
  });
}
