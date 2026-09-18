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
    // The randomized name saveImage() generated (see imageStorage.js) —
    // doubles as the lookup key the /uploads/:filename route reads `data`
    // back by, and as the delete key.
    filename: { type: String, required: true, trim: true, maxlength: 255, unique: true },
    // The name the admin's browser sent, kept only for a friendlier library
    // listing ("product-hero.jpg" instead of a hex string).
    originalName: { type: String, trim: true, maxlength: 255, default: "" },
    alt: { type: String, trim: true, maxlength: 200, default: "" },
    mimeType: { type: String, required: true, trim: true, maxlength: 100 },
    size: { type: Number, required: true, min: 0 },
    // The actual image bytes, stored in MongoDB (not on disk) so an upload
    // survives Vercel's serverless functions, which have no persistent or
    // shared filesystem. Capped by the 5MB upload limit (middleware/upload.js),
    // well under MongoDB's 16MB document limit. `select: false` keeps normal
    // queries (list, product/category fetches) from pulling this in; the
    // toJSON transform below is a second guard against it ever leaking into
    // an API response — only the dedicated /uploads/:filename route reads it.
    data: { type: Buffer, required: true, select: false }
  },
  { timestamps: true }
);

mediaSchema.index({ createdAt: -1 });

mediaSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.data;
    return ret;
  }
});

export default mongoose.model("Media", mediaSchema);
