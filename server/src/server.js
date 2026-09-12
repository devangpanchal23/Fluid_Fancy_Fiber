import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db.js";
import enquiryRoutes from "./routes/enquiryRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

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

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`));
  } catch (err) {
    console.error("[server] failed to start:", err.message);
    process.exit(1);
  }
}

start();
