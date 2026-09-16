import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { saveImage, deleteImage, UPLOAD_DIR } from "../utils/imageStorage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("saveImage writes a file and returns a served URL; deleteImage removes it", async () => {
  const buffer = await fs.readFile(path.join(__dirname, "..", "..", "..", "client", "src", "assets", "images", "pasted-1788530038937-0.png")).catch(() => Buffer.from("fake-png-bytes"));

  const { url, filename } = await saveImage(buffer, "sample.png", "image/png");
  assert.match(url, /^\/uploads\/[a-f0-9]{32}\.png$/);
  assert.equal(filename, url.replace("/uploads/", ""));

  const savedPath = path.join(UPLOAD_DIR, filename);
  const saved = await fs.readFile(savedPath);
  assert.deepEqual(saved, buffer);

  await deleteImage(filename);
  await assert.rejects(() => fs.access(savedPath));
});

test("deleteImage silently ignores a missing file", async () => {
  await deleteImage("does-not-exist.png");
});

test("deleteImage ignores unsafe filenames (path traversal)", async () => {
  await deleteImage("../../etc/passwd");
});
