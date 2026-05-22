AITradeX Phase 5.17 - Strict Action-Based Database Runtime

Base: Phase 5.16.1 SQL-aligned clean runtime.

What changed in this ZIP:
1. Hidden/background full-state sync has been disabled. App.saveState() no longer pushes business data in database mode.
2. scheduleFullSync() is now a disabled compatibility no-op. Manual database repair/export remains available from Admin Database tools only.
3. Settings saves now write directly to Supabase app_settings using id=main.
4. Profile display name, avatar URL, and password changes write directly to the users table; old per-browser avatar/name storage has been removed from the profile display path.
5. Supabase storage upload helper has been restored in db-service.js for KYC/avatar files.
6. Main business data is expected to flow through action-specific write methods: users, KYC, payment methods, deposits, withdrawals, ledger, trades, AI batches, notifications, admin logs, and settings.

Local browser storage is still used only for session and UI preferences such as active page, filters, chart choices, draft form step, and login lock attempts.

Important SQL:
Run these in Supabase SQL Editor after deploying if you have not already run the Phase 5.16.1 SQL:
1. supabase-schema.sql
2. supabase-core-sync-policies.sql
3. supabase-storage-policies.sql if storage upload is needed

Changed files:
- core.js
- db-service.js
- user-app.js
- admin-app.js
- README.txt
