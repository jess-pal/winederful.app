# Security Notes (Phase 0-4.1)

## Threat model summary

- Public unauthenticated traffic to quiz/share endpoints
- Abuse risk: endpoint flooding, token enumeration
- Data risk: over-collection and sensitive logging

## Implemented mitigations

- Data minimization: no user account required for quiz
- Strong input validation: Zod on all API boundaries
- Rate limiting:
  - `POST /api/quiz/submit`: 10/min per hashed IP
  - `POST /api/share/resolve`: 60/min per hashed IP
  - `POST /api/email/signup`: 5/min per hashed IP
- Security headers via centralized middleware:
  - CSP
  - HSTS
  - frame ancestors + X-Frame-Options
  - Referrer-Policy
  - X-Content-Type-Options
  - Permissions-Policy
- Logging redaction in `lib/logger.ts`
- IP/User-Agent are hashed for abuse controls
- Supabase service role key server-only
- RLS enabled with deny policies for anon/authenticated public roles
- Phase 2 RLS for authenticated user-owned rows (`profiles`, `data_deletion_requests`)
- Bearer-token verification on protected API routes before data access
- Authenticated route rate limits for profile/export/delete-request endpoints
- Support ticket endpoint protections:
  - strict category/description/email validation
  - optional auth with bearer token support
  - hashed contact email only (no plaintext stored in ticket tables)
  - screenshot type/signature/size validation
  - private storage bucket for attachments
  - support creation rate limit (10/hour per IP hash)
  - audit log entry for ticket creation
- Admin support protections:
  - server-side admin API allowlist checks
  - route-level admin gate cookie for `/admin/support` and `/admin/triage` (short-lived, signed, httpOnly, same-site strict)
  - explicit re-verification step via `/admin/login` before admin inbox access
  - admin ticket update/reply actions written to `audit_logs`
  - suspicious admin auth/rate-limit patterns logged as structured security events
- Phase 4 bug triage protections:
  - strict schema validation for all triage intake/proposal/draft payloads
  - no autonomous execution: proposal APIs only return structured JSON
  - human approval required (`approval.approved === true`) for internal issue draft creation
  - citations required in proposal schema before draft creation is accepted
  - sanitized triage content (token/email redaction) before persistence
  - deny-all RLS policies on `triage_items` and `internal_issues` for anon/authenticated roles
  - triage and issue draft actions appended to `audit_logs`
- Phase 4.1 automation/reporting protections:
  - cron routes require shared secret (`TRIAGE_CRON_SECRET` or `CRON_SECRET`)
  - digest email sending is server-side only via provider API token (`RESEND_API_KEY`)
  - daily summary reports stored in protected table with deny-all RLS (`triage_reports`)
  - scheduled sync/report actions written to `audit_logs`

## Remaining risks / future work

- In-memory limiter is per-instance; replace with Redis or DB-backed limiter in production scale
- Email is stored plaintext (with hash) in Phase 1; migrate to encrypted storage in Phase 1.5+
- Add CSRF token strategy if cookie-authenticated mutations are introduced
- Add bot defense (challenge/captcha) if abuse increases
