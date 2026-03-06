create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'pending', 'resolved', 'closed')),
  priority text not null default 'low' check (priority in ('low', 'medium', 'high')),
  user_id uuid null references auth.users(id) on delete set null,
  contact_email_hash text null,
  subject text null,
  description text not null,
  category text not null check (category in ('bug', 'feedback', 'billing', 'other')),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  created_at timestamptz not null default now(),
  sender_type text not null check (sender_type in ('user', 'agent', 'admin')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  created_at timestamptz not null default now(),
  storage_path text not null,
  mime_type text not null,
  size_bytes int not null check (size_bytes > 0)
);

create index if not exists idx_support_tickets_created on public.support_tickets(created_at desc);
create index if not exists idx_support_tickets_status on public.support_tickets(status);
create index if not exists idx_support_messages_ticket_created on public.support_messages(ticket_id, created_at asc);
create index if not exists idx_attachments_ticket_created on public.attachments(ticket_id, created_at asc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'support-attachments',
  'support-attachments',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
