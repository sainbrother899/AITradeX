-- AITradeX Phase 5.19 Final Critical DB Action Cleanup
-- AITradeX Phase 5.18 Strict Action-Based Database Runtime
-- Keeps schema/RLS aligned with direct action writes and manual repair sync.

-- AITradeX Phase 5.16.1 Clean Action Database Runtime Schema
-- Updated: 2026-05-23
-- Purpose: Keep Supabase schema aligned with the action-based database runtime.
-- Safe to run multiple times. It does not delete old data.

create table if not exists public.users (id text primary key,name text,email text unique,mobile text,role text default 'user',status text default 'ACTIVE',referral_code text,referred_by text,created_at timestamptz default now());
create table if not exists public.wallet_ledger (id text primary key,user_id text not null,account_type text default 'REAL',type text not null,amount numeric not null,reference_id text not null,note text,balance_after numeric,created_at timestamptz default now(),unique(type,reference_id));
create table if not exists public.kyc_requests (id text primary key,user_id text,user_email text,full_name text,mobile text,id_number text,address text,status text default 'PENDING',reviewed_at timestamptz,created_at timestamptz default now());
create table if not exists public.payment_methods (id text primary key,user_id text,user_email text,type text,holder_name text,upi_id text,bank_name text,account_number text,ifsc text,status text default 'PENDING',rejection_reason text,created_at timestamptz default now());
create table if not exists public.deposit_requests (id text primary key,user_id text,user_email text,amount numeric,method text,utr text unique,status text default 'PENDING',balance_applied boolean default false,first_deposit_referral_checked boolean default false,created_at timestamptz default now());
create table if not exists public.withdrawal_requests (id text primary key,user_id text,user_email text,amount numeric,payment_method_id text,status text default 'PENDING',hold_applied boolean default true,created_at timestamptz default now());
create table if not exists public.ai_trades (id text primary key,user_id text,user_email text,account_type text,pair text,side text,amount numeric,leverage numeric,status text default 'OPEN',pnl numeric,created_at timestamptz default now(),closed_at timestamptz);
create table if not exists public.referrals (id text primary key,referrer_user_id text,referred_user_id text,status text default 'REGISTERED',commission_paid boolean default false,commission_amount numeric default 0,created_at timestamptz default now());
create table if not exists public.plans (id text primary key,name text,price numeric,signals integer,ai_access text,trade_limit numeric,is_active boolean default true);
create table if not exists public.subscriptions (id text primary key,user_id text,plan_id text,plan_name text,amount numeric,status text default 'PENDING',starts_at timestamptz,expires_at timestamptz,created_at timestamptz default now());


-- Phase 5.0 Database Foundation
-- This snapshot table lets the current frontend app safely backup/restore all platform state while the full row-by-row backend migration is done in phases.
create table if not exists public.app_state_snapshots (
  id bigserial primary key,
  app_version text default 'AITradeX',
  saved_by text,
  note text,
  counts jsonb default '{}'::jsonb,
  state jsonb not null,
  saved_at timestamptz default now()
);

create index if not exists app_state_snapshots_saved_at_idx on public.app_state_snapshots(saved_at desc);

-- Extra future-ready columns. These are safe if they already exist.
alter table public.users add column if not exists password_hash text;
alter table public.users add column if not exists ai_trade_on boolean default false;
alter table public.users add column if not exists ai_trade_percent numeric default 25;
alter table public.users add column if not exists free_trial_started_at timestamptz;
alter table public.deposit_requests add column if not exists proof_image text;
alter table public.deposit_requests add column if not exists admin_note text;
alter table public.withdrawal_requests add column if not exists admin_note text;
alter table public.ai_trades add column if not exists trade_type text;
alter table public.ai_trades add column if not exists entry_price numeric;
alter table public.ai_trades add column if not exists close_price numeric;
alter table public.ai_trades add column if not exists target_pnl numeric;
alter table public.ai_trades add column if not exists closed_by text;

