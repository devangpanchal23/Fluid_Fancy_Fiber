# Production Readiness Audit

Audit date: 2026-10-15  
Branch: `codex/prod-hardening`  
Scope: repository source, configuration, installed-package manifests, and the local baseline checks. No application changes have been made yet.

## Stack discovered

| Area | Current implementation |
|---|---|
| Frontend | React 18 SPA, React Router 7, Vite 8, plain JavaScript and CSS |
| Backend | Express 4 on Node.js, exported as a Vercel serverless function and runnable as a local server |
| Data | MongoDB Atlas through Mongoose 8; image bytes in MongoDB documents and video bytes in GridFS |
| Authentication | bcryptjs password hashes, JWT in an HttpOnly cookie, account lockout and route middleware |
| Email | Nodemailer with Gmail SMTP |
| Hosting | One Vercel project; static Vite output plus rewrites to the Express function |
| Tests and quality | Node test runner; small client utility suite; ESLint 9 script exists without an ESLint 9 config; no TypeScript, type-check, formatter, CI workflow or browser-test runner found |

## Routes found

### Browser routes

| Route | Purpose | Audit note |
|---|---|---|
| `/` | Public one-page site with section anchors | Only public route declared in `client/src/main.jsx:31-32` |
| `/admin` and `/admin/` | Admin sign-in | Vercel SPA rewrite plus nested index route |
| `/admin/dashboard` | Dashboard | Protected |
| `/admin/products` | Product list | Protected |
| `/admin/products/new` | Create product | Protected |
| `/admin/products/:id/edit` | Edit product | Protected |
| `/admin/products/:productId/variants` | Product variants | Protected |
| `/admin/products/:productId/variants/new` | Create variant | Protected |
| `/admin/products/:productId/variants/:id/edit` | Edit variant | Protected |
| `/admin/media` | Media library | Protected |
| `/admin/categories` | Category manager | Protected |
| `/admin/videos` | Video list | Protected |
| `/admin/videos/new` | Create video | Protected |
| `/admin/videos/:id/edit` | Edit video | Protected |
| `/admin/video-library` | Uploaded video library | Protected |
| `/admin/people` | People list | Protected |
| `/admin/people/new` | Create person | Protected |
| `/admin/people/:id/edit` | Edit person | Protected |
| `/admin/cone-library` | Cone library list | Protected |
| `/admin/cone-library/new` | Create cone library item | Protected |
| `/admin/cone-library/:id/edit` | Edit cone library item | Protected |
| `/admin/enquiries` | Enquiry inbox | Protected |
| `/admin/settings` | Admin settings | Protected |
| `/admin/profile` | Admin profile | Protected |
| Any other path | No route element | No branded not-found route in `client/src/main.jsx:31-41` or `client/src/admin/AdminApp.jsx:30-62` |

The public experience is one page with in-page anchors, not separate routes. Unknown browser paths currently have no app-level 404 page. `/admin/*` is rewritten to the SPA, but unmatched admin paths also render no page. HTTP status handling for SPA unknown paths depends on Vercel's static fallback and needs deployment verification.

### API routes

