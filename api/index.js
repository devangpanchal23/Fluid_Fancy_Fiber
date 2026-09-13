// Vercel serverless entry point. Wraps the same Express app used by
// server/src/server.js for local/traditional hosting — no route or
// business-logic duplication, just a different way to invoke it.
import { app } from "../server/src/app.js";
import { connectDB } from "../server/src/config/db.js";

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
  sendJSON(res, 503, { success: false, error: text, message: text });
}

export default async function handler(req, res) {
  if (process.env.MONGODB_URI) {
    try {
      await connectDB();
    } catch (err) {
      console.error("[api] MongoDB connection failed:", err.message);
      unavailable(res, "Database unavailable.");
      return;
    }
  } else if (req.url !== "/api/health") {
    // MONGODB_URI isn't configured yet — let health checks through but fail
    // fast (and clearly) for anything that needs the database.
    unavailable(res, "Backend is not fully configured: MONGODB_URI is not set.");
    return;
  }

  app(req, res);
}
