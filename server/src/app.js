import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import enquiryRoutes from "./routes/enquiryRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import personRoutes from "./routes/personRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import variantRoutes from "./routes/variantRoutes.js";
import videoRoutes from "./routes/videoRoutes.js";
import videoAssetRoutes from "./routes/videoAssetRoutes.js";
import coneProductRoutes from "./routes/coneProductRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { connectDB, isDbConnected } from "./config/db.js";
import { serveImage } from "./controllers/uploadController.js";
import { streamVideo } from "./controllers/videoStreamController.js";

const configuredOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...configuredOrigins,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

export const app = express();

function requestOrigin(req) {
  const configuredSite = String(process.env.VITE_SITE_URL || "").trim();
  try {
    const parsed = new URL(configuredSite);
    if (parsed.protocol === "https:") return parsed.origin;
  } catch {
    // Use the validated request host when the optional canonical URL is unset.
  }
  const host = String(req.get("host") || "").toLowerCase();
  const safeHost = /^(?:[a-z0-9.-]+|\[[a-f\d:]+\])(?::\d{1,5})?$/.test(host) ? host : "localhost";
  const protocol = process.env.NODE_ENV === "production" ? "https" : req.protocol;
  return `${protocol}://${safeHost}`;
}

// Required behind Vercel's proxy (and any reverse proxy) so express-rate-limit
// reads the real client IP from X-Forwarded-For instead of the proxy's IP.
app.set("trust proxy", 1);

app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com",
      "frame-src https://drive.google.com https://www.google.com"
    ].join("; ")
  });
  if (process.env.NODE_ENV === "production") {
    res.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  next();
});

app.use("/api", (req, res, next) => {
  const sendJson = res.json.bind(res);
  res.json = (payload) => {
    if (res.statusCode < 400) return sendJson(payload);
    const codeByStatus = {
      400: "INVALID_REQUEST",
      401: "UNAUTHENTICATED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      413: "PAYLOAD_TOO_LARGE",
      429: "RATE_LIMITED",
      503: "SERVICE_UNAVAILABLE"
    };
    const message = typeof payload?.message === "string"
      ? payload.message
      : typeof payload?.error === "string"
        ? payload.error
        : "The request could not be completed. Please try again.";
    return sendJson({
      ...(payload && typeof payload === "object" ? payload : {}),
      success: false,
      code: payload?.code || codeByStatus[res.statusCode] || "REQUEST_FAILED",
      message,
      error: payload?.error || message
    });
  };
  next();
});

// credentials: true is required so the browser sends/receives the admin
// session cookie across origins in local dev (client :5173, server :5001).
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      try {
        new URL(origin);
      } catch {
        return callback(null, false);
      }
      if (
        allowedOrigins.has(origin) ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true
  })
);
app.use(requestLogger);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// Serves uploaded images out of MongoDB (see server/src/utils/imageStorage.js).
// Public — no requireAdmin — since these are the actual product/category/
// person photos rendered on the live site. On Vercel this path only reaches
// this Express app because vercel.json explicitly rewrites /uploads/(.*) to
// the /api function; without that rewrite it 404s against the static site.
app.get("/uploads/:filename", serveImage);

// Serves locally-uploaded videos out of MongoDB via GridFS (see
// server/src/utils/videoStorage.js) — same Vercel rewrite requirement as
// /uploads/:filename above (see vercel.json).
app.get("/video-uploads/:id", streamVideo);

app.get(["/api/robots.txt", "/robots.txt"], (req, res) => {
  res.type("text/plain").set("Cache-Control", "public, max-age=3600").send(
    `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: ${requestOrigin(req)}/sitemap.xml\n`
  );
});

app.get(["/api/sitemap.xml", "/sitemap.xml"], (req, res) => {
  const origin = requestOrigin(req);
  const urls = ["/", "/privacy", "/terms"];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
    .map((path) => `<url><loc>${origin}${path}</loc></url>`)
    .join("")}</urlset>`;
  res.type("application/xml").set("Cache-Control", "public, max-age=3600").send(xml);
});

app.get("/api/health", (req, res) => {
  const dbConnected = isDbConnected();
  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    code: dbConnected ? "OK" : "DATABASE_UNAVAILABLE",
    ok: dbConnected,
    service: "fluid-fibers-api",
    database: dbConnected ? "connected" : "disconnected"
  });
});

// Database resilience guard: if MongoDB is disconnected, try to connect;
// if still unavailable, return 503 instead of crashing or hanging the request.
app.use("/api", async (req, res, next) => {
  if (req.path === "/health") return next();
  const knownApiPath = [
    "/enquiries", "/admin", "/products", "/categories", "/people", "/uploads",
    "/media", "/variants", "/videos", "/video-assets", "/cone-library"
  ].some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`));
  if (!knownApiPath) return next();
  if (isDbConnected()) return next();
  try {
    await connectDB();
    next();
  } catch (err) {
    return next(Object.assign(new Error("Database unavailable"), { status: 503, cause: err }));
  }
});

// The enquiry-submission rate limit is applied inside enquiryRoutes.js, scoped
// to just the public POST route — it must not throttle the admin's own
// authenticated GET/PUT/DELETE calls on the same router.
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/admin", adminAuthRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/people", personRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/variants", variantRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/video-assets", videoAssetRoutes);
app.use("/api/cone-library", coneProductRoutes);

app.use(notFound);
app.use(errorHandler);
