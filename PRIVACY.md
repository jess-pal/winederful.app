# Privacy Policy (Draft, Phase 0-4.1)

## What we collect (Phase 0 + 1)

- Quiz responses (option IDs)
- Quiz result payload (persona + style suggestions)
- Event analytics (started/completed/viewed/shared/email_signup)
- Hashed IP and hashed user-agent for abuse prevention
- Email for signup (if submitted), plus consent metadata

## Additional data in Phase 2 (authenticated users)

- Optional profile data (display name, persona preference, favorite styles)
- Data deletion request records (request metadata only)

## Additional data in Phase 3 support flow

- Support ticket content (category, subject, description)
- Optional screenshot attachment (image only)
- Correlation and technical metadata (browser/OS summary, last route, app version)
- Optional contact email hash (for anonymous support requests)

## Additional data in Phase 4 triage flow

- Error triage records (`triage_items`) with sanitized title/summary, severity, and occurrence counts
- Evidence citations attached to triage proposals (sanitized excerpts and source references)
- Internal issue draft records (`internal_issues`) created only after explicit admin approval
- Approval metadata for auditability (approver ID, approval timestamp, optional approval note)
- Daily triage summary records (`triage_reports`) containing aggregated bug process metrics

## What we do not collect

- No account required
- No government IDs, payment details, or free-form profile data in MVP quiz

## Why we collect data

- Provide quiz result and share pages
- Protect public APIs from abuse
- Measure product usage (privacy-friendly aggregate events)
- Send marketing emails only when explicit consent is provided

## Retention

- Quiz/event records retained only as long as needed for analytics and abuse defense
- Email signup records retained until unsubscribe/deletion request

## Deletion

- Contact admin to request removal (self-serve deletion UI planned in later phases)

## Security practices

- Input validation, rate limiting, and secure headers
- Server-only privileged credentials
- RLS enabled on data tables
- Security redaction of sensitive strings in triage intake summaries/evidence
