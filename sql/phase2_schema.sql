create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  display_name text null,
  persona_id text null,
  preferences jsonb not null default '{}'::jsonb
);

create table if not exists public.data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null default 'pending',
  reason text null
);

create index if not exists idx_deletion_requests_user_created on public.data_deletion_requests(user_id, created_at desc);
