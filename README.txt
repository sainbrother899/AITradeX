AITradeX Phase 5.16 — True Action-Based Database Runtime

This build is a clean database-runtime rebuild based on the previous clean baseline.

What changed:
- App.saveState() no longer runs hidden full database sync in database mode.
- KYC request writes directly to Supabase kyc_requests.
- Deposit request writes directly to Supabase deposit_requests.
- Withdrawal request writes directly to Supabase withdrawal_requests.
- Payment/bank method writes directly to Supabase payment_methods.
- Wallet ledger writes directly to Supabase wallet_ledger.
- Notifications write directly to Supabase notifications.
- Admin audit actions write directly to Supabase admin_action_logs.
- Manual and AI trade rows write directly to Supabase trade_orders when opened/closed.

What localStorage is still used for:
- Login/session tokens
- Current page/menu UI state
- Filters/pagination and form draft convenience
- Login lock attempt counters
- Live price cache

What localStorage is NOT used for in database mode:
- It is not the source of truth for users, KYC, deposits, withdrawals, wallet ledger, trades, payment methods, notifications, or admin logs.

Important:
- Run supabase-schema.sql and supabase-core-sync-policies.sql if your Supabase project is missing columns/policies.
- Use Admin > Database > Load only when you intentionally want to reload data from Supabase.


PHASE 5.16.1 NOTE
- SQL files were deliberately updated in this package so GitHub/file diff clearly shows database runtime alignment.
- supabase-schema.sql now includes a Phase 5.16.1 section for action-based runtime compatibility.
- supabase-core-sync-policies.sql now includes a Phase 5.16.1 section covering every table used by the clean runtime.
- No patch.js/fix.js/old.js files are included.
