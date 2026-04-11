alter table public.product_events enable row level security;
alter table public.quiz_feedback enable row level security;
alter table public.product_insights enable row level security;
alter table public.product_recommendations enable row level security;
alter table public.approved_actions enable row level security;

create policy "deny_public_product_events"
on public.product_events
for all
to anon, authenticated
using (false)
with check (false);

create policy "deny_public_quiz_feedback"
on public.quiz_feedback
for all
to anon, authenticated
using (false)
with check (false);

create policy "deny_public_product_insights"
on public.product_insights
for all
to anon, authenticated
using (false)
with check (false);

create policy "deny_public_product_recommendations"
on public.product_recommendations
for all
to anon, authenticated
using (false)
with check (false);

create policy "deny_public_approved_actions"
on public.approved_actions
for all
to anon, authenticated
using (false)
with check (false);
