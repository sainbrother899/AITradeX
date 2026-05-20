AITradeX Phase 1 Base

Brand: AITradeX

User side:
index.html + js/user-app.js

Control center:
admin.html + js/admin-app.js

User panel rule:
Do not use Admin wording in user panel. Use AI / Control-neutral wording only.

Default control center login:
Email: control@aitradex.com
Password: admin123

Phase 1 includes:
- Professional landing page
- User login/register
- User dashboard shell
- Separate control center login
- Separate control center dashboard shell
- Clean files, no old code, no patches

Next phases:
Phase 2: KYC + payment methods
Phase 3: wallet deposit/withdrawal
Phase 4: trading page with TradingView + buy/sell + real/demo
Phase 5: subscriptions + referral first deposit 10%


Root Files Version:
- Removed js/ folder.
- core.js, auth.js, user-app.js, admin-app.js are now in root.
- index.html and admin.html script paths updated.

Phase 1.1: user-app.js and styles.css fully replaced. Leverage up to 2000x. Responsive full-height chart area. No old-code patching.


Phase 1.2 Premium User Polish:
- user-app.js fully replaced.
- styles.css fully replaced.
- Real/Demo switch changed to clear segmented switch.
- Real account selection fixed and visible.
- User dashboard polished with premium trading app style.
- Chart remains responsive with viewport-based height.
- Admin files untouched.


Phase 1.3 Real App User Polish:
- user-app.js fully replaced.
- styles.css fully replaced.
- No patch blocks added.
- Header now shows selected account and balance.
- Home is more compact and trading-app-like.
- Market cards use swipe ticker style on mobile.
- Wallet shell includes professional deposit step preview.
- Trade page made more exchange-style.
- P/L and History pages no longer feel empty.
- Admin side untouched.


Phase 1.4 Selected Account + Compact Polish:
- user-app.js updated by replacing the relevant full UI blocks.
- styles.css updated for compact premium real-app feel.
- Home now shows only selected account balance.
- If Demo is selected, Real balance is not shown on Home selected account card.
- If Real is selected, Demo balance is not shown on Home selected account card.
- Trade page account switch removed from order ticket to avoid confusion.
- Account switch remains in the top header/Home account card.
- UI spacing/cards reduced for less bulky feel.
- Admin side untouched.


Phase 1.5 Nav + History + Profit/Loss Color:
- user-app.js fully replaced.
- styles.css fully replaced.
- Header now has only menu, AITradeX brand and avatar.
- Header account switch/balance removed.
- Wallet page account switch removed.
- History page now contains AI Trade History and Manual Trade History only.
- Wallet history is not shown in History page.
- Profit values use green styling.
- Loss values use red styling.
- Bottom nav and top header made compact.
- Admin side untouched.


Phase 1.6 Avatar + Profile Edit:
- user-app.js updated for header avatar/name and profile editor.
- styles.css updated for avatar/profile UI.
- Header shows round avatar and user name on right side.
- Profile page includes avatar upload and display name edit.
- Avatar and display name currently save in browser localStorage.
- Supabase Storage can be connected later for production avatar upload.
- Admin side untouched.


Phase 1.7 Crypto + Forex Markets:
- user-app.js fully updated for market support.
- styles.css updated for market selector and history layout.
- Trade page now has Crypto / Forex market selector.
- Pair list changes based on selected market.
- TradingView symbol mapping is prepared for crypto and forex.
- Home trending markets include crypto and forex cards.
- History tables include Market column.
- User balance and P/L remain INR-based.
- Admin side untouched.


Phase 1.8 Professional Trade Section:
- user-app.js fully updated for trade page improvements.
- styles.css updated for trade page layout.
- Market + pair selector moved into compact top bar.
- Real/Demo mode notice added.
- Available balance shown on trade page.
- Position size preview added: amount x leverage.
- Market Feed replaces static crypto-only order book.
- TradingView symbol area improved.
- Buy/Sell confirmation summary shell added.
- Admin side untouched.


Phase 1.9 All Popular Market Rates:
- user-app.js updated with final popular crypto and forex pairs.
- Home now shows all selected popular crypto + forex rates in market ticker.
- Trade page shows selected market pair-rate list.
- Positive percentage values are green.
- Negative percentage values are red.
- Pair-rate list changes with Crypto / Forex market selector.
- Admin side untouched.


