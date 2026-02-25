# Security Notes (Phase 0 + 1)

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

## Remaining risks / future work

- In-memory limiter is per-instance; replace with Redis or DB-backed limiter in production scale
- Email is stored plaintext (with hash) in Phase 1; migrate to encrypted storage in Phase 1.5+
- Add CSRF token strategy if cookie-authenticated mutations are introduced
- Add bot defense (challenge/captcha) if abuse increases
