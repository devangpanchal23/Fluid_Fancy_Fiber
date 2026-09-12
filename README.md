# Fluid Fancy Fibre

A production-style marketing site for **Fluid Fancy Fibre LLP**, a ring-spun yarn manufacturer and exporter. Built as a MERN-stack project: a React/Vite single-page frontend with a custom (framework-free) design system, backed by an Express + MongoDB API for the contact form and "request spec sheet" flows.

## Overview

The site is a single continuous scrolling page (no client-side router) covering the full marketing funnel for a B2B yarn exporter: hero, value proposition, catalogue, manufacturing process, company story, team, case study, testimonials, FAQ, and a contact form — with a real backend persisting form submissions to MongoDB.

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

## Technology Stack

**Frontend (`client/`)**
- React 18
- Vite 8 (`@vitejs/plugin-react`)
- Plain CSS with design tokens (CSS custom properties) — no UI/component framework, no Bootstrap/Tailwind
- ESLint (flat config not yet present — see [Known Issues](#known-issues))

**Backend (`server/`)**
- Node.js + Express 4
- MongoDB via Mongoose 8
- `cors` (origin restricted to the configured client URL)
- `express-rate-limit` (20 requests / 15 min on the enquiries endpoint)
- `dotenv` for environment configuration
- `nodemon` for local development

**Database**
- MongoDB, single `enquiries` collection storing both contact-form and spec-sheet-request submissions (`type: "contact" | "spec"`).

**Authentication**
- None. There is no login/user system. Note: `GET /api/enquiries` (listing submissions) is currently unauthenticated — see [Known Issues](#known-issues) before exposing it publicly.

## Project Structure

```
fff/
├── client/                      React app (Vite)
│   ├── src/
│   │   ├── components/          One component per page section (Hero, Catalogue, Gallery, Process, Mill, People, Proof, Reviews, Faq, Contact, Footer, WhyUs, QuoteBanner, Header, etc.)
│   │   ├── data/content.js      Single source of truth for all site copy/content arrays
│   │   ├── hooks/                useReveal, useScrollProgress, useCountUp, useMagnetic, useMediaQuery, useActiveSection
│   │   ├── api/enquiries.js     Fetch wrapper for the backend API
│   │   ├── assets/images/       Product photography
│   │   ├── App.jsx              Section composition/order for the page
│   │   ├── main.jsx             React entry point
│   │   └── index.css            Design tokens + all component styles
│   ├── index.html
│   ├── vite.config.js
│   └── .env.example
├── server/                      Express API
│   └── src/
│       ├── server.js            App entry point, CORS, rate limiting, routes
│       ├── config/db.js         MongoDB connection
│       ├── models/Enquiry.js    Mongoose schema
│       ├── controllers/enquiryController.js
│       ├── routes/enquiryRoutes.js
│       └── middleware/          Request validation + error handling
│   └── .env.example
├── package.json                 Root convenience scripts (runs client + server together)
└── .gitignore
```

## Routes

This is a single-page app — there are no client-side routes. In-page navigation uses hash anchors: `#top`, `#catalogue`, `#process`, `#mill`, `#people`, `#reviews`, `#faq`, `#contact`.

### API Endpoints (`server/`)

| Method | Path                | Description                                      |
|--------|---------------------|---------------------------------------------------|
| GET    | `/api/health`       | Health check — `{ ok: true, service: "fluid-fibers-api" }` |
| POST   | `/api/enquiries`    | Create a contact or spec-sheet-request submission (rate-limited, validated) |
| GET    | `/api/enquiries`    | List submissions, paginated (`?type=&status=&page=&limit=`) — **unauthenticated** |

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

`.env` files are git-ignored; only `.env.example` files are committed. No real credentials are present in this repository.

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

Edit `server/.env` and set `MONGODB_URI` to a local MongoDB instance or a MongoDB Atlas connection string.

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

## Deployment

### Frontend — Vercel

The `client/` app is a standard Vite project and deploys to Vercel with zero custom config:

- **Root Directory:** `client`
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`
- **Environment Variable:** `VITE_API_URL` → the public URL of your deployed backend API (e.g. `https://your-api-host.com/api`)
- **Production branch:** `main`

### Backend — not Vercel

The `server/` app is a standalone Express + MongoDB API (a persistent process), not a set of serverless functions, so it is **not deployed to Vercel** as part of this repository. Host it on a Node-friendly platform (Render, Railway, Fly.io, a VPS, etc.) and point the frontend's `VITE_API_URL` at it. It needs `PORT`, `MONGODB_URI` (e.g. a MongoDB Atlas cluster), and `CLIENT_ORIGIN` (set to your deployed frontend's URL, for CORS) configured on that platform.

## Known Issues

- `GET /api/enquiries` has no authentication. If you deploy the backend publicly, add an auth check (API key, session, etc.) before exposing this route, or keep it internal-only.
- The API only persists submissions to MongoDB — it does not send email notifications. Wire up an email provider (Nodemailer + SMTP, SES, SendGrid, etc.) in `server/src/controllers/enquiryController.js` if the technical desk needs to be notified directly.
- No ESLint v9 flat config (`eslint.config.js`) exists yet in `client/`, so `npm run lint` cannot currently run.
- Team member photos are shown as initials on a tinted panel rather than real portraits — swap in photography via `client/src/data/content.js` (`PEOPLE`) plus an image mapping once available.

## Future Improvements

- Authenticate/protect the enquiries listing endpoint (or build a small admin view behind auth).
- Add outbound email notifications for new enquiries.
- Add an ESLint flat config for the client.
- Automated tests (none currently exist for either the client or the server).

## Author

Devang Panchal — [github.com/devangpanchal23](https://github.com/devangpanchal23)
