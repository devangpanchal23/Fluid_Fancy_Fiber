// Image storage abstraction. Today this writes to a local `server/uploads/`
// directory, which is fine for local dev and traditional (non-serverless)
// hosting, but Vercel's serverless functions have no persistent or shared
// filesystem — files written here in production will not reliably survive
// across invocations/deployments. To go to production, swap the body of
// saveImage/deleteImage for a real provider (Cloudinary, Vercel Blob, S3,
// Supabase Storage, …); every caller in this codebase only depends on the
// {url, filename} shape returned below, so no other file needs to change.
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif"
};

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function saveImage(buffer, originalName, mimetype) {
  await ensureUploadDir();
  const ext = EXT_BY_MIME[mimetype] || path.extname(originalName || "").slice(0, 10) || ".bin";
  const filename = `${crypto.randomBytes(16).toString("hex")}${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return { url: `/uploads/${filename}`, filename };
}

export async function deleteImage(filename) {
  if (!filename || filename.includes("/") || filename.includes("\\") || filename.includes("..")) return;
  try {
    await fs.unlink(path.join(UPLOAD_DIR, filename));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}

export { UPLOAD_DIR };
