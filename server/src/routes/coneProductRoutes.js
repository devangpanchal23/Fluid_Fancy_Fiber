import { Router } from "express";
import {
  listConeProducts,
  getConeProduct,
  createConeProduct,
  updateConeProduct,
  reorderConeProduct,
  deleteConeProduct
} from "../controllers/coneProductController.js";
import { requireAdmin, attachAdminIfPresent } from "../middleware/auth.js";

const router = Router();

router.get("/", attachAdminIfPresent, listConeProducts);
router.get("/:id", requireAdmin, getConeProduct);
router.post("/", requireAdmin, createConeProduct);
router.put("/:id", requireAdmin, updateConeProduct);
router.put("/:id/reorder", requireAdmin, reorderConeProduct);
router.delete("/:id", requireAdmin, deleteConeProduct);

export default router;
