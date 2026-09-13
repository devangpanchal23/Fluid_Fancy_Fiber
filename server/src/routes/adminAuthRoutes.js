import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, logout, me, changePassword } from "../controllers/adminAuthController.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again later." }
});

router.post("/login", loginLimiter, login);
router.post("/logout", requireAdmin, logout);
router.get("/me", requireAdmin, me);
router.put("/me/password", requireAdmin, changePassword);

export default router;
