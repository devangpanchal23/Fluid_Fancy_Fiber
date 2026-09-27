import mongoose from "mongoose";
import VideoMedia from "../models/VideoMedia.js";
import { saveVideoLink } from "./videoMediaController.js";
import Video from "../models/Video.js";

const STATUSES = ["draft", "published"];

// Assets belong to the library; content deletion never deletes shared video bytes.
async function resolveSource(body) {
  let media;
  if (body.videoMedia) {
    if (!mongoose.isValidObjectId(body.videoMedia)) throw Object.assign(new Error("Invalid video library selection."), { status: 400 });
    media = await VideoMedia.findOne({ _id: body.videoMedia, deleting: { $ne: true } });
    if (!media) throw Object.assign(new Error("Selected video is no longer available. Choose another video."), { status: 400 });
  } else {
    media = await saveVideoLink(body.url, body.title);
  }
  const linked = media.provider === "drive" || media.provider === "direct";
  return { videoMedia: media._id, sourceType: linked ? media.provider : "library", url: media.url,
    publicId: linked ? "" : media.publicId, duration: media.duration ?? null, thumbnail: body.thumbnail || (media.thumbnail?.url ? { url: media.thumbnail.url, alt: media.thumbnail.alt || "" } : null) };
}
async function claimSource(source, id) {
  if (!source.videoMedia) return;
  const claimed = await VideoMedia.findOneAndUpdate({ _id: source.videoMedia, deleting: { $ne: true } }, { $addToSet: { references: id } });
  if (!claimed) throw Object.assign(new Error("Selected video is being deleted. Choose another video."), { status: 409 });
}
async function releaseSource(mediaId, id) {
  if (mediaId) await VideoMedia.updateOne({ _id: mediaId }, { $pull: { references: id } });
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
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid video ID." });
    const video = await Video.findById(req.params.id);
    if (!video || (!isAdmin && video.status !== "published")) {
      return res.status(404).json({ success: false, message: "Video not found." });
    }
    res.json({ success: true, data: { video } });
  } catch (err) {
    next(err);
  }
}

function validateVideoBody(body) {
  const errors = {};
  if (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 160) errors.title = "Enter a title of 1–160 characters.";
  if (body.description != null && (typeof body.description !== "string" || body.description.length > 1000)) errors.description = "Description must be at most 1000 characters.";
  if (body.status && !STATUSES.includes(body.status)) errors.status = "Invalid status.";
  if (body.thumbnail && (typeof body.thumbnail.url !== "string" || !/^(https:\/\/|\/uploads\/)/.test(body.thumbnail.url))) errors.thumbnail = "Invalid thumbnail URL.";
  return errors;
}

export async function createVideo(req, res, next) {
  let source, id, saved = false;
  try {
    const body = req.body || {};
    const errors = validateVideoBody(body);
    if (Object.keys(errors).length) return res.status(400).json({ success: false, message: "Please fix the highlighted fields.", errors });
    source = await resolveSource(body);
    id = new mongoose.Types.ObjectId();
    await claimSource(source, id);
    const video = await Video.create({ _id: id, ...source, title: body.title.trim(), description: body.description || "", status: body.status || "draft", order: await Video.countDocuments() });
    saved = true;
    res.status(201).json({ success: true, data: { video } });
  } catch (e) {
    if (!saved && source?.videoMedia && id) await releaseSource(source.videoMedia, id).catch(() => {});
    next(e);
  }
}

export async function updateVideo(req, res, next) {
  let source, video, previousMedia, saved = false;
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid video ID." });
    video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: "Video not found." });
    const body = req.body || {};
    const merged = { ...video.toObject(), ...body };
    const errors = validateVideoBody(merged);
    if (Object.keys(errors).length) return res.status(400).json({ success: false, message: "Please fix the highlighted fields.", errors });
    previousMedia = video.videoMedia;
    if (Object.hasOwn(body, "url") || Object.hasOwn(body, "videoMedia")) {
      // A URL-only API update explicitly switches away from the library.
      if (Object.hasOwn(body, "url") && !Object.hasOwn(body, "videoMedia")) merged.videoMedia = null;
      source = await resolveSource(merged);
      await claimSource(source, video._id);
      Object.assign(video, source);
    }
    for (const field of ["title", "description", "thumbnail", "status"]) if (body[field] !== undefined) video[field] = body[field];
    await video.save();
    saved = true;
    if (source && String(previousMedia) !== String(source.videoMedia)) await releaseSource(previousMedia, video._id);
    res.json({ success: true, data: { video } });
  } catch (e) {
    if (!saved && source?.videoMedia && String(previousMedia) !== String(source.videoMedia)) await releaseSource(source.videoMedia, video._id).catch(() => {});
    next(e);
  }
}

export async function reorderVideo(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid video ID." });
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
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid video ID." });
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found." });
    }
    await video.deleteOne();
    await releaseSource(video.videoMedia, video._id);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
