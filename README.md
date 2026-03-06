# Wine Persona (Phase 0-4.1)

A privacy-first viral quiz app built with Next.js + TypeScript + Tailwind + Supabase.

## What is included

- Secure Next.js App Router foundation
- 10-question wine persona quiz
- Deterministic scoring engine with explainable output
- Result page + public share page (`/share/[token]`)
- Supabase Auth login (`/quiz` flow)
- User-owned profile data + export/delete scaffold
- Support ticket form with optional screenshot upload (`/support`)
- Bug triage intake pipeline (internal JSON + optional Sentry sync)
- Admin triage dashboard (`/admin/triage`) with proposal-only clustering + issue draft workflow
- Human-approved internal issue draft creation with citations + audit trail
- Scheduled triage automation (hourly Sentry sync + daily triage summaries)
- Daily communication summaries visible in admin triage UI
- Data export JSON + delete-request scaffold
- API input validation with Zod
- Rate limiting (in-memory adapter)
- Security headers middleware (CSP, HSTS, frame controls, etc.)
- Supabase SQL schema + RLS policies
- Sentry wiring (optional)
- Vitest scoring tests
- `doctor` script for non-technical setup checks

## 1) Install prerequisites (one-time)

1. Install [Node.js 20+](https://nodejs.org/)
2. Install [pnpm](https://pnpm.io/installation)
3. Install [Git](https://git-scm.com/downloads)
4. Create a Supabase project at [supabase.com](https://supabase.com)

## 2) Setup locally

1. Open terminal in this folder.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy env template:
   ```bash
   cp .env.example .env.local
   ```
4. Fill `.env.local` values:
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
   - `NEXT_PUBLIC_SUPABASE_URL` from Supabase project settings
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase API settings
   - `SUPABASE_URL` from Supabase project settings
   - `SUPABASE_ANON_KEY` from Supabase API settings
   - `SUPABASE_SERVICE_ROLE_KEY` from Supabase API settings (server only)
   - `ADMIN_ALLOWLIST` comma-separated admin emails (example: `jess@cheekylily.com`)
   - `IP_HASH_SALT` random long secret (16+ chars)
   - `ADMIN_SESSION_SECRET` random long secret (32+ chars)
   - `SENTRY_DSN` optional
   - `SENTRY_AUTH_TOKEN` optional (required only for admin Sentry triage sync)
   - `SENTRY_ORG_SLUG` optional (required only for admin Sentry triage sync)
   - `SENTRY_PROJECT_SLUG` optional (required only for admin Sentry triage sync)
   - `CRON_SECRET` or `TRIAGE_CRON_SECRET` required for scheduled triage routes (`/api/internal/cron/*`)
   - `RESEND_API_KEY` required for email digest sending
   - `TRIAGE_EMAIL_TO` required recipient (your Gmail address)
   - `TRIAGE_EMAIL_FROM` required sender (verified domain/sender in Resend)
5. Run doctor script:
   ```bash
   pnpm doctor
   ```
6. Apply SQL in Supabase SQL editor:
   - Run `sql/schema.sql`
   - Run `sql/rls.sql`
   - Run `sql/phase2_schema.sql`
   - Run `sql/phase2_rls.sql`
   - Run `sql/phase3_schema.sql`
   - Run `sql/phase3_rls.sql`
   - Run `sql/phase4_schema.sql`
   - Run `sql/phase4_rls.sql`
   - Run `sql/phase4_1_schema.sql`
   - Run `sql/phase4_1_rls.sql`
7. Start app:
   ```bash
   pnpm dev
   ```
8. Open [http://localhost:3000](http://localhost:3000)

## 3) Validate security headers

From another terminal:

```bash
curl -I http://localhost:3000
```

Check these headers are present:
- `content-security-policy`
- `strict-transport-security`
- `x-frame-options`
- `x-content-type-options`
- `referrer-policy`
- `permissions-policy`

## 4) Run tests and lint

```bash
pnpm lint
pnpm test
pnpm typecheck
```

## Account Data (Phase 2)

- Sign in
- Export your profile data as JSON
- Submit a deletion request (manual scaffold)

## Support (Phase 3 foundation)

- Use the fixed `Get help` button or open `/support`
- Create support tickets with category + description
- Optional screenshot upload (JPEG/PNG/WEBP, max 5MB)
- Ticket metadata auto-includes:
  - app version/commit
  - browser + OS summary
  - last route
  - correlation ID

## Admin Support Inbox

- Open `/admin/login`
- Sign in with an allowlisted admin email (magic link)
- Click `Verify admin access` to create a short-lived admin session gate
- You are redirected to `/admin/support` to view/update tickets and save replies

## Admin Bug Triage (Phase 4)

- Open `/admin/triage` after admin verification
- Intake sources:
  - internal fallback: `POST /api/internal/errors/intake`
  - support tickets (bug/feedback/billing/other): auto-synced on `/api/support/create`
  - support backfill sync: `POST /api/admin/triage/intake/support`
  - Sentry sync (optional): `POST /api/admin/triage/intake/sentry`
- Triage workflow:
  - review triage item details and evidence/citations
  - generate strict proposal JSON (`/api/admin/triage/proposal`) with plain-English summary, confidence, and missing-information prompts
  - explicitly check human approval in UI before draft creation
  - create internal issue draft (`/api/admin/triage/issues`) with audit log
- No autonomous code changes or issue publishing are performed by agents/routes

## Automation + Updates (Phase 4.1)

- Scheduled routes:
  - `GET /api/internal/cron/triage-sync` (hourly)
  - `GET /api/internal/cron/triage-daily-summary` (daily)
  - `GET /api/internal/cron/triage-email-digest` (daily, after summary)
- Daily summaries are stored in `triage_reports` and shown in `/admin/triage` under **Daily Updates**
- Admin can also generate a summary manually from `/admin/triage` using **Generate Summary**
- Admin can manually send the latest digest email from `/admin/triage` using **Send Digest Email**
- Cron auth requires `TRIAGE_CRON_SECRET` or `CRON_SECRET` via:
  - `Authorization: Bearer <TRIAGE_CRON_SECRET>`, or
  - `x-cron-secret: <TRIAGE_CRON_SECRET>`
- Vercel cron schedule is defined in `vercel.json`

See full operator workflow in `RUNBOOK_BUG_TRIAGE.md`.

## Notes

- Public clients never receive Supabase service role key.
- Quiz share page resolves tokens server-side via `/api/share/resolve`.
- Authenticated APIs require `Authorization: Bearer <access_token>`.
