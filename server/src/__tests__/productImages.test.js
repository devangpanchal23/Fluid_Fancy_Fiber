// Regression coverage for the bug where product images uploaded through the
// admin panel silently stopped rendering on the live site: they were written
// to local disk, which Vercel's serverless functions can't persist across
// requests. This test proves the whole path a real page load exercises —
// upload an image, attach it to a product exactly like ProductImageUploader
// does, then re-fetch the product and follow its image url with a plain GET
// (no admin auth, as the public site would) and check the bytes it gets back
// actually match what was uploaded.
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

test("a product image, once attached, is publicly fetchable and byte-identical to what was uploaded", { skip: !dbAvailable && "No local MongoDB reachable" }, async (t) => {
  const { app } = await import("../app.js");
  const Admin = (await import("../models/Admin.js")).default;
  const Category = (await import("../models/Category.js")).default;
  const Product = (await import("../models/Product.js")).default;
  const Media = (await import("../models/Media.js")).default;

  await Promise.all([
    Admin.deleteMany({ email: /^test-prodimg-admin@/ }),
    Category.deleteMany({ slug: /^test-prodimg-/ }),
    Product.deleteMany({ slug: /^test-prodimg-/ }),
    Media.deleteMany({ originalName: /^test-prodimg-/ })
  ]);

  const admin = new Admin({ email: "test-prodimg-admin@example.com", name: "Test Product Image Admin" });
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

  await req("/api/admin/login", { method: "POST", body: { email: "test-prodimg-admin@example.com", password: "SuperSecret123!" } });

  const imageBytes = Buffer.from("this-is-not-a-real-jpeg-but-stands-in-for-one");

  let mediaUrl;
  await t.test("uploading an image to the Media Library persists its bytes", async () => {
    const form = new FormData();
    form.append("image", new Blob([imageBytes], { type: "image/jpeg" }), "test-prodimg-hero.jpg");
    const res = await fetch(`${base}/api/media`, { method: "POST", headers: cookie ? { Cookie: cookie } : undefined, body: form });
    const data = await res.json();
    assert.equal(res.status, 201);
    mediaUrl = data.data.media.url;
    assert.match(mediaUrl, /^\/uploads\/.+\.jpg$/);
  });

  let productId;
  await t.test("attaching that image to a new product", async () => {
    const cat = await req("/api/categories", { method: "POST", body: { name: "Test Prodimg Category" } });
    const categoryId = cat.data.data.category._id;

    const prod = await req("/api/products", {
      method: "POST",
      body: { name: "Test Prodimg Product", category: categoryId, status: "active", images: [{ url: mediaUrl, alt: "" }] }
    });
    assert.equal(prod.status, 201);
    productId = prod.data.data.product._id;
    assert.equal(prod.data.data.product.images[0].url, mediaUrl);
  });

  await t.test("the product's image url is publicly fetchable, without admin auth, with the right bytes", async () => {
    const fetched = await req(`/api/products/${productId}`);
    const publicImageUrl = fetched.data.data.product.images[0].url;

    // Deliberately drop the admin session cookie here — this is exactly what
    // an anonymous visitor's <img> tag on the live site does.
    const imgRes = await fetch(`${base}${publicImageUrl}`);
    assert.equal(imgRes.status, 200, "product image must load without any admin session");
    assert.equal(imgRes.headers.get("content-type"), "image/jpeg");

    const receivedBytes = Buffer.from(await imgRes.arrayBuffer());
    assert.deepEqual(receivedBytes, imageBytes, "bytes served back must match what was uploaded");
  });

  await t.test("an unknown filename 404s instead of serving nothing silently", async () => {
    const res = await fetch(`${base}/uploads/does-not-exist-at-all.jpg`);
    assert.equal(res.status, 404);
  });

  // Cleanup
  await Promise.all([
    Admin.deleteMany({ email: /^test-prodimg-admin@/ }),
    Category.deleteMany({ slug: /^test-prodimg-/ }),
    Product.deleteMany({ slug: /^test-prodimg-/ }),
    Media.deleteMany({ originalName: /^test-prodimg-/ })
  ]);
  server.close();
});

test.after(async () => {
  if (dbAvailable) await mongoose.disconnect();
});
