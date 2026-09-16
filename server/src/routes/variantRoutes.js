import { Router } from "express";
import { listVariants, getVariant, createVariant, updateVariant, addVariantImage, reorderVariant, deleteVariant } from "../controllers/variantController.js";
import { requireAdmin, attachAdminIfPresent } from "../middleware/auth.js";
import { uploadSingleImage } from "../middleware/upload.js";

const router = Router();

router.get("/", attachAdminIfPresent, listVariants);
router.get("/:id", attachAdminIfPresent, getVariant);
router.post("/", requireAdmin, createVariant);
router.post("/:id/images", requireAdmin, uploadSingleImage, addVariantImage);
router.put("/:id", requireAdmin, updateVariant);
router.put("/:id/reorder", requireAdmin, reorderVariant);
router.delete("/:id", requireAdmin, deleteVariant);

export default router;
