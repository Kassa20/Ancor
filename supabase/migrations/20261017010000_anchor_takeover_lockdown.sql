-- Anchor: post-confirmation account-takeover lockdown.
-- RLS enabled with no policies: only the server (service role) reads and writes.

create table if not exists public.account_lockdowns (
  id uuid primary key default gen_random_uuid(),
  member_id text not null,
  status text not null check (status in ('awaiting_reverification', 'completed')),
  confirmed_by text not null,
  signals jsonb not null default '[]',
  pending_payments jsonb not null default '[]',
  completed_unauthorized jsonb not null default '[]',
  balance numeric(12,2) not null default 0,
  old_account_ref text not null,
  new_account_ref text,
  reverify_method text check (reverify_method in ('branch_photo_id', 'pre_change_callback')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists account_lockdowns_member_idx
  on public.account_lockdowns (member_id, created_at desc);

create table if not exists public.lockdown_steps (
  id uuid primary key default gen_random_uuid(),
  lockdown_id uuid not null references public.account_lockdowns (id) on delete cascade,
  step_key text not null check (step_key in ('delink', 'contain', 'reverify', 'migrate', 'demolish')),
  step_order smallint not null,
  label text not null,
  status text not null check (status in ('pending', 'done')),
  detail text,
  completed_at timestamptz,
  unique (lockdown_id, step_key)
);

alter table public.account_lockdowns enable row level security;
alter table public.lockdown_steps enable row level security;
