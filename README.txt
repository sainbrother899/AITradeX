AITradeX Phase 5.15 — Clean Database Runtime Baseline

Base used:
- AITradeX Phase 5.10.2 Separate Payment Methods

What was cleaned:
- Removed browser/local app-state as the main data source when Supabase is configured.
- Removed database runtime patch layers and old auto-refresh/realtime render loops.
- Rebuilt db-service.js as a single clean database service.
- Rebuilt auth.js as async database-first login/signup.
- User/admin app startup now loads Supabase data when a session exists.
- User/admin login loads Supabase data before dashboard render.
- User KYC, bank/payment methods, deposit requests, withdrawal requests now read from App.state loaded from Supabase, not per-browser userKey localStorage records.
- Admin KYC, bank/payment methods, deposit requests, withdrawal requests now read from database-backed App.state, not per-browser userKey localStorage records.

What still uses browser storage:
- Login session token/user id.
- Active page, filters, pagination, selected chart/pair, form draft step values.
- Login lock attempts.
- Live price cache.

What does not use browser storage as source of truth:
- Users.
- KYC requests.
- Deposit requests.
- Withdrawal requests.
- Wallet ledger.
- Payment/bank methods.
- Trades and AI batches.
- Notifications.
- Support tickets.
- App settings.
- Admin action logs.

Supabase setup:
- Run supabase-schema.sql.
- Run supabase-core-sync-policies.sql.
- Then deploy/open this ZIP.

Testing checklist:
1. Open admin and user in separate browsers/devices.
2. Create user on mobile.
3. Login same user on PC.
4. Submit KYC from user.
5. Admin Database > Load Core + Trades if needed, then check KYC page.
6. Approve KYC.
7. User refresh/login should show approved.
8. Submit deposit/withdrawal and confirm admin visibility.

Important:
- No patch.js/fix.js/old backup JS files are included.
- Changed runtime files were replaced cleanly: db-service.js, auth.js, core.js, user-app.js, admin-app.js.