| Method and path | Access | Definition |
|---|---|---|
| `GET /api/health` | Public | `server/src/app.js:83` |
| `GET /uploads/:filename` | Public immutable media | `server/src/app.js:76` |
| `GET /video-uploads/:id` | Public immutable video stream | `server/src/app.js:81` |
| `POST /api/enquiries` | Public, rate-limited, validated | `server/src/routes/enquiryRoutes.js:20` |
| `GET /api/enquiries`, `GET /api/enquiries/:id`, `PUT /api/enquiries/:id`, `DELETE /api/enquiries/:id` | Admin | `server/src/routes/enquiryRoutes.js:24-27` |
| `POST /api/admin/login` | Public, rate-limited, per-account lockout | `server/src/routes/adminAuthRoutes.js:27` |
| `POST /api/admin/logout`, `GET /api/admin/me`, `PUT /api/admin/me/password`, `PUT /api/admin/me/profile`, `POST /api/admin/me/change-password` | Admin | `server/src/routes/adminAuthRoutes.js:28-32` |
| `GET /api/products`, `GET /api/products/:id` | Public data with optional admin view | `server/src/routes/productRoutes.js:8-9` |
| `POST /api/products`, `POST /api/products/:id/images`, `PUT /api/products/:id`, `PUT /api/products/:id/reorder`, `DELETE /api/products/:id` | Admin | `server/src/routes/productRoutes.js:10-14` |
| `GET /api/categories` | Public | `server/src/routes/categoryRoutes.js:7` |
| `POST /api/categories`, `PUT /api/categories/:id`, `PUT /api/categories/:id/reorder`, `DELETE /api/categories/:id` | Admin | `server/src/routes/categoryRoutes.js:8-11` |
| `GET /api/people`, `GET /api/people/:id` | Public data with optional admin view | `server/src/routes/personRoutes.js:7-8` |
| `POST /api/people`, `PUT /api/people/:id`, `PUT /api/people/:id/reorder`, `DELETE /api/people/:id` | Admin | `server/src/routes/personRoutes.js:9-12` |
| `GET /api/variants`, `GET /api/variants/:id` | Public data with optional admin view | `server/src/routes/variantRoutes.js:8-9` |
| `POST /api/variants`, `POST /api/variants/:id/images`, `PUT /api/variants/:id`, `PUT /api/variants/:id/reorder`, `DELETE /api/variants/:id` | Admin | `server/src/routes/variantRoutes.js:10-14` |
| `POST /api/uploads`, `DELETE /api/uploads/:filename` | Admin | `server/src/routes/uploadRoutes.js:8-9` |
| `GET /api/media`, `POST /api/media`, `PUT /api/media/:id`, `DELETE /api/media/:id` | Admin | `server/src/routes/mediaRoutes.js:11-14` |
| `GET /api/videos`, `GET /api/videos/:id` | Public data with optional admin view | `server/src/routes/videoRoutes.js:7-8` |
| `POST /api/videos`, `PUT /api/videos/:id`, `PUT /api/videos/:id/reorder`, `DELETE /api/videos/:id` | Admin | `server/src/routes/videoRoutes.js:9-12` |
| `GET /api/video-assets`, `DELETE /api/video-assets/:id` | Admin | `server/src/routes/videoAssetRoutes.js:14-15` |
| `POST /api/video-assets/uploads`, `PUT /api/video-assets/uploads/:uploadId/chunks/:index`, `POST /api/video-assets/uploads/:uploadId/complete`, `DELETE /api/video-assets/uploads/:uploadId` | Admin, chunked upload | `server/src/routes/videoAssetRoutes.js:18-21` |
| `GET /api/cone-library` | Public data with optional admin view | `server/src/routes/coneProductRoutes.js:14` |
| `GET /api/cone-library/:id`, `POST /api/cone-library`, `PUT /api/cone-library/:id`, `PUT /api/cone-library/:id/reorder`, `DELETE /api/cone-library/:id` | Admin | `server/src/routes/coneProductRoutes.js:15-19` |
| Any unmatched API path | Public JSON 404 | `server/src/middleware/errorHandler.js:1-4` |

## Findings and planned fixes

The table below records the root causes identified before implementation. Implementation status and verification are summarized in the close-out section at the end of this file.

