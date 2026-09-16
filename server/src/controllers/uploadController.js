import { saveImage, deleteImage } from "../utils/imageStorage.js";

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
