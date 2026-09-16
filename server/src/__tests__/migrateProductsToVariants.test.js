// Regression test for a real bug found while investigating a reported
// "images don't save" issue: an earlier version of migrateOneProduct's
// caller skipped legacy-field cleanup entirely whenever a Variant already
// existed for a Product — including when that Variant was created by an
// earlier, partial/crashed run of the same script. That left the Product
// document with stale raw `images` (and other legacy fields) sitting
// alongside the new schema's `images` field, which then silently resurfaced
// as if it were a real, admin-assigned Type-level image. This test
// reproduces exactly that scenario against a real MongoDB instance and
// asserts the fix: cleanup must run regardless of whether a Variant had to
// be created or already existed.
import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

const TEST_URI = process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017/fluid_fibers_test";
process.env.MONGODB_URI = TEST_URI;

let dbAvailable = true;
try {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 1500 });
  }
} catch {
  dbAvailable = false;
}

test(
  "migrateOneProduct cleans stale legacy fields even when a Variant already exists (crashed-run scenario)",
  { skip: !dbAvailable && "No local MongoDB reachable" },
  async (t) => {
    const { migrateOneProduct } = await import("../scripts/migrateProductsToVariants.js");
    const Product = (await import("../models/Product.js")).default;
    const Variant = (await import("../models/Variant.js")).default;
    const Category = (await import("../models/Category.js")).default;

    const rawProducts = mongoose.connection.db.collection("products");

    await Category.deleteMany({ slug: "test-migration-category" });
    const category = await Category.create({ name: "Test Migration Category", slug: "test-migration-category" });

    await t.test("case 1: no Variant yet — creates one AND cleans legacy fields in the same pass", async () => {
      const product = await Product.create({ slug: "test-migrate-fresh", name: "Test Migrate Fresh", category: category._id });
      // Simulate a document that still carries the old flat schema's fields —
      // Mongoose won't write these (not in the schema), so go around it via
      // the raw driver, exactly as a genuinely old, un-migrated document would.
      await rawProducts.updateOne(
        { _id: product._id },
        { $set: { sku: "OLD-SKU-1", composition: "100% Cotton", images: [{ url: "/uploads/legacy.jpg", alt: "" }] } }
      );
      const raw = await rawProducts.findOne({ _id: product._id });

      const result = await migrateOneProduct(raw, { rawProducts });
      assert.equal(result.variantCreated, true);
      assert.equal(result.variantAlreadyExisted, false);
      assert.equal(result.fieldsCleaned, true);

      const variant = await Variant.findOne({ product: product._id });
      assert.equal(variant.sku, "OLD-SKU-1");
      assert.equal(variant.images[0].url, "/uploads/legacy.jpg");

      const cleaned = await rawProducts.findOne({ _id: product._id });
      assert.equal(cleaned.sku, undefined, "legacy sku must be removed from the Product document");
      assert.equal(cleaned.images, undefined, "legacy images must be removed from the Product document");

      await Promise.all([product.deleteOne(), Variant.deleteMany({ product: product._id })]);
    });

    await t.test("case 2 (the actual bug): Variant already exists (crashed prior run), Product still has stale legacy fields — cleanup must still happen", async () => {
      const product = await Product.create({ slug: "test-migrate-crashed", name: "Test Migrate Crashed", category: category._id });
      await Variant.create({ product: product._id, name: "Default", sku: "OLD-SKU-2", images: [] });
      // The crashed run got as far as creating the Variant but never reached
      // the $unset for this document — leave the stale raw fields in place.
      await rawProducts.updateOne(
        { _id: product._id },
        { $set: { sku: "OLD-SKU-2", images: [{ url: "/uploads/leftover.jpg", alt: "" }] } }
      );
      const raw = await rawProducts.findOne({ _id: product._id });

      const result = await migrateOneProduct(raw, { rawProducts });
      assert.equal(result.variantCreated, false, "must not create a second Variant");
      assert.equal(result.variantAlreadyExisted, true);
      assert.equal(result.fieldsCleaned, true, "cleanup must run even though a Variant already existed — this was the bug");

      const variantCount = await Variant.countDocuments({ product: product._id });
      assert.equal(variantCount, 1, "no duplicate Variant should be created");

      const cleaned = await rawProducts.findOne({ _id: product._id });
      assert.equal(cleaned.images, undefined, "stale leftover images must be removed even in the already-has-a-variant case");

      // Confirms the exact symptom this bug caused: before the fix, the API
      // would have returned the stale leftover image here as if it were a
      // legitimate, admin-assigned Type-level image.
      const viaApi = await Product.findById(product._id);
      assert.deepEqual(viaApi.images, [], "Product.images must be empty, not the stale leftover value");

      await Promise.all([product.deleteOne(), Variant.deleteMany({ product: product._id })]);
    });

    await t.test("case 3 (a second real bug, found while fixing case 2): a document with NO legacy fields but a real, current-schema Product.images must never be touched", async () => {
      const product = await Product.create({
        slug: "test-migrate-real-image",
        name: "Test Migrate Real Image",
        category: category._id,
        images: [{ url: "/uploads/real-type-image.jpg", alt: "" }]
      });
      await Variant.create({ product: product._id, name: "Default", sku: "OLD-SKU-3", images: [] });
      const raw = await rawProducts.findOne({ _id: product._id });

      const result = await migrateOneProduct(raw, { rawProducts });
      assert.equal(result.fieldsCleaned, false, "a document with no legacy-only fields must not be touched at all");

      const stillThere = await Product.findById(product._id);
      assert.equal(
        stillThere.images[0].url,
        "/uploads/real-type-image.jpg",
        "a real, admin-assigned Type-level image must survive re-running the migration"
      );

      await Promise.all([product.deleteOne(), Variant.deleteMany({ product: product._id })]);
    });

    await Category.deleteMany({ slug: "test-migration-category" });
  }
);

test.after(async () => {
  if (dbAvailable) await mongoose.disconnect();
});
