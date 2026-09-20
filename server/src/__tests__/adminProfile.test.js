// Admin self-service profile: username/email update and password change.
// Covers auth protection, validation, "only my own record", re-authentication,
// duplicate emails, and that a password change kills every existing session.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose from "mongoose";

const TEST_URI = process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017/fluid_fibers_test";
process.env.MONGODB_URI = TEST_URI;
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret-thats-long-enough-1234567890";
process.env.NODE_ENV = "test";
process.env.PROFILE_RATE_LIMIT = "1000"; // this suite makes far more profile calls than one real admin would

let dbAvailable = true;
try {
  await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 1500 });
} catch {
  dbAvailable = false;
}

test("Admin profile: username, email and password self-service", { skip: !dbAvailable && "No local MongoDB reachable" }, async (t) => {
  const { app } = await import("../app.js");
  const Admin = (await import("../models/Admin.js")).default;

  const EMAIL = "test-profile-a@example.com";
  const OTHER = "test-profile-b@example.com";
  const PASS = "OriginalPass123";

  const cleanup = () => Admin.deleteMany({ email: /^test-profile-/ });
  await cleanup();

  const mkAdmin = async (email, name) => {
    const a = new Admin({ email, name });
    await a.setPassword(PASS);
    return a.save();
  };
  await mkAdmin(EMAIL, "Profile A");
  const other = await mkAdmin(OTHER, "Profile B");

  const server = http.createServer(app).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;

  // Each "browser" keeps its own cookie, so a second session can be checked after the first changes the password.
  function client() {
    let cookie = "";
    return {
      get cookie() { return cookie; },
      set cookie(v) { cookie = v; },
      async req(path, { method = "GET", body, anon = false, raw = false } = {}) {
        const res = await fetch(`${base}${path}`, {
          method,
          headers: { "Content-Type": "application/json", ...(!anon && cookie ? { Cookie: cookie } : {}) },
          body: body === undefined ? undefined : JSON.stringify(body)
        });
        const setCookie = res.headers.get("set-cookie");
        if (setCookie) cookie = setCookie.split(";")[0];
        const text = await res.text();
        return { status: res.status, headers: res.headers, text, data: raw ? null : (() => { try { return JSON.parse(text); } catch { return null; } })() };
      }
    };
  }
  const login = async (c, email, password) => c.req("/api/admin/login", { method: "POST", body: { email, password } });

  const a = client();
  assert.equal((await login(a, EMAIL, PASS)).status, 200);

  try {
    await t.test("both endpoints require a logged-in admin", async () => {
      const anon = client();
      assert.equal((await anon.req("/api/admin/me/profile", { method: "PUT", body: { name: "Hacker", email: "x@example.com" } })).status, 401);
      assert.equal((await anon.req("/api/admin/me/change-password", { method: "POST", body: { currentPassword: PASS, newPassword: "NewPassword123", confirmPassword: "NewPassword123" } })).status, 401);
      assert.equal((await Admin.findOne({ email: EMAIL })).name, "Profile A", "nothing changed");
    });

    await t.test("username updates without a password and shows up on /me", async () => {
      const r = await a.req("/api/admin/me/profile", { method: "PUT", body: { name: "  New Display Name ", email: EMAIL } });
      assert.equal(r.status, 200);
      assert.equal(r.data.data.admin.name, "New Display Name");
      assert.equal((await a.req("/api/admin/me")).data.data.admin.name, "New Display Name");
    });

    await t.test("either field can be saved on its own", async () => {
      const nameOnly = await a.req("/api/admin/me/profile", { method: "PUT", body: { name: "Solo Name" } });
      assert.equal(nameOnly.status, 200);
      assert.equal(nameOnly.data.data.admin.email, EMAIL, "email untouched");
      const emailSame = await a.req("/api/admin/me/profile", { method: "PUT", body: { email: EMAIL } });
      assert.equal(emailSame.status, 200, "resending the current email needs no password");
      assert.equal(emailSame.data.data.admin.name, "Solo Name", "name untouched");
      assert.equal((await a.req("/api/admin/me/profile", { method: "PUT", body: {} })).status, 400, "an empty update is refused");
      const bad = await a.req("/api/admin/me/profile", { method: "PUT", body: { email: "nope" } });
      assert.ok(bad.data.errors.email && !bad.data.errors.name);
      await a.req("/api/admin/me/profile", { method: "PUT", body: { name: "New Display Name" } });
    });

    await t.test("responses never expose the password hash or internal fields", async () => {
      const r = await a.req("/api/admin/me/profile", { method: "PUT", body: { name: "New Display Name", email: EMAIL }, raw: true });
      assert.ok(!/passwordHash|\$2[aby]\$|tokenVersion|loginAttempts|lockUntil/.test(r.text), r.text);
      const me = await a.req("/api/admin/me", { raw: true });
      assert.ok(!/passwordHash|\$2[aby]\$/.test(me.text));
    });

    await t.test("rejects a blank/short/long username and malformed emails", async () => {
      for (const name of ["", " ", "A", "x".repeat(61)]) {
        const r = await a.req("/api/admin/me/profile", { method: "PUT", body: { name, email: EMAIL } });
        assert.equal(r.status, 400, `name ${JSON.stringify(name)}`);
        assert.ok(r.data.errors.name);
      }
      for (const email of ["", "plain", "a@b", "a b@example.com", "@example.com", 42]) {
        const r = await a.req("/api/admin/me/profile", { method: "PUT", body: { name: "Fine Name", email, currentPassword: PASS } });
        assert.equal(r.status, 400, `email ${JSON.stringify(email)}`);
        assert.ok(r.data.errors.email);
      }
      assert.equal((await Admin.findOne({ email: EMAIL })).name, "New Display Name", "failed edits change nothing");
    });

    await t.test("changing the email needs the current password", async () => {
      const none = await a.req("/api/admin/me/profile", { method: "PUT", body: { name: "New Display Name", email: "test-profile-new@example.com" } });
      assert.equal(none.status, 400);
      assert.ok(none.data.errors.currentPassword);

      const wrong = await a.req("/api/admin/me/profile", { method: "PUT", body: { name: "New Display Name", email: "test-profile-new@example.com", currentPassword: "WrongPassword1" } });
      assert.equal(wrong.status, 400);
      assert.equal(wrong.data.errors.currentPassword, "Current password is incorrect.");
      assert.ok(await Admin.findOne({ email: EMAIL }), "email unchanged");
    });

    await t.test("an email already used by another admin is refused (case-insensitively)", async () => {
      for (const email of [OTHER, OTHER.toUpperCase()]) {
        const r = await a.req("/api/admin/me/profile", { method: "PUT", body: { name: "New Display Name", email, currentPassword: PASS } });
        assert.equal(r.status, 409);
        assert.match(r.data.errors.email, /already used/i);
      }
      assert.ok(await Admin.findOne({ email: EMAIL }));
    });

    await t.test("the email changes with the right password, and the new address is the login", async () => {
      const NEW = "test-profile-new@example.com";
      const r = await a.req("/api/admin/me/profile", { method: "PUT", body: { name: "New Display Name", email: ` ${NEW.toUpperCase()} `, currentPassword: PASS } });
      assert.equal(r.status, 200);
      assert.equal(r.data.data.admin.email, NEW, "trimmed and lower-cased");
      assert.equal((await a.req("/api/admin/me")).data.data.admin.email, NEW, "session still valid and reflects it");

      assert.equal((await login(client(), EMAIL, PASS)).status, 401, "old email no longer works");
      assert.equal((await login(client(), NEW, PASS)).status, 200, "new email works");
    });

    await t.test("it only ever edits the logged-in admin — an id in the body is ignored", async () => {
      const r = await a.req("/api/admin/me/profile", {
        method: "PUT",
        body: { _id: other._id.toString(), id: other._id.toString(), adminId: other._id.toString(), name: "Still Me", email: "test-profile-new@example.com", role: "admin", passwordHash: "x" }
      });
      assert.equal(r.status, 200);
      const untouched = await Admin.findById(other._id);
      assert.equal(untouched.name, "Profile B");
      assert.equal(untouched.email, OTHER);
      assert.ok(await untouched.verifyPassword(PASS), "other admin's password untouched");
      assert.equal((await Admin.findOne({ email: "test-profile-new@example.com" })).name, "Still Me");
    });

    await t.test("password change validation: required, match, strength, and not the same password", async () => {
      const NEW = "test-profile-new@example.com";
      const send = (body) => a.req("/api/admin/me/change-password", { method: "POST", body });
      const good = { currentPassword: PASS, newPassword: "BrandNewPass456", confirmPassword: "BrandNewPass456" };

      assert.ok((await send({})).data.errors.currentPassword);
      assert.ok((await send({ ...good, confirmPassword: "Different12345" })).data.errors.confirmPassword);
      for (const [pw, why] of [["Short1", /at least 10/], ["onlyletterspassword", /number/], ["1234567890123", /letter/], ["a1".repeat(40), /at most/]]) {
        const r = await send({ ...good, newPassword: pw, confirmPassword: pw });
        assert.equal(r.status, 400, pw);
        assert.match(r.data.errors.newPassword, why);
      }
      const wrong = await send({ ...good, currentPassword: "NotMyPassword9" });
      assert.equal(wrong.status, 400);
      assert.equal(wrong.data.errors.currentPassword, "Current password is incorrect.");
      const same = await send({ currentPassword: PASS, newPassword: PASS, confirmPassword: PASS });
      assert.match(same.data.errors.newPassword, /different/i);

      assert.equal((await a.req("/api/admin/me")).status, 200, "failed attempts leave the session alone");
      assert.ok(await (await Admin.findOne({ email: NEW })).verifyPassword(PASS), "password unchanged");
    });

    await t.test("repeated wrong current passwords lock the account, like the login form", async () => {
      const victim = await mkAdmin("test-profile-lock@example.com", "Lock Me");
      const c = client();
      await login(c, victim.email, PASS);
      let last;
      for (let i = 0; i < 5; i++) {
        last = await c.req("/api/admin/me/change-password", { method: "POST", body: { currentPassword: "WrongGuess123", newPassword: "BrandNewPass456", confirmPassword: "BrandNewPass456" } });
      }
      assert.equal(last.status, 400);
      const locked = await c.req("/api/admin/me/change-password", { method: "POST", body: { currentPassword: PASS, newPassword: "BrandNewPass456", confirmPassword: "BrandNewPass456" } });
      assert.equal(locked.status, 423, "even the right password is refused while locked");
    });

    await t.test("a successful password change ends every session and needs the new password to sign back in", async () => {
      const NEW = "test-profile-new@example.com";
      // A second device, logged in before the change.
      const phone = client();
      assert.equal((await login(phone, NEW, PASS)).status, 200);
      assert.equal((await phone.req("/api/admin/me")).status, 200);

      const r = await a.req("/api/admin/me/change-password", { method: "POST", body: { currentPassword: PASS, newPassword: "BrandNewPass456", confirmPassword: "BrandNewPass456" }, raw: true });
      assert.equal(r.status, 200);
      assert.match(r.headers.get("set-cookie"), /ff_admin_token=;/, "session cookie cleared");
      assert.ok(!/passwordHash|BrandNewPass456/.test(r.text), "nothing sensitive echoed back");

      assert.equal((await a.req("/api/admin/me")).status, 401, "this session is over");
      assert.equal((await phone.req("/api/admin/me")).status, 401, "so is every other device's session");

      const stored = await Admin.findOne({ email: NEW });
      assert.notEqual(stored.passwordHash, "BrandNewPass456", "stored hashed, not plaintext");
      assert.match(stored.passwordHash, /^\$2[aby]\$/, "bcrypt hash");

      assert.equal((await login(client(), NEW, PASS)).status, 401, "old password rejected");
      const fresh = client();
      assert.equal((await login(fresh, NEW, "BrandNewPass456")).status, 200, "new password works");
      assert.equal((await fresh.req("/api/admin/me")).status, 200, "and the new session is valid");
    });
  } finally {
    await cleanup();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
});