Phase 2.0 App-Style Selectors:
- user-app.js updated for app-style pair/leverage selectors.
- styles.css updated for selector bottom sheets.
- Native large pair dropdown removed.
- Native large leverage dropdown removed.
- Pair opens in compact app-style bottom sheet.
- Leverage opens in compact chips bottom sheet.
- Rate percentage on top selected pair card/header uses green for plus and red for minus.
- Trade section made cleaner and less browser-default.
- Admin side untouched.


Phase 2.1 TradingView Chart:
- index.html now loads TradingView tv.js for user side chart.
- user-app.js renders actual TradingView widget in Trade page.
- Selected crypto/forex pair maps to TradingView symbol.
- Pair or market change reloads the chart automatically.
- Chart is dark theme and responsive.
- Chart uses viewport-based height and is not cut into a small fixed box.
- Admin side untouched.


Phase 2.2 Chart Controls:
- user-app.js updated with working timeframe controls.
- styles.css updated for bigger chart and settings UI.
- 1m, 5m, 15m, 30m, 1h, 4h, 1D buttons reload TradingView chart.
- Selected timeframe gets active highlight.
- Settings button opens chart settings bottom sheet.
- Settings support Candles / Line / Area chart style.
- Settings support Dark / Light theme.
- Settings support TradingView toolbar Show / Hide.
- Chart area is larger with reduced side padding.
- Admin side untouched.


Phase 2.3 TradingView Loader/Flicker Fix:
- user-app.js updated so TradingView chart shows a dark loading state before widget mount.
- styles.css updated to disable old fake chart pseudo background on TradingView container.
- White loading flash reduced by forcing dark chart container background.
- Old placeholder chart effect no longer appears on TradingView chart frame.
- Admin side untouched.


Phase 2.4 Black Chart Loading:
- user-app.js updated to hide TradingView iframe until it is mounted.
- styles.css updated to keep chart area black/dark during loading.
- White flash is covered by dark loader overlay.
- iframe fades in after TradingView loads.
- Admin side untouched.


Phase 2.5 Trade Header Cleanup:
- user-app.js updated to remove developer-facing TradingView symbol text from top trade card.
- Top pair card now has Change Pair button.
- Scrollable pair-rate cards remain visible.
- Real/Demo notice removed from above chart.
- Account mode and available balance moved inside Order Ticket.
- Market switch remains compact.
- Admin side untouched.


Phase 2.6 Dynamic Trade Feed:
- user-app.js updated with dynamic Trade Feed.
- Trade Feed changes automatically when user switches Crypto / Forex market.
- Selected pair is highlighted in Trade Feed if present.
- No separate user action is needed for Trade Feed.
- styles.css updated for Trade Feed cards.
- Admin side untouched.


Phase 2.7 Pair-Based Feeds:
- user-app.js updated so Market Feed changes by selected pair.
- Trade Feed now generates rows based on selected pair, not just market.
- Crypto pairs show crypto-specific feed text.
- Forex pairs show forex-specific feed text.
- XAU/USD and XAG/USD show metals-specific feed text.
- Selected pair is highlighted in Trade Feed.
- styles.css updated for pair-based feed polish.
- Admin side untouched.


Phase 2.8 User KYC + Payment Methods:
- User side KYC 4-step working UI added.
- Step 1 Personal Details.
- Step 2 ID Details.
- Step 3 ID front/back + selfie upload UI.
- Step 4 Review & Submit.
- KYC status: NOT_SUBMITTED / PENDING / APPROVED / REJECTED.
- Payment Methods page added.
- Holder name auto-fills from KYC name.
- Add UPI form.
- Add Bank form.
- Max 2 UPI and 2 Bank methods.
- Method status: PENDING / APPROVED / REJECTED.
- Data currently saves in localStorage for user-side testing.
- Admin approval will be built in next phase.


Phase 2.9 KYC + Payment Premium Polish:
- styles.css updated for compact premium KYC and Payment Methods UI.
- KYC status card, stepper, form, upload boxes, review grid and buttons are now slimmer.
- Payment Methods status, tabs, forms and saved cards are now more compact.
- No logic changed.
- Admin side untouched.


