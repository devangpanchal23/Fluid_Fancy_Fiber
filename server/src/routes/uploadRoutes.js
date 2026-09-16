import { Router } from "express";
import { uploadImage, removeImage } from "../controllers/uploadController.js";
import { uploadSingleImage } from "../middleware/upload.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAdmin, uploadSingleImage, uploadImage);
router.delete("/:filename", requireAdmin, removeImage);

export default router;
