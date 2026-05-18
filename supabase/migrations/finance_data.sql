create table if not exists finance_data (
  id text primary key,
  user_id text not null unique,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table finance_data enable row level security;
create policy "Allow all" on finance_data for all using (true) with check (true);
