-- AITradeX Phase 5.3 Core Sync Policies
-- Use these only for prototype/testing with anon key. Before public launch, replace with authenticated admin/user policies or Edge Functions.

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
