-- AITradeX Phase 5.19 Final Critical Actions Cleanup
-- AITradeX Phase 5.19 Strict DB-First Critical Runtime
-- Keeps schema/RLS aligned with DB-first critical writes and emergency-only manual repair sync.

-- AITradeX Phase 5.16.1 Clean Action Database Runtime Policies
-- Updated: 2026-05-23
-- Prototype/testing policy set. Keep RLS ON; these policies allow the current frontend anon-key prototype to read/write.
-- Before public launch, replace with Supabase Auth + strict user/admin policies or Edge Functions.

alter table public.users enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.deposit_requests enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.payment_methods enable row level security;
alter table public.kyc_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_action_logs enable row level security;

drop policy if exists "AITradeX anon all users" on public.users;
drop policy if exists "AITradeX anon all wallet ledger" on public.wallet_ledger;
drop policy if exists "AITradeX anon all deposits" on public.deposit_requests;
drop policy if exists "AITradeX anon all withdrawals" on public.withdrawal_requests;
drop policy if exists "AITradeX anon all payment methods" on public.payment_methods;
drop policy if exists "AITradeX anon all kyc" on public.kyc_requests;
drop policy if exists "AITradeX anon all notifications" on public.notifications;
drop policy if exists "AITradeX anon all admin action logs" on public.admin_action_logs;

create policy "AITradeX anon all users" on public.users for all to anon using (true) with check (true);
create policy "AITradeX anon all wallet ledger" on public.wallet_ledger for all to anon using (true) with check (true);
create policy "AITradeX anon all deposits" on public.deposit_requests for all to anon using (true) with check (true);
create policy "AITradeX anon all withdrawals" on public.withdrawal_requests for all to anon using (true) with check (true);
create policy "AITradeX anon all payment methods" on public.payment_methods for all to anon using (true) with check (true);
create policy "AITradeX anon all kyc" on public.kyc_requests for all to anon using (true) with check (true);
create policy "AITradeX anon all notifications" on public.notifications for all to anon using (true) with check (true);
create policy "AITradeX anon all admin action logs" on public.admin_action_logs for all to anon using (true) with check (true);

-- Phase 5.4 policies for trade/order sync tables.
alter table public.trade_orders enable row level security;
alter table public.ai_trade_batches enable row level security;

drop policy if exists "Allow anon read trade orders" on public.trade_orders;
drop policy if exists "Allow anon insert trade orders" on public.trade_orders;
drop policy if exists "Allow anon update trade orders" on public.trade_orders;
drop policy if exists "Allow anon delete trade orders" on public.trade_orders;
create policy "Allow anon read trade orders" on public.trade_orders for select to anon using (true);
create policy "Allow anon insert trade orders" on public.trade_orders for insert to anon with check (true);
create policy "Allow anon update trade orders" on public.trade_orders for update to anon using (true) with check (true);
create policy "Allow anon delete trade orders" on public.trade_orders for delete to anon using (true);

drop policy if exists "Allow anon read ai trade batches" on public.ai_trade_batches;
drop policy if exists "Allow anon insert ai trade batches" on public.ai_trade_batches;
drop policy if exists "Allow anon update ai trade batches" on public.ai_trade_batches;
drop policy if exists "Allow anon delete ai trade batches" on public.ai_trade_batches;
create policy "Allow anon read ai trade batches" on public.ai_trade_batches for select to anon using (true);
create policy "Allow anon insert ai trade batches" on public.ai_trade_batches for insert to anon with check (true);
create policy "Allow anon update ai trade batches" on public.ai_trade_batches for update to anon using (true) with check (true);
create policy "Allow anon delete ai trade batches" on public.ai_trade_batches for delete to anon using (true);


-- Phase 5.11 database-only app settings policies
alter table public.app_settings enable row level security;
drop policy if exists "Allow anon all app_settings" on public.app_settings;
create policy "Allow anon all app_settings" on public.app_settings for all to anon using (true) with check (true);


-- Phase 5.16.1: Ensure every table used by clean runtime has testing RLS policies.
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
      execute format('drop policy if exists "AITradeX anon all %s" on public.%I', tbl, tbl);
      execute format('create policy "AITradeX anon all %s" on public.%I for all to anon using (true) with check (true)', tbl, tbl);
    exception
      when undefined_table then raise notice 'Policy skipped, table missing: %', tbl;
      when others then raise notice 'Policy setup skipped for %. Reason: %', tbl, sqlerrm;
    end;
  end loop;
end $$;
