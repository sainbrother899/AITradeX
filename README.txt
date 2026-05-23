AITradeX Phase 6.2 - Deposit Backend Security Build

Base used:
- AITradeX Phase5.36 Hide AI Target User Text

What this build does:
1. Keeps the existing Phase5.36 design and user/admin flow unchanged.
2. Adds Phase6.1 secure-auth foundation plus Phase6.2 secure deposit approve/reject RPC for future Supabase Auth migration.
3. Keeps current legacy testing login active so the working system does not break.
4. Adds safe database columns for auth_user_id and admin role mapping.
5. Adds backend action queue table for future Edge Function migration.
6. Normalizes password fields in auth.js so password, passwordHash and password_hash stay aligned during the migration period.
7. Adds backend/auth helper functions in db-service.js for future phase migration checks.

Important:
- This is NOT the final real-money backend migration.
- This is Phase6.2 deposit backend security foundation. Deposit approve/reject now uses Supabase RPC functions when database mode is active.
- Deposit approve/reject is now routed through database RPC functions. Withdrawal approve, AI settlement and other sensitive writes are still using the current frontend-tested flow.
- Do not enable strict production RLS yet.

Deploy order:
1. Run supabase-schema.sql in Supabase SQL Editor.
2. If KYC/file uploads are used, run supabase-storage-policies.sql.
3. Upload/deploy this ZIP.
4. Hard refresh browser: Ctrl + Shift + R.
5. Test admin login, user login, deposit, withdrawal, KYC, AI live and manual trade exactly like Phase5.36.

Current cache version:
- phase62depositbackendsecurity

Next recommended Phase6 steps:
- Phase6.2: deposit approve/reject routed through secure Supabase RPC functions. Next: Phase6.3 withdrawal backend security.
- Phase6.3: migrate withdrawal approve/reject to backend Edge Function.
- Phase6.4: migrate AI live open/close settlement to backend Edge Function.
- Phase6.5: enable Supabase Auth login and strict RLS after all sensitive actions are backend-only.

Default admin for testing:
- control@aitradex.com
- admin123

Real-money warning:
This build is safer than the previous frontend-only baseline because migration foundations are prepared, but it is still not a final public real-money launch build. Public real-money launch requires backend Edge Functions, strict RLS, secure payment/KYC flow, legal/compliance review and complete audit policies.


Phase6.2 Deposit Backend Security details:
- Admin deposit approve/reject now calls Supabase RPC functions: aitradex_approve_deposit and aitradex_reject_deposit.
- The RPC checks admin status, locks the deposit row, blocks duplicate approved UTR, writes wallet ledger, updates request status, writes notification, admin log and backend_action_queue result in one controlled DB-side action.
- If the SQL has not been run, deposit approve/reject will show a secure function error. Run supabase-schema.sql first.
- This is safer than frontend-only writes, but it is not full production Auth/RLS security yet because current login remains legacy testing mode.
