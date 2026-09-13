import { verifyAdminToken } from "../utils/jwt.js";
import Admin from "../models/Admin.js";

const COOKIE_NAME = "ff_admin_token";
export { COOKIE_NAME };

// Attaches req.admin when a valid session cookie is present, but never
// rejects the request — used on routes that serve both the public site
// and the admin CMS (e.g. GET /api/products).
export async function attachAdminIfPresent(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return next();
    const payload = verifyAdminToken(token);
    const admin = await Admin.findById(payload.sub);
    if (admin) req.admin = admin;
  } catch {
    // Invalid/expired token on an optional-auth route — treat as anonymous.
  }
  next();
}

export async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ success: false, message: "Not authenticated." });
    }
    const payload = verifyAdminToken(token);
    const admin = await Admin.findById(payload.sub);
    if (!admin) {
      return res.status(401).json({ success: false, message: "Not authenticated." });
    }
    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
  }
}
