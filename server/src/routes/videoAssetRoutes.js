import { Router } from "express";
import { listVideoAssets, createVideoAsset, deleteVideoAsset } from "../controllers/videoAssetController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// Video Library is an admin-only surface, same as Media — the public site
// never lists it, it only ever sees the resulting url already copied onto a
// published Video Gallery entry.
router.get("/", requireAdmin, listVideoAssets);
router.post("/", requireAdmin, createVideoAsset);
router.delete("/:id", requireAdmin, deleteVideoAsset);

export default router;
