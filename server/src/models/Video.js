import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  { url: { type: String, required: true, trim: true, maxlength: 2000 }, alt: { type: String, trim: true, maxlength: 200, default: "" } },
  { _id: false }
);

// Video bytes live on Cloudinary (uploaded directly from the admin's
// browser via an unsigned preset — see client/src/admin/components/
// VideoUploader.jsx); we only ever store the resulting URL/public ID here.
const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 1000 },
    url: { type: String, required: true, trim: true, maxlength: 2000 },
    publicId: { type: String, required: true, trim: true, maxlength: 300 },
    thumbnail: { type: imageSchema, default: null },
    duration: { type: Number, default: null },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

videoSchema.index({ status: 1, order: 1 });

export default mongoose.model("Video", videoSchema);
