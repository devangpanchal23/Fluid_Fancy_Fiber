import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import enquiryRoutes from "./routes/enquiryRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

export const app = express();

// Required behind Vercel's proxy (and any reverse proxy) so express-rate-limit
// reads the real client IP from X-Forwarded-For instead of the proxy's IP.
app.set("trust proxy", 1);

// credentials: true is required so the browser sends/receives the admin
// session cookie across origins in local dev (client :5173, server :5000).
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ ok: true, service: "fluid-fibers-api" }));
// The enquiry-submission rate limit is applied inside enquiryRoutes.js, scoped
// to just the public POST route — it must not throttle the admin's own
// authenticated GET/PUT/DELETE calls on the same router.
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/admin", adminAuthRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);

app.use(notFound);
app.use(errorHandler);
