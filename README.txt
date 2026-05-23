AITradeX Phase 6.1 - Secure Auth Foundation Build

Base used:
- AITradeX Phase5.36 Hide AI Target User Text

What this build does:
1. Keeps the existing Phase5.36 design and user/admin flow unchanged.
2. Adds Phase6.1 secure-auth foundation for future Supabase Auth migration.
3. Keeps current legacy testing login active so the working system does not break.
4. Adds safe database columns for auth_user_id and admin role mapping.
5. Adds backend action queue table for future Edge Function migration.
6. Normalizes password fields in auth.js so password, passwordHash and password_hash stay aligned during the migration period.
7. Adds backend/auth helper functions in db-service.js for future phase migration checks.

Important:
- This is NOT the final real-money backend migration.
- This is Phase6.1 foundation only.
- Deposit approve, withdrawal approve, AI settlement and wallet writes are still using current frontend-tested flow.
- Do not enable strict production RLS yet.

Deploy order:
1. Run supabase-schema.sql in Supabase SQL Editor.
2. If KYC/file uploads are used, run supabase-storage-policies.sql.
3. Upload/deploy this ZIP.
4. Hard refresh browser: Ctrl + Shift + R.
5. Test admin login, user login, deposit, withdrawal, KYC, AI live and manual trade exactly like Phase5.36.

Current cache version:
- phase61secureauthfoundation

Next recommended Phase6 steps:
- Phase6.2: migrate deposit approve/reject to backend Edge Function.
- Phase6.3: migrate withdrawal approve/reject to backend Edge Function.
- Phase6.4: migrate AI live open/close settlement to backend Edge Function.
- Phase6.5: enable Supabase Auth login and strict RLS after all sensitive actions are backend-only.

Default admin for testing:
- control@aitradex.com
- admin123

Real-money warning:
This build is safer than the previous frontend-only baseline because migration foundations are prepared, but it is still not a final public real-money launch build. Public real-money launch requires backend Edge Functions, strict RLS, secure payment/KYC flow, legal/compliance review and complete audit policies.
