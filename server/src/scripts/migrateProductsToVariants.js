// One-off migration for the Category -> Product(Type) -> Variant -> specs
// restructuring: earlier versions of this app stored SKU/composition/count/
// specs/applications/images directly on Product. Those fields are no longer
// part of the Product schema, but may still be present on existing documents
// in MongoDB. For each Product that has no Variant yet, this creates one
// "Default" Variant carrying that old data over, then strips the old fields
// off the Product document — nothing existing is lost, it just becomes
// editable at the new, more granular level.
//
// Safe to re-run: a Product that already has a Variant is not given a second
// one. Legacy-field cleanup ($unset) is a separate, always-attempted step —
// it must NOT be skipped just because a Variant already exists, otherwise a
// product whose Variant was created by an earlier partial/crashed run (but
// never had its stale fields cleaned up) stays stuck with leftover raw
// sku/composition/count/specs/images data sitting on the Product document
// forever (see migrateProductsToVariants.test.js for the regression test
// covering exactly that scenario). Run with: npm run migrate:variants
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Variant from "../models/Variant.js";

// `images` is deliberately NOT in this list. It used to be a legacy-only
// field, but Product now legitimately has its own `images` (see the
// "dynamic product-image synchronization" feature) — so its mere presence
// no longer proves a document is unmigrated. Detect legacy-ness only from
// fields that have NEVER had a valid meaning on the current Product schema;
// only once one of those is found do we also clear `images`, since a
// genuinely pre-migration document's `images` was written at the same time
// as its sku/composition/etc and means the same old thing. This prevents
// the cleanup step from ever touching a real, admin-assigned Type-level
// image on an already-migrated document (that bug shipped once — see
// migrateProductsToVariants.test.js for the regression test).
export const UNAMBIGUOUS_LEGACY_FIELDS = ["sku", "composition", "count", "specs", "applications", "yarnType"];
export const FIELDS_TO_UNSET = [...UNAMBIGUOUS_LEGACY_FIELDS, "images"];

export function hasLegacyFields(raw) {
  return UNAMBIGUOUS_LEGACY_FIELDS.some((f) => raw[f] !== undefined);
}

// Core per-document migration step, factored out of main() so it can be
// exercised directly in tests without spinning up the whole CLI script.
// `rawProducts` is the raw (schema-less) MongoDB collection handle — legacy
// fields aren't declared on the Product Mongoose schema anymore, so they're
// only reachable this way, not via the Product model.
export async function migrateOneProduct(raw, { rawProducts, Variant: VariantModel = Variant } = {}) {
  const existingVariant = await VariantModel.findOne({ product: raw._id });
  let variantCreated = false;

  if (!existingVariant) {
    const specs = Array.isArray(raw.specs) ? [...raw.specs] : [];
    const existingKeys = new Set(specs.map((s) => String(s.key).trim().toLowerCase()));
    function addSpecIfNew(key, value) {
      if (!value || existingKeys.has(key.toLowerCase())) return;
      specs.push({ key, value });
      existingKeys.add(key.toLowerCase());
    }
    addSpecIfNew("Composition", raw.composition);
    addSpecIfNew("Count range", raw.count);
    if (Array.isArray(raw.applications) && raw.applications.length) {
      addSpecIfNew("Application", raw.applications.join(", "));
    }

    const sku = raw.sku || `MIGRATED-${String(raw._id).slice(-8).toUpperCase()}`;

    await VariantModel.create({
      product: raw._id,
      name: "Default",
      sku,
      specs,
      images: Array.isArray(raw.images) ? raw.images : [],
      isActive: true
    });

    variantCreated = true;
  }

  // Always attempted, independent of whether a Variant was just created or
  // already existed — this is what a crashed/partial earlier run can leave
  // undone for a product that otherwise looks fully migrated.
  let fieldsCleaned = false;
  if (hasLegacyFields(raw)) {
    const unsetDoc = Object.fromEntries(FIELDS_TO_UNSET.map((f) => [f, ""]));
    await rawProducts.updateOne({ _id: raw._id }, { $unset: unsetDoc });
    fieldsCleaned = true;
  }

  return { variantCreated, variantAlreadyExisted: Boolean(existingVariant), fieldsCleaned };
}

async function main() {
  await connectDB();
  const rawProducts = mongoose.connection.db.collection("products");

  // Must drop this before the $unset updates below — otherwise multiple
  // documents ending up with sku: null (or missing) violate the old unique
  // index, which no longer matches the trimmed Product schema anyway.
  try {
    await rawProducts.dropIndex("sku_1");
    console.log("[migrate] Dropped stale Product sku_1 index.");
  } catch (err) {
    if (err.codeName !== "IndexNotFound") throw err;
  }

  const products = await rawProducts.find({}).toArray();
  let variantsCreated = 0;
  let variantsSkipped = 0;
  let fieldsCleaned = 0;

  for (const raw of products) {
    const result = await migrateOneProduct(raw, { rawProducts });
    if (result.variantCreated) variantsCreated += 1;
    if (result.variantAlreadyExisted) variantsSkipped += 1;
    if (result.fieldsCleaned) fieldsCleaned += 1;
  }

  console.log(
    `[migrate] Done. Created ${variantsCreated} Default variant(s), ${variantsSkipped} product(s) already had one. Cleaned stale legacy fields off ${fieldsCleaned} product document(s).`
  );
  await mongoose.disconnect();
  process.exit(0);
}

// Only run the CLI flow when this file is executed directly (`node
// migrateProductsToVariants.js`), not when migrateOneProduct is imported by
// the test suite.
if (process.argv[1] && process.argv[1].endsWith("migrateProductsToVariants.js")) {
  main().catch((err) => {
    console.error("[migrate] Failed:", err.message);
    process.exit(1);
  });
}
