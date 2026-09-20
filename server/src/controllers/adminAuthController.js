import Admin from "../models/Admin.js";
import { signAdminToken, TOKEN_MAX_AGE_MS } from "../utils/jwt.js";
import { COOKIE_NAME } from "../middleware/auth.js";

export const MAX_ATTEMPTS = 5;
export const LOCK_MS = 15 * 60 * 1000;

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_MAX_AGE_MS,
    path: "/"
  };
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const admin = await Admin.findOne({ email: String(email).trim().toLowerCase() });
    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (admin.isLocked()) {
      const minutes = Math.ceil((admin.lockUntil.getTime() - Date.now()) / 60000);
      return res.status(423).json({ success: false, message: `Too many attempts. Try again in ${minutes} minute(s).` });
    }

    const valid = await admin.verifyPassword(password);
    if (!valid) {
      admin.loginAttempts = (admin.loginAttempts || 0) + 1;
      if (admin.loginAttempts >= MAX_ATTEMPTS) {
        admin.lockUntil = new Date(Date.now() + LOCK_MS);
        admin.loginAttempts = 0;
      }
      await admin.save();
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    admin.loginAttempts = 0;
    admin.lockUntil = null;
    admin.lastLoginAt = new Date();
    await admin.save();

    const token = signAdminToken(admin);
    res.cookie(COOKIE_NAME, token, cookieOptions());
    res.json({ success: true, data: { admin: admin.toJSON() } });
  } catch (err) {
    next(err);
  }
}

export function logout(req, res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: 0 });
  res.json({ success: true, data: null });
}

export function me(req, res) {
  res.json({ success: true, data: { admin: req.admin.toJSON() } });
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are required." });
    }
    if (String(newPassword).length < 10) {
      return res.status(400).json({ success: false, message: "New password must be at least 10 characters." });
    }
    const admin = req.admin;
    const valid = await admin.verifyPassword(currentPassword);
    if (!valid) {
      return res.status(401).json({ success: false, message: "Current password is incorrect." });
    }
    await admin.setPassword(newPassword);
    await admin.save();
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}