Phase 3.0 Admin KYC + Payment Approval:
- admin-app.js rebuilt for admin approval workflow.
- Admin Dashboard shows pending KYC and payment method requests.
- Admin Users page shows KYC status and balances.
- Admin KYC Requests page shows submitted user KYC details and upload filenames.
- Admin can approve/reject KYC with reject reason.
- Admin Payment Methods page shows UPI/Bank details.
- Admin can compare payment holder name vs KYC name.
- Admin can approve/reject payment methods with reject reason.
- Data currently reads/writes localStorage for testing with user side.
- Wallet and trade control admin pages remain placeholders for next phases.


Phase 3.1 Admin Fix:
- admin.html fixed to include id="adminApp" root for admin-app.js.
- auth.js extended with loginAdmin compatibility if missing.
- Admin login and admin render root should now work.
- User side logic untouched.


Phase 3.2 KYC/Admin Sync Fix:
- user-app.js now mirrors submitted KYC into App.state.kycRequests.
- user-app.js now mirrors payment methods into App.state.paymentMethods.
- admin-app.js now reads KYC from localStorage first, then App.state.kycRequests fallback.
- admin-app.js now reads payment methods from localStorage first, then App.state.paymentMethods fallback.
- Admin approve/reject writes to both localStorage and App.state.
- This makes user-submitted KYC/payment methods show more reliably in admin side during localStorage testing.
- Use the same browser and same domain/origin for user and admin testing.


Phase 3.3 Admin Filters + Safer Actions:
- admin-app.js fully rebuilt for safer KYC/payment actions.
- KYC search added by name, email, mobile and document number.
- KYC status filter added: All / Pending / Approved / Rejected.
- KYC Approve/Reject buttons show only while status is Pending.
- Approved/Rejected cards show completed status and timestamps.
- Payment search added by name, email, UPI, bank and account last 4.
- Payment filters added: status and method type.
- Payment Approve/Reject buttons show only while status is Pending.
- Delete Method button added for payment methods.
- Delete removes the method from user side storage too.
- Buttons show action feedback while processing.


Phase 3.4 User KYC Status Cards:
- User KYC page now hides the full form after Pending or Approved status.
- Pending KYC shows submitted successfully card + submitted details.
- Approved KYC shows approved successfully card + verified details.
- Rejected KYC shows rejection card + reason + resubmit button.
- Payment method cards now have premium status styling for pending/approved/rejected.
- No admin logic changed.


Phase 3.5 User Wallet Flow:
- User Wallet page rebuilt into real app style deposit/withdrawal flow.
- Deposit flow: amount, UPI/Bank, payment details, UTR submit.
- Minimum deposit remains ₹500.
- Withdrawal flow: amount, select approved payment method, review, submit.
- Minimum withdrawal changed to ₹1,000.
- Withdrawal only shows approved payment methods. No manual account/UPI entry in withdrawal.
- KYC approved is required for withdrawal.
- Pending withdrawal is deducted from available real balance.
- Wallet request history added.
- Deposit/withdrawal requests sync into App.state for next admin approval phase.
- Admin approval for wallet will be built in next phase.


Phase 3.6 Wallet Mode Polish:
- Wallet now respects selected Real/Demo account mode.
- Demo account mode shows only a centered premium message card.
- Deposit and withdrawal are hidden in Demo mode.
- Demo wallet card includes Switch to Real Account button.
- Real wallet Deposit tab shows only Available Balance and Pending Deposit cards.
- Real wallet Withdrawal tab shows only Available Balance and Pending Withdrawal cards.
- Demo balance card and extra wallet metric cards removed from real wallet flow.
- Wallet history remains visible for real account.


Phase 3.7 Wallet Premium Deposit Polish:
- Removed bulky 1/2/3/4 stepper from Deposit and Withdrawal.
- Added compact Step X/4 badge inside wallet flow card.
- Enlarged UPI QR placeholder.
- Added copy buttons for UPI ID and amount.
- Added bank name in bank transfer details.
- Added copy buttons for account name, bank name, account number, IFSC and amount.
- Wallet flow UI made more compact and premium.

