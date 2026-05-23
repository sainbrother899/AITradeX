AITradeX Phase 5.32 - AI Batch Settlement Fix

This build keeps previous fixes and corrects AI Live batch settlement behavior.

Key fixes:
- User-side AI Live auto-close is disabled, so one user's browser cannot close only that user's position while other same-batch positions remain open.
- AI Live batch close now uses a common batch exit price row for all positions in that batch.
- AI Live P/L uses safe exposure from margin × leverage instead of trusting a stale/corrupted stored positionSize.
- AI Live profit settlement is capped to the configured target percent. Example: ₹7,500 margin × 100x × 5% = ₹37,500 profit, not a BTC price-sized wallet credit.
- Admin batch close settles all currently open positions in the selected batch together.
- Cache version: phase532aibatchsettlement.

Deploy order:
1. Run supabase-schema.sql if you have not already applied the latest schema.
2. Run supabase-storage-policies.sql only if using file uploads/KYC uploads.
3. Upload/deploy this ZIP.
4. Hard refresh browser with Ctrl + Shift + R.

Important:
If a previous AI Live close already credited a wrong huge amount, correct that wallet with an admin debit/reversal after deploying this fix. New closes should use the safe formula.

Note:
This is still a frontend-only testing build. Public real-money launch needs Phase 6 backend/Auth/strict RLS migration.
