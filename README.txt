AITradeX Phase 5.29 - RLS Safety Pack + Final Deep Consistency

What changed in this build:
- Phase/runtime/cache labels aligned to 5.27.
- Added a clear Supabase RLS safety pack.
- supabase-schema.sql now includes the required TESTING RLS setup so the current frontend-only app keeps working after running schema.
- Added supabase-production-rls-template.sql for future real public launch hardening.
- Admin setup/security text updated so it does not pretend the current frontend-only app is production-secure.
- Previous Phase 5.26 consistency fixes are preserved:
  - Safer admin/user DB persistence flows.
  - REAL/DEMO wallet split.
  - Default admin seed for control@aitradex.com / admin123.
  - Password hash runtime support.
  - AI trade/batch consistency improvements.

Very important RLS note:
The current app uses custom frontend login with the Supabase anon key. Because of that, strict per-user/per-admin RLS cannot be fully secure with SQL alone. If strict anon-blocking RLS is applied now, the current website will stop reading/writing data.

For current testing:
1. Run supabase-schema.sql.
2. Run supabase-storage-policies.sql if you use uploads.
3. Deploy/upload the ZIP.
4. Hard refresh with Ctrl + Shift + R.

For real public money/users:
- Do NOT rely on frontend-only admin/funds/trade actions.
- Move admin, wallet, trade, approval and referral writes to a backend / Supabase Edge Functions with service-role key kept private.
- Switch login to Supabase Auth or server-issued verified sessions.
- Then apply/adapt supabase-production-rls-template.sql.

This build is suitable for functional testing and controlled review. It is not a final public real-money security architecture.


Phase 5.29 Telegram Coverage Fix:
- Telegram scope is now clear: KYC, Bank/Payment Method, Deposit and Withdrawal.
- Admin Alerts: new KYC, new bank account, new deposit, new withdrawal.
- User Mirror: KYC/bank/deposit/withdraw approve-reject messages.
- Notification/Telegram side-alert failures do not roll back saved KYC or payment-method data.


Phase 5.29 KYC Persistence Fix
- Fixed KYC approval reverting to PENDING after admin/user refresh.
- KYC request ID is now kept separate from Aadhaar/idDetails object.
- Admin and user panels now pick the best KYC row if old duplicate pending rows exist from earlier builds.
- Cache version: phase529kycpersistence
