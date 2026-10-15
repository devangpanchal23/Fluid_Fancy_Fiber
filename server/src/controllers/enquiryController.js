import Enquiry from "../models/Enquiry.js";
import { sendEnquiryNotification, sendSpecSheetEmail } from "../utils/mailer.js";

const STATUSES = ["new", "in_progress", "contacted", "closed", "archived"];

function matchesEnquiry(enquiry, body) {
  return ["type", "name", "company", "email", "message", "lineName"]
    .every((field) => String(enquiry[field] || "") === String(body[field] || ""));
}

// Public endpoint used by the contact form and spec-sheet modal.
// Response shape is intentionally NOT { success, data } — the existing
// client/src/api/enquiries.js already depends on { message, id } / { error }.
export async function createEnquiry(req, res, next) {
  try {
    const idempotencyKey = req.get("Idempotency-Key");
    if (idempotencyKey && !/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(idempotencyKey)) {
      return res.status(400).json({ error: "Invalid request token. Please refresh and try again." });
    }

    let enquiry = idempotencyKey ? await Enquiry.findOne({ idempotencyKey }).select("+idempotencyKey") : null;
    if (enquiry) {
      if (!matchesEnquiry(enquiry, req.body)) return res.status(409).json({ error: "This request token was already used for different details. Please start a new request." });
    } else {
      try {
        enquiry = await Enquiry.create({
          ...req.body,
          idempotencyKey,
          brochureDeliveryStatus: req.body.type === "spec" ? "pending" : "not_required"
        });
      } catch (err) {
        if (err.code !== 11000 || !idempotencyKey) throw err;
        enquiry = await Enquiry.findOne({ idempotencyKey }).select("+idempotencyKey");
        if (!enquiry) throw err;
        if (!matchesEnquiry(enquiry, req.body)) return res.status(409).json({ error: "This request token was already used for different details. Please start a new request." });
      }
    }

    if (enquiry.type === "spec" && enquiry.brochureDeliveryStatus !== "sent") {
      try {
        await sendSpecSheetEmail(enquiry);
        enquiry.brochureDeliveryStatus = "sent";
        await enquiry.save();
      } catch (mailErr) {
        console.error("[mailer] Brochure delivery failed:", mailErr?.message || mailErr);
        enquiry.brochureDeliveryStatus = "failed";
        await enquiry.save();
        return res.status(503).json({ success: false, code: "EMAIL_DELIVERY_FAILED", error: "We could not email the brochure right now. Please try again shortly." });
      }
    }
    res.status(201).json({
      message:
        enquiry.type === "spec"
          ? "Sent. Check your inbox in the next few minutes."
          : "Enquiry logged. Our technical desk replies within one working day.",
      id: enquiry._id
    });
    // Team notification is fire-and-forget. Customer brochure delivery above
    // has already succeeded before we report success to the visitor.
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
      const safeQuery = [...String(q).trim()].map((character) => "\\.^$|?*+()[]{}".includes(character) ? "\\" + character : character).join("");
      const re = new RegExp(safeQuery, "i");
      filter.$or = [{ name: re }, { company: re }, { email: re }, { message: re }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const [items, total] = await Promise.all([
      Enquiry.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
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
