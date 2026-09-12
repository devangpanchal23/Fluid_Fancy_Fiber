import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import enquiryRoutes from "./routes/enquiryRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

export const app = express();

// Required behind Vercel's proxy (and any reverse proxy) so express-rate-limit
// reads the real client IP from X-Forwarded-For instead of the proxy's IP.
app.set("trust proxy", 1);

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: "10kb" }));

const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." }
});

app.get("/api/health", (req, res) => res.json({ ok: true, service: "fluid-fibers-api" }));
app.use("/api/enquiries", enquiryLimiter, enquiryRoutes);

app.use(notFound);
app.use(errorHandler);
