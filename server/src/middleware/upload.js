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
