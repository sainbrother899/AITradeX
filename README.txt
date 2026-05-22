AITradeX Phase 5.19 - Final Critical Actions Cleanup

This package is built from Phase 5.18 and focuses on the remaining critical database reliability issues:

1. KYC, deposit, withdrawal user/admin notifications use awaited DB writes.
2. Telegram alerts are sent only after the notification row is saved successfully.
3. Admin critical audit logs for KYC, deposit, withdrawal, and bank actions use awaited DB writes.
4. Hidden full-state auto sync remains disabled. Manual fullSync is retained only for emergency Database tools.
5. Core notification/admin action helpers no longer use background AITradeXDB.fire writes.
6. SQL files are version-aligned with Phase 5.19.

Run in Supabase SQL Editor after upload if not already current:
- supabase-schema.sql
- supabase-core-sync-policies.sql
- supabase-storage-policies.sql (only if storage buckets are used)

Important: This is still a frontend/anon-key prototype. For public launch, migrate to Supabase Auth, strict RLS, and server-side/Edge Function secrets for Telegram and wallet-sensitive actions.

Phase 5.21 audit cleanup:
- Added DB persistence for plans, subscriptions, referrals, support tickets, user status/password changes and AI ON/OFF settings.
- Run supabase-schema.sql and supabase-core-sync-policies.sql in Supabase before using this build in database mode.


Phase 5.23 Final Clean Audit Fix:
- Notification delete now deletes the matching Supabase notifications row in database mode.
- Password storage now uses client-side salted SHA-256 hash format instead of saving new plain text passwords. Legacy plain passwords are accepted once and migrated after successful login.
- Admin password reset and user change-password flows now write hashed passwords.
- Database service verified with only one writeDepositRequest implementation and API export cleaned.
- Cache version bumped to phase524logicconsistency.

Security note: this is safer for testing than plain-text passwords, but real public launch with user funds still needs proper backend authentication, server-side authorization, and strict RLS/Edge Functions.

Phase 5.24 Final Logic Consistency Fix:
- REAL and DEMO wallet ledger rows are split on database load; realBalance() only counts REAL rows and demoBalance() only counts DEMO rows.
- Ledger duplicate protection now checks userId + accountType + type + referenceId, preventing cross-user/cross-account collisions.
- User manual market/limit trade creation uses awaited DB writes with rollback ledger entries if trade saving fails after margin lock.
- User subscription purchase uses awaited DB writes with rollback ledger entry and local subscription revert if subscription saving fails.
- Admin Instant AI and Live AI open/close flows now await key trade/batch/ledger/notification/audit writes instead of showing false success while writes fail silently.
- Manual fullSync now removes stale payment_methods rows that were deleted locally.
- Cache version bumped to phase524logicconsistency.
