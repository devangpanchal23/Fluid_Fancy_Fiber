import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  { url: { type: String, required: true, trim: true, maxlength: 2000 }, alt: { type: String, trim: true, maxlength: 200, default: "" } },
  { _id: false }
);

// A video's bytes either live on Cloudinary (uploaded from the admin's
// browser via an unsigned preset, or picked from the Video Library — see
// client/src/admin/utils/cloudinaryVideoUpload.js and VideoPicker.jsx) or
// stay wherever the admin pasted a URL from (e.g. Google Drive) — `source`
// tells the two apart, since only an "upload" has a Cloudinary `publicId`
// this server can delete. `embedType` tells the client how to render `url`:
// "native" plays directly in an HTML5 <video> tag, "iframe" (e.g. a Google
// Drive share link, converted to its /preview embed form) needs an <iframe>
// instead, since Drive doesn't serve raw playable video bytes from a share
// link. `videoAsset` links back to the Video Library entry this was picked
// from, if any, so deleting that entry can find every place it's still used.
const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 1000 },
    url: { type: String, required: true, trim: true, maxlength: 2000 },
    publicId: { type: String, trim: true, maxlength: 300, default: "" },
    source: { type: String, enum: ["upload", "url"], default: "upload" },
    embedType: { type: String, enum: ["native", "iframe"], default: "native" },
    videoAsset: { type: mongoose.Schema.Types.ObjectId, ref: "VideoAsset", default: null },
    thumbnail: { type: imageSchema, default: null },
    duration: { type: Number, default: null },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

videoSchema.index({ status: 1, order: 1 });

export default mongoose.model("Video", videoSchema);
