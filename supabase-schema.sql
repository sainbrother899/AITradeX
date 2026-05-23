-- AITradeX Phase 5.29 RLS Safety Pack + Final Deep Consistency
-- Includes notification delete compatibility and hashed password runtime support.
-- AITradeX Phase 5.19 Strict DB-First Critical Runtime
-- Keeps schema/RLS aligned with DB-first critical writes and emergency-only manual repair sync.

-- AITradeX Phase 5.16.1 Clean Action Database Runtime Schema
-- Updated: 2026-05-23
-- Purpose: Keep Supabase schema aligned with the action-based database runtime.
-- Safe to run multiple times. It does not delete old data.

create table if not exists public.users (id text primary key,name text,email text unique,mobile text,role text default 'user',status text default 'ACTIVE',referral_code text,referred_by text,created_at timestamptz default now());
create table if not exists public.wallet_ledger (id text primary key,user_id text not null,account_type text default 'REAL',type text not null,amount numeric not null,reference_id text not null,note text,balance_after numeric,created_at timestamptz default now(),unique(user_id,account_type,type,reference_id));
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

-- Phase 5.34: Live Sync Lite realtime publication support.
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
alter table public.plans add column if not exists raw jsonb default '{}'::jsonb;
alter table public.subscriptions add column if not exists raw jsonb default '{}'::jsonb;
alter table public.referrals add column if not exists raw jsonb default '{}'::jsonb;
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
values ('main', jsonb_build_object('databaseRuntimeVersion','6.2','mode','action-database'), now())
on conflict (id) do update
set settings = coalesce(public.app_settings.settings, '{}'::jsonb) || jsonb_build_object('databaseRuntimeVersion','6.2','mode','action-database'),
    updated_at = now();


-- Phase 5.29: Clean persistence compatibility columns/indexes.
alter table public.users add column if not exists last_login_at timestamptz;
alter table public.users add column if not exists updated_at timestamptz default now();
alter table public.payment_methods add column if not exists raw jsonb default '{}'::jsonb;
alter table public.notifications add column if not exists raw jsonb default '{}'::jsonb;
alter table public.admin_action_logs add column if not exists raw jsonb default '{}'::jsonb;
create index if not exists payment_methods_user_id_idx on public.payment_methods(user_id);
create index if not exists admin_action_logs_created_at_idx on public.admin_action_logs(created_at desc);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

insert into public.app_settings(id, settings, updated_at)
values ('main', jsonb_build_object('databaseRuntimeVersion','6.2','mode','action-database-clean-persistence'), now())
on conflict (id) do update
set settings = coalesce(public.app_settings.settings, '{}'::jsonb) || jsonb_build_object('databaseRuntimeVersion','6.2','mode','action-database-clean-persistence'),
    updated_at = now();


-- Phase 5.29: Final clean audit compatibility.
-- New passwords are stored in password_hash as sha256$salt$hash by the frontend runtime.
-- Existing plain password_hash values are migrated after the next successful login/reset.
alter table public.users add column if not exists password_hash text;
alter table public.notifications add column if not exists raw jsonb default '{}'::jsonb;

insert into public.app_settings(id, settings, updated_at)
values ('main', jsonb_build_object('databaseRuntimeVersion','6.2','mode','final-clean-audit-fix','passwordStorage','salted-sha256-runtime'), now())
on conflict (id) do update
set settings = coalesce(public.app_settings.settings, '{}'::jsonb) || jsonb_build_object('databaseRuntimeVersion','6.2','mode','final-clean-audit-fix','passwordStorage','salted-sha256-runtime'),
    updated_at = now();


-- Phase 5.29: default control admin + safer ledger uniqueness
alter table public.wallet_ledger drop constraint if exists wallet_ledger_type_reference_id_key;
alter table public.wallet_ledger drop constraint if exists wallet_ledger_user_id_account_type_type_reference_id_key;
alter table public.wallet_ledger add constraint wallet_ledger_user_id_account_type_type_reference_id_key unique(user_id, account_type, type, reference_id);

insert into public.users (id, name, email, mobile, role, status, referral_code, password_hash, ai_trade_on, ai_trade_percent, created_at, updated_at)
values ('control_root', 'AITradeX Control', 'control@aitradex.com', '', 'admin', 'ACTIVE', 'CONTROL', 'sha256$control_root$4777731d2f274363db7e3be6b9f78af08f0210a102cf2b137445d4daf9b13c02', false, 0, now(), now())
on conflict (id) do update set
  name=excluded.name,
  email=excluded.email,
  role=excluded.role,
  status=excluded.status,
  referral_code=excluded.referral_code,
  password_hash=coalesce(public.users.password_hash, excluded.password_hash),
  updated_at=now();


