AITradeX Phase 5.31 - AI Trade Sync Fix

This build keeps the Phase 5.30 manual-position visibility fix and adds an AI section consistency cleanup.

Key fixes:
- User side AI history now includes both Instant AI (AI_AUTO) and Live AI (AI_LIVE) closed trades.
- User side AI P/L summary now counts closed Live AI settlements too.
- User side latest AI activity can show Instant AI and Live AI rows correctly.
- User side AI open positions use normalized trade type/status matching.
- Admin side AI Instant/Live history and running Live AI filters use normalized trade type/status matching.
- Admin side Live AI close now has rollback protection if settlement ledger is applied but trade save fails.
- Cache version: phase531aitradesync.

Deploy order:
1. Run supabase-schema.sql if you have not already applied the latest schema.
2. Run supabase-storage-policies.sql only if using file uploads/KYC uploads.
3. Upload/deploy this ZIP.
4. Hard refresh browser with Ctrl + Shift + R.

Note:
This is still a frontend-only testing build. Public real-money launch needs Phase 6 backend/Auth/strict RLS migration.
