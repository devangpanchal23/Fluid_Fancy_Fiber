import { v2 as cloudinary } from "cloudinary";

export function isCloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

// Best-effort delete of the Cloudinary asset — mirrors mailer.js's posture:
// an admin deleting a video record must not be blocked by Cloudinary being
// unreachable or unconfigured (e.g. local dev without credentials set).
export async function deleteFromCloudinary(publicId) {
  if (!publicId || !isCloudinaryConfigured()) {
    console.warn("[video] Cloudinary not configured — skipping remote asset deletion.");
    return;
  }
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
  } catch (err) {
    console.error("[video] Failed to delete Cloudinary asset:", err?.message || err);
  }
}

export function defaultThumbnail(publicId) {
  if (!publicId) return null;
  return { url: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || "demo"}/video/upload/so_0/${publicId}.jpg`, alt: "" };
}
