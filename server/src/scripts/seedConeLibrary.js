// One-off: loads the six Cone library cards that used to be hardcoded on the
// site into the cone_library_products collection, so the live grid isn't empty
// the moment it becomes database-driven. Does nothing if any product already
// exists, so it is safe to re-run. Run with: npm run seed:cone-library
//
// The cards point at the bundled photos by key ("mill" / "hero"), which the
// client resolves — re-pick them from the Media Library in the admin whenever
// you want real photography.
import "dotenv/config";
import mongoose from "mongoose";
import ConeProduct from "../models/ConeProduct.js";
import { connectDB } from "../config/db.js";

const CARDS = [
  { productName: "Mono 40s", productDetails: "P/40", image: "mill" },
  { productName: "Lino 30s", productDetails: "L/30", image: "hero" },
  { productName: "Cascet 24s", productDetails: "C/24", image: "mill" },
  { productName: "Slub 16s", productDetails: "S/16", image: "hero" },
  { productName: "Dyed cones", productDetails: "D/XX", image: "mill" },
  { productName: "Ready beam", productDetails: "B/220", image: "hero" }
];

async function main() {
  await connectDB();

  const existing = await ConeProduct.countDocuments();
  if (existing > 0) {
    console.log(`[seed:cone-library] ${existing} product(s) already exist — nothing to do.`);
  } else {
    await ConeProduct.insertMany(
      CARDS.map((c, i) => ({
        productName: c.productName,
        productDetails: c.productDetails,
        image: { url: c.image, alt: `${c.productName} yarn sample`, filename: "", media: null },
        order: i
      }))
    );
    console.log(`[seed:cone-library] Created ${CARDS.length} products.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed:cone-library] Failed:", err.message);
  process.exit(1);
});
