import mongoose from "mongoose";

// Cached across invocations so serverless cold starts reuse a warm connection
// instead of opening a new one per request.
let connectPromise = null;
let listenersRegistered = false;

function setupListeners() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on("error", (err) => {
    console.error("[db] MongoDB connection error:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[db] MongoDB disconnected. State readyState:", mongoose.connection.readyState);
    connectPromise = null;
  });

  mongoose.connection.on("reconnected", () => {
    console.log("[db] MongoDB reconnected successfully.");
  });
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env and configure it.");
  }

  setupListeners();

  if (!connectPromise) {
    mongoose.set("strictQuery", true);
    connectPromise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 5000
      })
      .then((conn) => {
        console.log("[db] connected to MongoDB");
        return conn;
      })
      .catch((err) => {
        console.error("[db] MongoDB initial connection failed:", err.message);
        connectPromise = null; // Clear so subsequent calls can retry
        throw err;
      });
  }

  return connectPromise;
}

