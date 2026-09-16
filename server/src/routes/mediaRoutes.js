import { Router } from "express";
import { listMedia, uploadMedia, updateMedia, deleteMedia } from "../controllers/mediaController.js";
import { requireAdmin } from "../middleware/auth.js";
import { uploadSingleImage } from "../middleware/upload.js";

const router = Router();

// Media Library is an admin-only surface — the public site never lists it,
// it only ever sees the resulting url/alt already copied onto a
// Product/Variant/etc image.
router.get("/", requireAdmin, listMedia);
router.post("/", requireAdmin, uploadSingleImage, uploadMedia);
router.put("/:id", requireAdmin, updateMedia);
router.delete("/:id", requireAdmin, deleteMedia);

export default router;