| Severity | Location | Root cause and symptom | Planned fix |
|---|---|---|---|
| High | `server/src/middleware/errorHandler.js:6-14` | Arbitrary exception messages are returned to clients, potentially exposing MongoDB, validation or infrastructure details. Error bodies vary across route handlers. | Use one stable public error shape and safe messages; keep diagnostic detail in server logs with request correlation. Preserve validation details only when intentionally safe. |
| High | `server/src/app.js:44-65` | CORS accepts every `*.vercel.app` origin and any subdomain of the production domain while credentialed requests are enabled. This is broader than the deployed application needs. | Restrict production origins to explicit configured domains and retain explicit local development origins. |
| High | `server/src/app.js:36-69`; `vercel.json` | No application security-header middleware or Vercel security-header rules are present. | Add a brand-compatible header policy (CSP, HSTS, frame/content-type/referrer/permissions controls) after checking required image, video, font and analytics sources. |
| High | `server/src/scripts/seedAdmin.js:9-15`; `server/.env.example:10-17`; `README.md:292` | The documented and script fallback uses a known weak starter password if deployment variables are absent. | Require explicit high-entropy seed credentials; remove working default credentials from examples and docs without changing existing database records. |
| High | `server/src/middleware/upload.js:3-16`; `server/src/utils/imageStorage.js:25-38` | Upload acceptance trusts the client-supplied MIME type and persists bytes without checking file signatures or decoding the image. | Validate actual file signatures and dimensions, reject malformed/polyglot data, preserve current supported formats and size limit. |
| Critical | Root `package-lock.json`, `concurrently` -> `shell-quote` | `npm audit` reports command-injection advisory affecting the resolved `shell-quote` version used by the root development command. | Apply non-breaking lockfile remediation and re-run all scripts; avoid force-upgrading unrelated major packages. |
| Critical | `server/package-lock.json`, `proxy-addr` | `npm audit` reports IPv4-mapped IPv6 trust-subnet spoofing in the resolved dependency, relevant because Express trusts one proxy hop. | Apply a safe dependency update and verify proxy/IP-based rate-limit behavior. |
| High | `client/package-lock.json`, `brace-expansion`, `source-map-js` | `npm audit` reports denial-of-service advisories in the resolved client dependency graph. | Apply non-breaking lockfile updates and re-run client lint/tests/build. |
| High | `server/package-lock.json`, `brace-expansion` / `braces` via `nodemon` / `chokidar` | `npm audit` reports vulnerable pattern-expansion dependencies, including a transitive path whose suggested force fix downgrades nodemon to an obsolete release. | Upgrade the development watcher to a maintained compatible release or replace it; do not use the suggested breaking force downgrade. |
| Moderate | `server/package-lock.json`, `multer` | `npm audit` reports an upload denial-of-service advisory for the current Multer release. | Apply a non-breaking update and retain upload memory/file-size safeguards. |
| Moderate | `server/package-lock.json`, `qs` | `npm audit` reports request/query parsing denial-of-service advisories in the resolved version. | Apply a non-breaking transitive update and verify query parsing behavior. |
| High | `server/src/middleware/errorHandler.js:1-4`; `client/src/main.jsx:31-41`; `client/src/admin/AdminApp.jsx:30-62`; `vercel.json` | Browser 404 and component-level 500 states are missing; unmatched routes can render a blank screen. Static SPA fallback cannot reliably set a 404 status without explicit hosting behavior. | Add branded not-found and error-boundary/loading UI; configure Vercel routing for correct status where supported and test deployed preview behavior. |
| High | `server/src/controllers/enquiryController.js:9-17`; `server/src/utils/mailer.js` | Enquiry is persisted before synchronous customer email. SMTP failure returns 503 after the record is saved; retry can create duplicate enquiries, and there is no delivery state/retry queue. | Make email delivery state explicit and safely retryable without deleting or migrating existing enquiry data destructively. Prefer an additive outbox/delivery record and idempotency key if deployment storage permits. |
| Medium | `server/src/config/db.js:30-57` | A cached MongoDB connection is present, but pool size, socket/connect timeouts and selection behavior are largely defaults; `server/src/app.js:94-105` catches connection failures generically. | Set measured serverless-appropriate pool/timeouts and retain retry behavior; improve health diagnostics without exposing connection strings. Do not change Atlas target or credentials. |
| Medium | `server/src/controllers/categoryController.js:5-10`; `coneProductController.js:49-56,80-81,133-141`; `personController.js:31-53,159-179` | Category/cone/person reads and reorder operations load full collections into memory. Cone product creation reads the whole collection just to find the next order. | Add database sorting/pagination/projections where semantics allow; use count/query-based order allocation while preserving current pinned-person ordering. |
| Medium | `client/src/components/Catalogue.jsx:83-103` | Catalogue performs one products request followed by one variants request per product, creating N+1 network round trips and delaying catalogue completion. | Add an additive batched endpoint or fetch strategy, keep existing response contracts and static fallback. |
| Medium | `server/src/controllers/enquiryController.js:44-57` | Enquiry search interpolates raw query text into a regular expression. Admin-only access reduces exposure but crafted regex can consume database CPU. | Escape literal search input, enforce length limits, and use indexed search where practical. |
| Medium | `server/src/controllers/*Controller.js` list/read handlers | Several paginated list queries return hydrated Mongoose documents and some public collections are unbounded; extra document hydration and payloads grow with records. | Use safe projections and `lean()` on read-only list paths, preserve serialization shape, cap public limits, and add only query-backed indexes after checking existing Atlas indexes. |
| Medium | `client/src/components/VideoGallery.jsx:8-27`; `Catalogue.jsx:47-115`; `People.jsx:39-55`; `client/src/api/enquiries.js:5-15` | Public fetches have no timeout; several failures are swallowed and render empty sections/static fallbacks with no recovery affordance. | Add shared timeout/error handling, visible retry/empty states where appropriate, and keep fallbacks that protect the visual layout. |
| Medium | `client/src/components/VideoGallery.jsx:37-38`; `client/src/components/Gallery.jsx:122,189`; `client/src/components/VideoPlayer.jsx` | Video section disappears as a one-pixel placeholder when no videos load; gallery images do not consistently expose an image fallback state. | Preserve section spacing and provide visually consistent empty/error/image-failure states without changing the design identity. |
| Medium | `client/index.html:6-17`; `client/public` | Static title/description only; OG image points at `/src/assets/...`, which Vite does not publish as that URL. Canonical, robots, sitemap, web manifest and structured data are missing. | Fix built asset URL and add canonical/social metadata plus robots/sitemap and suitable Organization/WebSite structured data. |
| Medium | `vercel.json:1-11`; no `public/robots.txt` or sitemap | Static asset caching, redirect canonicalization and explicit security headers are not configured. Production www/non-www/HTTPS behavior has not been verified. | Add immutable cache headers only for fingerprinted assets, safe redirect rules after checking the configured domain, and deployment verification. |
| Medium | `client/src/components/SpecModal.jsx`; `client/src/components/Gallery.jsx`; admin dialogs | Dialogs have keyboard close behavior, but focus trapping/return, initial focus and background scroll management are inconsistent or absent. | Standardize accessible dialog focus and close behavior, preserve existing styling, and verify keyboard/touch operation. |
| Medium | `server/src/controllers/personController.js:47-52`; `coneProductController.js:52-56` | In-memory sorting and pagination occurs after fetching all rows. | Move ordering/paging to MongoDB only when equivalent ordering can be preserved; maintain deterministic tie-breaking. |
| Low | `client/package.json:11-15` | `lint` script is present but ESLint 9 cannot find `eslint.config.*`; no project lint config exists. | Add a minimal ESLint 9 flat config and fix real findings; do not suppress rules globally. |
| Low | Root/client/server `package.json` | No repository-wide type-check exists (project is JavaScript); no formatter or CI workflow is configured. | Add a PR workflow that runs lint, tests and build. Avoid a no-op type-check script; document JavaScript-only checking or add JSDoc checks if they add value. |
| Low | `client/index.html:13-17`; CSS font references | Fonts are fetched from Google Fonts at runtime. This adds a third-party dependency and may affect render timing; no measured font CLS data is available. | Measure first; preserve Barlow and Barlow Condensed exactly, then self-host only if licensing/source files are available and the performance result justifies it. |
| Low | `server/src/utils/imageStorage.js:50-53`; `videoStreamController.js:17-20` | Some media reads are correctly projected, but media bodies are still buffered in MongoDB documents and the video path performs metadata lookups per stream. | Keep payload projection and range support; measure query cost and use indexes/projections before changing storage architecture. |

