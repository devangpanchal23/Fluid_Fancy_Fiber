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
- **Catalogue** — an accordion of yarn lines with a cross-fading sticky image preview on hover.
- **Photo gallery** of yarn/cone samples.
- **Process timeline** — a 5-step manufacturing process with a scroll-driven progress line.
- **Mill/story section** with a parallax photo and company credentials.
- **Team cards** ("People") with initials-based avatars, roles and contact links.
- **Case study / proof section** with metrics.
- **Testimonials** — a card grid plus a marquee of short reviews.
- **FAQ accordion**.
- **Contact form** and a **"request spec sheet" modal** (global CTA + per-catalogue-line), both posting to the API.
- **Footer** with sitemap-style link columns.
- Scroll-reveal animations throughout (`IntersectionObserver`-based), a magnetic-button hover effect, and full `prefers-reduced-motion` support (disables all animation/parallax).
- Fully responsive via fluid `clamp()` typography/spacing and CSS Grid `auto-fit` layouts — the only hard breakpoint (900px) switches the header between desktop nav and a mobile hamburger menu.
- **The public Catalogue section now fetches its products from `GET /api/products`** (only `active` items), falling back to the site's original static catalogue data if the API/database is unreachable — the public page never breaks because of backend availability.

### Admin CMS (`/admin`)

