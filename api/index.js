// Vercel serverless entry point. Wraps the same Express app used by
// server/src/server.js for local/traditional hosting — no route or
// business-logic duplication, just a different way to invoke it.
import { app } from "../server/src/app.js";
import { connectDB } from "../server/src/config/db.js";
import { syncAdminCredentials } from "../server/src/utils/syncAdminCredentials.js";

let adminCredentialSync;

// Before the Express app has touched `res`, it's a plain Node ServerResponse
// (no .status()/.json() helpers) — use the raw Node API for early returns.
function sendJSON(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

// Two response-shape conventions coexist in this API (see server/src/app.js):
// the original public enquiry endpoints read `data.error`, everything added
// for the admin CMS reads `data.message`. This guard runs in front of both,
// so it sends both keys with the same text.
function unavailable(res, text) {
  sendJSON(res, 503, { success: false, code: "DATABASE_UNAVAILABLE", error: text, message: text });
}

export default async function handler(req, res) {
  const path = new URL(req.url, "https://internal.invalid").pathname;
  const knownApiPrefixes = [
    "/api/enquiries", "/api/admin", "/api/products", "/api/categories", "/api/people",
    "/api/uploads", "/api/media", "/api/variants", "/api/videos", "/api/video-assets", "/api/cone-library"
  ];
  const needsDatabase = knownApiPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  if (needsDatabase && process.env.MONGODB_URI) {
    try {
      await connectDB();
    } catch (err) {
      console.error("[api] MongoDB connection failed:", err.message);
      unavailable(res, "Database unavailable.");
      return;
    }
  } else if (needsDatabase) {
    // MONGODB_URI isn't configured yet — let health checks through but fail
    // fast (and clearly) for anything that needs the database.
    unavailable(res, "Backend is not fully configured: MONGODB_URI is not set.");
    return;
  }

  // Vercel instances are reused, so reconcile once per instance after its DB
  // connection is ready. A redeploy starts fresh instances with new env vars.
  if (needsDatabase && (process.env.ADMIN_EMAIL || process.env.ADMIN_PASSWORD)) {
    try {
      adminCredentialSync ||= syncAdminCredentials();
      await adminCredentialSync;
    } catch (err) {
      adminCredentialSync = null;
      console.error("[api] Admin credential sync failed:", err.message);
      unavailable(res, "Admin account configuration is invalid.");
      return;
    }
  }

  app(req, res);
}
