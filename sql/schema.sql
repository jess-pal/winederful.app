create extension if not exists pgcrypto;

create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  result_persona text not null,
  result_payload jsonb not null,
  public_share_token text unique not null,
  answers_payload jsonb null,
  ip_hash text null,
  user_agent_hash text null
);

create table if not exists public.events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  event_name text not null,
  session_id uuid null references public.quiz_sessions(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  ip_hash text null
);

create table if not exists public.email_signups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  email_hash text unique not null,
  marketing_opt_in boolean not null,
  consent_version text not null,
  double_opt_in_status text not null default 'pending',
  source text null
);

create table if not exists public.audit_logs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  actor_type text not null,
  actor_id text null,
  action text not null,
  target_type text null,
  target_id text null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_quiz_sessions_share_token on public.quiz_sessions(public_share_token);
create index if not exists idx_events_created_at on public.events(created_at desc);
create index if not exists idx_events_event_name on public.events(event_name);
create index if not exists idx_email_signups_created_at on public.email_signups(created_at desc);
