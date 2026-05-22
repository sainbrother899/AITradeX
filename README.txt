AITradeX Phase 5.25 - Final Admin/User Logic Fix

What changed in this build:
- Default Supabase admin seed/fallback added for control@aitradex.com / admin123.
- Admin login logging is no longer duplicated.
- Deposit approval and withdrawal approval now use safer awaited DB flows with rollback ledger entries if a later save fails.
- Manual position close now awaits DB trade save and rolls back settlement ledger on save failure.
- Pending limit order cancel now awaits DB trade save and rolls back margin release on save failure.
- User-side AI live auto close now awaits DB trade save and rolls back settlement ledger on save failure.
- Admin Instant AI and Live AI no longer stop the whole batch when one eligible user has too-small margin.
- Referral bonus now has an awaited async DB flow.
- Wallet ledger SQL uniqueness now matches app logic: user + account type + type + reference ID.
- Cache version bumped to phase525adminuserlogicfix.
- Database runtime version bumped to 5.25.

Before upload/deploy:
1. Run the updated supabase-schema.sql in Supabase SQL Editor.
2. Upload/deploy this ZIP.
3. Hard refresh browser with Ctrl + Shift + R.

Testing note:
This build is cleaner for functional testing. For real public funds/users, build a secure backend/service-role API and strict RLS before launch.
