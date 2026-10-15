# Production Hardening Report

Date: 2026-10-15
Branch: `codex/prod-hardening`

## Stack discovered

- Frontend: React 18, React Router 7, Vite 8, JavaScript and CSS.
- Backend: Node.js with Express 4, deployed as a Vercel serverless function.
- Data: MongoDB Atlas through Mongoose 8. Existing connection target and credentials were not changed.
- Authentication: bcryptjs password hashes and JWT in an HttpOnly cookie, with login lockout.
- Email: Nodemailer with Gmail SMTP.
- Tests: Node test runner, client utility tests, and server integration tests. No TypeScript is used.

## Changes and root causes

| Area | Symptom and root cause | Fix |
|---|---|---|
| Error handling and routes | Unknown routes and component failures could show a blank view; API handlers returned inconsistent errors and could expose internal messages. | Added branded not-found views, global React error boundary, safe consistent API errors, DB-aware health checks, and API path fallthrough that does not require a database connection. Added legal pages and Vercel routes. |
| Enquiry reliability | SMTP errors after saving an enquiry could cause client retries to create duplicates. | Added idempotency keys and explicit brochure delivery status; retries reuse the saved enquiry and avoid duplicate delivery after success. Added honeypot handling. |
| Upload validation | Uploads trusted client MIME metadata. | Check allowed image signatures after upload, retain size limits, and return a safe error for mismatched content. |
| Database load | Some collection reads were unbounded, catalogue variants caused N+1 requests, and DB pools used defaults. | Added query caps, `lean()` on read paths, batched variant lookup, a category index, and serverless pool/timeout settings. Atlas target is unchanged. |
| Security | CORS accepted broad Vercel/domain subdomains, baseline security headers were missing, and seed-admin docs/code had weak defaults. | Restricted origins, added CSP/HSTS and related headers, and require explicit admin seed credentials. Added dependency updates. |
| Frontend delivery | Hero image was not prioritized, broken gallery images had no fallback, and metadata/legal policies were incomplete. | Preload the hero image, add gallery fallbacks, metadata and social tags, sitemap/robots endpoints, privacy and terms pages, and analytics opt-in via environment flag. |
| Accessibility and interaction | Spec modal lacked complete keyboard focus behavior. | Added focus management, focus trapping, Escape handling, and focus restoration. |
| Quality and operations | Client lint setup was incomplete; no full-stack CI or deployment runbook existed. | Added React-aware linting, server linting, CI workflow, setup documentation, and deployment runbook. |

## Verification

- `npm run lint`: passed for client and server.
- `npm run check:js`: passed. A TypeScript type-check does not apply because this repository uses JavaScript.
- `npm test --prefix client`: 20 passed, 0 failed.
- `npm test` in `server/`: 112 passed, 0 failed against the local test database.
- Production build: passed with no Vite warnings.
- Dependency audit: prior full dependency audits reported 0 vulnerabilities after updates. Final production dependency audit also reports 0 vulnerabilities.
- `vercel.json`: manually reviewed; JSON parsed by build/config checks.

The server tests require permission to bind a local HTTP port and a local MongoDB test database. Running without those permissions failed with `EPERM` and unavailable database; rerunning with the required local access passed. Tests use `fluid_fibers_test`; production data was not changed.

## Bundle measurements

| Asset | Baseline gzip | Final gzip | Change |
|---|---:|---:|---:|
| Main JS | 76.05 KB | 78.16 KB | +2.11 KB (+2.8%) |
| Admin JS | 21.86 KB | 21.94 KB | +0.08 KB |
| Main CSS | 8.95 KB | 9.01 KB | +0.06 KB |
| Admin CSS | 3.69 KB | 3.69 KB | unchanged |
| Lazy legal page JS | not split | 1.24 KB | added lazy chunk |

The main bundle grew slightly due to resilience, metadata, and analytics wiring. No bundle-size improvement is claimed. Existing large factory-floor image remains 351.01 KB WebP; the hero image is 46.73 KB WebP.

## Not verified here

- Lighthouse mobile/desktop scores and Core Web Vitals were not captured. A browser audit runner and deployed preview were not available in this environment. Do not treat 90+ Lighthouse as achieved.
- Production Vercel environment variables, domain canonicalization, HTTPS redirects, CDN behavior, and preview deployment were not accessible to verify.
- MongoDB Atlas `explain()` and live pool behavior were not run against Atlas. No connection target or credentials were changed.
- Cross-browser visual checks and a full route-by-route browser smoke test were not available. Automated API route tests and production build passed.
- CSP and canonical URL behavior should be checked on the deployed site with the final domain and any required third-party media sources.
- Privacy and terms pages are operational templates, not legal advice or counsel-reviewed policy.
- Signature checks identify common image formats but do not fully decode/re-encode uploaded image content. A dedicated image decoder/scanner remains a useful additional control.

## Deployment actions

1. Configure `VITE_SITE_URL` with the final HTTPS domain.
2. Confirm required production/preview environment variables in Vercel, including SMTP and admin credentials. Never place secrets in the client environment.
3. Rotate the Gmail app password previously shared in chat, then update the server-side Vercel secret.
4. Deploy the branch/commit to a Vercel preview and verify routes, email delivery, security headers, CSP, and canonical metadata before production promotion.
5. Capture Lighthouse and API latency from that preview, then record measured values here.

No push, Vercel deployment, Atlas migration, or production data change was performed.
