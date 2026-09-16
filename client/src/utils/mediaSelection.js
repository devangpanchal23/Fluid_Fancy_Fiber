// Pure logic for the Media Picker's "confirm selection" step, kept separate
// from the (JSX) picker component so it can be unit-tested directly. A
// Product/Variant's `images` array is an ordered gallery where the FIRST
// entry is the primary/featured image — merging picked library items must
// preserve both the picker's own selection order and whatever was already
// in the gallery, and must never select the same Media item twice.
export function mediaToImage(media) {
  return { url: media.url, filename: media.filename, alt: media.alt || "", media: media._id };
}

// `selected` is the ordered array of Media items the admin picked (in
// pick-order, which IS the intended gallery order — see MediaPicker). Existing
// entries stay first (so an admin's prior manual reordering / uploads are
// never silently pushed down or made non-primary by a later library pick),
// newly picked ones are appended, and re-picking an already-attached image
// is a no-op rather than a duplicate.
export function mergeSelectedMedia(existingImages, selectedMedia) {
  const existingIds = new Set(existingImages.map((img) => img.media).filter(Boolean));
  const existingUrls = new Set(existingImages.map((img) => img.url));
  const additions = selectedMedia
    .filter((media) => !existingIds.has(media._id) && !existingUrls.has(media.url))
    .map(mediaToImage);
  return [...existingImages, ...additions];
}
