import mongoose from "mongoose";

const enquirySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["contact", "spec"],
      required: true,
      default: "contact"
    },
    name: { type: String, trim: true, maxlength: 120 },
    company: { type: String, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, required: true, maxlength: 200 },
    message: { type: String, trim: true, maxlength: 2000 },
    lineName: { type: String, trim: true, maxlength: 120 },
    status: {
      type: String,
      enum: ["new", "in_progress", "contacted", "closed", "archived"],
      default: "new"
    }
  },
  { timestamps: true }
);

enquirySchema.index({ createdAt: -1 });

export default mongoose.model("Enquiry", enquirySchema);
