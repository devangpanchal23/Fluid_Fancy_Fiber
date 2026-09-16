import { Router } from "express";
import { listCategories, createCategory, updateCategory, reorderCategory, deleteCategory } from "../controllers/categoryController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", listCategories);
router.post("/", requireAdmin, createCategory);
router.put("/:id", requireAdmin, updateCategory);
router.put("/:id/reorder", requireAdmin, reorderCategory);
router.delete("/:id", requireAdmin, deleteCategory);

export default router;
