import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  { url: { type: String, required: true, trim: true, maxlength: 2000 }, alt: { type: String, trim: true, maxlength: 200, default: "" } },
  { _id: false }
);

// Central library of every video ever uploaded, independent of which Video
// Gallery entry currently uses it — same relationship Media has to
// Product/Category/Person images (see server/src/models/Media.js). The
// bytes themselves live in this same MongoDB database via GridFS (see
// server/src/utils/videoStorage.js), not on disk (which would not survive
// Vercel's serverless functions having no persistent filesystem) and not on
// any third-party media service — `gridFsId` is the file's _id in the
// `videos.files` / `videos.chunks` GridFS collections, and `url` is the
// public streaming path (GET /video-uploads/:gridFsId) the admin/public
// player reads it back from.
const videoAssetSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 2000 },
    gridFsId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
    originalName: { type: String, trim: true, maxlength: 255, default: "" },
    mimeType: { type: String, trim: true, maxlength: 100, default: "" },
    size: { type: Number, min: 0, default: 0 },
    duration: { type: Number, default: null },
    thumbnail: { type: imageSchema, default: null }
  },
  { timestamps: true }
);

videoAssetSchema.index({ createdAt: -1 });

export default mongoose.model("VideoAsset", videoAssetSchema);
