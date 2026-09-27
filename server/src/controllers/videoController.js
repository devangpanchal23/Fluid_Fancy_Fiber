import Video from "../models/Video.js";
import VideoAsset from "../models/VideoAsset.js";

const STATUSES = ["draft", "published"];
const SOURCES = ["upload", "drive"];
const EMBED_TYPES = ["native", "iframe"];

export async function listVideos(req, res, next) {
  try {
    const isAdmin = Boolean(req.admin);
    const { status, page = 1, limit = 50, sort = "order" } = req.query;

    const filter = {};
    if (!isAdmin) {
      filter.status = "published";
    } else if (status && STATUSES.includes(status)) {
      filter.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const [items, total] = await Promise.all([
      Video.find(filter)
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Video.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: { items, total, page: pageNum, pages: Math.max(1, Math.ceil(total / limitNum)) }
    });
  } catch (err) {
    next(err);
  }
}

export async function getVideo(req, res, next) {
  try {
    const isAdmin = Boolean(req.admin);
    const video = await Video.findById(req.params.id);
    if (!video || (!isAdmin && video.status !== "published")) {
      return res.status(404).json({ success: false, message: "Video not found." });
    }
    res.json({ success: true, data: { video } });
  } catch (err) {
    next(err);
  }
}

async function validateVideoBody(body, { partial = false } = {}) {
  const errors = {};
  const source = body.source || "upload";
  if (body.source && !SOURCES.includes(body.source)) errors.source = "Invalid source.";
  if (body.embedType && !EMBED_TYPES.includes(body.embedType)) errors.embedType = "Invalid embed type.";
  if (body.status && !STATUSES.includes(body.status)) errors.status = "Invalid status.";

  if (!partial) {
    if (!body.title || !String(body.title).trim()) errors.title = "Required.";
    if (!body.url || !String(body.url).trim()) errors.url = "Required.";
  }

  if (source === "upload" && body.videoAsset) {
    const exists = await VideoAsset.exists({ _id: body.videoAsset });
    if (!exists) errors.videoAsset = "That Video Library entry no longer exists.";
  }
  if (source === "drive" && !partial && !String(body.driveFileId || "").trim()) {
    errors.driveFileId = "Required for a Google Drive video.";
  }

  return errors;
}

export async function createVideo(req, res, next) {
  try {
    const body = req.body || {};
    const errors = await validateVideoBody(body);
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, message: "Please fix the highlighted fields.", errors });
    }

    const source = body.source || "upload";
    const count = await Video.countDocuments();
    const video = await Video.create({
      title: String(body.title).trim(),
      description: body.description || "",
      url: body.url,
      source,
      embedType: body.embedType || (source === "drive" ? "iframe" : "native"),
      videoAsset: source === "upload" ? body.videoAsset || null : null,
      driveFileId: source === "drive" ? body.driveFileId || "" : "",
      thumbnail: body.thumbnail || null,
      duration: body.duration ?? null,
      status: body.status || "draft",
      order: body.order !== undefined ? body.order : count
    });

    res.status(201).json({ success: true, data: { video } });
  } catch (err) {
    next(err);
  }
}

export async function updateVideo(req, res, next) {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found." });
    }
    const body = req.body || {};
    const errors = await validateVideoBody(body, { partial: true });
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, message: "Please fix the highlighted fields.", errors });
    }

    const assignable = ["title", "description", "url", "source", "embedType", "videoAsset", "driveFileId", "thumbnail", "duration", "status", "order"];
    for (const field of assignable) {
      if (body[field] !== undefined) video[field] = body[field];
    }

    await video.save();
    res.json({ success: true, data: { video } });
  } catch (err) {
    next(err);
  }
}

export async function reorderVideo(req, res, next) {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found." });
    }
    const { direction } = req.body || {};
    if (direction !== "up" && direction !== "down") {
      return res.status(400).json({ success: false, message: "direction must be 'up' or 'down'." });
    }
    const neighbor = await Video.findOne({ order: { [direction === "up" ? "$lt" : "$gt"]: video.order } }).sort({
      order: direction === "up" ? -1 : 1
    });
    if (!neighbor) {
      return res.json({ success: true, data: { video } });
    }
    const tmp = video.order;
    video.order = neighbor.order;
    neighbor.order = tmp;
    await Promise.all([video.save(), neighbor.save()]);
    res.json({ success: true, data: { video } });
  } catch (err) {
    next(err);
  }
}

export async function deleteVideo(req, res, next) {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found." });
    }
    // The underlying file (if any) is only ever deleted from the Video
    // Library itself (videoAssetController.deleteVideoAsset) — a library
    // entry may be reused by other Video Gallery entries, same as Media
    // never gets deleted just because one Product stops using it.
    await video.deleteOne();
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
