import mongoose from "mongoose";

// Cached across invocations so serverless cold starts reuse a warm connection
// instead of opening a new one per request.
let connectPromise = null;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env and configure it.");
  }

  if (!connectPromise) {
    mongoose.set("strictQuery", true);
    connectPromise = mongoose.connect(uri).then((conn) => {
      console.log("[db] connected to MongoDB");
      return conn;
    });
  }
  return connectPromise;
}
