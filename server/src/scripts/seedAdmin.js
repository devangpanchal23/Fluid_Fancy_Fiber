// Creates (or updates the credentials of) the single admin account. Uses
// ADMIN_EMAIL / ADMIN_PASSWORD from the environment, falling back to the
// default login below. Run with: npm run seed:admin
// Point MONGODB_URI at the production database to apply it to the live site.
import "dotenv/config";
import mongoose from "mongoose";
import Admin from "../models/Admin.js";
import { connectDB } from "../config/db.js";

const DEFAULT_EMAIL = "admin@gmail.com";
const DEFAULT_PASSWORD = "admin123";

async function main() {
  const email = (process.env.ADMIN_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
  const name = process.env.ADMIN_NAME || "Admin";

  if (password.length < 8) {
    console.error("[seed:admin] ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  await connectDB();

  // Match on email first; otherwise reuse the one existing admin (so changing
  // the email updates that account instead of creating a second one).
  let admin = await Admin.findOne({ email });
  if (!admin) {
    const admins = await Admin.find().limit(2);
    if (admins.length === 1) admin = admins[0];
  }

  if (admin) {
    const previousEmail = admin.email;
    admin.email = email;
    await admin.setPassword(password);
    admin.name = name;
    admin.loginAttempts = 0;
    admin.lockUntil = null;
    await admin.save();
    const renamed = previousEmail !== email ? ` (was ${previousEmail})` : "";
    console.log(`[seed:admin] Updated existing admin: ${admin.email}${renamed}`);
  } else {
    admin = new Admin({ email, name });
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
