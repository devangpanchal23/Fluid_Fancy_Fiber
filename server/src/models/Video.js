import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  { url: { type: String, required: true, trim: true, maxlength: 2000 }, alt: { type: String, trim: true, maxlength: 200, default: "" } },
  { _id: false }
);

// A video's bytes either live in this database via GridFS (uploaded from
// the admin's browser, in small chunks — see server/src/utils/
// videoStorage.js and client/src/admin/utils/localVideoUpload.js — or
// picked from the Video Library, which is the same thing already uploaded)
// or stay on Google Drive, wherever the admin pasted a share link from —
// `source` tells the two apart. `embedType` tells the client how to render
// `url`: "native" plays directly in an HTML5 <video> tag (always paired
// with source "upload"), "iframe" needs an <iframe> instead, since Drive
// doesn't serve raw playable video bytes from a share link (always paired
// with source "drive"). `videoAsset` links back to the Video Library entry
// this was picked from, if any, so deleting that entry can find every place
// it's still used. `driveFileId` is kept alongside a "drive" url so the
// admin UI can always link back to the original Drive file (e.g. an "Open
// in Google Drive" fallback) without re-parsing the embed URL.
const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 1000 },
    url: { type: String, required: true, trim: true, maxlength: 2000 },
    source: { type: String, enum: ["upload", "drive"], default: "upload" },
    embedType: { type: String, enum: ["native", "iframe"], default: "native" },
    videoAsset: { type: mongoose.Schema.Types.ObjectId, ref: "VideoAsset", default: null },
    driveFileId: { type: String, trim: true, maxlength: 100, default: "" },
    thumbnail: { type: imageSchema, default: null },
    duration: { type: Number, default: null },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

videoSchema.index({ status: 1, order: 1 });

export default mongoose.model("Video", videoSchema);
