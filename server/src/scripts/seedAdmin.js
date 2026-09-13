// Creates (or updates the password of) the single admin account, from env
// vars — never hardcoded, never committed. Run with: npm run seed:admin
import "dotenv/config";
import mongoose from "mongoose";
import Admin from "../models/Admin.js";
import { connectDB } from "../config/db.js";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Admin";

  if (!email || !password) {
    console.error("[seed:admin] Set ADMIN_EMAIL and ADMIN_PASSWORD in your environment before running this script.");
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("[seed:admin] ADMIN_PASSWORD must be at least 10 characters.");
    process.exit(1);
  }

  await connectDB();

  let admin = await Admin.findOne({ email: email.trim().toLowerCase() });
  if (admin) {
    await admin.setPassword(password);
    admin.name = name;
    admin.loginAttempts = 0;
    admin.lockUntil = null;
    await admin.save();
    console.log(`[seed:admin] Updated password for existing admin: ${admin.email}`);
  } else {
    admin = new Admin({ email: email.trim().toLowerCase(), name });
    await admin.setPassword(password);
    await admin.save();
    console.log(`[seed:admin] Created admin: ${admin.email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed:admin] Failed:", err.message);
  process.exit(1);
});
