# Bug Triage Runbook (Phase 4.2)

## Goal

Create a closed-loop bug workflow:
1. detect bugs automatically,
2. triage and prioritize,
3. generate a fix plan,
4. approve issue draft creation,
5. communicate outcomes on a regular schedule.

## Sources of bugs

- Internal intake endpoint: `POST /api/internal/errors/intake`
- Optional Sentry ingestion:
  - Manual admin sync: `POST /api/admin/triage/intake/sentry`
  - Scheduled sync: `GET /api/internal/cron/triage-sync`

## Daily operator workflow

1. Open `/admin/triage`.
2. Review **Daily Updates** summary first.
3. Filter triage items by `critical` and `high`.
4. For each item:
   - confirm severity/status,
   - click **Generate Proposal JSON**,
   - verify citations,
   - if acceptable, check approval box and create internal issue draft.
5. Track completion by moving item to `resolved` once fix is shipped and verified.

## Scheduled automation (Vercel Cron)

Configured in `vercel.json`:
- Hourly Sentry sync: `/api/internal/cron/triage-sync`
- Hourly autopilot queue build: `/api/internal/cron/triage-proposal-queue`
- Summary generation every 2 days (07:00 SAST): `/api/internal/cron/triage-daily-summary`
- Digest email send every 2 days (07:05 SAST): `/api/internal/cron/triage-email-digest`
- Daily post-release verification scaffold: `/api/internal/cron/triage-post-release-verify`

Set environment variable:
- `TRIAGE_CRON_SECRET` or `CRON_SECRET` (required for cron route auth)
- `RESEND_API_KEY` (required for email provider auth)
- `TRIAGE_EMAIL_TO` (recipient, e.g. your Gmail)
- `TRIAGE_EMAIL_FROM` (verified sender in Resend)
- `AUTOPILOT_ENABLE_QUEUE` (`true`/`false`)
- `AUTOPILOT_ALLOW_PR_DRAFTS` (`true`/`false`)

Cron request auth accepted via either:
- `Authorization: Bearer <TRIAGE_CRON_SECRET or CRON_SECRET>`
- `x-cron-secret: <TRIAGE_CRON_SECRET or CRON_SECRET>`

## Required controls

- Proposal-only output; no autonomous issue publishing.
- Human approval required for draft creation.
- Structured schema validation and citations.
- Audit log entries for ingest/proposal/draft/report actions.
- No secrets in triage text (sanitization/redaction).
- Low-risk gate required for PR draft stub generation.

## Autopilot flow (safe mode)

1. Build queue: `POST /api/admin/triage/autopilot/queue` (or cron route).
2. Review queue rows: `GET /api/admin/triage/autopilot/queue`.
3. Decide per queue item: `PATCH /api/admin/triage/autopilot/queue/:id` (`approve` or `reject`).
4. Create PR draft stub for approved low-risk row:
   - `POST /api/admin/triage/autopilot/pr-draft`
   - This creates an internal draft artifact only (no code execution).

## How communication works

- Daily summaries are saved in `triage_reports`.
- `/admin/triage` shows latest summary in **Daily Updates**.
- You can manually generate one with **Generate Summary**.
- You can manually send the latest digest via **Send Digest Email**.
- Scheduled digest delivery sends the latest report to `TRIAGE_EMAIL_TO`.

## What "done" looks like

A bug is complete when all are true:
1. Triage item has a valid proposal with citations.
2. Internal issue draft is human-approved.
3. Fix is implemented and verified.
4. Triage item status is `resolved`.
5. Daily report reflects closure and recurrence trend.

## Visual regression checklist (pre-release)

Run this checklist on desktop and mobile for `/admin/triage`, `/admin/support`, and `/quiz`:

1. Header action buttons are readable against page background in normal, hover, focus, and disabled states.
2. Status/info banners are readable and not color-only dependent for meaning.
3. Primary and secondary action buttons are visually distinct.
4. Form controls (inputs/selects/textarea) have visible labels and focus outlines.
5. Long text blocks (`summary`, `JSON`, logs) remain readable and scroll correctly.
6. Critical actions (sign out, draft creation, status changes) are clearly visible and not visually hidden by theme colors.
7. No text appears with low contrast on dark surfaces (especially `brand-700` text on dark backgrounds).
