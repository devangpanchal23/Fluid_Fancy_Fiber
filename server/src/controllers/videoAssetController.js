import mongoose from "mongoose";
import VideoAsset from "../models/VideoAsset.js";
import Video from "../models/Video.js";
import { VIDEO_CHUNK_SIZE } from "../middleware/upload.js";
import {
  writeChunk,
  countChunks,
  sumChunkBytes,
  deleteChunks,
  finalizeUpload,
  deleteVideoFile,
  getFileMeta,
  sweepAbandonedChunks
} from "../utils/videoStorage.js";

const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
// A hard, deliberate ceiling: the `complete` step inserts one metadata
// document (cheap regardless of size, see videoStorage.js), so this isn't
// capped by MongoDB's document limit — it's capped to keep a single upload's
// total chunk-PUT time comfortably inside a serverless function's execution
// window on a slow connection. Documented in README.md; raise with care.
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB

export async function listVideoAssets(req, res, next) {
  try {
    const { q, page = 1, limit = 24 } = req.query;
    const filter = {};
    if (q && String(q).trim()) {
      const re = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.originalName = re;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 24));

    const [items, total] = await Promise.all([
      VideoAsset.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      VideoAsset.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: { items, total, page: pageNum, pages: Math.max(1, Math.ceil(total / limitNum)) }
    });
  } catch (err) {
    next(err);
  }
}

// Step 1 of 3: mints the id every chunk of this upload will be written
// under (see videoStorage.js) and hands it to the browser. No document is
// written yet — chunks reference this id directly, and `complete` is what
// makes the id resolve to an actual file.
export async function startVideoUpload(req, res, next) {
  try {
    const { mimeType, size } = req.body || {};
    if (!mimeType || !ALLOWED_VIDEO_TYPES.has(mimeType)) {
      return res.status(400).json({ success: false, message: "Unsupported video type. Use MP4, WEBM or MOV." });
    }
    const sizeNum = Number(size);
    if (!Number.isFinite(sizeNum) || sizeNum <= 0) {
      return res.status(400).json({ success: false, message: "Missing or invalid file size." });
    }
    if (sizeNum > MAX_VIDEO_SIZE) {
      return res.status(400).json({
        success: false,
        message: `Video is too large. Maximum size is ${Math.round(MAX_VIDEO_SIZE / (1024 * 1024))}MB.`
      });
    }

    sweepAbandonedChunks().catch((err) => console.warn("[video] Abandoned-chunk sweep failed (non-fatal):", err.message));

    const uploadId = new mongoose.Types.ObjectId();
    res.status(201).json({ success: true, data: { uploadId: uploadId.toString(), chunkSize: VIDEO_CHUNK_SIZE } });
  } catch (err) {
    next(err);
  }
}

// Step 2 of 3: one 4MB (or smaller, if final) piece of the file. Every
// chunk except the last must be exactly VIDEO_CHUNK_SIZE — enforced here so
// a malformed/malicious client can't desync the byte offsets `complete`
// relies on to have been written in fixed-size order.
export async function uploadVideoChunk(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.uploadId)) {
      return res.status(400).json({ success: false, message: "Invalid upload session." });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No chunk data was provided." });
    }
    const index = parseInt(req.params.index, 10);
    if (!Number.isInteger(index) || index < 0) {
      return res.status(400).json({ success: false, message: "Invalid chunk index." });
    }
    const isLast = req.body?.isLast === "true" || req.body?.isLast === true;
    if (!isLast && req.file.size !== VIDEO_CHUNK_SIZE) {
      return res.status(400).json({ success: false, message: "Malformed chunk (unexpected size)." });
    }
    if (req.file.size === 0) {
      return res.status(400).json({ success: false, message: "Empty chunk." });
    }

    const filesId = new mongoose.Types.ObjectId(req.params.uploadId);
    await writeChunk({ filesId, index, buffer: req.file.buffer });
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

