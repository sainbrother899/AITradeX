AITradeX - Clean Baseline (Landing Restored)

This package keeps the original landing page design/content exactly as the provided base ZIP.

What changed from the original base:
- Root-level patch/setup notes are organized into docs/setup and docs/sql.
- App UI files are kept on the original landing reference baseline.
- No landing page wording/design/hero changes have been applied.

Root app files:
- index.html: user landing + user app entry
- admin.html: control center entry
- config.js: public configuration
- core.js, auth.js, db-service.js: shared app/auth/database logic
- user-app.js, admin-app.js: user and admin interfaces
- styles.css: full UI styling

Important production note:
Before taking public deposits, withdrawals, trading, KYC or wallet activity live, migrate to Supabase Auth, strict RLS, private storage buckets, server-side admin actions, and immutable server-side wallet ledgers.
