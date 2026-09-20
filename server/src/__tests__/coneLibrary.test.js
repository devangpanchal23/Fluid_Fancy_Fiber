// End-to-end coverage for the Cone library CRUD: what the admin saves must be
// exactly what an anonymous visitor's GET /api/cone-library returns, in the
// admin-chosen order, with an image that loads; all three fields are mandatory;
// and a library image in use by a product can't be deleted by accident.
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

test("Cone library: admin CRUD is mirrored exactly on the public list", { skip: !dbAvailable && "No local MongoDB reachable" }, async (t) => {
  const { app } = await import("../app.js");
  const Admin = (await import("../models/Admin.js")).default;
  const ConeProduct = (await import("../models/ConeProduct.js")).default;
  const Media = (await import("../models/Media.js")).default;

  const cleanup = () =>
    Promise.all([
      Admin.deleteMany({ email: /^test-cone-admin@/ }),
      ConeProduct.deleteMany({ productName: /^TC / }),
      Media.deleteMany({ originalName: /^test-cone-/ })
    ]);
  await cleanup();

  const admin = new Admin({ email: "test-cone-admin@example.com", name: "Test Cone Admin" });
  await admin.setPassword("SuperSecret123!");
  await admin.save();

  const server = http.createServer(app).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;

  let cookie = "";
  async function req(path, { method = "GET", body, anon = false } = {}) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(!anon && cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    return { status: res.status, headers: res.headers, data: await res.json().catch(() => null) };
  }

  const mine = (items) => items.filter((p) => /^TC /.test(p.productName));
  const publicList = async () => mine((await req("/api/cone-library", { anon: true })).data.data.items);
  const adminList = async () => mine((await req("/api/cone-library")).data.data.items);

  // Uploads through the same endpoint the Media Library uses; returns the image ref a form would send.
  async function uploadImage(name, bytes) {
    const form = new FormData();
    form.append("image", new Blob([bytes], { type: "image/png" }), name);
    const res = await fetch(`${base}/api/media`, { method: "POST", headers: { Cookie: cookie }, body: form });
    const { media } = (await res.json()).data;
    return { url: media.url, alt: "", filename: media.filename, media: media._id };
  }

  await req("/api/admin/login", { method: "POST", body: { email: "test-cone-admin@example.com", password: "SuperSecret123!" } });

  const ids = {};
  const media = {};
  try {
    await t.test("the admin API is closed to logged-out visitors, but the list is public", async () => {
      const body = { productName: "TC Anon", productDetails: "X/1", image: { url: "https://example.com/a.png" } };
      assert.equal((await req("/api/cone-library", { method: "POST", body, anon: true })).status, 401);
      assert.equal((await req("/api/cone-library", { anon: true })).status, 200);
      assert.match((await req("/api/cone-library", { anon: true })).headers.get("cache-control"), /no-store/);
    });

    await t.test("all three fields are mandatory — nothing is saved when one is missing", async () => {
      const image = await uploadImage("test-cone-a.png", "a");
      const good = { productName: "TC Bad", productDetails: "B/1", image };

      const noName = await req("/api/cone-library", { method: "POST", body: { ...good, productName: "  " } });
      assert.equal(noName.status, 400);
      assert.ok(noName.data.errors.productName);

      const noDetails = await req("/api/cone-library", { method: "POST", body: { ...good, productDetails: undefined } });
      assert.equal(noDetails.status, 400);
      assert.ok(noDetails.data.errors.productDetails);

      const noImage = await req("/api/cone-library", { method: "POST", body: { ...good, image: null } });
      assert.equal(noImage.status, 400);
      assert.ok(noImage.data.errors.image);

      const ghost = await req("/api/cone-library", {
        method: "POST",
        body: { ...good, image: { url: "/uploads/ffffffffffffffffffffffffffffffff.png" } }
      });
      assert.equal(ghost.status, 400, "an /uploads/ url with no stored file must be refused");

      const all = await req("/api/cone-library", { method: "POST", body: { ...good, productName: "", productDetails: "", image: null } });
      assert.deepEqual(Object.keys(all.data.errors).sort(), ["image", "productDetails", "productName"]);

      assert.equal((await adminList()).length, 0, "no broken record may have been saved");
    });

    await t.test("creates products with library images — the public list shows them in creation order", async () => {
      for (const [key, name, details] of [["one", "TC One", "O/1"], ["two", "TC Two", "T/2"], ["three", "TC Three", "T/3"]]) {
        media[key] = await uploadImage(`test-cone-${key}.png`, `bytes-${key}`);
        const r = await req("/api/cone-library", { method: "POST", body: { productName: name, productDetails: details, image: media[key] } });
        assert.equal(r.status, 201);
        ids[key] = r.data.data.product._id;
      }
      const pub = await publicList();
      assert.deepEqual(pub.map((p) => [p.productName, p.productDetails]), [["TC One", "O/1"], ["TC Two", "T/2"], ["TC Three", "T/3"]]);
      for (const p of pub) {
        const img = await fetch(`${base}${p.image.url}`);
        assert.equal(img.status, 200, `image for ${p.productName} must load`);
        assert.match(img.headers.get("content-type"), /^image\//);
      }
      assert.deepEqual((await adminList()).map((p) => p.productName), pub.map((p) => p.productName), "admin and public agree");
    });

    await t.test("reordering moves a product one place and the public list follows", async () => {
      await req(`/api/cone-library/${ids.three}/reorder`, { method: "PUT", body: { direction: "up" } });
      assert.deepEqual((await publicList()).map((p) => p.productName), ["TC One", "TC Three", "TC Two"]);

      await req(`/api/cone-library/${ids.three}/reorder`, { method: "PUT", body: { direction: "up" } });
      await req(`/api/cone-library/${ids.three}/reorder`, { method: "PUT", body: { direction: "up" } });
      assert.deepEqual((await publicList()).map((p) => p.productName), ["TC Three", "TC One", "TC Two"], "already first: stays put");

      const bad = await req(`/api/cone-library/${ids.one}/reorder`, { method: "PUT", body: { direction: "sideways" } });
      assert.equal(bad.status, 400);
    });

    await t.test("updates name, details and image — blanking a field is refused", async () => {
      media.swap = await uploadImage("test-cone-swap.png", "bytes-swap");
      const r = await req(`/api/cone-library/${ids.one}`, {
        method: "PUT",
        body: { productName: "TC One Edited", productDetails: "O/99", image: media.swap }
      });
      assert.equal(r.status, 200);
      const edited = (await publicList()).find((p) => p._id === ids.one);
      assert.equal(edited.productName, "TC One Edited");
      assert.equal(edited.productDetails, "O/99");
      assert.equal(edited.image.url, media.swap.url);

      const blank = await req(`/api/cone-library/${ids.one}`, { method: "PUT", body: { productName: "" } });
      assert.equal(blank.status, 400);
      assert.ok(blank.data.errors.productName);
      const noImage = await req(`/api/cone-library/${ids.one}`, { method: "PUT", body: { image: null } });
      assert.equal(noImage.status, 400);
      assert.equal((await publicList()).find((p) => p._id === ids.one).productName, "TC One Edited", "failed edits change nothing");

      // A partial update leaves the other fields alone.
      await req(`/api/cone-library/${ids.one}`, { method: "PUT", body: { productDetails: "O/100" } });
      const after = (await publicList()).find((p) => p._id === ids.one);
      assert.equal(after.productName, "TC One Edited");
      assert.equal(after.image.url, media.swap.url);
    });

    await t.test("an image in use by a product is protected in the Media Library", async () => {
      const mediaDoc = await Media.findOne({ url: media.two.url });
      const blocked = await req(`/api/media/${mediaDoc._id}`, { method: "DELETE" });
      assert.equal(blocked.status, 409);
      assert.match(blocked.data.message, /cone library/i);
    });

    await t.test("deleting removes the product from the public list; unknown ids 404", async () => {
      assert.equal((await req(`/api/cone-library/${ids.two}`, { method: "DELETE" })).status, 200);
      assert.ok(!(await publicList()).some((p) => p._id === ids.two));
      assert.equal((await req(`/api/cone-library/${ids.two}`, { method: "DELETE" })).status, 404);
      assert.equal((await req(`/api/cone-library/${ids.two}`)).status, 404);
    });

    await t.test("a product whose image was force-deleted is hidden publicly but fixable in the admin", async () => {
      const mediaDoc = await Media.findOne({ url: media.three.url });
      assert.equal((await req(`/api/media/${mediaDoc._id}?force=true`, { method: "DELETE" })).status, 200);
      assert.ok(!(await publicList()).some((p) => p._id === ids.three), "no broken image on the live site");
      assert.ok((await adminList()).some((p) => p._id === ids.three), "still visible to the admin");

      const stuck = await req(`/api/cone-library/${ids.three}`, { method: "PUT", body: { productName: "TC Three B" } });
      assert.equal(stuck.status, 400);
      assert.ok(stuck.data.errors.image);
      const fixed = await req(`/api/cone-library/${ids.three}`, { method: "PUT", body: { image: await uploadImage("test-cone-fix.png", "fix") } });
      assert.equal(fixed.status, 200);
      assert.ok((await publicList()).some((p) => p._id === ids.three));
    });
  } finally {
    await cleanup();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
});
