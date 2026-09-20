import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, logout, me, changePassword } from "../controllers/adminAuthController.js";
import { updateProfile, updatePassword } from "../controllers/adminProfileController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again later." }
});

// Profile endpoints re-check the current password, so they get their own
// brute-force limit on top of the per-account lockout.
const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.PROFILE_RATE_LIMIT) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." }
});

router.post("/login", loginLimiter, login);
router.post("/logout", requireAdmin, logout);
router.get("/me", requireAdmin, me);
router.put("/me/password", requireAdmin, changePassword);
router.put("/me/profile", requireAdmin, profileLimiter, updateProfile);
router.post("/me/change-password", requireAdmin, profileLimiter, updatePassword);

export default router;
