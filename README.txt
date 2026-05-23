AITradeX Phase 6.3 - Withdrawal Backend Security

Base used:
- AITradeX Phase6.2.3 AI Plan Upgrade Limit Refresh Fix

What this build does:
1. Keeps the existing UI/design and working user/admin flow unchanged.
2. Keeps Phase6.1 secure-auth foundation and Phase6.2 deposit RPC security.
3. Adds secure Supabase RPC flow for withdrawal approve/reject.
4. Admin withdrawal approve now calls: aitradex_approve_withdrawal
5. Admin withdrawal reject now calls: aitradex_reject_withdrawal
6. Backend function checks pending status, admin permission, user active status, available wallet balance and duplicate withdrawal ledger before approving.
7. Backend approval writes wallet ledger debit, withdrawal status, notification, admin log and backend_action_queue record in one DB-side flow.
8. Reject flow writes rejected status, rejection reason, notification, admin log and backend_action_queue record.

Important:
- This is not the final real-money backend migration.
- Deposit and withdrawal admin approvals are now safer because they use Supabase RPC.
- AI settlement, manual trade settlement, KYC/payment method approval and strict production RLS still need later Phase6 steps.
- Current legacy testing login remains active so the working site does not break.

Deploy order:
1. Run the updated supabase-schema.sql in Supabase SQL Editor.
2. If KYC/file uploads are used, run supabase-storage-policies.sql.
3. Upload/deploy this ZIP.
4. Hard refresh browser: Ctrl + Shift + R.
5. Test: user withdrawal request, admin approve withdrawal, wallet debit, duplicate approve protection, admin reject withdrawal.

Current cache version:
- phase63withdrawalbackend

Default admin for testing:
- control@aitradex.com
- admin123

Next recommended Phase6 steps:
- Phase6.4: migrate AI live open/close settlement to backend RPC/Edge Function.
- Phase6.5: migrate manual trade settlement to backend.
- Phase6.6: migrate KYC + payment method approval to backend.
- Phase6.7: enable Supabase Auth and strict RLS only after sensitive actions are backend-only.

Real-money warning:
This build is safer than the previous frontend-only baseline because deposit and withdrawal approvals are now database-controlled, but it is still not a final public real-money launch build. Public real-money launch requires secure backend Edge Functions, strict RLS, payment/KYC compliance, legal review and full audit policies.
