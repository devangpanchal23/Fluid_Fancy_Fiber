import mongoose from "mongoose";

// Central library of every uploaded image, independent of what it is
// currently attached to. Product/Variant/Category/Person image subdocuments
// keep their own denormalized {url, alt} (so they always render even if a
// Media record is ever removed) but may additionally carry a `media` ref
// back to the record here — that's what lets the admin "Choose from
// library" flow attach the *same* file to several entities without
// re-uploading it, and what lets deletion here detect every place a file is
// still in use before removing it.
const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 2000 },
    // The randomized, disk-safe name saveImage() actually wrote (see
    // imageStorage.js) — needed to delete the underlying file later.
    filename: { type: String, required: true, trim: true, maxlength: 255 },
    // The name the admin's browser sent, kept only for a friendlier library
    // listing ("product-hero.jpg" instead of a hex string).
    originalName: { type: String, trim: true, maxlength: 255, default: "" },
    alt: { type: String, trim: true, maxlength: 200, default: "" },
    mimeType: { type: String, required: true, trim: true, maxlength: 100 },
    size: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
);

mediaSchema.index({ createdAt: -1 });

export default mongoose.model("Media", mediaSchema);
