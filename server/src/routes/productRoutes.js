import { Router } from "express";
import { listProducts, getProduct, createProduct, updateProduct, addProductImage, reorderProduct, deleteProduct } from "../controllers/productController.js";
import { requireAdmin, attachAdminIfPresent } from "../middleware/auth.js";
import { uploadSingleImage } from "../middleware/upload.js";

const router = Router();

router.get("/", attachAdminIfPresent, listProducts);
router.get("/:id", attachAdminIfPresent, getProduct);
router.post("/", requireAdmin, createProduct);
router.post("/:id/images", requireAdmin, uploadSingleImage, addProductImage);
router.put("/:id", requireAdmin, updateProduct);
router.put("/:id/reorder", requireAdmin, reorderProduct);
router.delete("/:id", requireAdmin, deleteProduct);

export default router;
