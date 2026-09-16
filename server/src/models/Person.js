import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  { url: { type: String, required: true, trim: true, maxlength: 2000 }, alt: { type: String, trim: true, maxlength: 200, default: "" } },
  { _id: false }
);

const linkSchema = new mongoose.Schema(
  { label: { type: String, required: true, trim: true, maxlength: 80 }, href: { type: String, required: true, trim: true, maxlength: 500 } },
  { _id: false }
);

const personSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    designation: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 40 },
    bio: { type: String, trim: true, maxlength: 1000 },
    image: { type: imageSchema, default: null },
    links: { type: [linkSchema], default: [] },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

personSchema.index({ isActive: 1, order: 1 });

export default mongoose.model("Person", personSchema);