// Step 3 of 3: every chunk has arrived — verify the pieces actually add up
// to the file the admin started uploading, write the one GridFS metadata
// document, and register the result in the Video Library.
export async function completeVideoUpload(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.uploadId)) {
      return res.status(400).json({ success: false, message: "Invalid upload session." });
    }
    const filesId = new mongoose.Types.ObjectId(req.params.uploadId);
    const { originalName, mimeType, size, totalChunks, duration } = req.body || {};

    if (!mimeType || !ALLOWED_VIDEO_TYPES.has(mimeType)) {
      return res.status(400).json({ success: false, message: "Unsupported video type. Use MP4, WEBM or MOV." });
    }
    const sizeNum = Number(size);
    const totalChunksNum = Number(totalChunks);
    if (!Number.isFinite(sizeNum) || sizeNum <= 0 || !Number.isInteger(totalChunksNum) || totalChunksNum <= 0) {
      return res.status(400).json({ success: false, message: "Missing or invalid upload metadata." });
    }

    const existing = await getFileMeta(filesId);
    if (existing) {
      return res.status(409).json({ success: false, message: "This upload was already completed." });
    }

    const [chunkCount, byteTotal] = await Promise.all([countChunks(filesId), sumChunkBytes(filesId)]);
    if (chunkCount !== totalChunksNum) {
      return res.status(400).json({
        success: false,
        message: `Upload incomplete: received ${chunkCount} of ${totalChunksNum} chunks. Please retry the upload.`
      });
    }
    if (byteTotal !== sizeNum) {
      await deleteChunks(filesId);
      return res.status(400).json({
        success: false,
        message: "Upload failed integrity check (byte count mismatch). Please retry the upload."
      });
    }

    const safeName = String(originalName || "video").replace(/[/\\]/g, "_").slice(0, 255);
    await finalizeUpload({ filesId, length: sizeNum, chunkSize: VIDEO_CHUNK_SIZE, filename: safeName });

    const videoAsset = await VideoAsset.create({
      url: `/video-uploads/${filesId.toString()}`,
      gridFsId: filesId,
      originalName: safeName,
      mimeType,
      size: sizeNum,
      duration: duration != null && Number.isFinite(Number(duration)) ? Number(duration) : null
    });

    res.status(201).json({ success: true, data: { videoAsset } });
  } catch (err) {
    next(err);
  }
}

// Lets the client clean up after an abandoned/cancelled upload instead of
// waiting for the best-effort sweep in startVideoUpload.
export async function abortVideoUpload(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.uploadId)) {
      return res.status(400).json({ success: false, message: "Invalid upload session." });
    }
    await deleteChunks(new mongoose.Types.ObjectId(req.params.uploadId));
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

async function findUsage(videoAsset) {
  return Video.find({ videoAsset: videoAsset._id }, { title: 1 });
}

export async function deleteVideoAsset(req, res, next) {
  try {
    const videoAsset = await VideoAsset.findById(req.params.id);
    if (!videoAsset) return res.status(404).json({ success: false, message: "Video not found." });

    const usage = await findUsage(videoAsset);

    if (usage.length && req.query.force !== "true") {
      return res.status(409).json({
        success: false,
        message: `This video is still used by ${usage.length} video gallery entr${usage.length === 1 ? "y" : "ies"}. Delete anyway to remove it from all of them, or unassign it first.`,
        data: { usage: usage.map((v) => ({ id: v._id, title: v.title })) }
      });
    }

    if (usage.length) {
      // Blank + unpublish rather than leaving a published entry pointing at
      // a video that no longer exists — the admin has to pick a new video
      // (or a Drive link) before republishing it.
      await Video.updateMany(
        { videoAsset: videoAsset._id },
        { $set: { url: "", videoAsset: null, embedType: "native", status: "draft" } }
      );
    }

    // Removes both the GridFS metadata doc and every one of its chunks in
    // one call, regardless of how those chunks were written — this is what
    // guarantees no orphaned chunk documents survive a delete.
    await deleteVideoFile(videoAsset.gridFsId);
    await videoAsset.deleteOne();

    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
