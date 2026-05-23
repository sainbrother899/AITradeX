AITradeX Phase 5.34 - Live Sync Lite

This build keeps Phase 5.33 AI batch auto-risk-close fixes and adds Live Sync Lite for admin/user panels.

What is new:
- Supabase Realtime listener added for core tables.
- Admin and user panels update silently when database rows change.
- No browser page refresh, no location.reload(), no blinking full-page reload.
- Active typing/form fields are protected: live sync waits while the user/admin is editing an input, textarea, select, or contenteditable area.
- Local write protection added: when this tab is saving an action, live sync pauses briefly so the current action is not overwritten mid-save.
- If Supabase Realtime fails, the app continues working normally with the existing manual/render flow.

Live sync covers:
- users
- wallet_ledger
- trade_orders
- ai_trade_batches
- kyc_requests
- deposit_requests
- withdrawal_requests
- payment_methods
- support_tickets
- notifications
- subscriptions
- referrals
- plans
- app_settings
- admin_action_logs

Previous AI fixes retained:
- User-side AI Live auto-close remains disabled.
- AI Live batch close is handled from admin/global batch watcher.
- Same batch positions close together when profit target, loss target, or margin-risk threshold is hit.
- AI Live P/L settlement remains margin × leverage based and capped safely.

Cache version:
- phase536hideaitargetuser
- Phase 5.36: User Orders → AI Live card no longer exposes admin target profit/loss percent; it shows user-facing amount/position only.

Deploy order:
1. Run supabase-schema.sql so realtime publication/table compatibility is applied.
2. Run supabase-storage-policies.sql only if using file uploads/KYC uploads.
3. Upload/deploy this ZIP.
4. Hard refresh browser with Ctrl + Shift + R.

Testing checklist:
- Keep admin panel open in one browser tab.
- Keep user panel open in another browser/device.
- Submit KYC/deposit/withdrawal/payment method from user side and confirm admin side updates without page refresh.
- Approve/reject from admin side and confirm user side status/wallet/notification updates without page refresh.
- Open/close AI Live batch from admin side and confirm user side global bar/orders update without page refresh.

Emergency off switch:
- In browser console, run: localStorage.setItem('AITradeX_LIVE_SYNC','off')
- Then hard refresh. To enable again: localStorage.removeItem('AITradeX_LIVE_SYNC') and hard refresh.

Important:
This is still a frontend-only testing build. Public real-money launch needs Phase 6 backend/Auth/strict RLS migration.
