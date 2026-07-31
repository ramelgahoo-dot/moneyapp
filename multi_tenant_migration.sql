-- Core multi-tenant schema for MoneyApp.
-- Run in Supabase SQL Editor before billing_migration.sql.

begin;

create extension if not exists pgcrypto;

create table if not exists public.cars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  make text not null,
  model text not null,
  year integer not null,
  purchase_price numeric not null check (purchase_price > 0),
  purchase_date date not null,
  sale_price numeric,
  sale_date date,
  status text not null default 'active' check (status in ('active', 'sold')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists cars_user_id_idx on public.cars(user_id);
create index if not exists cars_status_idx on public.cars(status);
create index if not exists cars_purchase_date_idx on public.cars(purchase_date desc);

create table if not exists public.car_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  car_id uuid not null references public.cars(id) on delete cascade,
  category text not null,
  amount numeric not null check (amount > 0),
  date date not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists car_expenses_user_id_idx on public.car_expenses(user_id);
create index if not exists car_expenses_car_id_idx on public.car_expenses(car_id);
create index if not exists car_expenses_date_idx on public.car_expenses(date desc);

create table if not exists public.income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  amount numeric not null check (amount > 0),
  date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists income_user_id_idx on public.income(user_id);
create index if not exists income_date_idx on public.income(date desc);
create index if not exists income_source_idx on public.income(source_type, source_id);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null,
  amount numeric not null check (amount > 0),
  date date not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_id_idx on public.expenses(user_id);
create index if not exists expenses_date_idx on public.expenses(date desc);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null,
  ticker text,
  name text not null,
  amount_invested numeric not null check (amount_invested > 0),
  current_value numeric not null check (current_value >= 0),
  funded_from text,
  date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists investments_user_id_idx on public.investments(user_id);
create index if not exists investments_date_idx on public.investments(date desc);
create index if not exists investments_type_idx on public.investments(type);

create table if not exists public.investment_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  ticker text,
  percentage numeric not null check (percentage > 0 and percentage <= 100),
  created_at timestamptz not null default now()
);

create index if not exists investment_rules_user_id_idx on public.investment_rules(user_id);
create index if not exists investment_rules_created_at_idx on public.investment_rules(created_at asc);

create table if not exists public.distributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  investment_id uuid not null references public.investments(id) on delete cascade,
  amount numeric not null check (amount > 0),
  date date not null,
  type text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists distributions_user_id_idx on public.distributions(user_id);
create index if not exists distributions_investment_id_idx on public.distributions(investment_id);
create index if not exists distributions_date_idx on public.distributions(date desc);

alter table public.cars enable row level security;
alter table public.car_expenses enable row level security;
alter table public.income enable row level security;
alter table public.expenses enable row level security;
alter table public.investments enable row level security;
alter table public.investment_rules enable row level security;
alter table public.distributions enable row level security;

drop policy if exists cars_select_own on public.cars;
create policy cars_select_own on public.cars for select to authenticated using (user_id = auth.uid());
drop policy if exists cars_insert_own on public.cars;
create policy cars_insert_own on public.cars for insert to authenticated with check (user_id = auth.uid());
drop policy if exists cars_update_own on public.cars;
create policy cars_update_own on public.cars for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists cars_delete_own on public.cars;
create policy cars_delete_own on public.cars for delete to authenticated using (user_id = auth.uid());

drop policy if exists car_expenses_select_own on public.car_expenses;
create policy car_expenses_select_own on public.car_expenses for select to authenticated using (user_id = auth.uid());
drop policy if exists car_expenses_insert_own on public.car_expenses;
create policy car_expenses_insert_own on public.car_expenses for insert to authenticated with check (user_id = auth.uid());
drop policy if exists car_expenses_update_own on public.car_expenses;
create policy car_expenses_update_own on public.car_expenses for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists car_expenses_delete_own on public.car_expenses;
create policy car_expenses_delete_own on public.car_expenses for delete to authenticated using (user_id = auth.uid());

drop policy if exists income_select_own on public.income;
create policy income_select_own on public.income for select to authenticated using (user_id = auth.uid());
drop policy if exists income_insert_own on public.income;
create policy income_insert_own on public.income for insert to authenticated with check (user_id = auth.uid());
drop policy if exists income_update_own on public.income;
create policy income_update_own on public.income for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists income_delete_own on public.income;
create policy income_delete_own on public.income for delete to authenticated using (user_id = auth.uid());

drop policy if exists expenses_select_own on public.expenses;
create policy expenses_select_own on public.expenses for select to authenticated using (user_id = auth.uid());
drop policy if exists expenses_insert_own on public.expenses;
create policy expenses_insert_own on public.expenses for insert to authenticated with check (user_id = auth.uid());
drop policy if exists expenses_update_own on public.expenses;
create policy expenses_update_own on public.expenses for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists expenses_delete_own on public.expenses;
create policy expenses_delete_own on public.expenses for delete to authenticated using (user_id = auth.uid());

drop policy if exists investments_select_own on public.investments;
create policy investments_select_own on public.investments for select to authenticated using (user_id = auth.uid());
drop policy if exists investments_insert_own on public.investments;
create policy investments_insert_own on public.investments for insert to authenticated with check (user_id = auth.uid());
drop policy if exists investments_update_own on public.investments;
create policy investments_update_own on public.investments for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists investments_delete_own on public.investments;
create policy investments_delete_own on public.investments for delete to authenticated using (user_id = auth.uid());

drop policy if exists investment_rules_select_own on public.investment_rules;
create policy investment_rules_select_own on public.investment_rules for select to authenticated using (user_id = auth.uid());
drop policy if exists investment_rules_insert_own on public.investment_rules;
create policy investment_rules_insert_own on public.investment_rules for insert to authenticated with check (user_id = auth.uid());
drop policy if exists investment_rules_update_own on public.investment_rules;
create policy investment_rules_update_own on public.investment_rules for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists investment_rules_delete_own on public.investment_rules;
create policy investment_rules_delete_own on public.investment_rules for delete to authenticated using (user_id = auth.uid());

drop policy if exists distributions_select_own on public.distributions;
create policy distributions_select_own on public.distributions for select to authenticated using (user_id = auth.uid());
drop policy if exists distributions_insert_own on public.distributions;
create policy distributions_insert_own on public.distributions for insert to authenticated with check (user_id = auth.uid());
drop policy if exists distributions_update_own on public.distributions;
create policy distributions_update_own on public.distributions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists distributions_delete_own on public.distributions;
create policy distributions_delete_own on public.distributions for delete to authenticated using (user_id = auth.uid());

notify pgrst, 'reload schema';

commit;