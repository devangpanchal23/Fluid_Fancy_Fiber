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
import coneProductRoutes from "./routes/coneProductRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { connectDB, isDbConnected } from "./config/db.js";
import { serveImage } from "./controllers/uploadController.js";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

export const app = express();

// Required behind Vercel's proxy (and any reverse proxy) so express-rate-limit
// reads the real client IP from X-Forwarded-For instead of the proxy's IP.
app.set("trust proxy", 1);

// credentials: true is required so the browser sends/receives the admin
// session cookie across origins in local dev (client :5173, server :5000).
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(requestLogger);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// Serves uploaded images out of MongoDB (see server/src/utils/imageStorage.js).
// Public — no requireAdmin — since these are the actual product/category/
// person photos rendered on the live site. On Vercel this path only reaches
// this Express app because vercel.json explicitly rewrites /uploads/(.*) to
// the /api function; without that rewrite it 404s against the static site.
app.get("/uploads/:filename", serveImage);

app.get("/api/health", (req, res) => {
  const dbConnected = isDbConnected();
  res.json({
    ok: true,
    service: "fluid-fibers-api",
    database: dbConnected ? "connected" : "disconnected"
  });
});

// Database resilience guard: if MongoDB is disconnected, try to connect;
// if still unavailable, return 503 instead of crashing or hanging the request.
app.use("/api", async (req, res, next) => {
  if (req.path === "/health") return next();
  if (isDbConnected()) return next();
  try {
    await connectDB();
    next();
  } catch {
    return res.status(503).json({
      success: false,
      error: "Database temporarily unavailable. Please retry in a moment.",
      message: "Database temporarily unavailable. Please retry in a moment."
    });
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
app.use("/api/cone-library", coneProductRoutes);

app.use(notFound);
app.use(errorHandler);
