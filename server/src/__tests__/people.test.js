// End-to-end coverage for the Person feature as the public site sees it: what
// the admin saves must be exactly what an anonymous visitor's GET
// /api/people?activeOnly=true returns, in the right order, with a photo that
// actually loads. Runs several add/edit/delete cycles so sync is proven to be
// reliable, not a one-time fluke.
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

test("People: admin changes are mirrored exactly on the public list", { skip: !dbAvailable && "No local MongoDB reachable" }, async (t) => {
  const { app } = await import("../app.js");
  const Admin = (await import("../models/Admin.js")).default;
  const Person = (await import("../models/Person.js")).default;
  const Media = (await import("../models/Media.js")).default;

  const cleanup = () =>
    Promise.all([
      Admin.deleteMany({ email: /^test-people-admin@/ }),
      Person.deleteMany({ name: /^TP / }),
      Media.deleteMany({ originalName: /^test-people-/ })
    ]);
  await cleanup();

  const admin = new Admin({ email: "test-people-admin@example.com", name: "Test People Admin" });
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

  // What the public People section requests; `anon` drops the admin cookie.
  const publicList = async () => (await req("/api/people?activeOnly=true&limit=100", { anon: true })).data.data.items.filter((p) => /^TP /.test(p.name));
  const adminList = async () => (await req("/api/people?limit=100")).data.data.items.filter((p) => /^TP /.test(p.name));

  async function uploadPhoto(name, bytes) {
    const form = new FormData();
    form.append("image", new Blob([bytes], { type: "image/png" }), name);
    const res = await fetch(`${base}/api/uploads`, { method: "POST", headers: { Cookie: cookie }, body: form });
    const { url } = (await res.json()).data;
    return { url, alt: "" };
  }

  async function assertPhotoLoads(person, expectedBytes) {
    const res = await fetch(`${base}${person.image.url}`);
    assert.equal(res.status, 200, `photo for ${person.name} must load`);
    assert.match(res.headers.get("content-type"), /^image\//);
    if (expectedBytes) assert.ok(Buffer.from(await res.arrayBuffer()).equals(Buffer.from(expectedBytes)));
  }

  await req("/api/admin/login", { method: "POST", body: { email: "test-people-admin@example.com", password: "SuperSecret123!" } });

  await t.test("rejects a person with no photo, a bogus photo, or a missing name", async () => {
    const noPhoto = await req("/api/people", { method: "POST", body: { name: "TP NoPhoto", designation: "X" } });
    assert.equal(noPhoto.status, 400);
    assert.ok(noPhoto.data.errors.image);

    const ghost = await req("/api/people", {
      method: "POST",
      body: { name: "TP Ghost", designation: "X", image: { url: "/uploads/ffffffffffffffffffffffffffffffff.png" } }
    });
    assert.equal(ghost.status, 400, "an /uploads/ url with no stored file must be refused");
    assert.match(ghost.data.errors.image, /no longer exists/i);

    const badUrl = await req("/api/people", { method: "POST", body: { name: "TP Bad", designation: "X", image: { url: "javascript:alert(1)" } } });
    assert.equal(badUrl.status, 400);

    const noName = await req("/api/people", { method: "POST", body: { designation: "X", image: await uploadPhoto("test-people-a.png", "a") } });
    assert.equal(noName.status, 400);
    assert.ok(noName.data.errors.name);

    assert.equal((await adminList()).length, 0, "no broken record may have been saved");
  });

  const ids = {};
  await t.test("creates main partner, co-partners and another person — public list orders them correctly", async () => {
    // Created deliberately out of display order.
    const bytesOther = "other-bytes";
    const other = await req("/api/people", {
      method: "POST",
      body: { name: "TP Other", designation: "Sales", type: "other", image: await uploadPhoto("test-people-other.png", bytesOther) }
    });
    const co2 = await req("/api/people", {
      method: "POST",
      body: { name: "TP Co Two", designation: "Exports", type: "co-partner", image: await uploadPhoto("test-people-co2.png", "co2") }
    });
    const main = await req("/api/people", {
      method: "POST",
      body: { name: "TP Main", designation: "Managing partner", type: "main-partner", image: await uploadPhoto("test-people-main.png", "main-bytes") }
    });
    const co1 = await req("/api/people", {
      method: "POST",
      body: { name: "TP Co One", designation: "Operations", type: "co-partner", image: await uploadPhoto("test-people-co1.png", "co1") }
    });
    for (const r of [other, co2, main, co1]) assert.equal(r.status, 201);
    Object.assign(ids, { other: other.data.data.person._id, co2: co2.data.data.person._id, main: main.data.data.person._id, co1: co1.data.data.person._id });

    const pub = await publicList();
    assert.deepEqual(
      pub.map((p) => p.name),
      ["TP Main", "TP Co Two", "TP Co One", "TP Other"],
      "main partner first, then co-partners in creation order, then others"
    );
    // Every photo the public list points at must actually load.
    for (const p of pub) await assertPhotoLoads(p);
    await assertPhotoLoads(pub[0], "main-bytes");
  });

  await t.test("the public roster is never cacheable, so edits can't show stale", async () => {
    const r = await req("/api/people?activeOnly=true", { anon: true });
    assert.match(r.headers.get("cache-control"), /no-store/);
  });

  await t.test("reordering only moves within a type — a co-partner can't jump above the main partner", async () => {
    await req(`/api/people/${ids.co1}/reorder`, { method: "PUT", body: { direction: "up" } });
    let names = (await publicList()).map((p) => p.name);
    assert.deepEqual(names, ["TP Main", "TP Co One", "TP Co Two", "TP Other"]);

    await req(`/api/people/${ids.co1}/reorder`, { method: "PUT", body: { direction: "up" } });
    names = (await publicList()).map((p) => p.name);
    assert.equal(names[0], "TP Main", "already first in its group: stays put, never crosses into main partner");
  });

  await t.test("Jignesh Kakadiya then Laljibhai Dhameliya always lead, whatever their type", async () => {
    // Created in the wrong order, and typed so that type rank alone would put Laljibhai first.
    const lal = await req("/api/people", {
      method: "POST",
      body: { name: "Laljibhai  Dhameliya", designation: "Partner", type: "main-partner", image: await uploadPhoto("test-people-lal.png", "lal") }
    });
    const jig = await req("/api/people", {
      method: "POST",
      body: { name: "Jignesh Kakadiya", designation: "Partner", type: "co-partner", image: await uploadPhoto("test-people-jig.png", "jig") }
    });
    assert.equal(lal.status, 201);
    assert.equal(jig.status, 201);

    try {
      // Unfiltered: the helpers above only keep "TP " test names.
      const publicNames = (await req("/api/people?activeOnly=true&limit=100", { anon: true })).data.data.items.map((p) => p.name);
      const adminNames = (await req("/api/people?limit=100")).data.data.items.map((p) => p.name);
      assert.deepEqual(publicNames.slice(0, 2), ["Jignesh Kakadiya", "Laljibhai  Dhameliya"]);
      assert.deepEqual(adminNames.slice(0, 2), publicNames.slice(0, 2), "admin list agrees");
    } finally {
      await req(`/api/people/${lal.data.data.person._id}`, { method: "DELETE" });
      await req(`/api/people/${jig.data.data.person._id}`, { method: "DELETE" });
    }
  });

  await t.test("admin list shows everyone (active and inactive) with previews", async () => {
    await req(`/api/people/${ids.other}`, { method: "PUT", body: { isActive: false } });
    const admin = await adminList();
    assert.equal(admin.length, 4, "admin must see inactive people too");
    assert.ok(admin.every((p) => p.image?.url));
    assert.ok(!(await publicList()).some((p) => p.name === "TP Other"), "deactivated person leaves the public site");
    await req(`/api/people/${ids.other}`, { method: "PUT", body: { isActive: true } });
  });

  // Three full add -> edit -> delete cycles, checking the public view each time.
  for (let cycle = 1; cycle <= 3; cycle++) {
    await t.test(`sync cycle ${cycle}: add, edit (name + photo), delete`, async () => {
      const before = (await publicList()).length;
      const bytes1 = `cycle-${cycle}-photo-one`;
      const created = await req("/api/people", {
        method: "POST",
        body: { name: `TP Cycle ${cycle}`, designation: "Temp", type: "co-partner", image: await uploadPhoto(`test-people-c${cycle}a.png`, bytes1) }
      });
      assert.equal(created.status, 201);
      const id = created.data.data.person._id;

      let pub = await publicList();
      assert.equal(pub.length, before + 1, "new person appears immediately, no manual step");
      let me = pub.find((p) => p._id === id);
      await assertPhotoLoads(me, bytes1);

      const bytes2 = `cycle-${cycle}-photo-two`;
      const edited = await req(`/api/people/${id}`, {
        method: "PUT",
        body: { name: `TP Cycle ${cycle} Edited`, designation: "Renamed", image: await uploadPhoto(`test-people-c${cycle}b.png`, bytes2) }
      });
      assert.equal(edited.status, 200);
      pub = await publicList();
      me = pub.find((p) => p._id === id);
      assert.equal(me.name, `TP Cycle ${cycle} Edited`);
      assert.equal(me.designation, "Renamed");
      await assertPhotoLoads(me, bytes2);
      assert.equal(pub.length, before + 1, "editing must not duplicate or drop anyone");

      assert.equal((await req(`/api/people/${id}`, { method: "DELETE" })).status, 200);
      pub = await publicList();
      assert.equal(pub.length, before, "deleted person leaves the public site");
      assert.ok(!pub.some((p) => p._id === id));
    });
  }

  await t.test("a photo picked from the Media Library works, stays linked, and protects the library item from deletion", async () => {
    const form = new FormData();
    form.append("image", new Blob(["library-bytes"], { type: "image/png" }), "test-people-library.png");
    const uploaded = await (await fetch(`${base}/api/media`, { method: "POST", headers: { Cookie: cookie }, body: form })).json();
    const media = uploaded.data.media;

    // Exactly what ImageUploader sends after picking from the library.
    const created = await req("/api/people", {
      method: "POST",
      body: { name: "TP Library", designation: "Picked", type: "co-partner", image: { url: media.url, filename: media.filename, alt: "", media: media._id } }
    });
    assert.equal(created.status, 201);
    assert.equal(created.data.data.person.image.media, media._id, "person stays linked to its Media record");

    const me = (await publicList()).find((p) => p.name === "TP Library");
    await assertPhotoLoads(me, "library-bytes");

    // Same library image reused by a second person.
    const second = await req("/api/people", {
      method: "POST",
      body: { name: "TP Library Two", designation: "Reused", image: { url: media.url, filename: media.filename, alt: "", media: media._id } }
    });
    assert.equal(second.status, 201, "one library image can be used by several people");

    const blocked = await req(`/api/media/${media._id}`, { method: "DELETE" });
    assert.equal(blocked.status, 409, "in-use library image can't be silently deleted");
    assert.match(blocked.data.message, /people entr/i);
    assert.ok((await publicList()).find((p) => p.name === "TP Library"), "person keeps a working photo");
  });

  await t.test("a legacy person with no photo stays visible+editable in admin, hidden publicly, and needs a photo to publish", async () => {
    // Simulates a record from before photos were mandatory, bypassing the API.
    const legacy = await Person.collection.insertOne({ name: "TP Legacy", designation: "Old", isActive: false, order: 99, links: [], createdAt: new Date(), updatedAt: new Date() });
    const id = legacy.insertedId.toString();

    const listed = (await adminList()).find((p) => p._id === id);
    assert.ok(listed, "legacy record must be visible in admin");
    assert.ok(!(await publicList()).some((p) => p._id === id));

    const activate = await req(`/api/people/${id}`, { method: "PUT", body: { isActive: true } });
    assert.equal(activate.status, 400, "cannot publish without a photo");
    assert.ok(activate.data.errors.image);

    const fixed = await req(`/api/people/${id}`, {
      method: "PUT",
      body: { isActive: true, type: "co-partner", image: await uploadPhoto("test-people-legacy.png", "legacy-bytes") }
    });
    assert.equal(fixed.status, 200);
    const me = (await publicList()).find((p) => p._id === id);
    assert.ok(me, "after re-uploading a photo the legacy person appears publicly");
    await assertPhotoLoads(me, "legacy-bytes");

    const cleared = await req(`/api/people/${id}`, { method: "PUT", body: { image: null } });
    assert.equal(cleared.status, 400, "an existing photo can't be wiped out");
  });

  await cleanup();
  server.close();
});

test.after(async () => {
  if (dbAvailable) await mongoose.disconnect();
});
