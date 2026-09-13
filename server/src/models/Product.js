import mongoose from "mongoose";

const specRowSchema = new mongoose.Schema(
  { key: { type: String, required: true, trim: true, maxlength: 80 }, value: { type: String, required: true, trim: true, maxlength: 200 } },
  { _id: false }
);

const imageSchema = new mongoose.Schema(
  { url: { type: String, required: true, trim: true, maxlength: 2000 }, alt: { type: String, trim: true, maxlength: 200, default: "" } },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 40 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 160 },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    tag: { type: String, trim: true, maxlength: 120 },
    shortDescription: { type: String, trim: true, maxlength: 300 },
    description: { type: String, trim: true, maxlength: 4000 },
    yarnType: { type: String, trim: true, maxlength: 120 },
    composition: { type: String, trim: true, maxlength: 200 },
    count: { type: String, trim: true, maxlength: 80 },
    specs: { type: [specRowSchema], default: [] },
    features: { type: [String], default: [] },
    applications: { type: [String], default: [] },
    images: { type: [imageSchema], default: [] },
    status: { type: String, enum: ["draft", "active", "archived"], default: "draft", index: true },
    featured: { type: Boolean, default: false }
  },
  { timestamps: true }
);

productSchema.index({ name: "text", shortDescription: "text", description: "text", sku: "text" });
productSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("Product", productSchema);
