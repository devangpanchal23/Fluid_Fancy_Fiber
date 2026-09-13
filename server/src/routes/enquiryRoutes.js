import { Router } from "express";
import rateLimit from "express-rate-limit";
import { createEnquiry, listEnquiries, getEnquiry, updateEnquiry, deleteEnquiry } from "../controllers/enquiryController.js";
import { validateEnquiry } from "../middleware/validateEnquiry.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// Only throttles the public submission endpoint (spam protection) — must not
// apply to the admin-only routes below, which the dashboard/enquiry list
// call repeatedly during normal use.
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." }
});

router.post("/", submitLimiter, validateEnquiry, createEnquiry);

// Listing/managing submissions is admin-only — this was previously an open
// route with no authentication at all.
router.get("/", requireAdmin, listEnquiries);
router.get("/:id", requireAdmin, getEnquiry);
router.put("/:id", requireAdmin, updateEnquiry);
router.delete("/:id", requireAdmin, deleteEnquiry);

export default router;
