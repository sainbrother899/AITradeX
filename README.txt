AITradeX Phase 5.12 — Direct Database Write for Critical Actions

Base used:
- AITradeX Phase 5.11 — DatabaseOnly-CrossDeviceLogin

What changed in Phase 5.12:
1. Direct Supabase database write layer added in db-service.js.
2. Critical app changes now write directly to Supabase tables after App.saveState().
3. These tables are monitored and upserted when records change:
   - users
   - payment_methods
   - kyc_requests
   - deposit_requests
   - withdrawal_requests
   - wallet_ledger
   - trade_orders
   - ai_trade_batches
   - admin_action_logs
   - notifications
   - app_settings
   - plans
   - subscriptions
   - referrals
   - support_tickets
4. Manual Sync Core + Trades remains as Force Full Sync / Repair.
5. Database page wording updated so admin understands direct-write mode is active.

Important:
- Run latest supabase-schema.sql in Supabase SQL Editor if you have not already run the Phase 5.11 schema.
- Run latest supabase-core-sync-policies.sql if RLS blocks inserts/updates.
- LocalStorage should now be used mainly for session/UI cache. Main money/trade data should be saved in Supabase tables.

Recommended tests:
1. PC: Create new user -> check Supabase users table.
2. Mobile: login with same user -> should work from database.
3. User: submit deposit request -> check Supabase deposit_requests immediately.
4. Admin: approve deposit -> check wallet_ledger and deposit_requests status.
5. User: submit withdrawal -> check withdrawal_requests immediately.
6. Manual trade open/close -> check trade_orders.
7. AI live trade open/close -> check trade_orders and ai_trade_batches.
8. KYC submit/approve/reject -> check kyc_requests and Telegram alerts.

Notes:
- This remains a frontend/Supabase prototype. For a public launch, move sensitive admin operations and Telegram bot sending behind a backend/Supabase Edge Function.

Phase 5.12.1 Signup Duplicate Recovery Fix
- Signup no longer shows a false failure after the user row is already saved in Supabase.
- Retry with the same email/password will log into the existing account instead of creating a duplicate.
- Auto direct-write is paused during the critical signup insert to avoid race-condition duplicate errors.
- User rows are de-duplicated before bulk repair/sync.

Phase 5.13 note:
- 5-second database polling was removed.
- Supabase Realtime is used for user/admin live updates without constant page refresh.
- Run supabase-realtime-enable.sql once in Supabase SQL Editor if realtime changes do not appear instantly.
