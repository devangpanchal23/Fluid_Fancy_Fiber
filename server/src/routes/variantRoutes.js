import { Router } from "express";
import { listVariants, getVariant, createVariant, updateVariant, reorderVariant, deleteVariant } from "../controllers/variantController.js";
import { requireAdmin, attachAdminIfPresent } from "../middleware/auth.js";

const router = Router();

router.get("/", attachAdminIfPresent, listVariants);
router.get("/:id", attachAdminIfPresent, getVariant);
router.post("/", requireAdmin, createVariant);
router.put("/:id", requireAdmin, updateVariant);
router.put("/:id/reorder", requireAdmin, reorderVariant);
router.delete("/:id", requireAdmin, deleteVariant);

export default router;
