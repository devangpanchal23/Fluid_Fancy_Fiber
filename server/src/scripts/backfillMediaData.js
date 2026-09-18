// One-off backfill: images stored before imageStorage.js moved to storing
// bytes in MongoDB only ever wrote to local disk (server/uploads/<filename>),
// which Vercel's serverless functions can't persist — so every Media record
// created before this change has no `data`. This reads each missing file
// off local disk (by the record's own `filename`) and saves it onto the
// record. Skips (with a warning) any record whose file no longer exists
// locally — nothing to backfill it from.
// Run with: MONGODB_URI=<target> node server/src/scripts/backfillMediaData.js
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Media from "../models/Media.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

async function main() {
  await connectDB();

  const missing = await Media.find({}).select("+data");
  let backfilled = 0;
  let skipped = 0;

  for (const media of missing) {
    if (media.data && media.data.length) continue;
    try {
      const buffer = await fs.readFile(path.join(UPLOAD_DIR, media.filename));
      media.data = buffer;
      await media.save();
      backfilled += 1;
    } catch {
      console.warn(`[backfill:media] Skipping ${media.filename} (${media._id}) — file not found on local disk.`);
      skipped += 1;
    }
  }

  console.log(`[backfill:media] Done. Backfilled ${backfilled} record(s), skipped ${skipped}.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("[backfill:media] Failed:", err.message);
  process.exit(1);
});