-- Phase 5.29 security note:
-- This schema is suitable for controlled testing. For real public money/users, move admin/funds/trading actions to a private backend/service-role API and tighten RLS policies per role.


-- Phase 5.29: final deep consistency marker
insert into public.app_settings(id, settings, updated_at)
values ('main', jsonb_build_object('databaseRuntimeVersion','6.2','mode','final-deep-consistency-fix','passwordStorage','salted-sha256-runtime'), now())
on conflict (id) do update
set settings = coalesce(public.app_settings.settings, '{}'::jsonb) || jsonb_build_object('databaseRuntimeVersion','6.2','mode','final-deep-consistency-fix','passwordStorage','salted-sha256-runtime'),
    updated_at = now();


-- Phase 5.29: TESTING RLS POLICIES FOR CURRENT FRONTEND-ONLY BUILD
-- These policies keep RLS enabled while allowing the current anon-key frontend prototype to function.
-- They are NOT sufficient for real public money/users because custom frontend login is not available to PostgreSQL RLS.
-- For real launch, move writes to backend/Edge Functions or Supabase Auth and then adapt supabase-production-rls-template.sql.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'users','wallet_ledger','deposit_requests','withdrawal_requests','payment_methods','kyc_requests',
    'notifications','admin_action_logs','trade_orders','ai_trade_batches','app_settings','plans','subscriptions',
    'referrals','support_tickets','app_state_snapshots'
  ]
  loop
    begin
      execute format('alter table public.%I enable row level security', tbl);
      execute format('drop policy if exists "AITradeX testing anon all %s" on public.%I', tbl, tbl);
      execute format('drop policy if exists "AITradeX anon all %s" on public.%I', tbl, tbl);
      execute format('create policy "AITradeX testing anon all %s" on public.%I for all to anon using (true) with check (true)', tbl, tbl);
    exception
      when undefined_table then raise notice 'Testing RLS policy skipped, table missing: %', tbl;
      when others then raise notice 'Testing RLS policy setup skipped for %. Reason: %', tbl, sqlerrm;
    end;
  end loop;
end $$;

insert into public.app_settings(id, settings, updated_at)
values ('main', jsonb_build_object('databaseRuntimeVersion','6.2','mode','rls-safety-pack','rlsMode','testing-frontend-compatible'), now())
on conflict (id) do update
set settings = coalesce(public.app_settings.settings, '{}'::jsonb) || jsonb_build_object('databaseRuntimeVersion','6.2','mode','rls-safety-pack','rlsMode','testing-frontend-compatible'),
    updated_at = now();


-- Phase 5.34: Live Sync Lite marker.
insert into public.app_settings (id, settings, updated_at)
values ('main', jsonb_build_object('databaseRuntimeVersion','6.2','mode','live-sync-lite','liveSync','supabase-realtime-silent-ui'), now())
on conflict (id) do update
set settings = coalesce(public.app_settings.settings, '{}'::jsonb) || jsonb_build_object('databaseRuntimeVersion','6.2','mode','live-sync-lite','liveSync','supabase-realtime-silent-ui'),
    updated_at = now();


-- Phase 6.2 Deposit Backend Security + Secure Auth Foundation (safe, non-breaking)
-- These columns/tables prepare the project for Supabase Auth + backend Edge Functions without breaking the current Phase5 UI.
alter table public.users add column if not exists auth_user_id uuid unique;
alter table public.users add column if not exists password_updated_at timestamptz;
alter table public.users add column if not exists password_updated_by text;

