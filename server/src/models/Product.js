import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  { url: { type: String, required: true, trim: true, maxlength: 2000 }, alt: { type: String, trim: true, maxlength: 200, default: "" } },
  { _id: false }
);

// Category -> Product (Type/Material) -> Variant -> dynamic specs.
// This model is the "Type" level (e.g. "Polyester", "Nylon" under a "Mono
// Yarn" category) — commercial detail (SKU, composition, count range) lives
// per-Variant (see models/Variant.js), but a Type can still carry its own
// image/gallery: the public catalogue preview falls back to it when the
// selected Variant has no image of its own (see Catalogue.jsx).
const productSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 160 },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    tag: { type: String, trim: true, maxlength: 120 },
    shortDescription: { type: String, trim: true, maxlength: 300 },
    description: { type: String, trim: true, maxlength: 4000 },
    features: { type: [String], default: [] },
    images: { type: [imageSchema], default: [] },
    status: { type: String, enum: ["draft", "active", "archived"], default: "draft", index: true },
    featured: { type: Boolean, default: false },
    order: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

productSchema.index({ name: "text", shortDescription: "text", description: "text" });
productSchema.index({ status: 1, order: 1 });

export default mongoose.model("Product", productSchema);
