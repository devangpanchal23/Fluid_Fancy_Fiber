import Media from "../models/Media.js";

// A stored image must always resolve. Uploaded images live in the Media
// collection (see utils/imageStorage.js), so an /uploads/ url is only accepted
// if the file actually exists — and the record is linked back to its Media
// entry so the library's "in use" protection covers it.
export async function normalizeImage(image) {
  if (!image || typeof image !== "object" || typeof image.url !== "string" || !image.url.trim()) {
    return { error: "A photo is required." };
  }
  const url = image.url.trim();
  const alt = typeof image.alt === "string" ? image.alt.trim().slice(0, 200) : "";

  if (url.startsWith("/uploads/")) {
    const filename = url.slice("/uploads/".length);
    const media = filename && !filename.includes("/") ? await Media.findOne({ filename }) : null;
    if (!media) return { error: "This photo no longer exists. Please upload it again." };
    return { image: { url, alt, filename: media.filename, media: media._id } };
  }
  if (/^https:\/\/\S+$/i.test(url) && url.length <= 2000) {
    return { image: { url, alt, filename: "", media: null } };
  }
  return { error: "The photo URL is not valid." };
}
