import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_IMAGE, resolveGallery } from "./catalogueImage.js";

// Matches real usage in Catalogue.jsx: fromApiVariant/fromApiProduct already
// map `images: [{url, alt}]` down to plain URL strings before this ever
// runs, so variant/line images here are strings. `category` is the one
// exception — it's the raw, un-transformed API object, so its image is
// still the {url, alt} shape and gets unwrapped to `.url` inside
// resolveGallery itself.
const typeImageUrl = "/uploads/type.jpg";
const categoryImage = { url: "/uploads/category.jpg", alt: "" };
const variantAUrl = "/uploads/poly-b1.jpg";
const variantBUrl = "/uploads/poly-b2.jpg";

test("resolveGallery: variant's own image takes priority over everything else", () => {
  const variant = { images: [variantAUrl] };
  const line = { images: [typeImageUrl] };
  const category = { image: categoryImage };
  assert.deepEqual(resolveGallery(variant, line, category), [variantAUrl]);
});

test("resolveGallery: distinct variants resolve to their own distinct images (no index/name cross-contamination)", () => {
  const line = { images: [typeImageUrl] };
  const poly_b1 = { images: [variantAUrl] };
  const poly_b2 = { images: [variantBUrl] };
  const galleryB1 = resolveGallery(poly_b1, line, null);
  const galleryB2 = resolveGallery(poly_b2, line, null);
  assert.deepEqual(galleryB1, [variantAUrl]);
  assert.deepEqual(galleryB2, [variantBUrl]);
  assert.notDeepEqual(galleryB1, galleryB2);
});

test("resolveGallery: falls back to the parent Type's image when the variant has none", () => {
  const variant = { images: [] };
  const line = { images: [typeImageUrl] };
  assert.deepEqual(resolveGallery(variant, line, null), [typeImageUrl]);
});

test("resolveGallery: falls back to the Category's image when neither variant nor type has one", () => {
  const variant = { images: [] };
  const line = { images: [] };
  const category = { image: categoryImage };
  assert.deepEqual(resolveGallery(variant, line, category), [categoryImage.url]);
});

test("resolveGallery: falls back to the guaranteed default when nothing anywhere has an image", () => {
  assert.deepEqual(resolveGallery(null, null, null), [DEFAULT_IMAGE]);
  assert.deepEqual(resolveGallery({ images: [] }, { images: [] }, { image: null }), [DEFAULT_IMAGE]);
});

test("resolveGallery: handles missing/null/undefined image fields without throwing", () => {
  assert.doesNotThrow(() => resolveGallery(undefined, undefined, undefined));
  assert.doesNotThrow(() => resolveGallery({ images: null }, { images: undefined }, {}));
  assert.deepEqual(resolveGallery({ images: null }, { images: undefined }, {}), [DEFAULT_IMAGE]);
});
