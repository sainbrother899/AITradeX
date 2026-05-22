AITradeX Phase 5.19 - Final Critical DB Action Cleanup

Base: Phase 5.18

Clean package notes:
- No patch.js / fix.js / old.js / .bak files.
- No duplicate app files.
- Hidden full-state sync remains disabled in database mode.
- Critical KYC/deposit/withdrawal notification flow uses awaited database notification writes.
- Admin KYC/deposit/withdrawal/payment-method audit logs use awaited database action writes.
- App.saveState() does not push business data in database mode.
- Manual fullSync remains only for admin emergency repair/import/export tools.

Run in Supabase if needed:
1. supabase-schema.sql
2. supabase-core-sync-policies.sql
3. supabase-storage-policies.sql (only for KYC/avatar storage)