Phase 3.8 Wallet Admin Approval:
- admin-app.js fully updated with clean Wallet Requests control center.
- Admin dashboard now shows live pending wallet request count.
- Wallet Requests page now has Pending / Approved / Rejected / Total metrics.
- Wallet Requests page supports search, status filter and type filter.
- Admin can approve/reject deposits.
- Approved deposit adds REAL wallet ledger credit and updates user real balance.
- Admin can approve/reject withdrawals.
- Approved withdrawal adds REAL wallet ledger debit and updates user real balance.
- User wallet request status syncs through localStorage/state without changing existing user UI baseline.
- No new patch layer added; admin wallet placeholder was replaced cleanly.

Phase 3.10 Deposit UTR Validation Clean Fix:
- user-app.js updated without changing UI/design baseline.
- Deposit UTR field now accepts digits only.
- Deposit UTR input is limited to exactly 12 digits.
- Deposit flow blocks Next/Submit unless UTR is exactly 12 digits.
- Duplicate deposit UTR is blocked before submission.
- Existing admin Deposits and Withdrawals split remains unchanged.

Phase 4.0 Admin Payment Settings:
- Base used: Phase 3.10 Deposit UTR Validation Clean.
- admin-app.js clean updated with Payment Settings page.
- Admin sidebar Settings is now Payment Settings.
- Admin can edit UPI ID, QR image, bank name, account holder name, account number, IFSC, minimum deposit and minimum withdrawal.
- User deposit step 3 now reads UPI, QR and bank details from admin payment settings instead of fixed hard-coded values.
- User withdrawal minimum now reads from admin payment settings.
- core.js default settings expanded for payment settings fallback.
- styles.css updated only for QR image/payment settings preview polish; existing UI baseline preserved.
- index.html and admin.html cache-buster versions updated.
- No patch layer or hidden blocked old UI added.

PHASE 4.1 - ADMIN MOBILE RESPONSIVE CLEAN
- Base kept as Phase 4.0 / Phase 3.10 flow.
- Admin panel mobile layout improved without changing desktop design.
- Mobile sidebar is now a sticky compact top control area.
- Admin menu scrolls horizontally on mobile for quick access to Deposits, Withdrawals and Payment Settings.
- Admin cards, filters, action buttons and request details stack cleanly on small screens.
- Users table remains horizontally scrollable on mobile instead of breaking layout.
- No feature flow removed; no old code hidden behind a new UI layer.

Changed files in Phase 4.1:
- styles.css
- admin.html
- README.txt


============================================================
AITradeX Phase 4.2 - QR Fit Responsive Clean
============================================================
- Base used: Phase 4.1 Admin Mobile Responsive Clean.
- Fixed uploaded QR image fitting on user deposit screen and admin payment settings preview.
- QR now stays inside a square container with contain-fit, so it does not crop or overflow.
- Added white QR background padding to improve scanner readability.
- Desktop and mobile admin/user UI baseline preserved.
- Changed files: styles.css, README.txt.

AITradeX Phase 4.3 - Admin Users Mobile Control Clean
- Base used: Phase 4.2 QR Fit Responsive Clean.
- Admin Users page changed from a wide desktop table to responsive user control cards.
- Mobile Users page now stacks cleanly like other admin sections.
- Added user search by name, email, mobile, referral/status.
- Added status filters: All, Active, Suspended, Blocked.
- Added admin actions: Make Active, Suspend, Block.
- User login now respects both BLOCKED and SUSPENDED statuses.
- Existing admin dashboard, deposits, withdrawals, payment settings and user-side UI/design baseline preserved.

Changed files in Phase 4.3:
- admin-app.js
- auth.js
- styles.css
- README.txt


