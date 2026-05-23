AITradeX Phase6.9 - RLS Readiness Pack

Base: Phase6.8 Wallet Telegram Backend.
This build keeps the same UI/design and working flows, but adds RLS readiness files and clearer production-lock guidance.

What is included:
- Deposit approve/reject backend RPC from previous phases.
- Withdrawal approve/reject backend RPC from previous phases.
- AI Live backend settlement from previous phases.
- Manual trade backend settlement and price-unit cleanup from previous phases.
- KYC + payment method backend approval from previous phases.
- Subscription backend control from previous phases.
- Admin wallet adjustment backend RPC and Telegram audit logs from Phase6.8.
- New safe audit file: supabase-rls-readiness-audit.sql
- New production template: supabase-strict-rls-final-lock-template.sql

Important deployment notes:
1. For normal testing/deploy, run supabase-schema.sql only if you have not already applied Phase6.8 schema or if you want the latest runtime marker.
2. You may safely run supabase-rls-readiness-audit.sql. It only reports RLS/function status and does not change data.
3. Do NOT run supabase-strict-rls-final-lock-template.sql on the current legacy-testing app. It is a future production template only.
4. Upload the ZIP files to hosting.
5. Hard refresh browser with Ctrl + Shift + R.

Why strict RLS is not enabled directly:
The current app still supports legacy frontend testing mode. If strict production RLS is enabled before Supabase Auth/Edge Functions are fully active, user/admin panels can lose DB access. Strict RLS should be the last production-lock step.

Current build:
Phase6.9-RLSReadinessPack
Cache version: phase69rlsreadinesspack
