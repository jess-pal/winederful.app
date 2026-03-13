-- Supabase Security Advisor hardening for production tables.
-- Safe to run multiple times.

-- 1) Ensure RLS is enabled on sensitive tables.
alter table if exists public.quiz_sessions enable row level security;
alter table if exists public.events enable row level security;
alter table if exists public.email_signups enable row level security;
alter table if exists public.audit_logs enable row level security;

-- 2) Public API roles should never directly read/write these tables.
revoke all privileges on table public.quiz_sessions from anon, authenticated;
revoke all privileges on table public.events from anon, authenticated;
revoke all privileges on table public.email_signups from anon, authenticated;
revoke all privileges on table public.audit_logs from anon, authenticated;

-- 3) Keep deny-all policies for anon/authenticated so PostgREST/API access
-- remains blocked even if grants are changed later.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'quiz_sessions'
      and policyname = 'deny_public_quiz_sessions'
  ) then
    create policy deny_public_quiz_sessions
      on public.quiz_sessions
      for all
      to anon, authenticated
      using (false)
      with check (false);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
      and policyname = 'deny_public_events'
  ) then
    create policy deny_public_events
      on public.events
      for all
      to anon, authenticated
      using (false)
      with check (false);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'email_signups'
      and policyname = 'deny_public_email_signups'
  ) then
    create policy deny_public_email_signups
      on public.email_signups
      for all
      to anon, authenticated
      using (false)
      with check (false);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and policyname = 'deny_public_audit_logs'
  ) then
    create policy deny_public_audit_logs
      on public.audit_logs
      for all
      to anon, authenticated
      using (false)
      with check (false);
  end if;
end
$$;