AITradeX Phase 4.4 - AI Auto Trade Engine Base Clean
- Base used: Phase 4.3 Admin Users Mobile Control Clean.
- Admin Trade Control renamed to AI Trade Control.
- Added admin AI trade execution form for market, pair, side, leverage, apply-to, AI pool usage and profit/loss %.
- User AI ON/OFF and 25/50/75/100% allocation now save into user state, not only temporary browser display.
- Admin AI trades apply only to active users with AI Auto Trading ON.
- Daily free AI trade limit added through core helper: free users get 5 AI auto trades per day by default.
- AI trade amount is calculated from user's real wallet balance and selected AI allocation.
- Profit result credits user's real wallet; loss result debits user's real wallet with ledger entry.
- AI Auto Trades go only to AI Auto Trade History.
- Manual BUY/SELL from user trade page goes only to Manual Trade History.
- Manual and AI trade history buckets are now separated by tradeType.
- Added admin recent AI trade batches and latest user-wise AI auto trade entries.
- Existing UI/design baseline preserved; no patch layer or hidden blocked code added.

Changed files in Phase 4.4:
- core.js
- admin-app.js
- user-app.js
- styles.css
- index.html
- admin.html
- README.txt


PHASE 4.5 - ADMIN AI TRADE FULL USER PAIR LIST
- AI Trade Control now uses the same shared market-pair list as the user trade page.
- Admin pair field is now a full dropdown with all CRYPTO and FOREX/user pairs.
- Market is automatically detected from the selected pair, preventing CRYPTO/FOREX mismatch.
- User manual trade history and AI Auto Trade history remain separate.
- No UI redesign, no patch layer, clean file replacement only.


PHASE 4.6 - AI TRADING DESK AUTO ELIGIBILITY CLEAN
- Base used: Phase 4.5 Admin AI Trade Full User Pairs Clean.
- Admin AI Trade Control simplified into AI Trading Desk.
- Removed confusing apply-to, leverage and AI pool usage controls from the admin flow.
- Admin now only selects Pair, Buy/Sell, Profit/Loss, Profit/Loss %, optional minimum balance and note.
- AI trade automatically applies to every valid user.
- Invalid users are skipped automatically without stopping valid users from receiving the trade.
- Eligibility checks: Active user status, AI Auto Trading ON, daily AI trade limit available, real balance available and AI allocation pool available.
- Every user's own 25/50/75/100% AI allocation is used directly for trade amount calculation.
- Admin now sees applied count, skipped count, total P/L impact and skip reason summary.
- AI Auto Trade history remains separate from Manual Trade history.
- No patch layer, no hidden blocked code; admin AI Trading Desk flow was cleanly simplified.

Changed files in Phase 4.6:
- admin-app.js
- styles.css
- README.txt

Phase 4.7 - AI Trading Desk Leverage + P/L Calculator Clean
- Added leverage selector in Admin AI Trading Desk: 1x, 2x, 5x, 10x.
- Added Risk & P/L Preview before execution.
- Preview shows valid users, skipped users, base AI amount, leverage exposure, per ₹1,000 impact, per ₹10,000 impact, estimated total P/L and skip reasons.
- AI trade execution now uses leveraged exposure for profit/loss calculation.
- Loss is capped so user real balance never goes below zero.
- Removed explanatory logic helper text from the admin desk UI to keep the page practical and clean.

Phase 4.8 - Common Live Price System Clean
- Base used: Phase 4.7 AI Trading Desk Leverage Calculator Clean.
- Added shared live price service in core.js.
- Crypto prices use Binance public ticker API, no API key required.
- Forex prices use ExchangeRate-API with the provided API key.
- XAU/USD and XAG/USD do not use random prices; admin must enter manual entry price for these metals.
- User home market ticker cards now refresh crypto/forex prices from the shared price service.
- User trade page pair cards and selected pair header now refresh from the shared price service.
- Admin AI Trading Desk now has an Entry Price step with Fetch Price button.
- AI trade execution locks entry price, price source and lock time into batch history and user-wise AI Auto Trade entries.
- Manual trade entries also save the latest available displayed/live entry price for history continuity.
- No TradingView scraping, no random settlement price, no patch layer or hidden blocked code.

Changed files in Phase 4.8:
- config.js
- core.js
- user-app.js
- admin-app.js
- styles.css
- README.txt

Phase 4.9 - Crypto Live WebSocket Ticker Clean
- Added Binance WebSocket live ticker for crypto pair price cards.
- Crypto price cards now update with a 1-second live feel where Binance stream is available.
- Forex prices continue through the existing ExchangeRate API refresh flow to avoid excessive API calls.
- XAU/USD and XAG/USD remain manual-rate based; no random rate is used.
- Existing API fallback remains in place if the WebSocket disconnects or is unavailable.
- Admin AI Trading Desk entry price lock remains separate and safe for history/settlement.

