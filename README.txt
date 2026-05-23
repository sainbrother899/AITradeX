AITradeX Phase 6.5.2 - Sell Limit Trigger Fix

This build fixes SELL limit orders self-triggering on page/tab changes when no live price card is visible. Pending limit orders now trigger only from an actual live/cached market price and never from the limit price fallback.

SQL: Not required for this update. Use the Phase 6.5.1 schema already run for manual trade backend RPC functions.

Deploy: upload the ZIP and hard refresh with Ctrl + Shift + R.

AITradeX Phase 6.5.1 - Limit Order Validation Fix

Base used:
- AITradeX Phase6.4 AI Backend Settlement Fix

What this build does:
1. Keeps the existing UI/design and working user/admin flow unchanged.
2. Preserves Phase6.2 deposit backend RPC security.
3. Preserves Phase6.3 withdrawal backend RPC security.
4. Preserves Phase6.4 AI Live backend batch settlement.
5. Adds secure Supabase RPC flow for manual market/limit order open:
   - aitradex_open_manual_trade
6. Adds secure Supabase RPC flow for manual position close/settlement:
   - aitradex_close_manual_trade
7. Adds secure Supabase RPC flow for pending limit cancel/margin release:
   - aitradex_cancel_manual_limit
8. Manual trade margin lock, close settlement, P/L calculation and limit cancel release are now DB-side in database mode.
9. Frontend fallback remains for non-database/local testing mode.

Important:
- This is still not the final public real-money launch build.
- KYC/payment method approval, plan/subscription backend control, admin wallet adjustment, Telegram backend, Supabase Auth enforcement and strict final RLS still need later Phase6 steps.
- Current legacy testing login remains active so the working site does not break.

Deploy order:
1. Run the updated supabase-schema.sql in Supabase SQL Editor.
2. If KYC/file uploads are used, run supabase-storage-policies.sql.
3. Upload/deploy this ZIP.
4. Hard refresh browser: Ctrl + Shift + R.
5. Test: manual market order open, manual close, P/L settlement, pending limit order cancel, wallet ledger and reload persistence.

Current cache version:
- phase652selllimittriggerfix

Default admin for testing:
- control@aitradex.com
- admin123

Next recommended Phase6 steps:
- Phase6.6: migrate KYC + payment method approval to backend.
- Phase6.7: migrate plan/subscription and AI limit control to backend.
- Phase6.8: migrate admin wallet adjustment and Telegram sending to backend.
- Phase6.9: enable Supabase Auth and strict RLS only after sensitive actions are backend-only.

Real-money warning:
This build is safer than the previous frontend-only baseline because deposit, withdrawal, AI Live settlement and manual trade settlement are now database-controlled in Supabase mode. Public real-money launch still requires secure backend Edge Functions, strict RLS, payment/KYC compliance, legal review and full audit policies.


Phase 6.5.1 limit-order fix:
- BUY limit must be below current price.
- SELL limit must be above current price.
- Marketable limit orders are blocked with a clear message.
- Triggered limit orders fill at the set limit price, not the current market price.
