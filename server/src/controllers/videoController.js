import Video from "../models/Video.js";
import { deleteFromCloudinary, defaultThumbnail } from "../utils/cloudinaryVideo.js";

const STATUSES = ["draft", "published"];
const SOURCES = ["upload", "url"];
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

function validateVideoBody(body, { partial = false } = {}) {
  const errors = {};
  const source = body.source || "upload";
  if (!partial) {
    if (!body.title || !String(body.title).trim()) errors.title = "Required.";
    if (!body.url || !String(body.url).trim()) errors.url = "Required.";
    // A pasted URL has no Cloudinary asset to speak of — only an upload
    // (from the file picker or the Video Library) needs a publicId.
    if (source === "upload" && (!body.publicId || !String(body.publicId).trim())) errors.publicId = "Required.";
  }
  if (body.source && !SOURCES.includes(body.source)) errors.source = "Invalid source.";
  if (body.embedType && !EMBED_TYPES.includes(body.embedType)) errors.embedType = "Invalid embed type.";
  if (body.status && !STATUSES.includes(body.status)) errors.status = "Invalid status.";
  return errors;
}

export async function createVideo(req, res, next) {
  try {
    const body = req.body || {};
    const errors = validateVideoBody(body);
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, message: "Please fix the highlighted fields.", errors });
    }

    const source = body.source || "upload";
    const count = await Video.countDocuments();
    const video = await Video.create({
      title: String(body.title).trim(),
      description: body.description || "",
      url: body.url,
      publicId: source === "upload" ? body.publicId || "" : "",
      source,
      embedType: body.embedType || "native",
      videoAsset: body.videoAsset || null,
      thumbnail: body.thumbnail || (source === "upload" ? defaultThumbnail(body.publicId) : null),
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
    const errors = validateVideoBody(body, { partial: true });
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, message: "Please fix the highlighted fields.", errors });
    }

    const assignable = [
      "title",
      "description",
      "url",
      "publicId",
      "source",
      "embedType",
      "videoAsset",
      "thumbnail",
      "duration",
      "status",
      "order"
    ];
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
    // Only remove the Cloudinary asset if it isn't tracked in the Video
    // Library — a library-tracked asset may be reused by other Video Gallery
    // entries, and is only ever deleted from the library itself
    // (videoAssetController.deleteVideoAsset), same as Media never gets
    // deleted just because one Product stops using it.
    if (!video.videoAsset && video.source === "upload") {
      await deleteFromCloudinary(video.publicId);
    }
    await video.deleteOne();
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
