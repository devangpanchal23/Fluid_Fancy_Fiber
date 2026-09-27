import { createHash } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import VideoMedia from '../models/VideoMedia.js';
import Video from '../models/Video.js';
import { MAX_VIDEO_SIZE, normalizeVideoUrl } from '../../../client/src/utils/videoSource.js';

export function configureVideoCloud() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if ([cloudName, apiKey, apiSecret].some((value) => !value || /^(your-|replace-|YOUR_)/.test(value))) {
    throw Object.assign(new Error('Configure server CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET before uploading or deleting library videos.'), { status: 503 });
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  return cloudName;
}
export async function videoConfig(req, res, next) {
  try {
    const cloudName = configureVideoCloud();
    res.json({ success: true, data: { cloudName, uploadPreset: process.env.CLOUDINARY_VIDEO_UPLOAD_PRESET?.trim() || process.env.CLOUDINARY_UPLOAD_PRESET?.trim() || '' } });
  } catch (e) { next(e); }
}
export async function listVideoMedia(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 24));
    const q = String(req.query.q || '').slice(0, 255).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter = { deleting: { $ne: true }, ...(q ? { originalName: new RegExp(q, 'i') } : {}) };
    const [items, total] = await Promise.all([VideoMedia.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), VideoMedia.countDocuments(filter)]);
    res.json({ success: true, data: { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (e) { next(e); }
}
// Shared by library creation and content Save/Publish: every pasted link is
// reusable even if the admin saves content without pressing Add to library.
export async function saveVideoLink(url, name) {
  let source;
  try { source = normalizeVideoUrl(url); }
  catch (e) { throw Object.assign(e, { status: 400 }); }
  if (name != null && (typeof name !== 'string' || name.trim().length > 255)) throw Object.assign(new Error('Video name must be at most 255 characters.'), { status: 400 });
  // Reuse an uploaded asset when its delivery URL is pasted back into the UI.
  const existing = await VideoMedia.findOne({ url: source.url });
  if (existing) {
    if (existing.deleting) throw Object.assign(new Error('This video is being deleted. Please retry.'), { status: 409 });
    return existing;
  }
  const publicId = `link:${createHash('sha256').update(source.url).digest('hex')}`;
  const values = { publicId, provider: source.sourceType, url: source.url,
    originalName: name?.trim() || (source.sourceType === 'drive' ? `Drive video ${new URL(source.url).pathname.split('/')[3]}` : new URL(source.url).pathname.split('/').pop()).slice(0, 255),
    thumbnail: null, size: null, duration: null };
  let media;
  try { media = await VideoMedia.findOneAndUpdate({ publicId }, { $setOnInsert: values }, { upsert: true, new: true, runValidators: true }); }
  catch (e) { if (e.code !== 11000) throw e; media = await VideoMedia.findOne({ publicId }); }
  if (!media || media.deleting) throw Object.assign(new Error('This video is being deleted. Please retry.'), { status: 409 });
  return media;
}

export async function createVideoMedia(req, res, next) {
  try {
    if (req.body?.url !== undefined && !req.body?.publicId) {
      const media = await saveVideoLink(req.body.url, req.body.originalName);
      return res.status(201).json({ success: true, data: { media } });
    }
    const cloudName = configureVideoCloud();
    const { publicId, originalName } = req.body || {};
    if (typeof publicId !== 'string' || !publicId.trim() || publicId.length > 300 || typeof originalName !== 'string' || !originalName.trim() || originalName.length > 255) return res.status(400).json({ success: false, message: 'A valid Cloudinary public ID and filename are required.' });
    // Never trust browser-supplied URL, size, format or resource type.
    const asset = await cloudinary.api.resource(publicId, { resource_type: 'video', type: 'upload' });
    if (asset.resource_type !== 'video' || !['mp4', 'webm', 'mov'].includes(asset.format) || !asset.width || !asset.height || !asset.bytes || asset.bytes > MAX_VIDEO_SIZE) return res.status(400).json({ success: false, message: 'Cloudinary asset must be an MP4, WEBM or MOV video no larger than 100 MiB.' });
    const options = { resource_type: 'video', secure: true, cloud_name: cloudName, version: asset.version };
    const values = {
      provider: 'cloudinary', publicId: asset.public_id, originalName: originalName.trim(), size: asset.bytes, format: asset.format, duration: asset.duration || null,
      url: cloudinary.url(asset.public_id, { ...options, format: 'mp4', transformation: [{ video_codec: 'h264', audio_codec: 'aac' }] }),
      thumbnail: { url: cloudinary.url(asset.public_id, { ...options, format: 'jpg', start_offset: '0' }), alt: '' }
    };
    let media;
    try { media = await VideoMedia.findOneAndUpdate({ publicId }, { $setOnInsert: values }, { upsert: true, new: true, runValidators: true }); }
    catch (e) { if (e.code !== 11000) throw e; media = await VideoMedia.findOne({ publicId }); }
    if (media.deleting) return res.status(409).json({ success: false, message: 'This asset is being deleted. Upload a new video.' });
    res.status(201).json({ success: true, data: { media } });
  } catch (e) { next(e); }
}
export async function deleteVideoMedia(req, res, next) {
  let claimed;
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid library ID.' });
    const media = await VideoMedia.findById(req.params.id);
    if (!media) return res.status(404).json({ success: false, message: 'Video library entry not found.' });
    if (await Video.exists({ $or: [{ videoMedia: media._id }, { publicId: media.publicId }, { url: media.url }] })) return res.status(409).json({ success: false, message: 'This video is used by content. Remove or replace it in that content before deleting.' });
    const isCloudinary = !media.provider || media.provider === 'cloudinary';
    if (isCloudinary) configureVideoCloud();
    claimed = await VideoMedia.findOneAndUpdate({ _id: media._id, deleting: false, references: { $size: 0 } }, { $set: { deleting: true } }, { new: true });
    if (!claimed) return res.status(409).json({ success: false, message: 'This video is in use or already being deleted.' });
    if (isCloudinary) {
      const result = await cloudinary.uploader.destroy(media.publicId, { resource_type: 'video', invalidate: true });
      if (!['ok', 'not found'].includes(result.result)) throw new Error('Cloudinary deletion failed. Please retry.');
    }
    await media.deleteOne();
    res.json({ success: true, data: null });
  } catch (e) {
    if (claimed) await VideoMedia.updateOne({ _id: claimed._id }, { $set: { deleting: false } }).catch(() => {});
    next(e);
  }
}
