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
  const Enquiry = (await import("../models/Enquiry.js")).default;

  await Promise.all([
    Admin.deleteMany({ email: /^test-admin@/ }),
    Category.deleteMany({ slug: /^test-/ }),
    Product.deleteMany({ sku: /^TEST-/ }),
    Enquiry.deleteMany({ email: /^test-enquiry@/ })
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
  await t.test("creates a product", async () => {
    const r = await req("/api/products", {
      method: "POST",
      body: { sku: "TEST-SKU-1", name: "Test Product", category: categoryId, status: "active" }
    });
    assert.equal(r.status, 201);
    productId = r.data.data.product._id;
  });

  await t.test("rejects a duplicate SKU", async () => {
    const r = await req("/api/products", {
      method: "POST",
      body: { sku: "TEST-SKU-1", name: "Another Product", category: categoryId }
    });
    assert.equal(r.status, 409);
  });

  await t.test("public (logged-out) product list only returns active products", async () => {
    const draft = await req("/api/products", { method: "POST", body: { sku: "TEST-SKU-2", name: "Draft Product", category: categoryId, status: "draft" } });
    assert.equal(draft.status, 201);

    const savedCookie = cookie;
    cookie = ""; // simulate an anonymous visitor
    const r = await req(`/api/products?limit=50`);
    cookie = savedCookie;

    const skus = r.data.data.items.map((p) => p.sku);
    assert.ok(skus.includes("TEST-SKU-1"), "active product should be public");
    assert.ok(!skus.includes("TEST-SKU-2"), "draft product must not be public");
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
    Product.deleteMany({ sku: /^TEST-/ }),
    Enquiry.deleteMany({ email: /^test-enquiry@/ })
  ]);
  server.close();
});

test.after(async () => {
  if (dbAvailable) await mongoose.disconnect();
});
