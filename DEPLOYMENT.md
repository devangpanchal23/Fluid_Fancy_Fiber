# Deployment runbook

## Vercel environment

Set these values in Vercel for Production and Preview as appropriate. Keep credentials in Vercel Secret variables and never commit their values.

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | Yes | Existing MongoDB Atlas URI. Keep the current cluster and database unchanged. |
| `JWT_SECRET` | Yes | Long, random secret used to sign admin sessions. |
| `ADMIN_EMAIL` | Optional pair | Deployment can create or synchronize the single admin account when both admin variables are set. |
| `ADMIN_PASSWORD` | Optional pair | At least 8 characters. Set with `ADMIN_EMAIL`; changing either takes effect on a fresh Vercel instance. |
| `BROCHURE_SENDER_EMAIL` | Required for spec emails | Gmail sender address. |
| `BROCHURE_SENDER_APP_PASSWORD` | Required for spec emails | Gmail App Password, stored as a Vercel Secret. |
| `SPEC_SHEET_URL` | Optional | HTTPS URL to the PDF. Defaults to the configured brochure link in server code. |
| `NOTIFY_EMAIL` | Optional | Internal enquiry notification recipient. |
| `CLIENT_ORIGIN` | Optional | Comma-separated exact origins only when the frontend is hosted separately. Same-origin Vercel deployment does not need this. |
| `VITE_SITE_URL` | Recommended | Production canonical origin, for example `https://your-domain.example`. Do not set a Preview URL here. |
| `VITE_ENABLE_ANALYTICS` | Optional | Set to `false` to disable Vercel Analytics. Enabled by default. |

`VITE_API_URL` is normally omitted on Vercel; the site uses the same-origin `/api` routes. Locally, `client/.env` can point to `http://localhost:5001/api`.

## Atlas access

- Preserve the existing Atlas cluster, database, user and URI.
- Allow connections from Vercel using the Atlas network access policy chosen for the account. Avoid broad public access where a safer network option is available.
- Database integration tests use the isolated `fluid_fibers_test` database by default. Never set `TEST_MONGODB_URI` to production.

## Release checklist

1. Confirm CI passes on the commit and review `npm audit` output for all three npm projects.
2. Confirm Production and Preview environment variables are set, especially the brochure sender, app password, Mongo URI and JWT secret.
3. Deploy a Preview and check `/`, `/privacy`, `/terms`, `/robots.txt`, `/sitemap.xml`, `/api/health`, `/admin` and a random missing path.
4. Confirm the Preview canonical metadata does not point at the Preview host. Set `VITE_SITE_URL` only to the production domain before the production build.
5. Promote the reviewed commit to Production, then test a brochure request with a mailbox you control and check the admin login.

## Rollback

Use Vercel Deployments to promote the last known-good deployment. Revert the corresponding Git commit if a code change caused the issue. This release contains no database migration and does not alter or delete existing records.
