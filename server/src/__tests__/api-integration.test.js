// End-to-end API tests against a real MongoDB instance. Uses its own
// isolated database (fluid_fibers_test) so it never touches dev/prod data.
// Skips entirely if no local MongoDB is reachable, so `npm test` still
// passes in environments without a database (e.g. a fresh CI checkout).
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose from "mongoose";

const TEST_URI = process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017/fluid_fibers_test";
process.env.MONGODB_URI = TEST_URI;
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-thats-long-enough-1234567890";
process.env.NODE_ENV = "test";

let dbAvailable = true;
try {
  await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 1500 });
} catch {
  dbAvailable = false;
}

test("admin auth + product/category/enquiry APIs", { skip: !dbAvailable && "No local MongoDB reachable" }, async (t) => {
  const { app } = await import("../app.js");
  const Admin = (await import("../models/Admin.js")).default;
  const Category = (await import("../models/Category.js")).default;
  const Product = (await import("../models/Product.js")).default;
  const Variant = (await import("../models/Variant.js")).default;
  const Video = (await import("../models/Video.js")).default;
  const Enquiry = (await import("../models/Enquiry.js")).default;
  const Person = (await import("../models/Person.js")).default;

  // A stale unique index from before the Product/Variant split may still be
  // sitting on this test database from an earlier run against the old flat
  // schema — Product no longer has a sku field, so drop it if present.
  try {
    await mongoose.connection.db.collection("products").dropIndex("sku_1");
  } catch (err) {
    if (err.codeName !== "IndexNotFound" && err.codeName !== "NamespaceNotFound") throw err;
  }

  await Promise.all([
    Admin.deleteMany({ email: /^test-admin@/ }),
    Category.deleteMany({ slug: /^test-/ }),
    Product.deleteMany({ slug: /^test-/ }),
    Variant.deleteMany({ sku: /^TEST-/ }),
    Video.deleteMany({ title: /^Test Video/ }),
    Enquiry.deleteMany({ email: /^test-enquiry@/ }),
    Person.deleteMany({ name: /^Test Person/ })
  ]);

  const admin = new Admin({ email: "test-admin@example.com", name: "Test Admin" });
  await admin.setPassword("SuperSecret123!");
  await admin.save();

  const server = http.createServer(app).listen(0);
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  let cookie = "";
  async function req(path, { method = "GET", body } = {}) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  }

  await t.test("rejects unauthenticated access to protected routes", async () => {
    const r1 = await req("/api/admin/me");
    assert.equal(r1.status, 401);
    const r2 = await req("/api/enquiries");
    assert.equal(r2.status, 401);
  });

  await t.test("rejects invalid login", async () => {
    const r = await req("/api/admin/login", { method: "POST", body: { email: "test-admin@example.com", password: "wrong" } });
    assert.equal(r.status, 401);
  });

  await t.test("logs in with valid credentials and sets a session cookie", async () => {
    const r = await req("/api/admin/login", { method: "POST", body: { email: "test-admin@example.com", password: "SuperSecret123!" } });
    assert.equal(r.status, 200);
    assert.equal(r.data.success, true);
    assert.ok(cookie, "expected a session cookie to be set");
  });

  await t.test("authenticated /api/admin/me returns the admin", async () => {
    const r = await req("/api/admin/me");
    assert.equal(r.status, 200);
    assert.equal(r.data.data.admin.email, "test-admin@example.com");
  });

  let categoryId;
  await t.test("creates a category", async () => {
    const r = await req("/api/categories", { method: "POST", body: { name: "Test Category" } });
    assert.equal(r.status, 201);
    categoryId = r.data.data.category._id;
    assert.ok(categoryId);
  });

  let productId;
  await t.test("creates a product (Type) with its own image", async () => {
    const r = await req("/api/products", {
      method: "POST",
      body: { name: "Test Product", category: categoryId, status: "active", images: [{ url: "/uploads/test-type.jpg", alt: "" }] }
    });
    assert.equal(r.status, 201);
    productId = r.data.data.product._id;
    assert.equal(r.data.data.product.images[0].url, "/uploads/test-type.jpg");
  });

  await t.test("public (logged-out) product list only returns active products", async () => {
    const draft = await req("/api/products", { method: "POST", body: { name: "Test Draft Product", category: categoryId, status: "draft" } });
    assert.equal(draft.status, 201);

    const savedCookie = cookie;
    cookie = ""; // simulate an anonymous visitor
    const r = await req(`/api/products?limit=50`);
    cookie = savedCookie;

    const names = r.data.data.items.map((p) => p.name);
    assert.ok(names.includes("Test Product"), "active product should be public");
    assert.ok(!names.includes("Test Draft Product"), "draft product must not be public");
  });

  let variantId;
  await t.test("creates a variant under the product", async () => {
    const r = await req("/api/variants", {
      method: "POST",
      body: { product: productId, name: "Test Variant", sku: "TEST-SKU-1", specs: [{ key: "Composition", value: "100% Polyester" }] }
    });
    assert.equal(r.status, 201);
    variantId = r.data.data.variant._id;
    assert.ok(variantId);
  });

  await t.test("rejects a duplicate variant SKU", async () => {
    const r = await req("/api/variants", {
      method: "POST",
      body: { product: productId, name: "Another Variant", sku: "TEST-SKU-1" }
    });
    assert.equal(r.status, 409);
  });

  await t.test("updates a variant's image, and a fresh GET reflects it (persistence, not just the write response)", async () => {
    const update = await req(`/api/variants/${variantId}`, {
      method: "PUT",
      body: { product: productId, name: "Test Variant", sku: "TEST-SKU-1", images: [{ url: "/uploads/variant-a.jpg", alt: "" }] }
    });
    assert.equal(update.status, 200);
    assert.equal(update.data.data.variant.images[0].url, "/uploads/variant-a.jpg");

    const fetched = await req(`/api/variants/${variantId}`);
    assert.equal(fetched.status, 200);
    assert.equal(fetched.data.data.variant.images[0].url, "/uploads/variant-a.jpg");
  });

  await t.test("replacing a variant's image updates it (not appends/duplicates)", async () => {
    const r = await req(`/api/variants/${variantId}`, {
      method: "PUT",
      body: { product: productId, name: "Test Variant", sku: "TEST-SKU-1", images: [{ url: "/uploads/variant-b.jpg", alt: "" }] }
    });
    assert.equal(r.status, 200);
    assert.equal(r.data.data.variant.images.length, 1);
    assert.equal(r.data.data.variant.images[0].url, "/uploads/variant-b.jpg");
  });

  await t.test("deleting a variant's image clears it (falls back to the Type/Category image client-side)", async () => {
    const r = await req(`/api/variants/${variantId}`, {
      method: "PUT",
      body: { product: productId, name: "Test Variant", sku: "TEST-SKU-1", images: [] }
    });
    assert.equal(r.status, 200);
    assert.deepEqual(r.data.data.variant.images, []);
  });

  await t.test("two variants of the same product keep their own distinct images (no cross-contamination)", async () => {
    const other = await req("/api/variants", {
      method: "POST",
      body: { product: productId, name: "Sibling Variant", sku: "TEST-SKU-3", images: [{ url: "/uploads/sibling.jpg", alt: "" }] }
    });
    assert.equal(other.status, 201);
    const otherId = other.data.data.variant._id;

    await req(`/api/variants/${variantId}`, {
      method: "PUT",
      body: { product: productId, name: "Test Variant", sku: "TEST-SKU-1", images: [{ url: "/uploads/first.jpg", alt: "" }] }
    });

    const [a, b] = await Promise.all([req(`/api/variants/${variantId}`), req(`/api/variants/${otherId}`)]);
    assert.equal(a.data.data.variant.images[0].url, "/uploads/first.jpg");
    assert.equal(b.data.data.variant.images[0].url, "/uploads/sibling.jpg");
  });

  await t.test("updates a product (Type)'s image", async () => {
    const update = await req(`/api/products/${productId}`, { method: "PUT", body: { images: [{ url: "/uploads/type-updated.jpg", alt: "" }] } });
    assert.equal(update.status, 200);

    const fetched = await req(`/api/products/${productId}`);
    assert.equal(fetched.data.data.product.images[0].url, "/uploads/type-updated.jpg");
  });

  await t.test("deleting a product (Type)'s image clears it", async () => {
    const r = await req(`/api/products/${productId}`, { method: "PUT", body: { images: [] } });
    assert.equal(r.status, 200);
    assert.deepEqual(r.data.data.product.images, []);
  });

  await t.test("public (logged-out) variant list only returns active variants", async () => {
    const inactive = await req("/api/variants", {
      method: "POST",
      body: { product: productId, name: "Inactive Variant", sku: "TEST-SKU-2", isActive: false }
    });
    assert.equal(inactive.status, 201);

    const savedCookie = cookie;
    cookie = "";
    const r = await req(`/api/variants?product=${productId}`);
    cookie = savedCookie;

    const names = r.data.data.items.map((v) => v.name);
    assert.ok(names.includes("Test Variant"), "active variant should be public");
    assert.ok(!names.includes("Inactive Variant"), "inactive variant must not be public");
  });

  await t.test("prevents deleting a category still in use", async () => {
    const r = await req(`/api/categories/${categoryId}`, { method: "DELETE" });
    assert.equal(r.status, 409);
  });

  await t.test("archives (soft-deletes) a product", async () => {
    const r = await req(`/api/products/${productId}`, { method: "DELETE" });
    assert.equal(r.status, 200);
    assert.equal(r.data.data.product.status, "archived");
  });

  await t.test("public enquiry submission works without auth", async () => {
    const savedCookie = cookie;
    cookie = "";
    const r = await req("/api/enquiries", { method: "POST", body: { type: "contact", name: "T", company: "C", email: "test-enquiry@example.com", message: "hi" } });
    cookie = savedCookie;
    assert.equal(r.status, 201);
  });

  await t.test("admin can list and update enquiry status", async () => {
    const list = await req("/api/enquiries?limit=50");
    assert.equal(list.status, 200);
    const found = list.data.data.items.find((e) => e.email === "test-enquiry@example.com");
    assert.ok(found);

    const update = await req(`/api/enquiries/${found._id}`, { method: "PUT", body: { status: "contacted" } });
    assert.equal(update.status, 200);
    assert.equal(update.data.data.enquiry.status, "contacted");
  });

  let personId;
  await t.test("creates a person", async () => {
    const r = await req("/api/people", { method: "POST", body: { name: "Test Person", designation: "Tester" } });
    assert.equal(r.status, 201);
    personId = r.data.data.person._id;
    assert.ok(personId);
  });

  await t.test("public (logged-out) people list only returns active people", async () => {
    const inactive = await req("/api/people", { method: "POST", body: { name: "Test Person Inactive", designation: "Tester", isActive: false } });
    assert.equal(inactive.status, 201);

    const savedCookie = cookie;
    cookie = "";
    const r = await req(`/api/people?limit=50`);
    cookie = savedCookie;

    const names = r.data.data.items.map((p) => p.name);
    assert.ok(names.includes("Test Person"), "active person should be public");
    assert.ok(!names.includes("Test Person Inactive"), "inactive person must not be public");
  });

  await t.test("updates a person", async () => {
    const r = await req(`/api/people/${personId}`, { method: "PUT", body: { designation: "Senior Tester" } });
    assert.equal(r.status, 200);
    assert.equal(r.data.data.person.designation, "Senior Tester");
  });

  await t.test("deletes a person", async () => {
    const r = await req(`/api/people/${personId}`, { method: "DELETE" });
    assert.equal(r.status, 200);
    const list = await req("/api/people?limit=50");
    assert.ok(!list.data.data.items.some((p) => p._id === personId));
  });

  let videoId;
  await t.test("creates a video (metadata only — no real Cloudinary upload in tests)", async () => {
    const r = await req("/api/videos", {
      method: "POST",
      body: { title: "Test Video", url: "https://res.cloudinary.com/demo/video/upload/test.mp4", publicId: "test-video-public-id" }
    });
    assert.equal(r.status, 201);
    videoId = r.data.data.video._id;
    assert.equal(r.data.data.video.status, "draft");
  });

  await t.test("public (logged-out) video list only returns published videos", async () => {
    const savedCookie = cookie;
    cookie = "";
    const r = await req("/api/videos");
    cookie = savedCookie;
    assert.ok(!r.data.data.items.some((v) => v._id === videoId), "draft video must not be public");
  });

  await t.test("publishing a video makes it public", async () => {
    const update = await req(`/api/videos/${videoId}`, { method: "PUT", body: { status: "published" } });
    assert.equal(update.status, 200);
    assert.equal(update.data.data.video.status, "published");

    const savedCookie = cookie;
    cookie = "";
    const r = await req("/api/videos");
    cookie = savedCookie;
    assert.ok(r.data.data.items.some((v) => v._id === videoId), "published video should be public");
  });

  await t.test("deletes a video (Cloudinary deletion best-effort without credentials)", async () => {
    const r = await req(`/api/videos/${videoId}`, { method: "DELETE" });
    assert.equal(r.status, 200);
    const list = await req("/api/videos?limit=50");
    assert.ok(!list.data.data.items.some((v) => v._id === videoId));
  });

  await t.test("logout clears the session", async () => {
    await req("/api/admin/logout", { method: "POST" });
    cookie = "";
    const r = await req("/api/admin/me");
    assert.equal(r.status, 401);
  });

  // Cleanup
  await Promise.all([
    Admin.deleteMany({ email: /^test-admin@/ }),
    Category.deleteMany({ slug: /^test-/ }),
    Product.deleteMany({ slug: /^test-/ }),
    Variant.deleteMany({ sku: /^TEST-/ }),
    Video.deleteMany({ title: /^Test Video/ }),
    Enquiry.deleteMany({ email: /^test-enquiry@/ }),
    Person.deleteMany({ name: /^Test Person/ })
  ]);
  server.close();
});

test.after(async () => {
  if (dbAvailable) await mongoose.disconnect();
});
