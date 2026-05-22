AITradeX Phase 5.18 - Await-Based Direct Database Actions

This build keeps the UI/design baseline and cleans the database runtime for critical actions.

Changed files:
- core.js
- db-service.js
- auth.js
- user-app.js
- admin-app.js
- supabase-schema.sql
- supabase-core-sync-policies.sql

Important runtime changes:
- KYC submit/update now awaits Supabase write before local UI success state.
- Deposit request now awaits Supabase write before success message.
- Withdrawal request now awaits Supabase write before success message.
- Bank/payment method submit now awaits Supabase write before success message.
- Admin KYC/deposit/withdrawal/bank approve-reject helpers await Supabase write before UI success state.
- App.saveState does not push full app state in database mode.
- Hidden scheduleFullSync remains disabled; manual fullSync remains only for emergency Database tools.
- No patch.js/fix.js/old.js/duplicate files added.

Run in Supabase if not already updated:
1. supabase-schema.sql
2. supabase-core-sync-policies.sql
3. supabase-storage-policies.sql if using KYC/avatar storage.
