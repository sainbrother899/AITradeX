AITradeX Phase 6.5.6 - Manual Price Unit Cleanup

This build keeps the existing UI/design and fixes the repeated BUY/SELL market/limit issues caused by mixed price units.

Core rule added:
- Crypto trade prices are stored internally in raw USDT/USD quote units.
- INR is display-only.
- Entry price, limit price, trigger price, live price and exit price are normalized before comparison or P/L settlement.

Fixes included:
1. BUY/SELL market orders use raw price for entry.
2. BUY/SELL limit orders compare raw live price vs raw limit price.
3. Triggered limit orders fill at the limit price.
4. Manual live P/L uses same-unit entry/live prices.
5. Manual close backend RPC normalizes entry/exit price before settlement.
6. Old rows with INR display price are guarded through SQL helper.
7. AI frontend fallback settlement remains disabled; AI close continues through backend RPC.
8. Version labels updated to Phase 6.5.6.

SQL required: YES.
Run the updated supabase-schema.sql because it updates manual trade RPC logic and adds the helper function public.aitradex_trade_raw_price().

Deploy:
1. Run supabase-schema.sql in Supabase SQL Editor.
2. Upload/deploy the ZIP.
3. Hard refresh: Ctrl + Shift + R.

Test:
- BUY market: should remain open and close with correct P/L.
- SELL market: should not auto-close when visiting Trade page.
- BUY limit: only triggers when actual price moves down to limit.
- SELL limit: only triggers when actual price moves up to limit.
- Manual close: user wallet/history should show correct P/L settlement.


Phase 6.5.6 note: Fixed manual trade raw/INR double conversion. Raw USDT price is trusted when coming from live API/cache/dataset raw price; INR remains display-only. SQL helper also keeps values in normal raw range unchanged even when INR display text is supplied.
