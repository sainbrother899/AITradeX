AITradeX Phase 6.7 - Plan + Subscription Backend Control

Base: Phase 6.5.6 Manual Price Unit Double Convert Fix.

What changed:
1. KYC approve/reject now uses secure Supabase RPC functions in database mode.
2. Bank/payment method approve/reject now uses secure Supabase RPC functions in database mode.
3. Backend functions validate active admin, lock the target row, block duplicate completed actions, update status, write user notification, write admin action log and backend action queue.
4. Existing UI/design is preserved.
5. Deposit backend, withdrawal backend, AI backend settlement and manual trade backend settlement are preserved.

Required deploy steps:
1. Run the updated supabase-schema.sql in Supabase SQL Editor.
2. Upload/deploy this ZIP.
3. Hard refresh browser: Ctrl + Shift + R.

Test checklist:
- Submit KYC as user, approve from admin, refresh both sides.
- Submit KYC as user, reject from admin with reason, refresh both sides.
- Add bank/payment method as user, approve from admin, refresh both sides.
- Add bank/payment method as user, reject from admin, refresh both sides.
- Confirm deposit, withdrawal, AI live and manual trade flows still work.

Real-money note:
This is one more backend-security step, but final real-money launch still requires Supabase Auth/strict RLS and backend-only sensitive actions across all remaining modules.


Phase 6.7 notes:
- User plan purchase now uses backend RPC aitradex_purchase_plan in Supabase mode.
- Admin plan change now uses backend RPC aitradex_change_user_plan in Supabase mode.
- Existing UI/design is unchanged.
- Run the updated supabase-schema.sql before deploy because new RPC functions are added.
