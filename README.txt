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
