// Image storage abstraction. Images are stored as binary data directly on a
// Media document in MongoDB Atlas (see server/src/models/Media.js) and
// served back by server/src/controllers/uploadController.js's serveImage
// handler, mounted at GET /uploads/:filename — this avoids Vercel's
// serverless functions having no persistent/shared filesystem, which local
// disk storage silently failed on (a file written during one request was
// gone by the next, on a different container or after a redeploy). Every
// caller in this codebase only depends on the {url, filename} shape returned
// below, so no other file needs to change if the backend changes again.
import path from "path";
import crypto from "crypto";
import Media from "../models/Media.js";

const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif"
};

function isSafeFilename(filename) {
  return Boolean(filename) && !filename.includes("/") && !filename.includes("\\") && !filename.includes("..");
}

export async function saveImage(buffer, originalName, mimetype, { alt = "" } = {}) {
  const ext = EXT_BY_MIME[mimetype] || path.extname(originalName || "").slice(0, 10) || ".bin";
  const filename = `${crypto.randomBytes(16).toString("hex")}${ext}`;
  const url = `/uploads/${filename}`;

  const media = await Media.create({
    url,
    filename,
    originalName: originalName || "",
    alt: String(alt || "").trim(),
    mimeType: mimetype,
    size: buffer.length,
    data: buffer
  });

  return { url, filename, media };
}

export async function deleteImage(filename) {
  if (!isSafeFilename(filename)) return;
  await Media.deleteOne({ filename });
}

// Used by GET /uploads/:filename to stream the bytes back out. Explicitly
// re-selects `data` since the schema excludes it by default.
export async function getImageData(filename) {
  if (!isSafeFilename(filename)) return null;
  return Media.findOne({ filename }).select("+data mimeType");
}
