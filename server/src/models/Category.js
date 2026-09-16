import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 2000 },
    alt: { type: String, trim: true, maxlength: 200, default: "" },
    filename: { type: String, trim: true, maxlength: 255, default: "" },
    media: { type: mongoose.Schema.Types.ObjectId, ref: "Media", default: null }
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, trim: true, maxlength: 500 },
    image: { type: imageSchema, default: null },
    order: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Category", categorySchema);
