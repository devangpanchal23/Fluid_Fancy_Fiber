import multer from "multer";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function hasImageSignature(buffer, mimetype) {
  if (!Buffer.isBuffer(buffer)) return false;
  if (mimetype === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimetype === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimetype === "image/gif") return ["GIF87a", "GIF89a"].some((signature) => buffer.subarray(0, 6).toString("ascii") === signature);
  if (mimetype === "image/webp") return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  return false;
}

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
    if (!err) {
      if (req.file && !hasImageSignature(req.file.buffer, req.file.mimetype)) {
        const invalid = new Error("Image content does not match its declared file type.");
        invalid.status = 400;
        return next(invalid);
      }
      return next();
    }
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
