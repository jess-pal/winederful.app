# Wine Persona (Phase 0 + Phase 1)

A privacy-first viral quiz app built with Next.js + TypeScript + Tailwind + Supabase.

## What is included

- Secure Next.js App Router foundation
- 10-question wine persona quiz
- Deterministic scoring engine with explainable output
- Result page + public share page (`/share/[token]`)
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
   - `SUPABASE_URL` from Supabase project settings
   - `SUPABASE_ANON_KEY` from Supabase API settings
   - `SUPABASE_SERVICE_ROLE_KEY` from Supabase API settings (server only)
   - `IP_HASH_SALT` random long secret (16+ chars)
   - `SENTRY_DSN` optional
5. Run doctor script:
   ```bash
   pnpm doctor
   ```
6. Apply SQL in Supabase SQL editor:
   - Run `sql/schema.sql`
   - Run `sql/rls.sql`
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

## Notes

- Public clients never receive Supabase service role key.
- Quiz share page resolves tokens server-side via `/api/share/resolve`.
- Phase 1.5+ (auth/admin/support/agents) is not implemented yet.
