alter table public.triage_items enable row level security;
alter table public.internal_issues enable row level security;

create policy "deny_public_triage_items"
on public.triage_items
for all
to anon, authenticated
using (false)
with check (false);

create policy "deny_public_internal_issues"
on public.internal_issues
for all
to anon, authenticated
using (false)
with check (false);

-- Service role bypasses RLS and performs admin/intake actions server-side.
