import { Router } from "express";
import { listProducts, getProduct, createProduct, updateProduct, deleteProduct } from "../controllers/productController.js";
import { requireAdmin, attachAdminIfPresent } from "../middleware/auth.js";

const router = Router();

router.get("/", attachAdminIfPresent, listProducts);
router.get("/:id", attachAdminIfPresent, getProduct);
router.post("/", requireAdmin, createProduct);
router.put("/:id", requireAdmin, updateProduct);
router.delete("/:id", requireAdmin, deleteProduct);

export default router;
