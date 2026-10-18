-- Anchor: trusted contacts, risk assessments and contact alerts.
-- member_id stores the synthetic member id (e.g. 'M1001').
-- RLS is enabled with no policies: only the server (service role) reads and writes.

create table if not exists public.trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  member_id text not null,
  name text not null,
  relationship text not null,
  phone text,
  email text,
  auto_alert boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint trusted_contacts_reachable check (phone is not null or email is not null)
);
create index if not exists trusted_contacts_member_active_idx
  on public.trusted_contacts (member_id) where revoked_at is null;

create table if not exists public.risk_assessments (
  id uuid primary key default gen_random_uuid(),
  member_id text not null,
  payment jsonb not null,
  answers jsonb not null,
  pattern_score numeric(4,2) not null,
  answer_score numeric(4,2) not null,
  ai_score numeric(4,2) not null,
  score smallint not null check (score between 0 and 100),
  tier text not null check (tier in ('LOW', 'MEDIUM', 'HIGH')),
  typology text,
  reasons jsonb not null default '[]',
  actions jsonb not null default '[]',
  ai_used boolean not null default false,
  decision text check (decision in ('talk', 'wait', 'cancel', 'send')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists risk_assessments_member_idx
  on public.risk_assessments (member_id, created_at desc);

create table if not exists public.contact_alerts (
  id uuid primary key default gen_random_uuid(),
  member_id text not null,
  assessment_id uuid references public.risk_assessments (id) on delete set null,
  contact_id uuid not null references public.trusted_contacts (id),
  trigger text not null check (trigger in ('auto', 'manual')),
  channel text not null check (channel in ('sms', 'email', 'none')),
  status text not null check (status in ('sent', 'simulated', 'suppressed', 'failed')),
  message text,
  created_at timestamptz not null default now()
);
create index if not exists contact_alerts_assessment_idx on public.contact_alerts (assessment_id);
create index if not exists contact_alerts_contact_idx on public.contact_alerts (contact_id);

alter table public.trusted_contacts enable row level security;
alter table public.risk_assessments enable row level security;
alter table public.contact_alerts enable row level security;
