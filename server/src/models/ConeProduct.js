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

export const CONE_NAME_MAX = 120;
export const CONE_DETAILS_MAX = 120;

// One card in the public "Cone library" grid. `image` references the Media
// Library (same `{ url, media }` shape as Person/Category images); `order`
// is the admin-controlled position on the live site (ascending).
const coneProductSchema = new mongoose.Schema(
  {
    image: { type: imageSchema, default: null },
    productName: { type: String, required: true, trim: true, maxlength: CONE_NAME_MAX },
    productDetails: { type: String, required: true, trim: true, maxlength: CONE_DETAILS_MAX },
    order: { type: Number, default: 0 }
  },
  { timestamps: true, collection: "cone_library_products" }
);

coneProductSchema.index({ order: 1, createdAt: 1 });

export default mongoose.model("ConeProduct", coneProductSchema);
