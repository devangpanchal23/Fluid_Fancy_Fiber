import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVideoUrl } from "./videoEmbed.js";

test("parseVideoUrl converts a Drive /file/d/ share link to its /preview embed form", () => {
  const result = parseVideoUrl("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQr/view?usp=sharing");
  assert.equal(result.url, "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQr/preview");
  assert.equal(result.embedType, "iframe");
});

test("parseVideoUrl converts a Drive open?id= link the same way", () => {
  const result = parseVideoUrl("https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQr");
  assert.equal(result.url, "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQr/preview");
  assert.equal(result.embedType, "iframe");
});

test("parseVideoUrl converts a Drive uc?id= link the same way", () => {
  const result = parseVideoUrl("https://drive.google.com/uc?id=1AbCdEfGhIjKlMnOpQr&export=download");
  assert.equal(result.url, "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQr/preview");
  assert.equal(result.embedType, "iframe");
});

test("parseVideoUrl rejects a Drive link with no extractable file ID", () => {
  const result = parseVideoUrl("https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQr");
  assert.ok(result.error, "a folder link isn't a playable file and should be rejected with guidance");
  assert.equal(result.url, undefined);
});

test("parseVideoUrl rejects a non-Drive URL", () => {
  const result = parseVideoUrl("https://example.com/clips/spinning.mp4");
  assert.ok(result.error, "only Google Drive links are supported; other hosts must be rejected with guidance");
  assert.equal(result.url, undefined);
});

test("parseVideoUrl rejects empty input", () => {
  assert.ok(parseVideoUrl("").error);
  assert.ok(parseVideoUrl("   ").error);
});

test("parseVideoUrl rejects a non-URL string", () => {
  assert.ok(parseVideoUrl("not a url at all").error);
});

test("parseVideoUrl rejects a non-http(s) protocol", () => {
  assert.ok(parseVideoUrl("ftp://example.com/video.mp4").error);
});