- **Real authentication** — email + password, `bcryptjs` password hashing, JWT stored in an `httpOnly` cookie (not `localStorage`), login rate limiting (10/15 min) and account lockout after 5 failed attempts (15 min), server-side session verification on every protected request. No public signup — the one admin account is created via a seed script from environment variables.
- **Dashboard** — total/active/draft product counts, total enquiries, recent products, recent enquiries, quick actions.
- **Product CMS** — full CRUD with search, status/category filters, sort, pagination; Draft/Active/Archived status; Featured toggle; SKU + slug with duplicate detection; specs, features, applications, and a reorderable image list (URL-based; see [Images](#images)). A shared `ProductForm` handles both create and edit, with Save Draft / Publish / Cancel, unsaved-change protection, and inline validation errors from the API.
- **Category management** — add/rename/activate/deactivate/delete, with delete blocked while any product still references the category.
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
│   │   ├── components/          Public-site sections (Hero, Catalogue, Gallery, Process, Mill, People, Proof, Reviews, Faq, Contact, Footer, WhyUs, QuoteBanner, Header, etc.)
│   │   ├── admin/                Admin CMS — code-split from the public bundle
│   │   │   ├── AdminApp.jsx      Route table for everything under /admin
│   │   │   ├── admin.css         Admin-only styles (reuses the public site's design tokens)
│   │   │   ├── api/client.js     Fetch wrapper (credentials: "include", { success, data } handling)
│   │   │   ├── context/          AdminAuthContext (session state), ToastContext
│   │   │   ├── components/       AdminLayout, AdminSidebar, AdminHeader, ProtectedRoute, ConfirmDialog, ProductImageUploader, EnquiryDetails
│   │   │   └── pages/             AdminLogin, Dashboard, ProductList, ProductForm, CategoryManager, EnquiryList, Settings
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
│       ├── models/               Admin, Category, Product, Enquiry (Mongoose schemas)
│       ├── controllers/          adminAuthController, categoryController, productController, enquiryController
│       ├── routes/               adminAuthRoutes, categoryRoutes, productRoutes, enquiryRoutes
│       ├── middleware/           auth (requireAdmin / attachAdminIfPresent), validateEnquiry, errorHandler
│       ├── utils/                jwt.js (sign/verify), slugify.js
│       ├── scripts/              seedAdmin.js, migrateProducts.js
│       └── __tests__/            Automated tests (node:test)
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
| GET    | `/api/products`             | Public\*    | List products — `?q=&status=&category=&featured=&page=&limit=&sort=`. Anonymous callers always get `status=active` only, regardless of query |
| GET    | `/api/products/:id`         | Public\*    | Get one product (404 if not `active` and not an admin) |
| POST   | `/api/products`             | Admin       | Create a product (validated; rejects duplicate SKU/slug) |
| PUT    | `/api/products/:id`         | Admin       | Update a product |
| DELETE | `/api/products/:id`         | Admin       | Archive (soft-delete); `?hard=true` permanently deletes |
| GET    | `/api/categories`           | Public      | List categories (`?activeOnly=true` to filter) |
| POST   | `/api/categories`           | Admin       | Create a category |
| PUT    | `/api/categories/:id`       | Admin       | Rename / toggle active |
| DELETE | `/api/categories/:id`       | Admin       | Delete (blocked with `409` while any product still uses it) |
| POST   | `/api/enquiries`            | Public      | Create a contact or spec-sheet-request submission (rate-limited, validated) — response shape: `{ message, id }` / `{ error }` |
| GET    | `/api/enquiries`            | Admin       | List submissions — `?type=&status=&q=&page=&limit=` |
| GET    | `/api/enquiries/:id`        | Admin       | Get one submission |
| PUT    | `/api/enquiries/:id`        | Admin       | Update status (`new`, `in_progress`, `contacted`, `closed`, `archived`) |
| DELETE | `/api/enquiries/:id`        | Admin       | Delete permanently |

\* `attachAdminIfPresent` middleware: if a valid admin session cookie is present the response includes non-active products too (for the CMS); otherwise it's silently restricted to `active` — a public caller cannot bypass this by passing `?status=draft`.

## Environment Variables

**`client/.env`** (copy from `client/.env.example`)

| Variable         | Description                                  | Example                        |
|------------------|-----------------------------------------------|---------------------------------|
| `VITE_API_URL`   | Base URL of the backend API                  | `http://localhost:5000/api`    |

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

## Known Issues

- **The production database is not yet wired up.** No `MONGODB_URI`/`JWT_SECRET` have been configured in the Vercel project, so on the live deployment `/api/health` works but every database-backed route (enquiries, products, categories, admin login) returns `503`. See [Deployment](#deployment) for the exact steps to finish this.
- `PUT/DELETE /api/products/:id`, `/api/categories/:id`, `/api/enquiries/:id` etc. all require the admin session cookie now — this was previously unauthenticated for enquiries and did not exist at all for products/categories.
- The `Product.images` field stores `{ url, alt }` pairs (a URL, or one of the bundled asset keys `hero`/`mill`/`logo` for content migrated from the original static catalogue) rather than uploaded files — see [Images](#images) for why, and for how to add real object storage later.
- The API only persists enquiry submissions to MongoDB — it does not send email notifications. Wire up an email provider (Nodemailer + SMTP, SES, SendGrid, etc.) in `server/src/controllers/enquiryController.js` if the technical desk needs to be notified directly.
- No ESLint v9 flat config (`eslint.config.js`) exists yet in `client/`, so `npm run lint` cannot currently run.
- Team member photos are shown as initials on a tinted panel rather than real portraits — swap in photography via `client/src/data/content.js` (`PEOPLE`) plus an image mapping once available.
- A dependency-tree `qs` package (a transitive dependency of Express itself, not something this project imports directly) has a known moderate-severity advisory; `npm audit fix` doesn't resolve it without an Express major-version bump, which was judged out of scope here.

## Images

Per the "don't store raw image files in MongoDB" requirement, `Product.images` stores `{ url, alt }` pairs rather than binary data — `url` is either a hosted image URL you paste into the admin's image uploader, or (for the five products migrated from the original static catalogue) one of the bundled asset keys (`hero`, `mill`) that the client already ships. No object-storage credentials (Cloudinary, S3, Vercel Blob, etc.) were available to wire up, so none were invented. If you want real file uploads from the admin UI later: add an upload endpoint backed by whichever storage provider you choose, configured entirely via environment variables (an API key/bucket name), and have `ProductImageUploader` POST to it instead of only accepting pasted URLs — the `{ url, alt }` shape in the `Product` model doesn't need to change.

## Future Improvements

- Wire up real object storage (see [Images](#images)) so the admin can upload files directly instead of pasting URLs.
- Add outbound email notifications for new enquiries.
- Add an ESLint flat config for the client.
- A client-side test suite (component tests for the admin CMS) — the server has one now (see [Testing](#testing)), the client doesn't yet.
- Support multiple admin accounts / roles (currently a single shared admin account, by design, per the "no public signup" requirement).

## Author

Devang Panchal — [github.com/devangpanchal23](https://github.com/devangpanchal23)
