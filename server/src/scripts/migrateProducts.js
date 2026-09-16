// One-off migration: seeds Category + Product(Type) + Variant documents from
// the site's original static catalogue (client/src/data/content.js LINES) so
// MongoDB becomes the source of truth without losing any existing content.
// Safe to re-run: matches on Variant SKU and only creates what's missing.
// Run with: npm run migrate:products
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import Variant from "../models/Variant.js";
import { slugify } from "../utils/slugify.js";

// Mirrors client/src/data/content.js LINES — kept in sync manually since the
// two projects don't share a module graph. `image` matches a key in
// client/src/assets/images.js (resolved client-side, see resolveImage()).
const CATEGORY_NAME = "Yarn";

const LINES = [
  {
    sku: "MONO-40",
    name: "Mono Yarn",
    tag: "Premium synthetic",
    shortDescription: "Engineered for absolute uniformity and high tensile strength.",
    description:
      "Engineered for absolute uniformity and high tensile strength — built for technical textiles and fast processing speeds.",
    specs: [
      { key: "Composition", value: "100% Polyester" },
      { key: "Count range", value: "30s – 60s" },
      { key: "Application", value: "Warp & weft" }
    ],
    images: [{ url: "mill", alt: "Mono Yarn sample" }],
    featured: true
  },
  {
    sku: "LINO-30",
    name: "Lino Yarn",
    tag: "Natural blend",
    shortDescription: "Linen's breathability with added durability.",
    description:
      "Linen's breathability with added durability — a shirting and luxury-apparel workhorse that holds its hand after washing.",
    specs: [
      { key: "Composition", value: "Linen / viscose" },
      { key: "Count range", value: "20s – 40s" },
      { key: "Application", value: "Luxury shirting" }
    ],
    images: [{ url: "hero", alt: "Lino Yarn sample" }]
  },
  {
    sku: "CASCET-24",
    name: "Cascet Yarn",
    tag: "Specialty twist",
    shortDescription: "Core-spun construction giving elasticity under a natural sheath.",
    description:
      "Core-spun construction giving elasticity under a natural sheath, for stretch denim and comfort knits.",
    specs: [
      { key: "Composition", value: "Core-spun blend" },
      { key: "Count range", value: "16s – 32s" },
      { key: "Application", value: "Stretch denim" }
    ],
    images: [{ url: "mill", alt: "Cascet Yarn sample" }]
  },
  {
    sku: "SLUB-16",
    name: "Slub Yarn",
    tag: "Character count",
    shortDescription: "Controlled slub profiles programmed per metre.",
    description:
      "Controlled slub profiles programmed per metre, so the texture reads as intentional across the whole run.",
    specs: [
      { key: "Profile", value: "Programmed to brief" },
      { key: "Count range", value: "10s – 30s" },
      { key: "Application", value: "Fashion wovens" }
    ],
    images: [{ url: "hero", alt: "Slub Yarn sample" }]
  },
  {
    sku: "BEAM-220",
    name: "Ready Beam",
    tag: "Prepared warp",
    shortDescription: "Pre-warped beams to your loom's exact specification.",
    description:
      "Pre-warped beams to your loom's exact specification, cutting changeover time and beam-gaiting errors.",
    specs: [
      { key: "Width", value: "Up to 220 cm" },
      { key: "Ends", value: "Custom to order" },
      { key: "Delivery", value: "Direct to loom" }
    ],
    images: [{ url: "mill", alt: "Ready Beam sample" }]
  }
];

async function main() {
  await connectDB();

  let category = await Category.findOne({ slug: slugify(CATEGORY_NAME) });
  if (!category) {
    category = await Category.create({ name: CATEGORY_NAME, slug: slugify(CATEGORY_NAME), isActive: true });
    console.log(`[migrate] Created category: ${category.name}`);
  } else {
    console.log(`[migrate] Using existing category: ${category.name}`);
  }

  let created = 0;
  let skipped = 0;
  for (const line of LINES) {
    const existingVariant = await Variant.findOne({ sku: line.sku });
    if (existingVariant) {
      skipped += 1;
      continue;
    }

    let product = await Product.findOne({ slug: slugify(line.name), category: category._id });
    if (!product) {
      product = await Product.create({
        slug: slugify(line.name),
        name: line.name,
        category: category._id,
        tag: line.tag,
        shortDescription: line.shortDescription,
        description: line.description,
        status: "active",
        featured: Boolean(line.featured)
      });
    }

    await Variant.create({
      product: product._id,
      name: "Default",
      sku: line.sku,
      specs: line.specs,
      images: line.images,
      isActive: true
    });
    created += 1;
  }

  console.log(`[migrate] Done. Created ${created} variant(s), skipped ${skipped} (already existed).`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("[migrate] Failed:", err.message);
  process.exit(1);
});
