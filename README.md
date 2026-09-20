# Fluid Fancy Fibre

A production-style marketing site for **Fluid Fancy Fibre LLP**, a ring-spun yarn manufacturer and exporter, with a full **Admin CMS** at `/admin` for managing the catalogue and enquiries. Built as a MERN-stack project: a React/Vite frontend with a custom (framework-free) design system, backed by an Express + MongoDB API.

## Overview

The public site (`/`) is a single continuous scrolling page covering the full marketing funnel for a B2B yarn exporter: hero, value proposition, catalogue, manufacturing process, company story, team, case study, testimonials, FAQ, and a contact form.

The catalogue shown on the public site is now backed by MongoDB — products are managed through the Admin CMS at `/admin` (login, dashboard, product/category/enquiry management), with the public catalogue fetching only `active` products from the API. The admin area is code-split from the public bundle (lazy-loaded), so it adds zero weight to the public site's initial load.

## Key Features

- **Single-page scroll experience** — sticky header with scroll-spy navigation, a scroll-progress bar, and a "back to top" control.
- **Preloader** shown on first load.
- **Hero** with a parallax product photo and animated headline reveal.
- **Why Us** — a 4-card value-proposition grid (consistency, traceability, sampling turnaround, export paperwork) with hover animation.
- **Animated stat counters** (years exporting, production lines, traceability %, export markets) that count up into view.
- **Scrolling word ticker** of yarn types.
- **Quote banner** — a mid-page conversion CTA wired to the spec-request modal.
- **Catalogue** — a two-level accordion (Product/Type → Variant) with a cross-fading sticky image preview on hover and a category filter; see [Product Hierarchy](#product-hierarchy).
- **Photo gallery** of yarn/cone samples.
- **Video gallery** ("On the floor") — published videos from the admin, click-to-play cards; the section is simply omitted when there are no published videos. See [Video Gallery](#video-gallery).
- **Process timeline** — a 5-step manufacturing process with a scroll-driven progress line.
- **Mill/story section** with a parallax photo and company credentials.
- **Team cards** ("People") — fetched from `GET /api/people`, falling back to the site's static roster if the API/database is unreachable, same resilience pattern as the Catalogue. Uploaded photos when set, initials-based avatars otherwise.
- **Case study / proof section** with metrics.
- **Testimonials** — a card grid plus a marquee of short reviews.
- **FAQ accordion**.
- **Contact form** and a **"request spec sheet" modal** (global CTA + per-catalogue-line), both posting to the API.
- **Footer** with sitemap-style link columns.
- Scroll-reveal animations throughout (`IntersectionObserver`-based), a magnetic-button hover effect, and full `prefers-reduced-motion` support (disables all animation/parallax).
- Fully responsive via fluid `clamp()` typography/spacing and CSS Grid `auto-fit` layouts — the only hard breakpoint (900px) switches the header between desktop nav and a mobile hamburger menu.
- **The public Catalogue section fetches Product/Type and Variant data from the API** (only `active` Types / `isActive` Variants), falling back to the site's original static (flat) catalogue data if the API/database is unreachable — the public page never breaks because of backend availability.

### Admin CMS (`/admin`)

- **Real authentication** — email + password, `bcryptjs` password hashing, JWT stored in an `httpOnly` cookie (not `localStorage`), login rate limiting (10/15 min) and account lockout after 5 failed attempts (15 min), server-side session verification on every protected request. No public signup — the one admin account is created via a seed script from environment variables.
- **Dashboard** — total/active/draft product counts, total variants, total categories, total videos, total people, total enquiries, recent products, recent enquiries, quick actions.
- **Product/Type CMS** — CRUD with search, status/category filters, sort, pagination, reordering; Draft/Active/Archived status; Featured toggle. Each Type links to its own **Variant** manager for SKU, dynamic key-value specifications, and a reorderable, real file-upload image gallery with a "Make primary" action (see [Product Hierarchy](#product-hierarchy) and [Image Uploads](#image-uploads)).
- **Category management** — add/rename/activate/deactivate/delete/reorder, with an uploaded image per category, and delete blocked while any product still references the category.
- **Video Gallery management** — upload direct-to-Cloudinary with a real progress bar, title/description, optional thumbnail override, publish/draft toggle, reordering, delete (see [Video Gallery](#video-gallery)).
- **People/Team management** — full CRUD (name, designation, email, phone, bio, uploaded photo, links, active/inactive, display order) with search and up/down reordering; the public People section renders whatever's here.
- **Cone library management** — full CRUD for the "Cone library" grid (product image picked from the Media Library or uploaded, product name, product details), all three required, with up/down reordering; the public Cone library section renders whatever's here. On a fresh database run `npm run seed:cone-library --prefix server` once to load the six original cards.
- **Enquiry management** — the existing contact-form and spec-sheet submissions, now listable/searchable/paginated with a status workflow (`New → In Progress → Contacted → Closed → Archived`) and delete.
- **Premium, on-brand UI** — reuses the public site's exact design tokens (palette, typography, "blueprint" corner marks), not a generic admin template: responsive sidebar + mobile drawer, header with a profile menu, breadcrumbs, toast notifications, confirmation dialogs before destructive actions, and loading/empty/error states throughout.
- Fully code-split from the public bundle (`React.lazy`) — visiting `/` never downloads the admin JS/CSS.

## Technology Stack

**Frontend (`client/`)**
- React 18
- Vite 8 (`@vitejs/plugin-react`)
- `react-router-dom` 7 — only used to separate `/` (public site) from `/admin/*` (CMS); the public site itself still has no in-page routing
- Plain CSS with design tokens (CSS custom properties) — no UI/component framework, no Bootstrap/Tailwind. The admin CMS reuses the exact same tokens via its own `admin.css` (loaded only on `/admin` routes)
- ESLint (flat config not yet present — see [Known Issues](#known-issues))

**Backend (`server/`)**
- Node.js + Express 4
- MongoDB via Mongoose 8 (`Admin`, `Category`, `Product`, `Enquiry` models)
- `bcryptjs` — admin password hashing
- `jsonwebtoken` — admin session tokens
- `cookie-parser` — reads the `httpOnly` session cookie
- `nodemailer` — sends enquiry-notification emails via Gmail SMTP
- `cors` (origin restricted to the configured client URL, `credentials: true` for the session cookie)
- `express-rate-limit` — 20 requests/15 min on the public enquiry-submission endpoint, 10 requests/15 min on admin login (separate limiters; the admin CMS's own authenticated calls are not throttled by either)
- `dotenv` for environment configuration
- `nodemon` for local development

**Database**
- MongoDB, four collections:
  - `admins` — the single admin account (email, bcrypt hash, lockout state)
  - `categories` — product categories
  - `products` — the catalogue (source of truth for the public site's Catalogue section)
  - `enquiries` — contact-form and spec-sheet-request submissions (`type: "contact" | "spec"`)

**Authentication**
- Email + password login against the `Admin` model, `bcryptjs`-hashed passwords, a JWT (8h expiry) issued on login and set as an `httpOnly`, `SameSite=Lax` cookie (`secure` in production). Every admin/product-write/category-write/enquiry route is protected by server-side middleware that verifies this cookie — there is no client-side-only gate. No public signup; the account is created by an environment-variable-driven seed script (see [Admin Setup](#admin-setup)).

## Project Structure

```
fff/
├── api/
│   └── index.js                 Vercel serverless entry point (wraps server/src/app.js)
├── vercel.json                  Single-project build/routing config (client build + API function + SPA fallback for /admin)
├── client/                      React app (Vite)
│   ├── src/
│   │   ├── components/          Public-site sections (Hero, Catalogue, Gallery, VideoGallery, Process, Mill, People, Proof, Reviews, Faq, Contact, Footer, WhyUs, QuoteBanner, Header, etc.)
│   │   ├── admin/                Admin CMS — code-split from the public bundle
│   │   │   ├── AdminApp.jsx      Route table for everything under /admin
│   │   │   ├── admin.css         Admin-only styles (reuses the public site's design tokens)
│   │   │   ├── api/client.js     Fetch wrapper (credentials: "include", { success, data } handling)
│   │   │   ├── context/          AdminAuthContext (session state), ToastContext
│   │   │   ├── components/       AdminLayout, AdminSidebar, AdminHeader, ProtectedRoute, ConfirmDialog, ProductImageUploader, ImageUploader, VideoUploader, EnquiryDetails
│   │   │   └── pages/             AdminLogin, Dashboard, ProductList, ProductForm, VariantList, VariantForm, CategoryManager, VideoList, VideoForm, PersonList, PersonForm, EnquiryList, Settings
│   │   ├── data/content.js      Site copy/content arrays (also the source the product migration script mirrors)
│   │   ├── hooks/                useReveal, useScrollProgress, useCountUp, useMagnetic, useMediaQuery, useActiveSection
│   │   ├── api/enquiries.js     Fetch wrapper for the public contact/spec-sheet forms
│   │   ├── assets/images/       Product photography
│   │   ├── App.jsx              Public site section composition/order
│   │   ├── main.jsx             React entry point — routes "/" to App, "/admin/*" to the lazy-loaded AdminApp
│   │   └── index.css            Design tokens + all public-site component styles
│   ├── index.html
│   ├── vite.config.js
│   └── .env.example
├── server/                      Express API
│   └── src/
│       ├── app.js               Express app: CORS, cookies, routes (no .listen — used by both server.js and api/index.js)
│       ├── server.js            Traditional entry point (`npm start`): connects DB, then app.listen()
│       ├── config/db.js         MongoDB connection (cached for serverless reuse)
│       ├── models/               Admin, Category, Product (Type), Variant, Video, Person, Enquiry (Mongoose schemas)
│       ├── controllers/          adminAuthController, categoryController, productController, variantController, videoController, personController, enquiryController, uploadController
│       ├── routes/               adminAuthRoutes, categoryRoutes, productRoutes, variantRoutes, videoRoutes, personRoutes, enquiryRoutes, uploadRoutes
│       ├── middleware/           auth (requireAdmin / attachAdminIfPresent), validateEnquiry, upload (multer config), errorHandler
│       ├── utils/                jwt.js (sign/verify), slugify.js, mailer.js (Gmail SMTP enquiry notifications), imageStorage.js (local file save/delete — see Image Uploads)
│       ├── scripts/              seedAdmin.js, migrateProducts.js, migrateProductsToVariants.js (see Product Hierarchy)
│       └── __tests__/            Automated tests (node:test)
│   ├── uploads/                  Local-dev image upload destination (git-ignored except .gitkeep) — served at /uploads
│   └── .env.example
├── package.json                 Root convenience scripts (runs client + server together)
└── .gitignore
```

## Routes

**Public site (`/`)** — a single-page app with no client-side routes; in-page navigation uses hash anchors: `#top`, `#catalogue`, `#process`, `#mill`, `#people`, `#reviews`, `#faq`, `#contact`.

**Admin CMS (`/admin`)** — real client-side routes (`react-router-dom`), all except the login page protected server-side:

| Route                          | Page                          |
|---------------------------------|--------------------------------|
| `/admin`                        | Login (redirects to dashboard if already signed in) |
| `/admin/dashboard`               | Dashboard                      |
| `/admin/products`                | Product list (search/filter/sort/pagination) |
| `/admin/products/new`            | Create product                 |
| `/admin/products/:id/edit`       | Edit product                   |
| `/admin/categories`              | Category management            |
| `/admin/enquiries`               | Enquiry management              |
| `/admin/settings`                | Account settings / change password |

Visiting a protected `/admin/*` route while logged out redirects to `/admin`; visiting `/admin` while already logged in redirects to `/admin/dashboard`.

### API Endpoints (`server/`)

All responses use `{ success: true, data }` or `{ success: false, message, errors? }`, **except** `POST /api/enquiries` and `GET /api/health`, which predate this convention and are kept backward-compatible (the public contact form and spec-sheet modal already depend on their exact response shape).

| Method | Path                        | Auth        | Description |
|--------|-----------------------------|-------------|--------------|
| GET    | `/api/health`               | Public      | Health check — `{ ok: true, service: "fluid-fibers-api" }` |
| POST   | `/api/admin/login`          | Public      | Email + password login; sets the session cookie. Rate-limited (10/15 min) |
| POST   | `/api/admin/logout`         | Admin       | Clears the session cookie |
| GET    | `/api/admin/me`             | Admin       | Current admin profile |
| PUT    | `/api/admin/me/password`    | Admin       | Change password (requires current password) |
| PUT    | `/api/admin/me/profile`     | Admin       | Update the logged-in admin's own username and/or email — `{ name?, email?, currentPassword? }`; changing the email needs `currentPassword` |
| POST   | `/api/admin/me/change-password` | Admin   | `{ currentPassword, newPassword, confirmPassword }` — 10+ chars with a letter and a number; ends every session, so the admin logs in again |
| GET    | `/api/products`             | Public\*    | List products/Types — `?q=&status=&category=&featured=&page=&limit=&sort=` (default sort `order -featured`). Anonymous callers always get `status=active` only, regardless of query |
| GET    | `/api/products/:id`         | Public\*    | Get one product/Type (404 if not `active` and not an admin) |
| POST   | `/api/products`             | Admin       | Create a product/Type (validated; rejects duplicate slug) — see [Product Hierarchy](#product-hierarchy) |
| PUT    | `/api/products/:id`         | Admin       | Update a product/Type |
| PUT    | `/api/products/:id/reorder` | Admin       | Swap `order` with the previous/next product — `{ direction: "up" \| "down" }` |
| DELETE | `/api/products/:id`         | Admin       | Archive (soft-delete); `?hard=true` permanently deletes it and its Variants |
| GET    | `/api/variants`             | Public\*    | List Variants for one product — `?product=<id>` (required for non-admin callers) `&page=&limit=&sort=`. Anonymous callers always get `isActive=true` only |
| GET    | `/api/variants/:id`         | Public\*    | Get one variant (404 if inactive and not an admin) |
| POST   | `/api/variants`             | Admin       | Create a variant under a product (validated; rejects duplicate SKU) |
| PUT    | `/api/variants/:id`         | Admin       | Update a variant (name, sku, dynamic `specs`, `images`, `isActive`) |
| PUT    | `/api/variants/:id/reorder` | Admin       | Swap `order` with the previous/next variant under the same product |
| DELETE | `/api/variants/:id`         | Admin       | Delete permanently |
| GET    | `/api/videos`               | Public\*    | List videos — `?status=&page=&limit=&sort=`. Anonymous callers always get `status=published` only |
| GET    | `/api/videos/:id`           | Public\*    | Get one video (404 if not `published` and not an admin) |
| POST   | `/api/videos`               | Admin       | Save a video's metadata (title, description, Cloudinary `url`/`publicId`, thumbnail, duration) — the file itself is uploaded client-side directly to Cloudinary first, see [Video Gallery](#video-gallery) |
| PUT    | `/api/videos/:id`           | Admin       | Update a video / change its status |
| PUT    | `/api/videos/:id/reorder`   | Admin       | Swap `order` with the previous/next video |
| DELETE | `/api/videos/:id`           | Admin       | Delete the record and best-effort delete the asset from Cloudinary |
| GET    | `/api/categories`           | Public      | List categories (`?activeOnly=true` to filter), sorted by `order` then `name` |
| POST   | `/api/categories`           | Admin       | Create a category (name, description, image, order) |
| PUT    | `/api/categories/:id`       | Admin       | Update a category / toggle active |
| PUT    | `/api/categories/:id/reorder` | Admin     | Swap `order` with the previous/next category — `{ direction: "up" \| "down" }` |
| DELETE | `/api/categories/:id`       | Admin       | Delete (blocked with `409` while any product still uses it) |
| GET    | `/api/people`               | Public\*    | List team members — `?q=&activeOnly=&page=&limit=&sort=`. Anonymous callers always get active-only |
| GET    | `/api/people/:id`           | Public\*    | Get one person (404 if inactive and not an admin) |
| POST   | `/api/people`               | Admin       | Create a person |
| PUT    | `/api/people/:id`           | Admin       | Update a person |
| PUT    | `/api/people/:id/reorder`   | Admin       | Swap `order` with the previous/next person — `{ direction: "up" \| "down" }` |
| DELETE | `/api/people/:id`           | Admin       | Delete permanently |
| GET    | `/api/cone-library`         | Public      | List Cone library products in display order (never cached) |
| GET    | `/api/cone-library/:id`     | Admin       | Get one product |
| POST   | `/api/cone-library`         | Admin       | Create a product — `{ image, productName, productDetails }`, all required |
| PUT    | `/api/cone-library/:id`     | Admin       | Update a product (a sent field can't be blanked) |
| PUT    | `/api/cone-library/:id/reorder` | Admin   | Move a product one place — `{ direction: "up" | "down" }` |
| DELETE | `/api/cone-library/:id`     | Admin       | Delete permanently |
| POST   | `/api/uploads`              | Admin       | Upload one image file (multipart `image` field, JPEG/PNG/WEBP/GIF, max 5MB) — returns `{ url, filename }` |
| DELETE | `/api/uploads/:filename`    | Admin       | Delete a previously-uploaded file from local storage |
| POST   | `/api/enquiries`            | Public      | Create a contact or spec-sheet-request submission (rate-limited, validated) — response shape: `{ message, id }` / `{ error }` |
| GET    | `/api/enquiries`            | Admin       | List submissions — `?type=&status=&q=&page=&limit=` |
| GET    | `/api/enquiries/:id`        | Admin       | Get one submission |
| PUT    | `/api/enquiries/:id`        | Admin       | Update status (`new`, `in_progress`, `contacted`, `closed`, `archived`) |
| DELETE | `/api/enquiries/:id`        | Admin       | Delete permanently |

\* `attachAdminIfPresent` middleware: if a valid admin session cookie is present the response includes non-active products/variants/videos too (for the CMS); otherwise it's silently restricted to public-visible only — a public caller cannot bypass this by passing `?status=draft`.

## Product Hierarchy

The catalogue is modelled as **Category → Product (Type/Material) → Variant → Specifications**, so a client can add new materials and variants (each with its own composition, count range, application, images, and anything else) from the admin without any code changes:

- **Category** (`Category` model) — e.g. "Mono Yarn". Has its own single `image`.
- **Product** (`Product` model, admin-labelled "Product/Type") — e.g. "Polyester" or "Nylon" under that category. Holds descriptive/grouping fields (name, tag, description, features, status, order) plus its own `images` gallery.
- **Variant** (`Variant` model) — e.g. "Cascatian" under "Nylon". This is where all commercial detail lives: SKU, its own `images` gallery, and `specs`.
- **Specifications** — `Variant.specs` is a free-form `[{key, value}]` list, not fixed columns. Composition, Count Range, Application, Twist, Finish, or anything else are just rows an admin adds in the Variant form's "Specifications" fieldset — new fields never require a code change.

In the admin, manage Products under **Products** — each has its own image gallery in its form — then click "Variants" on a product's row to manage its Variants (each with its own gallery too; there's no separate global gallery page). Publicly, the Catalogue accordion is now two levels deep: clicking a Product/Type row reveals its Variants, clicking a Variant reveals its specs and a "Request this spec" button.

### Catalogue preview image sync

Every selectable item (Category, Product/Type, Variant) can have its own image, and the right-side catalogue preview always shows the exact image belonging to whatever's currently selected — looked up by that item's own database `_id`, never by array index or display name, so `poly_b1` and `poly_b2` can never accidentally show each other's picture. `Catalogue.jsx`'s `resolveGallery()` implements the fallback chain when the selected level has no image of its own:

```
Selected Variant's own images
  → (none) Variant's parent Product/Type's images
  → (none) that Product's Category's image
  → (none) guaranteed-good bundled default asset
```

All of it comes from the same single API response already fetched for the accordion (`/api/products` + `/api/variants`) — selecting a different item never triggers another network request or a page reload, it's a pure state update. A `CatalogueImage` helper component remounts whenever the resolved source changes and swaps to the bundled default if a URL 404s, so a missing or broken uploaded file can never render as a broken-image icon.

**Migrating existing data:** earlier versions of this app stored SKU/composition/count/specs/images directly on `Product`. If you have a database from before this change, run `npm run migrate:variants` (from `server/`) once after deploying — for every Product with no Variant yet, it creates a `"Default"` Variant carrying that old data over, so nothing is lost. Safe to re-run (skips Products that already have a Variant).

## Video Gallery

Admin-managed videos, uploaded **directly from the browser to Cloudinary** (never through this server) via an unsigned upload preset — this sidesteps Vercel serverless request-size/timeout limits entirely, since the file never touches an Express function. Our server only ever stores the resulting `{url, publicId, thumbnail, duration}` metadata in MongoDB and, on delete, calls Cloudinary's Admin API (server-side secret key) to remove the asset.

**One-time setup**, per Cloudinary account:
1. Cloudinary dashboard → Settings → Upload → Upload presets → **Add upload preset**.
2. Signing Mode: **Unsigned**. Restrict allowed formats to video types (mp4, webm, mov) if you want.
3. Copy the cloud name and preset name into `client/.env` (`VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`) — both are meant to be public, an unsigned preset name is not a secret by Cloudinary's own design.
4. Copy your API key/secret into `server/.env` (`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) — used only for server-side delete.

Without this configured, the admin video uploader shows a clear inline error rather than failing silently; everything else in the app is unaffected.

## Environment Variables

**`client/.env`** (copy from `client/.env.example`)

| Variable         | Description                                  | Example                        |
|------------------|-----------------------------------------------|---------------------------------|
| `VITE_API_URL`   | Base URL of the backend API                  | `http://localhost:5000/api`    |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name, for direct browser video uploads (see [Video Gallery](#video-gallery)) | `your-cloud-name` |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | An *unsigned* Cloudinary upload preset name (create it in the Cloudinary dashboard) | `fluid-fibers-videos` |

**`server/.env`** (copy from `server/.env.example`)

| Variable         | Description                                  | Example                                          |
|------------------|-----------------------------------------------|----------------------------------------------------|
| `PORT`           | Port the Express server listens on            | `5000`                                             |
| `MONGODB_URI`    | MongoDB connection string                     | `mongodb://127.0.0.1:27017/fluid_fibers`           |
| `CLIENT_ORIGIN`  | Allowed CORS origin (the deployed frontend URL) | `http://localhost:5173`                          |
| `JWT_SECRET`     | Signs admin session tokens — must be a long random string, never reused/guessable | generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `NODE_ENV`       | `production` makes the session cookie `secure` (HTTPS-only) | `development` locally, `production` on Vercel |
| `ADMIN_EMAIL`    | Used only by `npm run seed:admin` to create/update the admin account | `admin@example.com` |
| `ADMIN_PASSWORD` | Used only by `npm run seed:admin`. **Quote it** if it contains `#` or other special characters — dotenv treats an unquoted `#` as a comment and silently truncates the value | `"a-strong-password-#123"` |
| `ADMIN_NAME`     | Optional display name for the seeded admin     | `Admin` |
| `EMAIL_USER`     | Gmail address used to send contact-form/spec-sheet notifications (optional — see [Email Notifications](#email-notifications)) | `you@gmail.com` |
| `EMAIL_PASS`     | A Gmail **App Password** for that account, not its regular password. Quote it — it contains spaces | `"abcd efgh ijkl mnop"` |
| `NOTIFY_EMAIL`   | Who receives the notification. Defaults to `EMAIL_USER` if unset | `fluidfancyenterprisepvtltd@gmail.com` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Used only to delete a video from Cloudinary when it's deleted in the admin (optional — if unset, deleting a video still removes the MongoDB record but leaves the file on Cloudinary, logged as a warning) | from the Cloudinary dashboard's Access Keys |

`.env` files are git-ignored; only `.env.example` files are committed. No real credentials are present in this repository. `ADMIN_EMAIL`/`ADMIN_PASSWORD` are read only by the one-off seed script, not at request time — safe to remove from `.env` after seeding.

## Installation

```bash
git clone https://github.com/devangpanchal23/Fluid_Fancy_Fiber.git
cd Fluid_Fancy_Fiber
npm run install:all
```

Then configure environment variables:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env` and set `MONGODB_URI` to a local MongoDB instance or a MongoDB Atlas connection string, and set `JWT_SECRET` (see the table above for how to generate one).

## Admin Setup

The admin account isn't created by signing up — it's seeded from environment variables. With `server/.env` configured (`MONGODB_URI`, and `ADMIN_EMAIL`/`ADMIN_PASSWORD` set):

```bash
cd server
npm run seed:admin
```

Re-running it is safe — it updates the password of the existing account instead of creating a duplicate. Then log in at `http://localhost:5173/admin` (or your deployed domain + `/admin`) with those credentials.

### Migrating the existing catalogue into MongoDB

The site originally shipped its five yarn lines as static data in `client/src/data/content.js`. A one-off script seeds the same content into MongoDB (a `Yarn` category + the five products) so the admin CMS and public catalogue have something to show immediately:

```bash
cd server
npm run migrate:products
```

Safe to re-run — it matches on SKU and only creates what's missing. Nothing in `client/src/data/content.js` is deleted; it remains as the built-in fallback the public Catalogue section uses if the API is ever unreachable.

## Development

Run both the client and server together from the repo root:

```bash
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:5000 (health check at `/api/health`)

Or run them independently:

```bash
npm run dev:client
npm run dev:server
```

## Production Build

```bash
npm run build      # builds client/ into client/dist
npm start          # runs the Express server (node server/src/server.js)
```

The client build is a static bundle (`client/dist`) that can be served by any static host. The server is a long-running Node process and must be hosted somewhere that supports that (see below).

## Testing

```bash
cd server
npm test
```

Uses Node's built-in test runner (`node:test`) — no extra framework dependency. Covers:
- Pure unit tests (`slugify`, JWT sign/verify + tamper rejection) that need no database.
- An end-to-end integration test that spins up the real Express app against an isolated `fluid_fibers_test` MongoDB database (never touches your dev/prod data) and exercises: unauthenticated access is rejected, invalid login is rejected, valid login sets a session cookie, category/product create, duplicate-SKU rejection, draft products are excluded from the public product list, category delete is blocked while in use, product archive, public enquiry submission, admin enquiry listing + status update, and logout invalidating the session.

The integration test skips itself (rather than failing) if no local MongoDB is reachable, so `npm test` still passes on a fresh checkout without a database configured. There is no client-side test suite yet — see [Future Improvements](#future-improvements).

## Deployment

The whole project deploys as a **single Vercel project**: the `client/` app builds to a static bundle, and the `server/` Express app is wrapped (via `api/index.js`, see below) as a Vercel serverless function, both served from the same domain. Configured by the root `vercel.json`:

- **Root Directory:** repository root (`.`)
- **Install Command:** `npm run install:all` (installs `client/` and `server/` dependencies)
- **Build Command:** `npm run build` (builds `client/` into `client/dist`)
- **Output Directory:** `client/dist`
- **API routes:** any request to `/api/*` is routed to the single serverless function at `api/index.js`, which imports the same Express app (`server/src/app.js`) used by the traditional `npm start` entry point — no route logic is duplicated between the two.
- **Production branch:** `main`

### Required environment variables (set in the Vercel project, not committed)

| Variable         | Where          | Value                                                                 |
|------------------|----------------|-------------------------------------------------------------------------|
| `MONGODB_URI`    | Vercel project | A MongoDB connection string (e.g. MongoDB Atlas). **Not yet configured** — see [Known Issues](#known-issues). |
| `CLIENT_ORIGIN`  | Vercel project | The deployed site's own URL (CORS is same-origin in this single-project setup, so this mainly matters if the API is ever called cross-origin). |
| `VITE_API_URL`   | Vercel project | `/api` — same-origin, so a relative path is enough; no absolute cross-origin URL needed. |
| `JWT_SECRET`     | Vercel project | A long random secret (see the [Environment Variables](#environment-variables) table for how to generate one) — **required** for admin login to work at all. |
| `NODE_ENV`       | Vercel project | Vercel sets this to `production` automatically; the session cookie is only ever `secure` (HTTPS-only) in that environment. |

`api/index.js` checks for `MONGODB_URI` at request time: if it's missing, `/api/health` still responds normally, but every database-backed route (`/api/enquiries`, `/api/products`, `/api/categories`, `/api/admin/*`) returns `503` with a clear "not configured" error instead of crashing — so the frontend can deploy and go live before the database is wired up. Once `MONGODB_URI` and `JWT_SECRET` are set and the project is redeployed, run `npm run seed:admin` and `npm run migrate:products` **locally, pointed at that same production database** (temporarily set `MONGODB_URI` in your shell, or in `server/.env`, to the production connection string) to create the admin account and seed the catalogue.

## Email Notifications

When a visitor submits the contact form or requests a spec sheet, `server/src/controllers/enquiryController.js` still saves the submission to MongoDB first (unchanged), then fires off a notification email via Gmail SMTP (`server/src/utils/mailer.js`, using `nodemailer`) to `NOTIFY_EMAIL` — the email includes the submitter's name, company, email, message/product line, and a `reply-to` set to the submitter so you can reply directly from your inbox.

This is entirely best-effort and asynchronous: the visitor's response is sent immediately after the database save, and the email send happens after that — a slow or failed email never delays or breaks the form submission. If `EMAIL_USER`/`EMAIL_PASS` aren't configured, it just logs a warning and skips sending.

Setup: enable 2-Step Verification on the sending Gmail account, generate an **App Password** (Google Account → Security → App passwords — a 16-character code, not your login password), and set `EMAIL_USER`/`EMAIL_PASS`/`NOTIFY_EMAIL` (see [Environment Variables](#environment-variables)).

## Known Issues

- **The production database is not yet wired up.** No `MONGODB_URI`/`JWT_SECRET` have been configured in the Vercel project, so on the live deployment `/api/health` works but every database-backed route (enquiries, products, categories, admin login) returns `503`. See [Deployment](#deployment) for the exact steps to finish this.
- `PUT/DELETE /api/products/:id`, `/api/categories/:id`, `/api/enquiries/:id` etc. all require the admin session cookie now — this was previously unauthenticated for enquiries and did not exist at all for products/categories.
- The `Variant.images`/`Category.image`/`Person.image` fields store `{ url, alt }` pairs (a URL, or one of the bundled asset keys `hero`/`mill`/`logo` for content migrated from the original static site) rather than binary data — see [Image Uploads](#image-uploads) for how uploads work and their production caveat.
- Email notifications (see [Email Notifications](#email-notifications)) are best-effort: if `EMAIL_USER`/`EMAIL_PASS` aren't set, or Gmail's SMTP rejects the send, the submission still saves to MongoDB and the visitor still gets a success response — only the notification email is skipped, with a warning logged server-side.
- No ESLint v9 flat config (`eslint.config.js`) exists yet in `client/`, so `npm run lint` cannot currently run.
- A dependency-tree `qs` package (a transitive dependency of Express itself, not something this project imports directly) has a known moderate-severity advisory; `npm audit fix` doesn't resolve it without an Express major-version bump, which was judged out of scope here.

## Image Uploads

The admin CMS uploads image files directly (Variants, Categories, People, video thumbnails) via `POST /api/uploads` (multipart, field name `image`, JPEG/PNG/WEBP/GIF only, 5MB max — enforced both client- and server-side). Files are currently saved to `server/uploads/` and served statically from `/uploads/<filename>`; `Variant.images`/`Category.image`/`Person.image`/`Video.thumbnail` store the resulting `{ url, alt }` (never raw binary in MongoDB, per the storage requirement). Video *files themselves* don't go through this endpoint at all — see [Video Gallery](#video-gallery).

**This works in local dev and on traditional (non-serverless) hosting, but not durably on Vercel production** — serverless functions have no persistent or shared filesystem, so a file uploaded in one invocation is not guaranteed to be there for the next. The storage layer is deliberately isolated in `server/src/utils/imageStorage.js` (`saveImage`/`deleteImage`) so swapping in a real provider (Cloudinary, Vercel Blob, S3, Supabase Storage, …) before going live is a change to that one file only — every controller and admin component already only depends on the `{ url, filename }` shape it returns.

## Future Improvements

- Wire up a real object-storage provider for production uploads (see [Image Uploads](#image-uploads)).
- Add an ESLint flat config for the client.
- A client-side test suite (component tests for the admin CMS) — the server has one now (see [Testing](#testing)), the client doesn't yet.
- Support multiple admin accounts / roles (currently a single shared admin account, by design, per the "no public signup" requirement).

## Author

Devang Panchal — [github.com/devangpanchal23](https://github.com/devangpanchal23)
