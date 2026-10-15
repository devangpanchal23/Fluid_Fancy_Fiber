// Versioned public paths let the HTML preload match the browser's responsive
// image selection, while Vercel can cache these immutable assets long-term.
const logo = "/images/fluid-fancy-logo-2x.webp";
const logoFull = "/images/fluid-fancy-logo-full.webp";
const spinningFrames = "/images/spinning-frames-2x.webp";
const factoryFloor = "/images/factory-floor-1x.webp";

export const images = {
  logo,
  logoFull,
  hero: spinningFrames,
  heroSrcSet: "/images/spinning-frames-1x.webp 313w, /images/spinning-frames-2x.webp 626w",
  mill: factoryFloor,
  millSrcSet: "/images/factory-floor-1x.webp 870w, /images/factory-floor-2x.webp 1200w",
  factoryFloor
};
