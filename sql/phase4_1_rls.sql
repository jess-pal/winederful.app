alter table public.triage_reports enable row level security;

create policy "deny_public_triage_reports"
on public.triage_reports
for all
to anon, authenticated
using (false)
with check (false);

-- Service role bypasses RLS and performs report generation server-side.
