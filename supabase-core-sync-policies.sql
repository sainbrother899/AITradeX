-- AITradeX Phase 5.3 Core Sync Policies
-- Use these only for prototype/testing with anon key. Before public launch, replace with authenticated admin/user policies or Edge Functions.

alter table public.users enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.deposit_requests enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.payment_methods enable row level security;
alter table public.kyc_requests enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "AITradeX anon all users" on public.users;
drop policy if exists "AITradeX anon all wallet ledger" on public.wallet_ledger;
drop policy if exists "AITradeX anon all deposits" on public.deposit_requests;
drop policy if exists "AITradeX anon all withdrawals" on public.withdrawal_requests;
drop policy if exists "AITradeX anon all payment methods" on public.payment_methods;
drop policy if exists "AITradeX anon all kyc" on public.kyc_requests;
drop policy if exists "AITradeX anon all notifications" on public.notifications;

create policy "AITradeX anon all users" on public.users for all to anon using (true) with check (true);
create policy "AITradeX anon all wallet ledger" on public.wallet_ledger for all to anon using (true) with check (true);
create policy "AITradeX anon all deposits" on public.deposit_requests for all to anon using (true) with check (true);
create policy "AITradeX anon all withdrawals" on public.withdrawal_requests for all to anon using (true) with check (true);
create policy "AITradeX anon all payment methods" on public.payment_methods for all to anon using (true) with check (true);
create policy "AITradeX anon all kyc" on public.kyc_requests for all to anon using (true) with check (true);
create policy "AITradeX anon all notifications" on public.notifications for all to anon using (true) with check (true);
