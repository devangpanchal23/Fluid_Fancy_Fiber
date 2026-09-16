import Enquiry from "../models/Enquiry.js";
import { sendEnquiryNotification } from "../utils/mailer.js";

const STATUSES = ["new", "in_progress", "contacted", "closed", "archived"];

// Public endpoint used by the contact form and spec-sheet modal.
// Response shape is intentionally NOT { success, data } — the existing
// client/src/api/enquiries.js already depends on { message, id } / { error }.
export async function createEnquiry(req, res, next) {
  try {
    const enquiry = await Enquiry.create(req.body);
    res.status(201).json({
      message:
        enquiry.type === "spec"
          ? "Sent. Check your inbox in the next few minutes."
          : "Enquiry logged. Our technical desk replies within one working day.",
      id: enquiry._id
    });
    // Fire-and-forget: the submission already succeeded and was saved above;
    // a slow or failed notification email must never affect the response
    // already sent to the visitor or leave an unhandled rejection.
    sendEnquiryNotification(enquiry).catch((mailErr) => {
      console.warn("[mailer] Background notification dispatch failed:", mailErr?.message || mailErr);
    });
  } catch (err) {
    next(err);
  }
}

// Everything below is admin-only (see routes/enquiryRoutes.js) and uses the
// { success, data } / { success: false, message } response convention.

export async function listEnquiries(req, res, next) {
  try {
    const { type, status, q, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (q && String(q).trim()) {
      const re = new RegExp(String(q).trim(), "i");
      filter.$or = [{ name: re }, { company: re }, { email: re }, { message: re }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const [items, total] = await Promise.all([
      Enquiry.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Enquiry.countDocuments(filter)
    ]);

    res.json({ success: true, data: { items, total, page: pageNum, pages: Math.max(1, Math.ceil(total / limitNum)) } });
  } catch (err) {
    next(err);
  }
}

export async function getEnquiry(req, res, next) {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) return res.status(404).json({ success: false, message: "Enquiry not found." });
    res.json({ success: true, data: { enquiry } });
  } catch (err) {
    next(err);
  }
}

export async function updateEnquiry(req, res, next) {
  try {
    const { status } = req.body || {};
    if (!status || !STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status." });
    }
    const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!enquiry) return res.status(404).json({ success: false, message: "Enquiry not found." });
    res.json({ success: true, data: { enquiry } });
  } catch (err) {
    next(err);
  }
}

export async function deleteEnquiry(req, res, next) {
  try {
    const enquiry = await Enquiry.findByIdAndDelete(req.params.id);
    if (!enquiry) return res.status(404).json({ success: false, message: "Enquiry not found." });
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
