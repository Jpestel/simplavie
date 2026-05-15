-- Enable UUID extension (not used but good practice)
-- extension already available in Supabase

-- ─── App config ───────────────────────────────────────────────
create table if not exists app_config (
  id text primary key default 'default',
  user_name text not null default 'Mon proche',
  primary_color text not null default '#6366f1',
  admin_password text not null default '1234',
  modules jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ─── User profile ─────────────────────────────────────────────
create table if not exists user_profile (
  id text primary key default 'default',
  first_name text,
  last_name text,
  birth_date text,
  address text,
  city text,
  postal_code text,
  phone text,
  mobile text,
  email text,
  social_security_number text,
  mutuelle text,
  mutuelle_number text,
  caf_number text,
  mdph_number text,
  aah_recipient boolean default false,
  doctor_name text,
  doctor_phone text,
  pharmacy_name text,
  pharmacy_phone text,
  blood_type text,
  allergies text,
  treatments text,
  contacts jsonb not null default '[]'::jsonb,
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Routine steps ────────────────────────────────────────────
create table if not exists routine_steps (
  id text primary key,
  label text not null,
  icon text not null default '✅',
  step_time text,
  step_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ─── Routine completions (which steps done on which day) ──────
create table if not exists routine_completions (
  date date not null,
  step_id text not null references routine_steps(id) on delete cascade,
  primary key (date, step_id)
);

-- ─── Disable RLS (single-tenant personal app) ─────────────────
alter table app_config enable row level security;
alter table user_profile enable row level security;
alter table routine_steps enable row level security;
alter table routine_completions enable row level security;

create policy "Allow all" on app_config for all using (true) with check (true);
create policy "Allow all" on user_profile for all using (true) with check (true);
create policy "Allow all" on routine_steps for all using (true) with check (true);
create policy "Allow all" on routine_completions for all using (true) with check (true);

-- ─── Care data ────────────────────────────────────────────────
create table if not exists care_data (
  id text primary key default 'default',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table care_data enable row level security;
create policy "Allow all" on care_data for all using (true) with check (true);
