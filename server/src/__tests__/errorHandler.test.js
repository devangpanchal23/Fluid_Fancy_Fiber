import test from "node:test";
import assert from "node:assert/strict";
import { errorHandler, notFound } from "../middleware/errorHandler.js";

function responseRecorder() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
}

test("API errors return a safe, consistent internal error response", () => {
  const res = responseRecorder();
  const originalError = console.error;
  console.error = () => {};
  try {
    errorHandler(new Error("database password leaked"), {}, res, () => {});
  } finally {
    console.error = originalError;
  }
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.payload, {
    success: false,
    code: "INTERNAL_ERROR",
    error: "Something went wrong. Please try again.",
    message: "Something went wrong. Please try again."
  });
  assert.equal(JSON.stringify(res.payload).includes("database password"), false);
});

test("API not-found response does not expose request details", () => {
  const res = responseRecorder();
  notFound({ method: "GET", originalUrl: "/private/path?secret=value" }, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.code, "NOT_FOUND");
  assert.equal(JSON.stringify(res.payload).includes("secret"), false);
});
