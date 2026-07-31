-- Billing migration for Stripe subscription state
-- Run in Supabase SQL Editor.

begin;

create table if not exists public.billing_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  subscription_status text not null default 'free',
  price_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_profiles_status_idx
  on public.billing_profiles(subscription_status);

alter table public.billing_profiles enable row level security;

drop policy if exists billing_profiles_select_own on public.billing_profiles;
create policy billing_profiles_select_own
  on public.billing_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists billing_profiles_insert_own on public.billing_profiles;
create policy billing_profiles_insert_own
  on public.billing_profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists billing_profiles_update_own on public.billing_profiles;
create policy billing_profiles_update_own
  on public.billing_profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

notify pgrst, 'reload schema';

commit;
