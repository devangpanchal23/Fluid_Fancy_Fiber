import { v2 as cloudinary } from "cloudinary";
import Video from "../models/Video.js";

const STATUSES = ["draft", "published"];

function isCloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

// Best-effort delete of the Cloudinary asset — mirrors mailer.js's posture:
// an admin deleting a video record must not be blocked by Cloudinary being
// unreachable or unconfigured (e.g. local dev without credentials set).
async function deleteFromCloudinary(publicId) {
  if (!publicId || !isCloudinaryConfigured()) {
    console.warn("[video] Cloudinary not configured — skipping remote asset deletion.");
    return;
  }
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
  } catch (err) {
    console.error("[video] Failed to delete Cloudinary asset:", err?.message || err);
  }
}

function defaultThumbnail(url, publicId) {
  if (!publicId) return null;
  return { url: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || "demo"}/video/upload/so_0/${publicId}.jpg`, alt: "" };
}

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
  const required = ["title", "url", "publicId"];
  if (!partial) {
    for (const field of required) {
      if (!body[field] || !String(body[field]).trim()) errors[field] = "Required.";
    }
  }
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

    const count = await Video.countDocuments();
    const video = await Video.create({
      title: String(body.title).trim(),
      description: body.description || "",
      url: body.url,
      publicId: body.publicId,
      thumbnail: body.thumbnail || defaultThumbnail(body.url, body.publicId),
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

    const assignable = ["title", "description", "url", "publicId", "thumbnail", "duration", "status", "order"];
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
    await deleteFromCloudinary(video.publicId);
    await video.deleteOne();
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
