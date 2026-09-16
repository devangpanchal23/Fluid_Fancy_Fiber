// Pure, framework-free catalogue image resolution logic — kept separate
// from Catalogue.jsx (which is JSX and can't be imported by a plain Node
// test runner) so the fallback chain and per-item image identity can be
// regression-tested directly.

// Guaranteed-to-load bundled asset — the last link in the image fallback
// chain (variant -> type -> category -> this), so the preview can never
// render a broken-image icon.
export const DEFAULT_IMAGE = "mill";

// The fallback chain: a selected Variant's own image(s) first; if it has
// none, fall back to its parent Product/Type's image(s); if that also has
// none, fall back to the Category's single image; and if nothing anywhere
// has been assigned yet, the guaranteed-good bundled default. Every level
// is looked up by the database record already loaded into state — nothing
// here is a hardcoded product-to-image mapping, and no two distinct
// variants/types can ever resolve to each other's image since each lookup
// reads only that exact record's own `images`/`image` field.
export function resolveGallery(variant, line, category) {
  if (variant?.images?.length) return variant.images;
  if (line?.images?.length) return line.images;
  if (category?.image?.url) return [category.image.url];
  return [DEFAULT_IMAGE];
}
