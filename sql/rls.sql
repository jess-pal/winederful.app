alter table public.quiz_sessions enable row level security;
alter table public.events enable row level security;
alter table public.email_signups enable row level security;
alter table public.audit_logs enable row level security;

-- Public cannot directly read/write raw quiz sessions.
create policy "deny_public_quiz_sessions"
on public.quiz_sessions
for all
to anon, authenticated
using (false)
with check (false);

-- Public cannot query raw event logs.
create policy "deny_public_events"
on public.events
for all
to anon, authenticated
using (false)
with check (false);

-- Public cannot query email signups.
create policy "deny_public_email_signups"
on public.email_signups
for all
to anon, authenticated
using (false)
with check (false);

-- Public cannot query audit logs.
create policy "deny_public_audit_logs"
on public.audit_logs
for all
to anon, authenticated
using (false)
with check (false);

-- Service role bypasses RLS and performs inserts/selects from server routes.
