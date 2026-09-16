import { test } from "node:test";
import assert from "node:assert/strict";
import { mediaToImage, mergeSelectedMedia } from "./mediaSelection.js";

const mediaA = { _id: "media-a", url: "/uploads/a.jpg", filename: "a.jpg", alt: "Alpha" };
const mediaB = { _id: "media-b", url: "/uploads/b.jpg", filename: "b.jpg", alt: "" };
const mediaC = { _id: "media-c", url: "/uploads/c.jpg", filename: "c.jpg", alt: "" };

test("mediaToImage maps a Media record to a Product/Variant image subdocument shape", () => {
  assert.deepEqual(mediaToImage(mediaA), { url: "/uploads/a.jpg", filename: "a.jpg", alt: "Alpha", media: "media-a" });
});

test("mergeSelectedMedia: appends picked items after whatever already exists, preserving order", () => {
  const existing = [{ url: "/uploads/existing.jpg", media: "media-existing", alt: "" }];
  const result = mergeSelectedMedia(existing, [mediaA, mediaB]);
  assert.equal(result.length, 3);
  assert.equal(result[0].media, "media-existing", "the pre-existing (already primary) image stays first");
  assert.equal(result[1].media, "media-a");
  assert.equal(result[2].media, "media-b");
});

test("mergeSelectedMedia: an empty gallery gets its first picked item as the primary image", () => {
  const result = mergeSelectedMedia([], [mediaB, mediaA]);
  assert.equal(result[0].media, "media-b", "primary = first selected, in pick order, not alphabetical/insertion-id order");
  assert.equal(result[1].media, "media-a");
});

test("mergeSelectedMedia: re-picking an already-attached Media id is a no-op, not a duplicate", () => {
  const existing = [mediaToImage(mediaA)];
  const result = mergeSelectedMedia(existing, [mediaA, mediaB]);
  assert.equal(result.length, 2, "mediaA must not appear twice");
  assert.equal(result.filter((img) => img.media === "media-a").length, 1);
});

test("mergeSelectedMedia: a legacy image with no `media` id but a matching url is also deduped", () => {
  const existing = [{ url: mediaA.url, alt: "" }]; // uploaded before the Media Library existed
  const result = mergeSelectedMedia(existing, [mediaA]);
  assert.equal(result.length, 1);
});

test("mergeSelectedMedia: two independent galleries selecting different subsets never cross-contaminate", () => {
  const variantAGallery = mergeSelectedMedia([], [mediaA]);
  const variantBGallery = mergeSelectedMedia([], [mediaC]);
  assert.equal(variantAGallery[0].media, "media-a");
  assert.equal(variantBGallery[0].media, "media-c");
  assert.notEqual(variantAGallery[0].url, variantBGallery[0].url);
});
