-- Supabase schema + RLS (run all at once or in blocks)

-- 1) Tables
create table if not exists profiles (
  id uuid references auth.users primary key,
  name text,
  currency text default 'BRL',
  language text default 'pt',
  default_month text,
  telegram_chat_id bigint,
  telegram_summary_enabled boolean default false
);

create table if not exists telegram_link_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  code text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists categories (
  id text primary key,
  user_id uuid references auth.users not null,
  name text not null,
  type text not null,
  icon text
);

create table if not exists transactions (
  id text primary key,
  user_id uuid references auth.users not null,
  type text not null,
  amount numeric not null,
  category text not null,
  date date not null,
  description text,
  is_future boolean default false,
  is_unexpected boolean default false,
  source text default 'web',
  created_at timestamptz default now()
);

create table if not exists goals (
  id text primary key,
  user_id uuid references auth.users not null,
  title text not null,
  target_amount numeric,
  current_amount numeric default 0,
  deadline date,
  completed boolean default false,
  created_at timestamptz default now()
);

-- Migration para adicionar novos campos (rodar se tabela já existe):
-- alter table goals add column if not exists target_amount numeric;
-- alter table goals add column if not exists current_amount numeric default 0;
-- alter table goals add column if not exists deadline date;

-- Migration para Fase 7.1 - Resumos Automáticos (rodar se tabela já existe):
-- alter table profiles add column if not exists telegram_summary_enabled boolean default false;

create table if not exists assets (
  id text primary key,
  user_id uuid references auth.users not null,
  symbol text not null,
  name text not null,
  asset_class text not null,
  quantity numeric not null,
  average_price numeric not null,
  total_invested numeric not null,
  purchase_date date not null,
  created_at timestamptz default now()
);

create table if not exists recurring_transactions (
  id text primary key,
  user_id uuid references auth.users not null,
  type text not null,                    -- 'income' | 'expense' | 'investment'
  amount numeric not null,
  category text not null,
  description text,
  frequency text not null,               -- 'weekly' | 'monthly' | 'yearly'
  day_of_month smallint,                 -- 1-28 (para monthly)
  day_of_week smallint,                  -- 0-6 (para weekly, 0=domingo)
  month_of_year smallint,                -- 1-12 (para yearly)
  start_date date not null,
  end_date date,                         -- null = indefinido
  last_generated_date date,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 2) Indexes
create index if not exists idx_transactions_user_date on transactions (user_id, date);
create index if not exists idx_goals_user_created on goals (user_id, created_at);
create index if not exists idx_assets_user_created on assets (user_id, created_at);
create index if not exists idx_categories_user_name on categories (user_id, name);
create index if not exists idx_telegram_tokens_code on telegram_link_tokens (code);
create index if not exists idx_telegram_tokens_user on telegram_link_tokens (user_id);
create index if not exists idx_recurring_user_active on recurring_transactions (user_id, is_active);

-- 3) RLS enable
alter table profiles enable row level security;
alter table telegram_link_tokens enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table goals enable row level security;
alter table assets enable row level security;
alter table recurring_transactions enable row level security;

-- 4) RLS policies
create policy "Profiles own data" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Telegram link tokens own data" on telegram_link_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Categories own data" on categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Transactions own data" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Goals own data" on goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Assets own data" on assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Recurring transactions own data" on recurring_transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
