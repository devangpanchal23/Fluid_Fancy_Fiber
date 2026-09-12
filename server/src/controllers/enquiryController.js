import Enquiry from "../models/Enquiry.js";

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
  } catch (err) {
    next(err);
  }
}

export async function listEnquiries(req, res, next) {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const [items, total] = await Promise.all([
      Enquiry.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Enquiry.countDocuments(filter)
    ]);

    res.json({ items, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
}
