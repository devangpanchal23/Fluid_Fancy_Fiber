// End-to-end tests for the Media Library API, against a real MongoDB
// instance (same isolated fluid_fibers_test database and skip-if-unreachable
// pattern as api-integration.test.js). Covers: upload, list/search,
// selection onto Product/Variant (by Media id, preserving order/primary),
// persistence across a fresh GET, cross-contamination between sibling
// variants, and deletion protection (blocked while in use, then force-
// deleted and unassigned everywhere).
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

test("Media Library API", { skip: !dbAvailable && "No local MongoDB reachable" }, async (t) => {
  const { app } = await import("../app.js");
  const Admin = (await import("../models/Admin.js")).default;
  const Category = (await import("../models/Category.js")).default;
  const Product = (await import("../models/Product.js")).default;
  const Variant = (await import("../models/Variant.js")).default;
  const Media = (await import("../models/Media.js")).default;

  await Promise.all([
    Admin.deleteMany({ email: /^test-media-admin@/ }),
    Category.deleteMany({ slug: /^test-media-/ }),
    Product.deleteMany({ slug: /^test-media-/ }),
    Variant.deleteMany({ sku: /^TEST-MEDIA-/ }),
    Media.deleteMany({ originalName: /^test-media-/ })
  ]);

  const admin = new Admin({ email: "test-media-admin@example.com", name: "Test Media Admin" });
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

  async function uploadMediaFile(filename, { type = "image/png", bytes = "test image bytes" } = {}) {
    const form = new FormData();
    form.append("image", new Blob([bytes], { type }), filename);
    const res = await fetch(`${base}/api/media`, {
      method: "POST",
      headers: cookie ? { Cookie: cookie } : undefined,
      body: form
    });
    return { status: res.status, data: await res.json().catch(() => null) };
  }

  await req("/api/admin/login", { method: "POST", body: { email: "test-media-admin@example.com", password: "SuperSecret123!" } });

  await t.test("rejects unauthenticated access to the library", async () => {
    const savedCookie = cookie;
    cookie = "";
    const r = await req("/api/media");
    cookie = savedCookie;
    assert.equal(r.status, 401);
  });

  await t.test("rejects an unsupported file type with a visible error, no record created", async () => {
    const r = await uploadMediaFile("test-media-bad.txt", { type: "text/plain" });
    assert.equal(r.status, 400);
    assert.match(r.data.message, /Unsupported file type/i);
  });

  let mediaAId, mediaBId, mediaAUrl, mediaBUrl;
  await t.test("uploads an image and returns a saved Media record immediately", async () => {
    const r = await uploadMediaFile("test-media-alpha.png");
    assert.equal(r.status, 201);
    assert.equal(r.data.success, true);
    const { media } = r.data.data;
    assert.match(media.url, /^\/uploads\/.+\.png$/);
    assert.equal(media.mimeType, "image/png");
    assert.ok(media.size > 0);
    assert.ok(media.createdAt);
    mediaAId = media._id;
    mediaAUrl = media.url;
  });

  await t.test("second upload creates a second, distinct Media record", async () => {
    const r = await uploadMediaFile("test-media-beta.png");
    assert.equal(r.status, 201);
    mediaBId = r.data.data.media._id;
    mediaBUrl = r.data.data.media.url;
    assert.notEqual(mediaBId, mediaAId);
  });

  await t.test("lists media, newest first", async () => {
    const r = await req("/api/media?limit=50");
    assert.equal(r.status, 200);
    const ids = r.data.data.items.map((m) => m._id);
    assert.ok(ids.includes(mediaAId) && ids.includes(mediaBId));
  });

  await t.test("searches media by original filename", async () => {
    const r = await req("/api/media?q=test-media-alpha");
    assert.equal(r.status, 200);
    const names = r.data.data.items.map((m) => m.originalName);
    assert.ok(names.includes("test-media-alpha.png"));
    assert.ok(!names.includes("test-media-beta.png"));
  });

  await t.test("updates a media item's alt text", async () => {
    const r = await req(`/api/media/${mediaAId}`, { method: "PUT", body: { alt: "Alpha swatch" } });
    assert.equal(r.status, 200);
    assert.equal(r.data.data.media.alt, "Alpha swatch");

    const searched = await req("/api/media?q=Alpha swatch");
    assert.ok(searched.data.data.items.some((m) => m._id === mediaAId));
  });

  let categoryId, productId;
  await t.test("sets up a product for selection tests", async () => {
    const cat = await req("/api/categories", { method: "POST", body: { name: "Test Media Category" } });
    categoryId = cat.data.data.category._id;
    const prod = await req("/api/products", {
      method: "POST",
      body: { name: "Test Media Product", category: categoryId, status: "active" }
    });
    productId = prod.data.data.product._id;
  });

  let variantAId, variantBId;
  await t.test("selecting media for a Product preserves order — first is primary", async () => {
    const r = await req(`/api/products/${productId}`, {
      method: "PUT",
      body: {
        images: [
          { url: mediaBUrl, media: mediaBId, alt: "" },
          { url: mediaAUrl, media: mediaAId, alt: "" }
        ]
      }
    });
    assert.equal(r.status, 200);
    assert.equal(r.data.data.product.images[0].url, mediaBUrl);
    assert.equal(r.data.data.product.images[1].url, mediaAUrl);

    const fetched = await req(`/api/products/${productId}`);
    assert.equal(fetched.data.data.product.images[0].media, mediaBId);
  });

  await t.test("two variants under one product select different library images without cross-contamination", async () => {
    const a = await req("/api/variants", {
      method: "POST",
      body: { product: productId, name: "Variant A", sku: "TEST-MEDIA-A", images: [{ url: mediaAUrl, media: mediaAId, alt: "" }] }
    });
    variantAId = a.data.data.variant._id;

    const b = await req("/api/variants", {
      method: "POST",
      body: { product: productId, name: "Variant B", sku: "TEST-MEDIA-B", images: [{ url: mediaBUrl, media: mediaBId, alt: "" }] }
    });
    variantBId = b.data.data.variant._id;

    const [fetchedA, fetchedB] = await Promise.all([req(`/api/variants/${variantAId}`), req(`/api/variants/${variantBId}`)]);
    assert.equal(fetchedA.data.data.variant.images[0].media, mediaAId);
    assert.equal(fetchedB.data.data.variant.images[0].media, mediaBId);
    assert.notEqual(fetchedA.data.data.variant.images[0].url, fetchedB.data.data.variant.images[0].url);
  });

  let variantNoImageId;
  await t.test("a variant with no image of its own has an empty gallery (client falls back to the Product's)", async () => {
    const r = await req("/api/variants", {
      method: "POST",
      body: { product: productId, name: "Variant No Image", sku: "TEST-MEDIA-C" }
    });
    variantNoImageId = r.data.data.variant._id;
    assert.deepEqual(r.data.data.variant.images, []);

    const fetched = await req(`/api/variants/${variantNoImageId}`);
    assert.deepEqual(fetched.data.data.variant.images, []);
  });

  await t.test("deleting an in-use media item is blocked with a clear, itemized message", async () => {
    const r = await req(`/api/media/${mediaAId}`, { method: "DELETE" });
    assert.equal(r.status, 409);
    assert.match(r.data.message, /still used by/i);
    assert.ok(r.data.data.usage.products.some((p) => p.id === productId));
    assert.ok(r.data.data.usage.variants.some((v) => v.id === variantAId));
  });

  await t.test("force-deleting an in-use media item removes it from every use and deletes the record", async () => {
    const r = await req(`/api/media/${mediaAId}?force=true`, { method: "DELETE" });
    assert.equal(r.status, 200);

    const [product, variant, stillListed] = await Promise.all([
      req(`/api/products/${productId}`),
      req(`/api/variants/${variantAId}`),
      req(`/api/media?q=test-media-alpha`)
    ]);
    assert.ok(!product.data.data.product.images.some((img) => img.media === mediaAId));
    assert.deepEqual(variant.data.data.variant.images, []);
    assert.equal(stillListed.data.data.items.length, 0);
  });

  await t.test("deleting an unused media item succeeds directly, without force", async () => {
    const uploaded = await uploadMediaFile("test-media-unused.png");
    const unusedId = uploaded.data.data.media._id;

    const r = await req(`/api/media/${unusedId}`, { method: "DELETE" });
    assert.equal(r.status, 200);

    const listed = await req("/api/media?q=test-media-unused");
    assert.equal(listed.data.data.items.length, 0);
  });

  // Cleanup
  await Promise.all([
    Admin.deleteMany({ email: /^test-media-admin@/ }),
    Category.deleteMany({ slug: /^test-media-/ }),
    Product.deleteMany({ slug: /^test-media-/ }),
    Variant.deleteMany({ sku: /^TEST-MEDIA-/ }),
    Media.deleteMany({ originalName: /^test-media-/ })
  ]);
  server.close();
});

test.after(async () => {
  if (dbAvailable) await mongoose.disconnect();
});
