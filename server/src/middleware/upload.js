import multer from "multer";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      const err = new Error("Unsupported file type. Upload a JPEG, PNG, WEBP or GIF image.");
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  }
});

// Wraps multer's single-file handler so its own errors (file too large, etc.)
// become friendly 400s through the shared errorHandler instead of raw
// MulterError stacks.
export function uploadSingleImage(req, res, next) {
  multerUpload.single("image")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "Image is too large. Maximum size is 5MB."
          : "Could not process the uploaded file.";
      err.status = 400;
      err.message = message;
    }
    next(err);
  });
}

// One piece of a video being uploaded in chunks (see
// server/src/utils/videoStorage.js for why: Vercel serverless functions
// hard-cap request payloads at ~4.5MB, far below any real video file, so the
// browser splits the file client-side and PUTs it here one piece at a time).
// A little slack above VIDEO_CHUNK_SIZE absorbs multipart/form-data's own
// boundary/header overhead so the exact-size final legitimate chunk is never
// rejected; the controller separately enforces the exact expected byte count.
export const VIDEO_CHUNK_SIZE = 4 * 1024 * 1024; // 4MB
const CHUNK_SIZE_SLACK = 256 * 1024;

const multerVideoChunk = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: VIDEO_CHUNK_SIZE + CHUNK_SIZE_SLACK }
});

export function parseVideoChunk(req, res, next) {
  multerVideoChunk.single("chunk")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message = err.code === "LIMIT_FILE_SIZE" ? "Upload chunk too large." : "Could not process the uploaded chunk.";
      err.status = 400;
      err.message = message;
    }
    next(err);
  });
}
