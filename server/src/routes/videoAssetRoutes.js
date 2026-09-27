import { Router } from "express";
import {
  listVideoAssets,
  startVideoUpload,
  uploadVideoChunk,
  completeVideoUpload,
  abortVideoUpload,
  deleteVideoAsset
} from "../controllers/videoAssetController.js";
import { parseVideoChunk } from "../middleware/upload.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// Video Library is an admin-only surface, same as Media — the public site
// never lists it, it only ever sees the resulting url already copied onto a
// published Video Gallery entry (streamed via GET /video-uploads/:id, a
// separate public route — see server/src/controllers/videoStreamController.js).
router.get("/", requireAdmin, listVideoAssets);
router.delete("/:id", requireAdmin, deleteVideoAsset);

// Chunked upload lifecycle — see server/src/utils/videoStorage.js for why a
// single video can't travel in one request on Vercel serverless functions.
router.post("/uploads", requireAdmin, startVideoUpload);
router.put("/uploads/:uploadId/chunks/:index", requireAdmin, parseVideoChunk, uploadVideoChunk);
router.post("/uploads/:uploadId/complete", requireAdmin, completeVideoUpload);
router.delete("/uploads/:uploadId", requireAdmin, abortVideoUpload);

export default router;
