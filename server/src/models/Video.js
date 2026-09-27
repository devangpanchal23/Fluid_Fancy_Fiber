import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  { url: { type: String, required: true, trim: true, maxlength: 2000 }, alt: { type: String, trim: true, maxlength: 200, default: "" } },
  { _id: false }
);

// Content references a library asset or a validated external video URL.
const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 1000 },
    url: { type: String, required: true, trim: true, maxlength: 2000 },
    sourceType: { type: String, enum: ["direct", "drive", "library"], default: "direct" },
    videoMedia: { type: mongoose.Schema.Types.ObjectId, ref: "VideoMedia", default: null },
    publicId: { type: String, default: "", trim: true, maxlength: 300 },
    thumbnail: { type: imageSchema, default: null },
    duration: { type: Number, default: null },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true, optimisticConcurrency: true }
);

videoSchema.index({ status: 1, order: 1 });

export default mongoose.model("Video", videoSchema);
