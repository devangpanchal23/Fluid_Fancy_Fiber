# Performance and accessibility report

## Scope and stack

- Branch: `perf-a11y-phase2`, based on `main`.
- Frontend: React 19, Vite 8, JavaScript, CSS.
- Backend: Node.js and Express, served through Vercel routes; MongoDB-backed application.
- This work preserves the site's existing fonts, palette, layout and branding. No database or public API changes were made.

## Issues, causes and fixes

| Issue | Root cause | Fix and verification |
|---|---|---|
| Google Fonts blocked first render and delayed mobile paint | The page fetched CSS and font files from Google at runtime | Self-hosted Latin WOFF2 files for Barlow 400/600 and Barlow Condensed 400/500/600, added swap display, metric-adjusted fallbacks, and preloaded the two above-fold font files. Removed Google font preconnects and CSP sources. Confirmed no Google font references remain and ran Lighthouse against the production build. |
| Main CSS was render blocking | The shared stylesheet contains global layout and component styles | Kept it as one render-blocking stylesheet to avoid a flash of unstyled content. Inlining/splitting it risked visual shifts; Lighthouse reports about 450 ms estimated savings for this CSS resource. Critical page background styles are inline. |
| Large factory and spinning images | Original WebP assets were oversized for their displayed dimensions | Added responsive 1x/2x WebP variants. Factory 1x is 94,500 bytes (under 100 KiB), factory 2x is 158,504 bytes. Spinning images are 11,994 and 29,308 bytes. Replaced the displayed logo with a 368x116 WebP (6,248 bytes). |
| Images could shift layout and load eagerly below the fold | Several image elements lacked intrinsic dimensions and lazy loading | Added width/height to app images, lazy loading and async decoding below the fold. The hero image remains eager with high fetch priority and a preload. Build and rendered-page audits checked the image attributes. |
| Initial JavaScript included below-fold UI | Gallery, video, people, catalogue and modal modules were imported into the initial route | Added React lazy loading, viewport-triggered section loading and reserved-height skeletons. Video player loads only after play. Gated optional Vercel Analytics behind `VITE_ENABLE_ANALYTICS=true` so it does not create a default local 404 or enter the default page bundle. Added Rollup visualizer output for bundle inspection. |
| People grid had an invalid ARIA attribute | A generic `aria-label` was attached to a `div` without a permitted role | Added list/listitem semantics to the loaded grid and a status role to its loading state. Lighthouse's prohibited-ARIA audit passes after the change. |
| Contrast audit failed | Existing muted tan `#8c7c5e` text on light brand surfaces does not meet WCAG AA for small text | Left brand colors untouched as instructed. See the contrast section below for failing elements and the smallest considered suggestion. |

## Lighthouse measurements

Measured with Lighthouse 12.8.2 in headless Brave, extensions disabled, using the production build and a local Vercel-style harness with gzip, route headers and CSP. These are comparable local before/after runs, not deployed-preview measurements. The supplied live desktop baseline is recorded separately because it used a different environment and had extensions enabled.

| Device | State | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Mobile | Before | 71 | 91 | 100 | 100 | 4.6 s | 4.6 s | 0 ms | 0.006 |
| Mobile | After | 96 | 95 | 100 | 100 | 1.8 s | 2.6 s | 0 ms | 0 |
| Desktop | Before | 100 | 91 | 100 | 100 | 0.6 s | 0.6 s | 0 ms | 0 |
| Desktop | After | 100 | 95 | 100 | 100 | 0.4 s | 0.6 s | 0 ms | 0 |

Lighthouse reports `color-contrast` as the only remaining failing audit after the changes. Its other accessibility audit for prohibited ARIA attributes now passes. Lighthouse's console-error and inspector-issue audits reported no issues in the local harness. Agentic Browsing is not a Lighthouse category, and its 1/2 result was not independently reproduced here.

The user-provided live desktop result was Performance 100, Accessibility 91, Best Practices 96, SEO 100, FCP 0.5 s, LCP 0.6 s, TBT 0 ms, CLS 0.009. Local before/after values above use the same local harness and should not be compared directly to that extension-enabled live run.

## Remaining contrast findings

The live Lighthouse run did not load all viewport-deferred sections, so a full-page audit of the rendered page also identified the following text groups using `#8c7c5e`:

| Text/background | Measured contrast | Example elements |
|---|---:|---|
| `#8c7c5e` on `#ebe5d8` | 3.24:1 | Quote banner and footer section labels; Lighthouse also reports these footer labels after the change |
| `#8c7c5e` on `#ebe6dc` | 3.27:1 | Section marker 01 |
| `#8c7c5e` on `#f4f0e8` | 3.58:1 | Catalogue and people section markers, section labels |
| `#8c7c5e` on `#f9f6ef` | 3.77:1 | Factory cell numbers, reviewer initials, location label, review carousel text |

For small text, WCAG AA requires 4.5:1. A hue-preserving darkened candidate, `#756547`, reaches at least 4.51:1 on these surfaces. It has not been applied because changing brand colors requires the user's approval.

## Bundle and asset sizes

Production build output after changes:

| Asset | Raw | Gzip |
|---|---:|---:|
| Initial app JS | 217.18 kB | 69.69 kB |
| Initial shared CSS | 44.98 kB | 9.38 kB |
| React initial chunk | 7.16 kB | 2.83 kB |
| Catalogue lazy chunk | 7.14 kB | 2.33 kB |
| Gallery lazy chunk | 5.71 kB | 2.22 kB |
| People lazy chunk | 3.45 kB | 1.42 kB |
| Video gallery lazy chunk | 2.76 kB | 1.28 kB |
| Video player lazy chunk | 2.21 kB | 1.00 kB |
| Spec modal lazy chunk | 3.09 kB | 1.39 kB |

Against the main-branch build, the main JS file changed from 248.82 kB / 78.21 kB gzip to 217.18 kB / 69.69 kB gzip, a 10.9% reduction in gzip size. Lighthouse's estimated unused first-party JS decreased from 28 KiB to 24 KiB. The visualizer report is generated at `client/dist/bundle-analysis.html` and is build output, not a tracked report artifact.

## Verification and limits

- `npm run lint`: passed for client and server.
- `npm run check:js`: passed.
- `npm test --prefix client`: 20 tests passed.
- `npm test` in server: 112 tests passed in the prior verification run.
- `npm run build`: passed; Vite emitted no warnings.
- Local harness Lighthouse: mobile and desktop runs captured, no extension use. Local CSP produced no Lighthouse console errors.
- The deployed Vercel preview was not accessible from this workspace, so deployed CSP behavior was not verified. Re-run Lighthouse and inspect the browser console on the actual preview after deployment.
- Mobile LCP remains 2.6 s in this run, slightly above the 2.5 s target. Run-to-run and network variance apply; no claim is made that the target is met.
- Admin image upload fields were given explicit intrinsic dimensions as well, but admin views are not part of the public Lighthouse home-page score.
