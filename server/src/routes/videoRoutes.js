import { Router } from "express";
import { listVideos, getVideo, createVideo, updateVideo, reorderVideo, deleteVideo } from "../controllers/videoController.js";
import { requireAdmin, attachAdminIfPresent } from "../middleware/auth.js";

const router = Router();

router.get("/", attachAdminIfPresent, listVideos);
router.get("/:id", attachAdminIfPresent, getVideo);
router.post("/", requireAdmin, createVideo);
router.put("/:id", requireAdmin, updateVideo);
router.put("/:id/reorder", requireAdmin, reorderVideo);
router.delete("/:id", requireAdmin, deleteVideo);

export default router;