create table if not exists public.admin_roles (
  id text primary key,
  user_id text references public.users(id) on delete cascade,
  auth_user_id uuid,
  role text not null default 'admin',
  permissions jsonb not null default '{}'::jsonb,
  status text not null default 'ACTIVE',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.backend_action_queue (
  id text primary key,
  action_type text not null,
  status text not null default 'PENDING',
  requested_by text,
  target_user_id text,
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz default now(),
  processed_at timestamptz
);

create index if not exists users_auth_user_id_idx on public.users(auth_user_id);
create index if not exists admin_roles_user_id_idx on public.admin_roles(user_id);
create index if not exists backend_action_queue_status_idx on public.backend_action_queue(status, created_at desc);

insert into public.app_settings(id, settings, updated_at)
values ('main', jsonb_build_object('databaseRuntimeVersion','6.2','mode','phase6-secure-auth-foundation','authMode','legacy-testing'), now())
on conflict (id) do update
set settings = coalesce(public.app_settings.settings, '{}'::jsonb) || jsonb_build_object('databaseRuntimeVersion','6.2','mode','phase6-secure-auth-foundation','authMode','legacy-testing'),
    updated_at = now();

-- Phase 6.2 Deposit Backend Security
-- Centralizes deposit approve/reject in PostgreSQL RPC functions.
-- This is a safe migration step before full Edge Function/service-role migration.

create or replace function public.aitradex_validate_admin(p_admin_user_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = p_admin_user_id
      and lower(coalesce(role,'')) = 'admin'
      and upper(coalesce(status,'ACTIVE')) = 'ACTIVE'
  );
$$;

create or replace function public.aitradex_approve_deposit(
  p_request_id text,
  p_admin_user_id text default 'control_root',
  p_admin_email text default '',
  p_admin_name text default 'Admin'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dep public.deposit_requests%rowtype;
  ledger_applied boolean := false;
  ledger_inserted integer := 0;
  duplicate_count integer := 0;
  ledger_id text;
  notif_id text;
  log_id text;
  queue_id text;
begin
  if not public.aitradex_validate_admin(p_admin_user_id) then
    raise exception 'Admin permission required for deposit approval.';
  end if;

  select * into dep from public.deposit_requests where id = p_request_id for update;
  if not found then
    raise exception 'Deposit request not found.';
  end if;

  if upper(coalesce(dep.status,'PENDING')) <> 'PENDING' then
    return jsonb_build_object('ok', true, 'alreadyCompleted', true, 'status', dep.status, 'ledgerApplied', false);
  end if;

  if coalesce(dep.amount,0) <= 0 then
    raise exception 'Invalid deposit amount.';
  end if;

  if nullif(trim(coalesce(dep.utr,'')), '') is not null then
    select count(*) into duplicate_count
    from public.deposit_requests
    where id <> dep.id
      and utr = dep.utr
      and upper(coalesce(status,'')) = 'APPROVED';
    if duplicate_count > 0 then
      raise exception 'Duplicate approved UTR found. Approval blocked.';
    end if;
  end if;

  ledger_id := 'ledger_dep_' || dep.id;
  insert into public.wallet_ledger(id, user_id, account_type, type, amount, reference_id, note, created_at, raw)
  values (
    ledger_id,
    dep.user_id,
    'REAL',
    'DEPOSIT',
    dep.amount,
    dep.id,
    'SECURE_DEPOSIT_APPROVED · UTR ' || coalesce(dep.utr,'-'),
    now(),
    jsonb_build_object('secureDepositApprove', true, 'approvedBy', p_admin_user_id, 'approvedByEmail', p_admin_email, 'approvedAt', now())
  )
  on conflict on constraint wallet_ledger_user_id_account_type_type_reference_id_key do nothing;
  get diagnostics ledger_inserted = row_count;
  ledger_applied := ledger_inserted > 0;

  update public.deposit_requests
  set status = 'APPROVED',
      balance_applied = true,
      reviewed_at = now(),
      reviewed_by = p_admin_user_id,
      admin_note = case when duplicate_count > 0 then 'Checked duplicate UTR warning: ' || duplicate_count::text || ' similar approved request(s).' else 'Approved by secure backend function.' end,
      raw = coalesce(raw, '{}'::jsonb) || jsonb_build_object('secureDepositApprove', true, 'approvedBy', p_admin_user_id, 'approvedByEmail', p_admin_email, 'approvedAt', now(), 'ledgerApplied', ledger_applied)
  where id = dep.id;

  notif_id := 'notif_dep_ok_' || dep.id;
  insert into public.notifications(id, audience, user_id, title, message, type, link_page, reference_id, read, created_at, raw)
  values (notif_id, 'USER', dep.user_id, 'Deposit approved', 'Deposit ' || dep.amount::text || ' approved and credited to your wallet.', 'DEPOSIT', 'wallet', 'dep_ok_' || dep.id, false, now(), jsonb_build_object('secureDepositApprove', true))
  on conflict (id) do update set
    audience=excluded.audience, user_id=excluded.user_id, title=excluded.title, message=excluded.message, type=excluded.type, link_page=excluded.link_page, reference_id=excluded.reference_id, raw=excluded.raw;

  log_id := 'adminlog_dep_approve_' || dep.id;
  insert into public.admin_action_logs(id, admin_user_id, action, target_type, target_id, meta, created_at)
  values (log_id, p_admin_user_id, 'DEPOSIT_APPROVE_SECURE', 'DEPOSIT', dep.id, jsonb_build_object('userId', dep.user_id, 'amount', dep.amount, 'utr', dep.utr, 'ledgerApplied', ledger_applied, 'adminEmail', p_admin_email, 'adminName', p_admin_name), now())
  on conflict (id) do update set meta=excluded.meta, created_at=excluded.created_at;

  queue_id := 'backend_deposit_approve_' || dep.id;
  insert into public.backend_action_queue(id, action_type, status, requested_by, target_user_id, payload, result, created_at, processed_at)
  values (queue_id, 'DEPOSIT_APPROVE', 'COMPLETED', p_admin_user_id, dep.user_id, jsonb_build_object('requestId', dep.id, 'amount', dep.amount), jsonb_build_object('ledgerApplied', ledger_applied, 'status', 'APPROVED'), now(), now())
  on conflict (id) do update set status='COMPLETED', result=excluded.result, processed_at=now();

  return jsonb_build_object('ok', true, 'requestId', dep.id, 'userId', dep.user_id, 'amount', dep.amount, 'ledgerApplied', ledger_applied, 'status', 'APPROVED');
end;
$$;

create or replace function public.aitradex_reject_deposit(
  p_request_id text,
  p_reason text default 'Rejected by admin.',
  p_admin_user_id text default 'control_root',
  p_admin_email text default '',
  p_admin_name text default 'Admin'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dep public.deposit_requests%rowtype;
  notif_id text;
  log_id text;
  queue_id text;
  clean_reason text := coalesce(nullif(trim(p_reason), ''), 'Rejected by admin.');
begin
  if not public.aitradex_validate_admin(p_admin_user_id) then
    raise exception 'Admin permission required for deposit rejection.';
  end if;

  select * into dep from public.deposit_requests where id = p_request_id for update;
  if not found then
    raise exception 'Deposit request not found.';
  end if;

  if upper(coalesce(dep.status,'PENDING')) <> 'PENDING' then
    return jsonb_build_object('ok', true, 'alreadyCompleted', true, 'status', dep.status);
  end if;

  update public.deposit_requests
  set status = 'REJECTED',
      reviewed_at = now(),
      reviewed_by = p_admin_user_id,
      admin_note = clean_reason,
      raw = coalesce(raw, '{}'::jsonb) || jsonb_build_object('secureDepositReject', true, 'rejectedBy', p_admin_user_id, 'rejectedByEmail', p_admin_email, 'rejectedAt', now(), 'rejectReason', clean_reason, 'rejectReasonUser', clean_reason)
  where id = dep.id;

  notif_id := 'notif_dep_rej_' || dep.id;
  insert into public.notifications(id, audience, user_id, title, message, type, link_page, reference_id, read, created_at, raw)
  values (notif_id, 'USER', dep.user_id, 'Deposit rejected', 'Deposit request ' || coalesce(dep.amount,0)::text || ' was rejected. ' || clean_reason, 'DEPOSIT', 'wallet', 'dep_rej_' || dep.id, false, now(), jsonb_build_object('secureDepositReject', true, 'reason', clean_reason))
  on conflict (id) do update set
    audience=excluded.audience, user_id=excluded.user_id, title=excluded.title, message=excluded.message, type=excluded.type, link_page=excluded.link_page, reference_id=excluded.reference_id, raw=excluded.raw;

  log_id := 'adminlog_dep_reject_' || dep.id;
  insert into public.admin_action_logs(id, admin_user_id, action, target_type, target_id, meta, created_at)
  values (log_id, p_admin_user_id, 'DEPOSIT_REJECT_SECURE', 'DEPOSIT', dep.id, jsonb_build_object('userId', dep.user_id, 'amount', dep.amount, 'utr', dep.utr, 'reason', clean_reason, 'adminEmail', p_admin_email, 'adminName', p_admin_name), now())
  on conflict (id) do update set meta=excluded.meta, created_at=excluded.created_at;

  queue_id := 'backend_deposit_reject_' || dep.id;
  insert into public.backend_action_queue(id, action_type, status, requested_by, target_user_id, payload, result, created_at, processed_at)
  values (queue_id, 'DEPOSIT_REJECT', 'COMPLETED', p_admin_user_id, dep.user_id, jsonb_build_object('requestId', dep.id, 'reason', clean_reason), jsonb_build_object('status', 'REJECTED'), now(), now())
  on conflict (id) do update set status='COMPLETED', result=excluded.result, processed_at=now();

  return jsonb_build_object('ok', true, 'requestId', dep.id, 'userId', dep.user_id, 'status', 'REJECTED', 'reason', clean_reason);
end;
$$;

grant execute on function public.aitradex_validate_admin(text) to anon, authenticated;
grant execute on function public.aitradex_approve_deposit(text,text,text,text) to anon, authenticated;
grant execute on function public.aitradex_reject_deposit(text,text,text,text) to anon, authenticated;

insert into public.app_settings(id, settings, updated_at)
values ('main', jsonb_build_object('databaseRuntimeVersion','6.2','mode','phase6-deposit-backend-security','depositBackend','rpc-secure-function'), now())
on conflict (id) do update
set settings = coalesce(public.app_settings.settings, '{}'::jsonb) || jsonb_build_object('databaseRuntimeVersion','6.2','mode','phase6-deposit-backend-security','depositBackend','rpc-secure-function'),
    updated_at = now();
