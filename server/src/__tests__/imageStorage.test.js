// Images are stored as binary data on a Media document in MongoDB (not on
// disk — see imageStorage.js's header comment for why) so these tests run
// against a real MongoDB instance, same isolated fluid_fibers_test database
// and skip-if-unreachable pattern as the other integration tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

const TEST_URI = process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017/fluid_fibers_test";
process.env.MONGODB_URI = TEST_URI;
process.env.NODE_ENV = "test";

let dbAvailable = true;
try {
  await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 1500 });
} catch {
  dbAvailable = false;
}

test("saveImage stores bytes on a Media document; getImageData reads them back; deleteImage removes it", { skip: !dbAvailable && "No local MongoDB reachable" }, async () => {
  const { saveImage, deleteImage, getImageData } = await import("../utils/imageStorage.js");
  const Media = (await import("../models/Media.js")).default;

  await Media.deleteMany({ originalName: "imagestorage-test-sample.png" });

  const buffer = Buffer.from("fake-png-bytes-for-testing");
  const { url, filename, media } = await saveImage(buffer, "imagestorage-test-sample.png", "image/png");

  assert.match(url, /^\/uploads\/[a-f0-9]{32}\.png$/);
  assert.equal(filename, url.replace("/uploads/", ""));
  assert.equal(media.originalName, "imagestorage-test-sample.png");

  // The document returned by saveImage/create must never leak raw bytes into
  // a JSON API response (the toJSON transform on Media strips `data`).
  assert.equal(JSON.stringify(media).includes("fake-png-bytes"), false);

  const fetched = await getImageData(filename);
  assert.ok(fetched, "getImageData should find the record by filename");
  assert.ok(Buffer.from(fetched.data).equals(buffer));
  assert.equal(fetched.mimeType, "image/png");

  await deleteImage(filename);
  assert.equal(await getImageData(filename), null);
});

test("deleteImage silently ignores a filename with no matching record", { skip: !dbAvailable && "No local MongoDB reachable" }, async () => {
  const { deleteImage } = await import("../utils/imageStorage.js");
  await deleteImage("does-not-exist.png");
});

test("deleteImage and getImageData ignore unsafe filenames (path traversal)", { skip: !dbAvailable && "No local MongoDB reachable" }, async () => {
  const { deleteImage, getImageData } = await import("../utils/imageStorage.js");
  await deleteImage("../../etc/passwd");
  assert.equal(await getImageData("../../etc/passwd"), null);
});

test.after(async () => {
  if (dbAvailable) await mongoose.disconnect();
});
