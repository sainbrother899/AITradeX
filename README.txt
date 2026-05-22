AITradeX Stable Base — Phase 4.89

This ZIP is the cleaned stable base built from Phase 4.86 Admin Text Contrast Fix.

Main files
- index.html: user app entry
- admin.html: admin/control panel entry
- styles.css: shared user/admin styling
- user-app.js: user-side app logic
- admin-app.js: admin-side app logic
- core.js: shared state/helpers
- auth.js: auth/session helpers
- config.js: configuration placeholder
- supabase-schema.sql: database planning/schema reference

Default control center login
Email: control@aitradex.com
Password: admin123

Clean-base notes
- No separate temporary, duplicate, backup, or hotfix files are included.
- Old phase history notes were removed from this README.
- CSS phase comments were removed while preserving the existing rule order.
- User/admin JavaScript logic is kept in the main working files.

Important
This build is a frontend/static prototype baseline. Before real public use, move authentication, wallet ledger, deposits, withdrawals, trade settlement, and admin permissions to a secure backend such as Supabase/Firebase or a custom server.


Stable display setting:
- Crypto prices are shown to users in INR-only mode.
- Default USDT-INR conversion rate is ₹95 per USDT.
- Admin can change this anytime from Payment Settings > USDT to INR Rate.
- Internal trade P/L still uses raw crypto movement percentage, so wallet P/L remains INR-based.


Phase 4.91 update:
- Added premium read-only USDT-INR rate chip on user Trade page.
- Added premium read-only USDT-INR rate chip on user Wallet hero.
- Rate is controlled from Admin Payment Settings and defaults to ₹95 per USDT.

Phase 5.0 Database Foundation
-----------------------------
This build adds Supabase-ready database foundation without breaking the existing frontend/local-storage flow.

Setup:
1. Create a Supabase project.
2. Open Supabase SQL Editor and run supabase-schema.sql.
3. In config.js, fill SUPABASE_URL and SUPABASE_ANON_KEY.
4. Open Admin > Database.
5. Click Test Supabase Connection.
6. Click Backup Local Data to Supabase to save the current app state.

Important:
- This phase adds database backup/restore foundation first.
- The app still works in local mode if Supabase keys are blank.
- Full row-by-row migration for auth, wallet, trades and notifications should be done in next phases.

Phase 5.2 note:
For KYC/avatar Supabase Storage uploads, run supabase-storage-policies.sql in Supabase SQL Editor after creating these buckets:
- kyc-documents
- user-avatars
- support-attachments
These policies are for testing/client mode only. Lock them down before public launch.

Phase 5.3 Notes:
- Added row-by-row Supabase core sync for users, KYC, bank methods, deposit requests, withdrawal requests, wallet ledger and notifications.
- Admin > Database now has Sync Core + Trades and Load Core + Trades buttons.
- Auto-sync is debounced after local state changes when Supabase is configured.
- If Supabase shows row-level security errors for core tables, run supabase-core-sync-policies.sql in SQL Editor for prototype/testing.
- Before public launch, replace broad anon policies with secure authenticated policies or Edge Functions.

Phase 5.4 Notes:
- Added Supabase sync for manual trades, pending limit orders, closed manual history, AI live positions and instant AI trade user entries through the trade_orders table.
- Added Supabase sync for Instant AI and Live AI batch summaries through the ai_trade_batches table.
- Admin > Database Sync Core + Trades now pushes users, wallet/deposit/withdrawal data and trading/order data together.
- Run the updated supabase-schema.sql to create trade_orders and ai_trade_batches.
- Run the updated supabase-core-sync-policies.sql if Supabase shows RLS errors for trade/order sync tables.


Phase 5.4.1 note: Admin Database button labels were corrected to clearly show Core + Trades sync/load. The sync function already includes trade_orders and ai_trade_batches.

Phase 5.6 - Admin Login Security Hardening
- Admin session now expires automatically after 2 hours.
- Admin login gets temporarily locked for 15 minutes after 5 wrong password attempts on the same browser.
- Admin Security Center added in sidebar.
- Admin login/logout actions are written to audit logs.

Phase 5.9 - Telegram Bot Notifications
- Admin App Settings now includes Telegram Alerts controls.
- Configure Telegram bot token and chat ID from Admin > App Settings.
- Send Test Telegram Alert verifies the connection.
- Telegram alerts are limited to KYC, deposit and withdrawal only. Signup, support and AI alerts remain inside the website notification center.
- Optional user alert mirroring is available but disabled by default.
- Note: This frontend prototype stores the bot token in app settings/local state. For real production, move Telegram sending to a secure backend/Edge Function.


Phase 5.10 - Telegram Alerts Scope Fix
- Added a direct Admin > Telegram Alerts menu item.
- Telegram delivery is now limited to KYC, Deposit and Withdrawal types only.
- Added Telegram-capable KYC submit / approve / reject notifications.
- Signup, support, AI, wallet adjustment, plan and security notifications no longer go to Telegram.

# Phase 5.11 Database Only Mode
- Supabase is now the primary source for login/register and app data.
- Browser localStorage is no longer used for the full app state when Supabase config is present.
- Run supabase-schema.sql and supabase-core-sync-policies.sql before testing this version.
- PC/mobile cross-device login now checks Supabase users table.
