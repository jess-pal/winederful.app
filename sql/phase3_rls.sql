alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.attachments enable row level security;

create policy "support_tickets_own_select"
on public.support_tickets
for select
to authenticated
using (user_id = auth.uid());

create policy "support_messages_own_select"
on public.support_messages
for select
to authenticated
using (exists (
  select 1 from public.support_tickets t where t.id = support_messages.ticket_id and t.user_id = auth.uid()
));

create policy "attachments_own_select"
on public.attachments
for select
to authenticated
using (exists (
  select 1 from public.support_tickets t where t.id = attachments.ticket_id and t.user_id = auth.uid()
));

-- Inserts/updates are handled by server routes with service role key.
