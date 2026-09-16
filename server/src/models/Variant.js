import mongoose from "mongoose";

const specRowSchema = new mongoose.Schema(
  { key: { type: String, required: true, trim: true, maxlength: 80 }, value: { type: String, required: true, trim: true, maxlength: 200 } },
  { _id: false }
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 2000 },
    alt: { type: String, trim: true, maxlength: 200, default: "" },
    filename: { type: String, trim: true, maxlength: 255, default: "" },
    // See Product.js's imageSchema for why this is optional/nullable.
    media: { type: mongoose.Schema.Types.ObjectId, ref: "Media", default: null }
  },
  { _id: false }
);

// A Variant is a specific, sellable version of a Product/Type (e.g.
// "Cascatian" under the "Nylon" type) — it carries all the commercial
// detail. `specs` is intentionally free-form key/value pairs (Composition,
// Count Range, Application, Twist, Finish, ...) so an admin can add new
// specification fields without any code changes.
const variantSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 40 },
    specs: { type: [specRowSchema], default: [] },
    images: { type: [imageSchema], default: [] },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

variantSchema.index({ product: 1, order: 1 });

export default mongoose.model("Variant", variantSchema);
