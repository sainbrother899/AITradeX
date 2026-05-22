-- AITradeX Phase 5.13: enable Supabase Realtime for database-only live updates.
-- Run this once in Supabase SQL Editor after supabase-schema.sql.
-- It does not delete data.

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'users',
    'payment_methods',
    'kyc_requests',
    'deposit_requests',
    'withdrawal_requests',
    'wallet_ledger',
    'trade_orders',
    'ai_trade_batches',
    'admin_action_logs',
    'notifications',
    'app_settings',
    'plans',
    'subscriptions',
    'referrals',
    'support_tickets'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception
      when duplicate_object then
        null;
      when undefined_table then
        raise notice 'Realtime table skipped because it does not exist: %', tbl;
      when others then
        raise notice 'Realtime enable skipped for %. Reason: %', tbl, sqlerrm;
    end;
  end loop;
end $$;
