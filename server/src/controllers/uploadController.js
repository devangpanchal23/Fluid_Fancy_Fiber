import { saveImage, deleteImage, getImageData } from "../utils/imageStorage.js";

export async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file was provided." });
    }
    const { url, filename } = await saveImage(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.status(201).json({ success: true, data: { url, filename } });
  } catch (err) {
    next(err);
  }
}

export async function removeImage(req, res, next) {
  try {
    await deleteImage(req.params.filename);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

// Public — every product/category/person photo on the live site loads
// through this route, keyed by the filename saveImage() generated.
export async function serveImage(req, res, next) {
  try {
    const media = await getImageData(req.params.filename);
    if (!media) return res.status(404).end();
    res.set("Content-Type", media.mimeType);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.send(media.data);
  } catch (err) {
    next(err);
  }
}
