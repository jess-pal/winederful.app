alter table public.profiles enable row level security;
alter table public.data_deletion_requests enable row level security;

create policy "profiles_own_select"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "profiles_own_insert"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "profiles_own_update"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "deletion_requests_own_select"
on public.data_deletion_requests
for select
to authenticated
using (auth.uid() = user_id);

create policy "deletion_requests_own_insert"
on public.data_deletion_requests
for insert
to authenticated
with check (auth.uid() = user_id);
