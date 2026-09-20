import Admin from "../models/Admin.js";
import { COOKIE_NAME } from "../middleware/auth.js";
import { MAX_ATTEMPTS, LOCK_MS, cookieOptions } from "./adminAuthController.js";

// Self-service account settings. Every handler acts on `req.admin` — the
// account the session cookie belongs to — and never on an id from the request,
// so one admin can't edit another's record through these endpoints.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MIN = 2;
const NAME_MAX = 60;
// Matches the existing policy (seedAdmin / Settings page: at least 10 chars)
// plus a letter and a number. bcrypt only reads the first 72 bytes, so longer
// passwords would silently be truncated — refuse them instead.
const PASSWORD_MIN = 10;
const PASSWORD_MAX_BYTES = 72;

function fail(res, errors, status = 400, message = "Please fix the highlighted fields.") {
  return res.status(status).json({ success: false, message, errors });
}

export function passwordPolicyError(password) {
  if (typeof password !== "string" || password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (Buffer.byteLength(password) > PASSWORD_MAX_BYTES) return `Use at most ${PASSWORD_MAX_BYTES} characters.`;
  if (!/[A-Za-z]/.test(password)) return "Include at least one letter.";
  if (!/\d/.test(password)) return "Include at least one number.";
  return null;
}

// Re-authentication. A wrong guess counts toward the same lockout as the login
// form, so a hijacked session can't be used to brute-force the password here.
// Returns true when `password` is correct; otherwise sends the response and
// returns false.
async function reauthenticate(admin, password, res) {
  if (admin.isLocked()) {
    const minutes = Math.ceil((admin.lockUntil.getTime() - Date.now()) / 60000);
    fail(res, { currentPassword: `Too many attempts. Try again in ${minutes} minute(s).` }, 423, `Too many attempts. Try again in ${minutes} minute(s).`);
    return false;
  }
  if (typeof password !== "string" || !password || !(await admin.verifyPassword(password))) {
    admin.loginAttempts = (admin.loginAttempts || 0) + 1;
    if (admin.loginAttempts >= MAX_ATTEMPTS) {
      admin.lockUntil = new Date(Date.now() + LOCK_MS);
      admin.loginAttempts = 0;
    }
    await admin.save();
    fail(res, { currentPassword: "Current password is incorrect." });
    return false;
  }
  if (admin.loginAttempts) {
    admin.loginAttempts = 0;
    await admin.save();
  }
  return true;
}

export async function updateProfile(req, res, next) {
  try {
    const admin = req.admin;
    const body = req.body || {};
    const errors = {};

    // Either field may be sent alone (the page saves them separately); one that
    // is sent must be valid, one that is omitted is left as it is.
    const hasName = body.name !== undefined;
    const hasEmail = body.email !== undefined;
    if (!hasName && !hasEmail) return fail(res, { name: "Nothing to update." });

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (hasName && (name.length < NAME_MIN || name.length > NAME_MAX)) errors.name = `Username must be ${NAME_MIN}–${NAME_MAX} characters.`;

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (hasEmail && (!email || email.length > 254 || !EMAIL_RE.test(email))) errors.email = "Enter a valid email address.";

    if (Object.keys(errors).length) return fail(res, errors);

    const emailChanged = hasEmail && email !== admin.email;
    if (emailChanged) {
      // The email is the login identity, so changing it needs the current
      // password — a stolen session alone can't take the account over.
      if (!(await reauthenticate(admin, body.currentPassword, res))) return undefined;

      const taken = await Admin.exists({ email, _id: { $ne: admin._id } });
      if (taken) return fail(res, { email: "This email is already used by another account." }, 409);
      admin.email = email;
    }
    if (hasName) admin.name = name;

    try {
      await admin.save();
    } catch (err) {
      // Lost a race with another admin taking the address between check and save.
      if (err?.code === 11000) return fail(res, { email: "This email is already used by another account." }, 409);
      throw err;
    }
    res.json({ success: true, data: { admin: admin.toJSON() } });
  } catch (err) {
    next(err);
  }
}

export async function updatePassword(req, res, next) {
  try {
    const admin = req.admin;
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    const errors = {};

    if (typeof currentPassword !== "string" || !currentPassword) errors.currentPassword = "Enter your current password.";
    const policy = passwordPolicyError(newPassword);
    if (policy) errors.newPassword = policy;
    if (typeof confirmPassword !== "string" || confirmPassword !== newPassword) errors.confirmPassword = "Passwords do not match.";
    if (Object.keys(errors).length) return fail(res, errors);

    if (!(await reauthenticate(admin, currentPassword, res))) return undefined;

    if (await admin.verifyPassword(newPassword)) {
      return fail(res, { newPassword: "Choose a password different from your current one." });
    }

    await admin.setPassword(newPassword);
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    admin.loginAttempts = 0;
    admin.lockUntil = null;
    await admin.save();

    // End this session: drop the cookie, and the bumped tokenVersion makes
    // every token issued before now (on any device) fail requireAdmin.
    res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: 0 });
    res.json({ success: true, message: "Password changed. Please sign in again.", data: null });
  } catch (err) {
    next(err);
  }
}