create table if not exists public.notifications (
  id text primary key,
  audience text default 'USER',
  user_id text,
  title text,
  message text,
  type text default 'INFO',
  link_page text,
  reference_id text,
  read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.support_tickets (
  id text primary key,
  user_id text,
  user_email text,
  subject text,
  category text,
  message text,
  status text default 'OPEN',
  replies jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.admin_action_logs (
  id text primary key,
  admin_user_id text,
  action text not null,
  target_type text,
  target_id text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Phase 5.5 audit log compatibility: older schema used bigserial id. Keep existing projects sync-safe.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'admin_action_logs' and column_name = 'id' and data_type <> 'text'
  ) then
    alter table public.admin_action_logs alter column id drop default;
    alter table public.admin_action_logs alter column id type text using id::text;
  end if;
end $$;

-- Phase 5.4 Trade + AI + Orders Sync
-- Generic table for manual positions, limit orders, closed manual history, AI live positions and instant AI user entries.
create table if not exists public.trade_orders (
  id text primary key,
  user_id text not null,
  batch_id text,
  trade_type text default 'MANUAL',
  account_type text default 'REAL',
  order_type text default 'MARKET',
  market text default 'CRYPTO',
  pair text,
  side text,
  status text default 'OPEN',
  source text,
  entry_price numeric,
  entry_price_display text,
  exit_price numeric,
  exit_price_display text,
  limit_price numeric,
  limit_price_display text,
  leverage numeric default 1,
  margin_amount numeric default 0,
  margin_locked boolean default false,
  position_size numeric default 0,
  pnl numeric default 0,
  settlement_amount numeric default 0,
  target_type text,
  target_percent numeric default 0,
  close_reason text,
  closed_by text,
  note text,
  raw jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  opened_at timestamptz,
  closed_at timestamptz
);

create index if not exists trade_orders_user_id_idx on public.trade_orders(user_id);
create index if not exists trade_orders_status_idx on public.trade_orders(status);
create index if not exists trade_orders_trade_type_idx on public.trade_orders(trade_type);
create index if not exists trade_orders_created_at_idx on public.trade_orders(created_at desc);

-- Admin-created AI batches for instant AI trades and live AI positions.
create table if not exists public.ai_trade_batches (
  id text primary key,
  batch_type text default 'INSTANT',
  market text default 'CRYPTO',
  pair text,
  side text,
  leverage numeric default 1,
  status text default 'OPEN',
  entry_price numeric,
  entry_price_display text,
  target_type text,
  target_percent numeric default 0,
  min_balance numeric default 0,
  total_margin numeric default 0,
  total_exposure numeric default 0,
  total_pnl numeric default 0,
  applied_count integer default 0,
  skipped_count integer default 0,
  skip_reasons jsonb default '{}'::jsonb,
  note text,
  raw jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  closed_at timestamptz
);

create index if not exists ai_trade_batches_type_idx on public.ai_trade_batches(batch_type);
create index if not exists ai_trade_batches_created_at_idx on public.ai_trade_batches(created_at desc);


-- Phase 5.11 Database-only support
create table if not exists public.app_settings (
  id text primary key default 'main',
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.plans add column if not exists raw jsonb default '{}'::jsonb;
alter table public.referrals add column if not exists raw jsonb default '{}'::jsonb;

alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists avatar_path text;


-- Phase 5.12.6: Preserve full frontend request payloads for database-only admin views
alter table public.kyc_requests add column if not exists raw jsonb default '{}'::jsonb;
alter table public.payment_methods add column if not exists raw jsonb default '{}'::jsonb;
alter table public.deposit_requests add column if not exists raw jsonb default '{}'::jsonb;
alter table public.withdrawal_requests add column if not exists raw jsonb default '{}'::jsonb;

-- Phase 5.13: optional realtime publication support.
-- Safe to run multiple times; duplicate publication entries are ignored.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'users','payment_methods','kyc_requests','deposit_requests','withdrawal_requests','wallet_ledger','trade_orders','ai_trade_batches','admin_action_logs','notifications','app_settings','plans','subscriptions','referrals','support_tickets'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception
      when duplicate_object then null;
      when undefined_table then raise notice 'Realtime table skipped because it does not exist: %', tbl;
      when others then raise notice 'Realtime enable skipped for %. Reason: %', tbl, sqlerrm;
    end;
  end loop;
end $$;


-- Phase 5.16.1: Action-based database runtime compatibility
-- These columns make direct KYC/deposit/withdrawal/admin updates safe across old projects.
alter table public.users add column if not exists last_login_at timestamptz;
alter table public.users add column if not exists updated_at timestamptz default now();
alter table public.kyc_requests add column if not exists admin_note text;
alter table public.kyc_requests add column if not exists reviewed_by text;
alter table public.payment_methods add column if not exists reviewed_at timestamptz;
alter table public.payment_methods add column if not exists reviewed_by text;
alter table public.deposit_requests add column if not exists reviewed_at timestamptz;
alter table public.deposit_requests add column if not exists reviewed_by text;
alter table public.withdrawal_requests add column if not exists reviewed_at timestamptz;
alter table public.withdrawal_requests add column if not exists reviewed_by text;
alter table public.withdrawal_requests add column if not exists rejection_reason text;
alter table public.wallet_ledger add column if not exists raw jsonb default '{}'::jsonb;
alter table public.notifications add column if not exists raw jsonb default '{}'::jsonb;
alter table public.admin_action_logs add column if not exists raw jsonb default '{}'::jsonb;

create index if not exists users_email_idx on public.users(email);
create index if not exists users_mobile_idx on public.users(mobile);
create index if not exists kyc_requests_user_id_idx on public.kyc_requests(user_id);
create index if not exists deposit_requests_user_id_idx on public.deposit_requests(user_id);
create index if not exists withdrawal_requests_user_id_idx on public.withdrawal_requests(user_id);
create index if not exists wallet_ledger_user_id_idx on public.wallet_ledger(user_id);
create index if not exists notifications_user_id_idx on public.notifications(user_id);

insert into public.app_settings(id, settings, updated_at)
values ('main', jsonb_build_object('databaseRuntimeVersion','5.16.1','mode','action-database'), now())
on conflict (id) do update
set settings = coalesce(public.app_settings.settings, '{}'::jsonb) || jsonb_build_object('databaseRuntimeVersion','5.16.1','mode','action-database'),
    updated_at = now();
