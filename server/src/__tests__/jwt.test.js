import { test } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "test-only-secret-thats-long-enough-1234567890";

const { signAdminToken, verifyAdminToken } = await import("../utils/jwt.js");

test("signAdminToken/verifyAdminToken round-trip", () => {
  const fakeAdmin = { _id: { toString: () => "abc123" }, email: "admin@example.com" };
  const token = signAdminToken(fakeAdmin);
  const payload = verifyAdminToken(token);
  assert.equal(payload.sub, "abc123");
  assert.equal(payload.email, "admin@example.com");
});

test("verifyAdminToken rejects a tampered token", () => {
  const fakeAdmin = { _id: { toString: () => "abc123" }, email: "admin@example.com" };
  const token = signAdminToken(fakeAdmin);
  const tampered = token.slice(0, -2) + "xx";
  assert.throws(() => verifyAdminToken(tampered));
});
