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

const linkSchema = new mongoose.Schema(
  { label: { type: String, required: true, trim: true, maxlength: 80 }, href: { type: String, required: true, trim: true, maxlength: 500 } },
  { _id: false }
);

// Display order on the public site: main partner first, then co-partners,
// then everyone else; within a type, ascending `order`.
export const PERSON_TYPES = ["main-partner", "co-partner", "other"];
export const PERSON_TYPE_RANK = { "main-partner": 0, "co-partner": 1, other: 2 };

// The partners who always lead the roster, in this exact order (lowercased,
// single-spaced names). Anyone not listed follows by type rank, then `order`.
export const PINNED_PEOPLE = ["jignesh kakadiya", "laljibhai dhameliya"];

export function pinnedRank(name) {
  const i = PINNED_PEOPLE.indexOf(String(name || "").trim().replace(/\s+/g, " ").toLowerCase());
  return i === -1 ? PINNED_PEOPLE.length : i;
}

const personSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    designation: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: PERSON_TYPES, default: "other" },
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
