import VideoAsset from "../models/VideoAsset.js";
import Video from "../models/Video.js";
import { deleteFromCloudinary } from "../utils/cloudinaryVideo.js";

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

// The video file itself is uploaded directly from the admin's browser to
// Cloudinary (see client/src/admin/utils/cloudinaryVideoUpload.js) — this
// endpoint just registers the resulting url/publicId in the library so it
// can be reused across Video Gallery entries without re-uploading.
export async function createVideoAsset(req, res, next) {
  try {
    const body = req.body || {};
    if (!body.url || !String(body.url).trim()) {
      return res.status(400).json({ success: false, message: "Missing the uploaded video's URL." });
    }
    if (!body.publicId || !String(body.publicId).trim()) {
      return res.status(400).json({ success: false, message: "Missing the uploaded video's Cloudinary public ID." });
    }

    const videoAsset = await VideoAsset.create({
      url: body.url,
      publicId: body.publicId,
      originalName: body.originalName || "",
      mimeType: body.mimeType || "",
      size: body.size || 0,
      duration: body.duration ?? null,
      thumbnail: body.thumbnail || null
    });

    res.status(201).json({ success: true, data: { videoAsset } });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: "This video is already in the library." });
    }
    next(err);
  }
}

async function findUsage(videoAsset) {
  return Video.find(
    { $or: [{ videoAsset: videoAsset._id }, { publicId: videoAsset.publicId }] },
    { title: 1 }
  );
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
      // a video that no longer exists on Cloudinary — the admin has to pick
      // a new video (or a URL) before republishing it.
      await Video.updateMany(
        { $or: [{ videoAsset: videoAsset._id }, { publicId: videoAsset.publicId }] },
        { $set: { url: "", publicId: "", videoAsset: null, embedType: "native", status: "draft" } }
      );
    }

    await deleteFromCloudinary(videoAsset.publicId);
    await videoAsset.deleteOne();

    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
