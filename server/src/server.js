import "dotenv/config";
import mongoose from "mongoose";
import { app } from "./app.js";
import { connectDB, isDbConnected } from "./config/db.js";
import { ensurePortAvailable } from "./utils/portHelper.js";

const PORT = Number(process.env.PORT) || 5001;

// Permanent Crash Protection: Prevent uncaught exceptions/rejections from killing the process
process.on("uncaughtException", (err) => {
  console.error("[server] Uncaught Exception caught (process preserved):", err?.stack || err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[server] Unhandled Rejection at:", promise, "reason:", reason);
});

let server = null;
let reconnectTimer = null;

async function attemptDbConnection() {
  if (isDbConnected()) return;
  try {
    await connectDB();
    if (reconnectTimer) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    }
  } catch (err) {
    console.warn(`[server] MongoDB connection attempt failed (${err.message}). Retrying in background...`);
    if (!reconnectTimer) {
      reconnectTimer = setInterval(attemptDbConnection, 5000);
      reconnectTimer.unref(); // Do not block process exit
    }
  }
}

async function start() {
  // Free port 5000 from stale orphaned processes if in development
  await ensurePortAvailable(PORT);

  // Attempt initial DB connection (non-fatal if temporarily offline)
  await attemptDbConnection();

  server = app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `[server] Port ${PORT} is already in use by another application. Please check running processes or set a different PORT in server/.env.`
      );
    } else {
      console.error("[server] Server error:", err.message);
    }
  });
}

// Graceful shutdown: Cleanly close server and release port and DB sockets
async function handleShutdown(signal) {
  console.log(`\n[server] Received ${signal}. Gracefully shutting down...`);
  if (reconnectTimer) clearInterval(reconnectTimer);

  if (server) {
    server.close(() => {
      console.log("[server] HTTP listener closed.");
    });
  }

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
      console.log("[db] MongoDB connection closed.");
    }
  } catch (err) {
    console.warn("[db] Error closing MongoDB connection:", err.message);
  }

  process.exit(0);
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

// nodemon uses SIGUSR2 to restart
process.once("SIGUSR2", async () => {
  await handleShutdown("SIGUSR2");
  process.kill(process.pid, "SIGUSR2");
});

start();