Phase 4.10 — Crypto Chart Price Sync Clean
- Crypto price cards now use Binance @trade stream for the last traded price instead of only 24h ticker last price.
- Ticker stream is still used for 24h change/mood, but visible card price follows the faster trade stream.
- This makes TradingView BINANCE chart price and platform crypto card price much closer. Tiny differences can still appear from chart refresh timing/rounding.
- No UI redesign, no patch layer; common live price logic was cleanly updated in core.js.

Phase 4.11 — Gold Silver Chart Feed Live Clean
- Base used: Phase 4.10 Crypto Chart Price Sync Clean.
- Added temporary TradingView chart-feed based price fetch for XAU/USD and XAG/USD.
- Gold and silver cards now refresh from the chart feed instead of showing only manual/static pricing.
- Admin AI Trading Desk can fetch/lock XAU/USD and XAG/USD entry prices from the same chart feed.
- Manual fallback price remains available only if the chart feed is unavailable.
- Crypto WebSocket price sync and forex ExchangeRate API flow were not changed.
- No UI redesign, no patch layer, no hidden blocked code.

Changed files in Phase 4.11:
- core.js
- user-app.js
- admin-app.js
- README.txt

Phase 4.12 - Manual Live Position Bar Clean
- Added a minimal one-line manual live position bar above the user nav/header.
- The bar appears only when the user has an open manual position.
- The bar shows active position count, live profit/loss amount, Profit/Loss label, and Close button.
- AI auto trades are not shown as live positions; they remain inside AI Auto Trade History.
- Manual live P/L updates from the current live price cache/stream.
- Closing a manual position moves it to Manual Trade History and applies final P/L to the correct account wallet.
- New manual positions are limited to one active manual position at a time for a cleaner mobile flow.
- No admin AI trading flow changes were made.

Phase 4.13 - Manual Trading Logic Clean
- Base used: Phase 4.12 Manual Live Position Bar Clean.
- Manual BUY/SELL now opens a real open-position record only after a live entry price is locked.
- Entry price is fetched through the shared live price system before placing the trade.
- If live price is unavailable, the trade is blocked instead of using random/static zero values.
- One active manual position remains allowed at a time to keep the top live bar clean.
- Manual live P/L continues to update from the live price cache/stream.
- Open manual position cards now show entry price and current live price for easier testing.
- Close button finalizes the manual position, saves exit price/source, applies final P/L to the correct REAL/DEMO wallet, and moves the trade to Manual Trade History.
- AI auto trade flow was not changed.
- No UI redesign, no patch layer, no hidden blocked code.

Changed files in Phase 4.13:
- user-app.js
- README.txt


Phase 4.14 - Manual Trade Risk & Bottom Live Bar Clean
- Manual live position bar moved from top/header area to just above the bottom navigation.
- Manual live position bar stays hidden when there is no active manual trade.
- Manual trade page active card now refreshes live price and live P/L from the shared live price cache.
- Manual trades now auto-close if the live loss reaches available account balance, preventing balance from going negative.
- Removed the one-active-position limit; multiple manual positions can be opened.
- Close button now asks which manual position to close when multiple positions are active.
- AI auto trade flow was not changed.


Phase 4.15 - Manual Position Selector & Risk Clamp Clean
- Replaced browser prompt close selector with a premium in-app close position modal.
- Manual live bar stays above the bottom nav and opens the custom selector when Close is clicked.
- Multiple manual positions remain supported, but new trade margin now respects already-open manual margins.
- Manual trade live P/L is capped on the loss side by the position margin/current balance so balance cannot go negative.
- Risk auto-close now triggers when a position reaches its max allowed loss.
- Trade page active manual cards continue to refresh live current price and P/L.


Phase 4.16 - Manual Live Bottom Bar Spacing Fix
- Manual live position bar now sits directly above the bottom navigation on mobile.
- Removed the extra vertical gap between the live position bar and bottom nav.
- Close position selector modal position adjusted to match the lower bar placement.
- No changes to manual trade logic, AI trade logic, price feeds, or admin flow.
