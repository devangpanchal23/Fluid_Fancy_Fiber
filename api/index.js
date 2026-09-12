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

export default async function handler(req, res) {
  if (process.env.MONGODB_URI) {
    try {
      await connectDB();
    } catch (err) {
      console.error("[api] MongoDB connection failed:", err.message);
      sendJSON(res, 503, { error: "Database unavailable." });
      return;
    }
  } else if (req.url !== "/api/health") {
    // MONGODB_URI isn't configured yet — let health checks through but fail
    // fast (and clearly) for anything that needs the database.
    sendJSON(res, 503, { error: "Backend is not fully configured: MONGODB_URI is not set." });
    return;
  }

  app(req, res);
}
