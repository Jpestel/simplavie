-- Enable UUID extension (not used but good practice)
-- extension already available in Supabase

-- ─── App config ───────────────────────────────────────────────
create table if not exists app_config (
  id text primary key,
  user_id text not null,
  user_name text not null default 'Mon proche',
  primary_color text not null default '#6366f1',
  background_color text default '#f9fafb',
  admin_password text not null default '1234',
  modules jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Migration : exécuter ces commandes si la table existe déjà
-- alter table app_config add column if not exists user_id text;
-- alter table app_config add column if not exists background_color text default '#f9fafb';

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

-- ─── Routine data (steps config per user) ────────────────────
create table if not exists routine_data (
  id text primary key,
  user_id text not null unique,
  payload jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ─── Routine completions (which steps done on which day) ──────
create table if not exists routine_completions (
  user_id text not null,
  date date not null,
  step_id text not null,
  primary key (user_id, date, step_id)
);

-- ─── Routine cancellations ────────────────────────────────────
create table if not exists routine_cancellations (
  user_id text not null,
  date date not null,
  step_id text not null,
  primary key (user_id, date, step_id)
);

-- ─── Routine postponements ────────────────────────────────────
create table if not exists routine_postponements (
  user_id text not null,
  date date not null,
  step_id text not null,
  to_date date,
  primary key (user_id, date, step_id)
);

-- ─── Routine extras (one-time tasks added for a specific day) ─
create table if not exists routine_extras (
  user_id text not null,
  date date not null,
  step_id text not null,
  step_payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, date, step_id)
);

-- ─── RLS ──────────────────────────────────────────────────────
alter table app_config enable row level security;
alter table user_profile enable row level security;
alter table routine_data enable row level security;
alter table routine_completions enable row level security;
alter table routine_cancellations enable row level security;
alter table routine_postponements enable row level security;
alter table routine_extras enable row level security;

create policy "Allow all" on app_config for all using (true) with check (true);
create policy "Allow all" on user_profile for all using (true) with check (true);
create policy "Allow all" on routine_data for all using (true) with check (true);
create policy "Allow all" on routine_completions for all using (true) with check (true);
create policy "Allow all" on routine_cancellations for all using (true) with check (true);
create policy "Allow all" on routine_postponements for all using (true) with check (true);
create policy "Allow all" on routine_extras for all using (true) with check (true);

-- ─── Care data ────────────────────────────────────────────────
create table if not exists care_data (
  id text primary key default 'default',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table care_data enable row level security;
create policy "Allow all" on care_data for all using (true) with check (true);
