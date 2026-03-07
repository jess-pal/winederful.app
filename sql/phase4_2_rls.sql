alter table public.triage_autopilot_queue enable row level security;
alter table public.triage_verification_runs enable row level security;

create policy "deny_public_triage_autopilot_queue"
on public.triage_autopilot_queue
for all
to anon, authenticated
using (false)
with check (false);

create policy "deny_public_triage_verification_runs"
on public.triage_verification_runs
for all
to anon, authenticated
using (false)
with check (false);

-- Service role bypasses RLS and performs queue/verification actions server-side.