## Existing protections observed

- Every mutating CMS route is behind `requireAdmin`; media/video libraries are admin-only. Public catalogue reads intentionally use optional admin context to hide drafts from anonymous visitors.
- Admin passwords are bcrypt-hashed; session JWTs are stored in HttpOnly cookies, use Secure in production, SameSite=Lax, expire after eight hours, and support token-version invalidation.
- Login and public enquiry submissions have express-rate-limit controls; login also has persistent per-account lockout.
- Image upload has a 5 MiB size cap and a MIME allowlist. Video upload is chunked and has explicit chunk/file size validation.
- Image and video public URLs use randomized/immutable identifiers and one-year immutable cache headers.
- Schemas use timestamps throughout the inspected models. Several high-use fields already have indexes, including product/category slugs, variant SKU/product, media filename, and ordering fields.
- Vercel deployment currently keeps `MONGODB_URI` and admin credentials server-side. `.env` files are ignored by Git.

## Baseline checks and metrics

| Check | Baseline |
|---|---|
| Client production build | Pass, Vite 8.3.0; 94 modules transformed; no build warnings shown |
| Client bundle (gzip) | Main JS 76.05 kB; admin JS 21.86 kB (lazy chunk); main CSS 8.95 kB; admin CSS 3.69 kB |
| Largest included image asset | `factory-floor` WebP 351.01 kB |
| Client tests | 20 passed, 0 failed |
| Server tests | 6 passed, 0 failed, 10 skipped because local MongoDB is unavailable; test harness targets isolated `fluid_fibers_test`, not Atlas |
| Client lint | Fails before changes: ESLint 9.39.5 has no `eslint.config.*` |
| Type-check | Not configured; JavaScript-only project |
| `npm audit` | Network audit completed with escalation: root 2 Critical (`shell-quote`); client 2 High (`brace-expansion`, `source-map-js`); server 7 total (1 Critical `proxy-addr`, 4 High incl. `brace-expansion`/`braces`, 2 Moderate `multer`/`qs`) |
| Lighthouse / Core Web Vitals | Not captured yet; no local Lighthouse runner or deployed preview URL/access was present during baseline inspection |
| Route/API smoke checks | Source inventory complete; database-backed routes could not be meaningfully exercised because no local MongoDB is available. Production Atlas will not be used for destructive testing. |

## Scope limits to resolve during implementation

- No preview deployment URL or Vercel deployment access is available in the repository context. I will make the local app deploy-ready and run local smoke checks; remote preview behavior, Vercel environment completeness and deployed Lighthouse numbers require a preview URL and access.
- MongoDB Atlas query plans and current production indexes cannot be inspected safely from this local checkout. No Atlas credentials/connection target will be changed, and no production writes or migrations will be run.
- npm audit is available and has identified the dependency advisories above. Any remediation will use maintained compatible versions; no forced downgrade will be accepted.

## Audit close-out

The findings above drove the hardening work documented in [FINAL_REPORT.md](FINAL_REPORT.md). The code-side changes and local checks are complete. External checks remain open where they require Vercel/production access or a Lighthouse-capable browser: live domain redirects, Vercel environment values, Atlas explain plans, deployed route status, and mobile/desktop Lighthouse metrics. No production data, Atlas target, or credentials were changed. The dependency advisories listed under the baseline describe the pre-fix state; full dependency audits after dependency remediation reported zero vulnerabilities, while a final network-dependent audit refresh could not complete because npm registry DNS was unavailable.
