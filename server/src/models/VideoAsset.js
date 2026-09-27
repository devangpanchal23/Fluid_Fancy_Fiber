import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  { url: { type: String, required: true, trim: true, maxlength: 2000 }, alt: { type: String, trim: true, maxlength: 200, default: "" } },
  { _id: false }
);

// Central library of every video ever uploaded, independent of which Video
// Gallery entry currently uses it — same relationship Media has to
// Product/Category/Person images (see server/src/models/Media.js). Unlike
// Media, the bytes themselves live on Cloudinary (uploaded directly from the
// admin's browser via an unsigned preset — see client/src/admin/utils/
// cloudinaryVideoUpload.js), so this record only ever stores the resulting
// url/publicId and light metadata, never the file itself.
const videoAssetSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 2000 },
    publicId: { type: String, required: true, trim: true, maxlength: 300, unique: true },
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
