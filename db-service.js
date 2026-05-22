
(() => {
  const App = window.AITradeX;
  const C = window.AITRADEX_CONFIG || {};
  const SUPABASE_READY = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);
  const client = SUPABASE_READY ? (App?.db || window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY)) : null;
  const SNAPSHOT_TABLE = "app_state_snapshots";

  const STORAGE_BUCKETS = {
    kyc: "kyc-documents",
    avatars: "user-avatars",
    support: "support-attachments"
  };

  function cleanFileName(name) {
    return String(name || "file")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .slice(0, 80) || "file";
  }

  function fileExt(name, type) {
    const fromName = String(name || "").split(".").pop();
    if (fromName && fromName !== name && fromName.length <= 8) return fromName.toLowerCase();
    if (String(type || "").includes("png")) return "png";
    if (String(type || "").includes("jpeg") || String(type || "").includes("jpg")) return "jpg";
    if (String(type || "").includes("pdf")) return "pdf";
    return "bin";
  }

  function storagePath({ folder = "uploads", userId = "guest", label = "file", file }) {
    const safeUser = String(userId || "guest").replace(/[^a-zA-Z0-9_-]/g, "");
    const ext = fileExt(file?.name, file?.type);
    const base = cleanFileName(file?.name || `${label}.${ext}`).replace(new RegExp(`\\.${ext}$`, "i"), "");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const random = Math.random().toString(36).slice(2, 8);
    return `${folder}/${safeUser}/${stamp}-${random}-${label}-${base}.${ext}`;
  }

  async function signedUrl(bucket, path, expiresIn = 60 * 60 * 24 * 7) {
    if (!SUPABASE_READY || !client) throw new Error("Supabase is not configured.");
    if (!bucket || !path) throw new Error("Storage bucket/path missing.");
    const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data?.signedUrl || "";
  }

  async function uploadUserFile({ bucket, folder = "uploads", userId, label = "file", file }) {
    if (!file) throw new Error("Select a file first.");
    if (!SUPABASE_READY || !client) throw new Error("Supabase is not configured. Add URL and anon key in config.js.");
    const path = storagePath({ folder, userId, label, file });
    const { error } = await client.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream"
    });
    if (error) throw error;
    let url = "";
    try { url = await signedUrl(bucket, path); } catch {
      const { data } = client.storage.from(bucket).getPublicUrl(path);
      url = data?.publicUrl || "";
    }
    return {
      bucket,
      path,
      url,
      name: file.name || cleanFileName(path.split("/").pop()),
      size: file.size || 0,
      type: file.type || "",
      uploadedAt: new Date().toISOString()
    };
  }

  function safeClone(value) {
    try { return JSON.parse(JSON.stringify(value || {})); } catch { return {}; }
  }

  function countsFromState(state) {
    const s = state || App?.state || {};
    return {
      users: (s.users || []).filter(u => u.role === "user").length,
      admins: (s.users || []).filter(u => u.role === "admin").length,
      deposits: (s.depositRequests || []).length,
      withdrawals: (s.withdrawalRequests || []).length,
      walletLedger: (s.walletLedger || []).length,
      demoLedger: (s.demoLedger || []).length,
      trades: (s.trades || []).length,
      manualTrades: (s.trades || []).filter(t => String(t.tradeType || '').toUpperCase() === 'MANUAL').length,
      aiLiveTrades: (s.trades || []).filter(t => String(t.tradeType || '').toUpperCase() === 'AI_LIVE').length,
      instantAiTrades: (s.trades || []).filter(t => String(t.tradeType || '').toUpperCase() === 'AI_INSTANT').length,
      pendingOrders: (s.trades || []).filter(t => String(t.status || '').toUpperCase().includes('PENDING')).length,
      aiTradeBatches: (s.aiTradeBatches || []).length,
      adminActionLogs: (s.adminActionLogs || []).length,
      aiLiveBatches: (s.aiLiveBatches || []).length,
      notifications: (s.notifications || []).length,
      supportTickets: (s.supportTickets || []).length,
      kycRequests: (s.kycRequests || []).length,
      paymentMethods: (s.paymentMethods || []).length,
      plans: (s.plans || []).length,
      subscriptions: (s.subscriptions || []).length,
      referrals: (s.referrals || []).length
    };
  }

  async function testConnection() {
    if (!SUPABASE_READY || !client) {
      return { ok: false, message: "Supabase URL / anon key not configured in config.js." };
    }
    try {
      const { error } = await client.from(SNAPSHOT_TABLE).select("id", { count: "exact", head: true });
      if (error) throw error;
      return { ok: true, message: "Supabase connected. Snapshot table is available." };
    } catch (err) {
      return { ok: false, message: err?.message || "Unable to connect to Supabase. Run supabase-schema.sql first." };
    }
  }

  async function backupFullState({ savedBy = "admin", note = "Manual admin backup" } = {}) {
    if (!SUPABASE_READY || !client) throw new Error("Supabase is not configured. Add URL and anon key in config.js.");
    const state = safeClone(App?.state || {});
    const payload = {
      app_version: "AITradeX-Phase5.0",
      saved_by: savedBy,
      note,
      counts: countsFromState(state),
      state
    };
    const { data, error } = await client.from(SNAPSHOT_TABLE).insert(payload).select("id,saved_at,counts,note").single();
    if (error) throw error;
    return data;
  }

  async function latestSnapshot() {
    if (!SUPABASE_READY || !client) throw new Error("Supabase is not configured.");
    const { data, error } = await client.from(SNAPSHOT_TABLE).select("id,saved_at,saved_by,note,counts,state").order("saved_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function restoreLatestSnapshot() {
    const snap = await latestSnapshot();
    if (!snap?.state) throw new Error("No database backup found.");
    App.state = snap.state;
    App.saveState();
    return snap;
  }

  function downloadLocalBackup() {
    const data = {
      app: "AITradeX",
      exportedAt: new Date().toISOString(),
      counts: countsFromState(App?.state || {}),
      state: safeClone(App?.state || {})
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `aitradex-local-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function importLocalBackup(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error("Select a backup JSON file."));
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const json = JSON.parse(String(reader.result || "{}"));
          const next = json.state || json;
          if (!next || !Array.isArray(next.users)) throw new Error("Invalid AITradeX backup file.");
          App.state = next;
          App.saveState();
          resolve(countsFromState(next));
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error("Unable to read selected backup file."));
      reader.readAsText(file);
    });
  }



  function dateIso(value) {
    if (!value) return new Date().toISOString();
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : new Date().toISOString();
  }

  function getEmailForUser(userId) {
    const u = (App?.state?.users || []).find(x => x.id === userId);
    return u?.email || "";
  }

  function dbStatus(message, ok = true) {
    const row = { ok, message, at: new Date().toISOString() };
    try { localStorage.setItem("AITradeX_DB_LAST_SYNC", JSON.stringify(row)); } catch {}
    return row;
  }

  function emitDbLoaded(detail = {}) {
    try { window.dispatchEvent(new CustomEvent("aitradex:db-loaded", { detail })); } catch {}
  }

  function replaceInState(listName, row) {
    if (!row || !row.id) return null;
    App.state[listName] = Array.isArray(App.state[listName]) ? App.state[listName] : [];
    const idx = App.state[listName].findIndex(x => String(x.id) === String(row.id));
    if (idx >= 0) App.state[listName][idx] = row;
    else App.state[listName].push(row);
    return row;
  }

  function lastSyncStatus() {
    try { return JSON.parse(localStorage.getItem("AITradeX_DB_LAST_SYNC") || "null"); } catch { return null; }
  }

  async function upsertRows(table, rows, label = table) {
    if (!rows.length) return { table, label, count: 0, skipped: true };
    const { error } = await client.from(table).upsert(rows, { onConflict: "id" });
    if (error) throw new Error(`${label}: ${error.message}`);
    return { table, label, count: rows.length, skipped: false };
  }

  function userRows() {
    const rows = [];
    const seenId = new Set();
    const seenEmail = new Set();
    const seenMobile = new Set();
    (App?.state?.users || []).forEach(u => {
      const id = String(u.id || "").trim();
      const email = String(u.email || "").trim().toLowerCase();
      const mobile = String(u.mobile || "").replace(/\D/g, "").slice(-10);
      if (!id || seenId.has(id)) return;
      if (email && seenEmail.has(email)) return;
      if (mobile && seenMobile.has(mobile)) return;
      seenId.add(id);
      if (email) seenEmail.add(email);
      if (mobile) seenMobile.add(mobile);
      rows.push({
        id,
        name: u.name || "",
        email,
        mobile: mobile || u.mobile || "",
        role: u.role || "user",
        status: u.status || "ACTIVE",
        referral_code: u.referralCode || u.referral_code || "",
        referred_by: u.referredBy || u.referred_by || null,
        password_hash: u.password || u.password_hash || null,
        ai_trade_on: !!u.aiTradeOn,
        ai_trade_percent: Number(u.aiTradePercent || 25),
        free_trial_started_at: u.freeTrialStartedAt ? dateIso(u.freeTrialStartedAt) : null,
        avatar_url: u.avatarUrl || u.avatar_url || null,
        avatar_path: u.avatarPath || u.avatar_path || null,
        created_at: dateIso(u.createdAt || u.created_at)
      });
    });
    return rows;
  }

  function walletLedgerRows() {
    return (App?.state?.walletLedger || []).map(x => ({
      id: String(x.id),
      user_id: x.userId || x.user_id,
      account_type: x.accountType || x.account_type || "REAL",
      type: x.type || "WALLET",
      amount: Number(x.amount || 0),
      reference_id: String(x.referenceId || x.reference_id || x.id),
      note: x.note || "",
      balance_after: Number(x.balanceAfter || x.balance_after || 0),
      created_at: dateIso(x.createdAt || x.created_at)
    })).filter(x => x.id && x.user_id);
  }

  function depositRows() {
    return (App?.state?.depositRequests || []).map(x => ({
      id: String(x.id),
      user_id: x.userId || x.user_id,
      user_email: x.userEmail || x.user_email || getEmailForUser(x.userId || x.user_id),
      amount: Number(x.amount || 0),
      method: x.type || x.method || "UPI",
      utr: String(x.utr || ""),
      status: x.status || "PENDING",
      balance_applied: !!(x.balanceApplied || x.balance_applied),
      first_deposit_referral_checked: !!(x.firstDepositReferralChecked || x.first_deposit_referral_checked),
      proof_image: x.proofImage || x.proof_image || null,
      admin_note: x.adminNote || x.rejectReason || x.admin_note || "",
      created_at: dateIso(x.createdAt || x.created_at)
    })).filter(x => x.id && x.user_id);
  }

  function withdrawalRows() {
    return (App?.state?.withdrawalRequests || []).map(x => ({
      id: String(x.id),
      user_id: x.userId || x.user_id,
      user_email: x.userEmail || x.user_email || getEmailForUser(x.userId || x.user_id),
      amount: Number(x.amount || 0),
      payment_method_id: x.methodId || x.paymentMethodId || x.payment_method_id || "",
      status: x.status || "PENDING",
      hold_applied: x.holdApplied !== false,
      admin_note: x.adminNote || x.rejectReason || x.admin_note || "",
      created_at: dateIso(x.createdAt || x.created_at)
    })).filter(x => x.id && x.user_id);
  }

  function paymentMethodRows() {
    return (App?.state?.paymentMethods || []).map(x => ({
      id: String(x.id),
      user_id: x.userId || x.user_id,
      user_email: x.userEmail || x.user_email || getEmailForUser(x.userId || x.user_id),
      type: x.type || "BANK",
      holder_name: x.holderName || x.holder_name || "",
      upi_id: x.upiId || x.upi_id || "",
      bank_name: x.bankName || x.bank_name || "",
      account_number: x.accountNumber || x.account_number || "",
      ifsc: x.ifsc || "",
      status: x.status || "PENDING",
      rejection_reason: x.rejectReason || x.rejectionReason || x.rejection_reason || "",
      created_at: dateIso(x.createdAt || x.created_at)
    })).filter(x => x.id && x.user_id);
  }

  function kycRows() {
    return (App?.state?.kycRequests || []).map(x => ({
      id: String(x.id),
      user_id: x.userId || x.user_id,
      user_email: x.userEmail || x.user_email || getEmailForUser(x.userId || x.user_id),
      full_name: x.fullName || x.full_name || x.name || "",
      mobile: x.mobile || "",
      id_number: x.idNumber || x.id_number || x.aadhaar || "",
      address: x.address || "",
      status: x.status || "PENDING",
      reviewed_at: x.reviewedAt ? dateIso(x.reviewedAt) : null,
      created_at: dateIso(x.createdAt || x.created_at)
    })).filter(x => x.id && x.user_id);
  }

  function notificationRows() {
    return (App?.state?.notifications || []).map(x => ({
      id: String(x.id),
      audience: x.audience || "USER",
      user_id: x.userId || x.user_id || null,
      title: x.title || "",
      message: x.message || "",
      type: x.type || "INFO",
      link_page: x.linkPage || x.link_page || "",
      reference_id: x.referenceId || x.reference_id || "",
      read: !!x.read,
      created_at: dateIso(x.createdAt || x.created_at)
    })).filter(x => x.id);
  }


  function appSettingsRows() {
    return [{ id: "main", settings: safeClone(App?.state?.settings || {}), updated_at: new Date().toISOString() }];
  }

  function planRows() {
    return (App?.state?.plans || []).map(p => ({
      id: String(p.id),
      name: p.name || "Plan",
      price: Number(p.price || 0),
      signals: Number(p.signals || p.aiTradeLimit || 0),
      ai_access: p.aiAccess || "AI Access",
      trade_limit: Number(p.tradeLimit || p.signals || 0),
      is_active: String(p.status || "ACTIVE").toUpperCase() !== "INACTIVE",
      raw: safeClone(p)
    })).filter(p => p.id);
  }

  function subscriptionRows() {
    return (App?.state?.subscriptions || []).map(x => ({
      id: String(x.id),
      user_id: x.userId || x.user_id,
      plan_id: x.planId || x.plan_id,
      plan_name: x.planName || x.plan_name || "",
      amount: Number(x.amount || x.price || 0),
      status: x.status || "ACTIVE",
      starts_at: x.startsAt ? dateIso(x.startsAt) : (x.createdAt ? dateIso(x.createdAt) : null),
      expires_at: x.expiresAt ? dateIso(x.expiresAt) : null,
      created_at: dateIso(x.createdAt || x.created_at)
    })).filter(x => x.id && x.user_id);
  }

  function referralRows() {
    return (App?.state?.referrals || []).map(r => ({
      id: String(r.id),
      referrer_user_id: r.referrerUserId || r.referrer_user_id,
      referred_user_id: r.referredUserId || r.referred_user_id,
      status: r.status || "REGISTERED",
      commission_paid: !!(r.commissionPaid || r.commission_paid || r.bonuses?.deposit?.credited || r.bonuses?.subscription?.credited),
      commission_amount: Number(r.commissionAmount || r.commission_amount || r.bonuses?.deposit?.amount || r.bonuses?.subscription?.amount || 0),
      created_at: dateIso(r.createdAt || r.created_at),
      raw: safeClone(r)
    })).filter(r => r.id && r.referrer_user_id && r.referred_user_id);
  }

  function supportRows() {
    return (App?.state?.supportTickets || []).map(t => ({
      id: String(t.id),
      user_id: t.userId || t.user_id,
      user_email: t.userEmail || t.user_email || getEmailForUser(t.userId || t.user_id),
      subject: t.subject || "Support Ticket",
      category: t.category || "GENERAL",
      message: t.message || "",
      status: t.status || "OPEN",
      replies: Array.isArray(t.replies) ? t.replies : [],
      created_at: dateIso(t.createdAt || t.created_at),
      updated_at: dateIso(t.updatedAt || t.updated_at || t.createdAt || t.created_at)
    })).filter(t => t.id && t.user_id);
  }

  function tradeRows() {
    return (App?.state?.trades || []).map(x => {
      const status = String(x.status || "OPEN").toUpperCase();
      const tradeType = String(x.tradeType || x.trade_type || "MANUAL").toUpperCase();
      const margin = Number(x.marginAmount ?? x.amount ?? x.margin_amount ?? 0);
      const leverage = Number(x.leverage || 1);
      const positionSize = Number(x.positionSize ?? x.position_size ?? (margin * leverage));
      return {
        id: String(x.id),
        user_id: x.userId || x.user_id,
        batch_id: x.batchId || x.batch_id || null,
        trade_type: tradeType,
        account_type: x.accountType || x.account_type || "REAL",
        order_type: x.orderType || x.order_type || "MARKET",
        market: x.market || "CRYPTO",
        pair: x.pair || "",
        side: x.side || "BUY",
        status,
        source: x.source || "",
        entry_price: Number(x.entryPrice || x.entry_price || 0) || null,
        entry_price_display: x.entryPriceDisplay || x.entry_price_display || "",
        exit_price: Number(x.exitPrice || x.closePrice || x.exit_price || x.close_price || 0) || null,
        exit_price_display: x.exitPriceDisplay || x.closePriceDisplay || x.exit_price_display || "",
        limit_price: Number(x.limitPrice || x.limit_price || 0) || null,
        limit_price_display: x.limitPriceDisplay || x.limit_price_display || "",
        leverage,
        margin_amount: margin,
        margin_locked: !!x.marginLocked,
        position_size: positionSize,
        pnl: Number(x.pnl || 0),
        settlement_amount: Number(x.settlementAmount || x.settlement_amount || 0),
        target_type: x.targetType || x.target_type || "",
        target_percent: Number(x.targetPercent || x.target_percent || 0),
        close_reason: x.closeReason || x.close_reason || "",
        closed_by: x.closedBy || x.closed_by || "",
        note: x.note || "",
        raw: x,
        created_at: dateIso(x.createdAt || x.openedAt || x.created_at || x.opened_at),
        opened_at: x.openedAt || x.opened_at ? dateIso(x.openedAt || x.opened_at) : (x.createdAt || x.created_at ? dateIso(x.createdAt || x.created_at) : null),
        closed_at: x.closedAt || x.closed_at ? dateIso(x.closedAt || x.closed_at) : null
      };
    }).filter(x => x.id && x.user_id);
  }

  function aiBatchRows() {
    const instant = (App?.state?.aiTradeBatches || []).map(x => ({ ...x, batchKind: "INSTANT" }));
    const live = (App?.state?.aiLiveBatches || []).map(x => ({ ...x, batchKind: "LIVE" }));
    return [...instant, ...live].map(x => ({
      id: String(x.id),
      batch_type: x.batchKind || x.batch_type || "INSTANT",
      market: x.market || "CRYPTO",
      pair: x.pair || "",
      side: x.side || "BUY",
      leverage: Number(x.leverage || 1),
      status: x.status || (String(x.batchKind || "").toUpperCase() === "LIVE" ? "OPEN" : "CLOSED"),
      entry_price: Number(x.entryPrice || x.entry_price || 0) || null,
      entry_price_display: x.entryPriceDisplay || x.entry_price_display || "",
      target_type: x.targetType || x.target_type || x.resultType || "",
      target_percent: Number(x.targetPercent || x.target_percent || x.resultPercent || 0),
      min_balance: Number(x.minBalance || x.min_balance || 0),
      total_margin: Number(x.totalMargin || x.total_margin || 0),
      total_exposure: Number(x.totalExposure || x.total_exposure || 0),
      total_pnl: Number(x.totalPnl || x.total_pnl || 0),
      applied_count: Number(x.appliedCount || x.applied_count || 0),
      skipped_count: Number(x.skippedCount || x.skipped_count || 0),
      skip_reasons: x.skipReasons || x.skip_reasons || {},
      note: x.note || "",
      raw: x,
      created_at: dateIso(x.createdAt || x.created_at),
      closed_at: x.closedAt || x.closed_at ? dateIso(x.closedAt || x.closed_at) : null
    })).filter(x => x.id);
  }


  function adminActionRows() {
    return (App?.state?.adminActionLogs || []).map(x => ({
      id: String(x.id || `${x.action || "action"}_${x.createdAt || Date.now()}`),
      admin_user_id: x.adminUserId || x.admin_user_id || "admin",
      action: x.action || "ADMIN_ACTION",
      target_type: x.targetType || x.target_type || "SYSTEM",
      target_id: String(x.targetId || x.target_id || ""),
      meta: x.meta && typeof x.meta === "object" ? x.meta : {},
      created_at: dateIso(x.createdAt || x.created_at)
    })).filter(x => x.id && x.action);
  }

  async function syncCoreTables({ silent = false } = {}) {
    if (!SUPABASE_READY || !client) throw new Error("Supabase is not configured.");
    const results = [];
    results.push(await upsertRows("users", userRows(), "Users"));
    results.push(await upsertRows("payment_methods", paymentMethodRows(), "Bank/payment methods"));
    results.push(await upsertRows("kyc_requests", kycRows(), "KYC requests"));
    results.push(await upsertRows("deposit_requests", depositRows(), "Deposit requests"));
    results.push(await upsertRows("withdrawal_requests", withdrawalRows(), "Withdrawal requests"));
    results.push(await upsertRows("wallet_ledger", walletLedgerRows(), "Wallet ledger"));
    results.push(await upsertRows("trade_orders", tradeRows(), "Manual/AI trades and orders"));
    results.push(await upsertRows("ai_trade_batches", aiBatchRows(), "AI trade batches"));
    results.push(await upsertRows("admin_action_logs", adminActionRows(), "Admin action logs"));
    results.push(await upsertRows("notifications", notificationRows(), "Notifications"));
    results.push(await upsertRows("app_settings", appSettingsRows(), "App settings"));
    results.push(await upsertRows("plans", planRows(), "Plans"));
    results.push(await upsertRows("subscriptions", subscriptionRows(), "Subscriptions"));
    results.push(await upsertRows("referrals", referralRows(), "Referrals"));
    results.push(await upsertRows("support_tickets", supportRows(), "Support tickets"));
    const total = results.reduce((s, r) => s + Number(r.count || 0), 0);
    dbStatus(`Core tables synced: ${total} row(s).`, true);
    if (!silent && App?.toast) App.toast("Core database sync completed.");
    return { ok: true, total, results, syncedAt: new Date().toISOString() };
  }

  function camelUser(r) {
    return {
      id: r.id, name: r.name || "", email: r.email || "", mobile: r.mobile || "", role: r.role || "user", status: r.status || "ACTIVE",
      referralCode: r.referral_code || "", referredBy: r.referred_by || null, password: r.password_hash || "",
      aiTradeOn: !!r.ai_trade_on, aiTradePercent: Number(r.ai_trade_percent || 25), freeTrialStartedAt: r.free_trial_started_at || "", avatarUrl: r.avatar_url || "", avatarPath: r.avatar_path || "", createdAt: r.created_at || ""
    };
  }
  function camelLedger(r) { return { id: r.id, userId: r.user_id, accountType: r.account_type || "REAL", type: r.type, amount: Number(r.amount || 0), referenceId: r.reference_id, note: r.note || "", balanceAfter: Number(r.balance_after || 0), createdAt: r.created_at }; }
  function camelDeposit(r) { return { id: r.id, userId: r.user_id, userEmail: r.user_email, amount: Number(r.amount || 0), type: r.method || "UPI", utr: r.utr || "", status: r.status || "PENDING", balanceApplied: !!r.balance_applied, firstDepositReferralChecked: !!r.first_deposit_referral_checked, adminNote: r.admin_note || "", createdAt: r.created_at }; }
  function camelWithdrawal(r) { return { id: r.id, userId: r.user_id, userEmail: r.user_email, amount: Number(r.amount || 0), methodId: r.payment_method_id || "", status: r.status || "PENDING", holdApplied: !!r.hold_applied, adminNote: r.admin_note || "", createdAt: r.created_at }; }
  function camelMethod(r) { return { id: r.id, userId: r.user_id, userEmail: r.user_email, type: r.type || "BANK", holderName: r.holder_name || "", upiId: r.upi_id || "", bankName: r.bank_name || "", accountNumber: r.account_number || "", ifsc: r.ifsc || "", status: r.status || "PENDING", rejectReason: r.rejection_reason || "", createdAt: r.created_at }; }
  function camelKyc(r) { return { id: r.id, userId: r.user_id, userEmail: r.user_email, fullName: r.full_name || "", mobile: r.mobile || "", idNumber: r.id_number || "", address: r.address || "", status: r.status || "PENDING", reviewedAt: r.reviewed_at || "", createdAt: r.created_at }; }
  function camelNotification(r) { return { id: r.id, audience: r.audience || "USER", userId: r.user_id || "", title: r.title || "", message: r.message || "", type: r.type || "INFO", linkPage: r.link_page || "", referenceId: r.reference_id || "", read: !!r.read, createdAt: r.created_at }; }
  function camelAdminAction(r) { return { id: String(r.id), adminUserId: r.admin_user_id || "admin", action: r.action || "ADMIN_ACTION", targetType: r.target_type || "SYSTEM", targetId: r.target_id || "", meta: r.meta || {}, createdAt: r.created_at || "" }; }
  function camelPlan(r) { return r.raw && typeof r.raw === "object" ? r.raw : { id: r.id, name: r.name || "Plan", price: Number(r.price || 0), signals: Number(r.signals || r.trade_limit || 0), aiAccess: r.ai_access || "AI Access", status: r.is_active === false ? "INACTIVE" : "ACTIVE" }; }
  function camelSubscription(r) { return { id: r.id, userId: r.user_id, planId: r.plan_id, planName: r.plan_name || "", amount: Number(r.amount || 0), price: Number(r.amount || 0), status: r.status || "ACTIVE", startsAt: r.starts_at || "", expiresAt: r.expires_at || "", createdAt: r.created_at || "" }; }
  function camelReferral(r) { return r.raw && typeof r.raw === "object" ? r.raw : { id: r.id, referrerUserId: r.referrer_user_id, referredUserId: r.referred_user_id, status: r.status || "REGISTERED", commissionPaid: !!r.commission_paid, commissionAmount: Number(r.commission_amount || 0), bonuses: {}, createdAt: r.created_at || "" }; }
  function camelSupport(t) { return { id: t.id, userId: t.user_id, userEmail: t.user_email || "", subject: t.subject || "Support Ticket", category: t.category || "GENERAL", message: t.message || "", status: t.status || "OPEN", replies: Array.isArray(t.replies) ? t.replies : [], createdAt: t.created_at || "", updatedAt: t.updated_at || "" }; }

  function camelTrade(r) {
    const raw = r.raw && typeof r.raw === "object" ? r.raw : {};
    return {
      ...raw,
      id: r.id,
      userId: r.user_id,
      batchId: r.batch_id || raw.batchId || "",
      tradeType: r.trade_type || raw.tradeType || "MANUAL",
      accountType: r.account_type || raw.accountType || "REAL",
      orderType: r.order_type || raw.orderType || "MARKET",
      market: r.market || raw.market || "CRYPTO",
      pair: r.pair || raw.pair || "",
      side: r.side || raw.side || "BUY",
      status: r.status || raw.status || "OPEN",
      source: r.source || raw.source || "",
      entryPrice: Number(r.entry_price || raw.entryPrice || 0),
      entryPriceDisplay: r.entry_price_display || raw.entryPriceDisplay || "",
      exitPrice: Number(r.exit_price || raw.exitPrice || 0),
      exitPriceDisplay: r.exit_price_display || raw.exitPriceDisplay || "",
      limitPrice: Number(r.limit_price || raw.limitPrice || 0),
      limitPriceDisplay: r.limit_price_display || raw.limitPriceDisplay || "",
      leverage: Number(r.leverage || raw.leverage || 1),
      marginAmount: Number(r.margin_amount || raw.marginAmount || 0),
      marginLocked: !!r.margin_locked,
      positionSize: Number(r.position_size || raw.positionSize || 0),
      pnl: Number(r.pnl || raw.pnl || 0),
      settlementAmount: Number(r.settlement_amount || raw.settlementAmount || 0),
      targetType: r.target_type || raw.targetType || "",
      targetPercent: Number(r.target_percent || raw.targetPercent || 0),
      closeReason: r.close_reason || raw.closeReason || "",
      closedBy: r.closed_by || raw.closedBy || "",
      note: r.note || raw.note || "",
      createdAt: r.created_at || raw.createdAt || "",
      openedAt: r.opened_at || raw.openedAt || "",
      closedAt: r.closed_at || raw.closedAt || ""
    };
  }

  function camelAiBatch(r) {
    const raw = r.raw && typeof r.raw === "object" ? r.raw : {};
    return {
      ...raw,
      id: r.id,
      market: r.market || raw.market || "CRYPTO",
      pair: r.pair || raw.pair || "",
      side: r.side || raw.side || "BUY",
      leverage: Number(r.leverage || raw.leverage || 1),
      status: r.status || raw.status || "OPEN",
      entryPrice: Number(r.entry_price || raw.entryPrice || 0),
      entryPriceDisplay: r.entry_price_display || raw.entryPriceDisplay || "",
      targetType: r.target_type || raw.targetType || raw.resultType || "",
      targetPercent: Number(r.target_percent || raw.targetPercent || raw.resultPercent || 0),
      minBalance: Number(r.min_balance || raw.minBalance || 0),
      totalMargin: Number(r.total_margin || raw.totalMargin || 0),
      totalExposure: Number(r.total_exposure || raw.totalExposure || 0),
      totalPnl: Number(r.total_pnl || raw.totalPnl || 0),
      appliedCount: Number(r.applied_count || raw.appliedCount || 0),
      skippedCount: Number(r.skipped_count || raw.skippedCount || 0),
      skipReasons: r.skip_reasons || raw.skipReasons || {},
      note: r.note || raw.note || "",
      createdAt: r.created_at || raw.createdAt || "",
      closedAt: r.closed_at || raw.closedAt || ""
    };
  }

  async function pullCoreTables() {
    if (!SUPABASE_READY || !client) throw new Error("Supabase is not configured.");
    const fetchTable = async (table) => {
      const { data, error } = await client.from(table).select("*");
      if (error) throw new Error(`${table}: ${error.message}`);
      return data || [];
    };
    const [users, methods, kyc, deposits, withdrawals, ledger, trades, batches, adminLogs, notifications, appSettings, plans, subscriptions, referrals, supportTickets] = await Promise.all([
      fetchTable("users"),
      fetchTable("payment_methods"),
      fetchTable("kyc_requests"),
      fetchTable("deposit_requests"),
      fetchTable("withdrawal_requests"),
      fetchTable("wallet_ledger"),
      fetchTable("trade_orders"),
      fetchTable("ai_trade_batches"),
      fetchTable("admin_action_logs"),
      fetchTable("notifications"),
      fetchTable("app_settings"),
      fetchTable("plans"),
      fetchTable("subscriptions"),
      fetchTable("referrals"),
      fetchTable("support_tickets")
    ]);
    const adminLocal = (App.state.users || []).filter(u => u.role === "admin");
    const pulledUsers = users.map(camelUser);
    const adminIds = new Set(pulledUsers.filter(u => u.role === "admin").map(u => u.id));
    App.state.users = [...pulledUsers, ...adminLocal.filter(u => !adminIds.has(u.id))];
    App.state.paymentMethods = methods.map(camelMethod);
    App.state.kycRequests = kyc.map(camelKyc);
    App.state.depositRequests = deposits.map(camelDeposit);
    App.state.withdrawalRequests = withdrawals.map(camelWithdrawal);
    App.state.walletLedger = ledger.map(camelLedger);
    App.state.trades = trades.map(camelTrade).sort((a, b) => Date.parse(b.createdAt || b.openedAt || 0) - Date.parse(a.createdAt || a.openedAt || 0));
    const pulledBatches = batches.map(camelAiBatch);
    App.state.aiTradeBatches = pulledBatches.filter(b => String(b.batch_type || b.batchType || '').toUpperCase() === 'INSTANT');
    App.state.aiLiveBatches = pulledBatches.filter(b => String(b.batch_type || b.batchType || '').toUpperCase() === 'LIVE');
    App.state.adminActionLogs = adminLogs.map(camelAdminAction).sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
    App.state.notifications = notifications.map(camelNotification);
    const mainSettings = (appSettings || []).find(x => String(x.id) === "main") || appSettings?.[0];
    if (mainSettings?.settings && typeof mainSettings.settings === "object") App.state.settings = { ...(App.state.settings || {}), ...mainSettings.settings };
    if (plans.length) App.state.plans = plans.map(camelPlan);
    App.state.subscriptions = subscriptions.map(camelSubscription);
    App.state.referrals = referrals.map(camelReferral);
    App.state.supportTickets = supportTickets.map(camelSupport);
    App.saveState();
    const summary = { users: users.length, methods: methods.length, kyc: kyc.length, deposits: deposits.length, withdrawals: withdrawals.length, walletLedger: ledger.length, trades: trades.length, aiBatches: batches.length, adminActionLogs: adminLogs.length, notifications: notifications.length, appSettings: appSettings.length, plans: plans.length, subscriptions: subscriptions.length, referrals: referrals.length, supportTickets: supportTickets.length };
    dbStatus(`Core + trade tables loaded from Supabase: ${users.length + deposits.length + withdrawals.length + ledger.length + trades.length + batches.length} row(s).`, true);
    emitDbLoaded({ type: "pull", summary });
    return summary;
  }

  async function findUserByEmail(email) {
    if (!SUPABASE_READY || !client) throw new Error("Supabase is not configured.");
    const clean = String(email || "").trim().toLowerCase();
    if (!clean) return null;
    const { data, error } = await client.from("users").select("*").eq("email", clean).limit(1).maybeSingle();
    if (error) throw error;
    const user = data ? camelUser(data) : null;
    if (user) replaceInState("users", user);
    return user;
  }

  async function findUserByMobile(mobile) {
    if (!SUPABASE_READY || !client) throw new Error("Supabase is not configured.");
    const clean = String(mobile || "").replace(/\D/g, "").slice(-10);
    if (!clean) return null;
    const { data, error } = await client.from("users").select("*").eq("mobile", clean).limit(1).maybeSingle();
    if (error) throw error;
    const user = data ? camelUser(data) : null;
    if (user) replaceInState("users", user);
    return user;
  }

  async function findUserById(id) {
    if (!SUPABASE_READY || !client) throw new Error("Supabase is not configured.");
    const clean = String(id || "").trim();
    if (!clean) return null;
    const { data, error } = await client.from("users").select("*").eq("id", clean).limit(1).maybeSingle();
    if (error) throw error;
    const user = data ? camelUser(data) : null;
    if (user) replaceInState("users", user);
    return user;
  }

  function userToRow(user) {
    return {
      id: String(user.id),
      name: user.name || "",
      email: String(user.email || "").toLowerCase(),
      mobile: String(user.mobile || "").replace(/\D/g, "").slice(-10) || user.mobile || "",
      role: user.role || "user",
      status: user.status || "ACTIVE",
      referral_code: user.referralCode || user.referral_code || "",
      referred_by: user.referredBy || user.referred_by || null,
      password_hash: user.password || user.password_hash || "",
      ai_trade_on: !!user.aiTradeOn,
      ai_trade_percent: Number(user.aiTradePercent || 25),
      free_trial_started_at: user.freeTrialStartedAt ? dateIso(user.freeTrialStartedAt) : null,
      avatar_url: user.avatarUrl || user.avatar_url || null,
      avatar_path: user.avatarPath || user.avatar_path || null,
      created_at: dateIso(user.createdAt || user.created_at)
    };
  }

  async function upsertUserRecord(user) {
    if (!SUPABASE_READY || !client) throw new Error("Supabase is not configured.");
    if (!user?.id) throw new Error("User record missing id.");
    const row = userToRow(user);
    const { error } = await client.from("users").upsert(row, { onConflict: "id" });
    if (error) throw error;
    replaceInState("users", user);
    dbStatus(`User synced to Supabase: ${row.email}`, true);
    return user;
  }

  async function createUserAccount(user) {
    if (!SUPABASE_READY || !client) throw new Error("Supabase is not configured.");
    if (!user?.id) throw new Error("User record missing id.");
    const row = userToRow(user);

    async function existingMatch(existing) {
      return {
        user: existing,
        existed: true,
        match: String(existing?.password || existing?.password_hash || "") === String(user.password || user.password_hash || "")
      };
    }

    // Always check existing account first. This makes repeated signup/login recovery safe on PC and mobile.
    const existingByEmail = row.email ? await findUserByEmail(row.email) : null;
    if (existingByEmail) return existingMatch(existingByEmail);
    const existingByMobile = row.mobile ? await findUserByMobile(row.mobile) : null;
    if (existingByMobile) return existingMatch(existingByMobile);

    // IMPORTANT: Do not chain .select().single() here. Some Supabase RLS setups allow INSERT
    // but block RETURNING/SELECT, which creates the row and then shows a policy error on mobile.
    // We insert with minimal returning and treat the local user object as the source of truth.
    const { error } = await client.from("users").insert(row, { returning: "minimal" });
    if (error) {
      const msg = String(error.message || error || "");
      const duplicate = /duplicate key|unique constraint|users_email|users_mobile|users_pkey/i.test(msg);
      const policy = /row-level security|violates row-level security|policy/i.test(msg);
      let recovered = null;
      try { recovered = row.email ? await findUserByEmail(row.email) : null; } catch {}
      if (!recovered && row.mobile) { try { recovered = await findUserByMobile(row.mobile); } catch {} }
      if (recovered && (duplicate || policy)) return existingMatch(recovered);
      throw error;
    }

    const saved = { ...user, email: row.email, mobile: row.mobile, password: row.password_hash, password_hash: row.password_hash };
    replaceInState("users", saved);
    dbStatus(`User created in Supabase: ${row.email}`, true);
    return { user: saved, existed: false, match: true };
  }

  const DIRECT_TABLE_PLANS = [
    { table: "users", label: "Users", rows: userRows },
    { table: "payment_methods", label: "Bank/payment methods", rows: paymentMethodRows },
    { table: "kyc_requests", label: "KYC requests", rows: kycRows },
    { table: "deposit_requests", label: "Deposit requests", rows: depositRows },
    { table: "withdrawal_requests", label: "Withdrawal requests", rows: withdrawalRows },
    { table: "wallet_ledger", label: "Wallet ledger", rows: walletLedgerRows },
    { table: "trade_orders", label: "Manual/AI trades and orders", rows: tradeRows },
    { table: "ai_trade_batches", label: "AI trade batches", rows: aiBatchRows },
    { table: "admin_action_logs", label: "Admin action logs", rows: adminActionRows },
    { table: "notifications", label: "Notifications", rows: notificationRows },
    { table: "app_settings", label: "App settings", rows: appSettingsRows },
    { table: "plans", label: "Plans", rows: planRows },
    { table: "subscriptions", label: "Subscriptions", rows: subscriptionRows },
    { table: "referrals", label: "Referrals", rows: referralRows },
    { table: "support_tickets", label: "Support tickets", rows: supportRows }
  ];

  const directFingerprints = new Map();
  function rowFingerprint(row) {
    try { return JSON.stringify(row || {}); } catch { return String(Date.now()); }
  }
  function changedRowsFor(table, rows) {
    const changed = [];
    (rows || []).forEach(row => {
      if (!row || row.id === undefined || row.id === null) return;
      const key = `${table}:${String(row.id)}`;
      const fp = rowFingerprint(row);
      if (directFingerprints.get(key) !== fp) {
        directFingerprints.set(key, fp);
        changed.push(row);
      }
    });
    return changed;
  }

  async function directWriteChangedTables({ reason = "state-change", force = false } = {}) {
    if (!SUPABASE_READY || !client || !App?.state) return { ok: false, message: "Supabase is not configured." };
    const results = [];
    let total = 0;
    const errors = [];
    for (const plan of DIRECT_TABLE_PLANS) {
      const rows = plan.rows();
      const changed = force ? rows : changedRowsFor(plan.table, rows);
      if (!changed.length) continue;
      try {
        const result = await upsertRows(plan.table, changed, plan.label);
        results.push(result);
        total += changed.length;
      } catch (err) {
        errors.push({ table: plan.table, label: plan.label, message: err?.message || String(err) });
      }
    }
    if (total > 0) emitDbLoaded({ type: "direct-write", reason, total, results, errors });
    if (errors.length) {
      dbStatus(`Direct database write partially saved ${total} row(s). ${errors.length} table(s) need policy/schema check.`, false);
      try { console.warn("AITradeX direct write partial errors", errors); } catch {}
    } else if (total > 0) {
      dbStatus(`Direct database write saved ${total} changed row(s).`, true);
    }
    return { ok: !errors.length, total, results, errors };
  }

  let directWriteTimer = null;
  let directWriting = false;
  let directWriteQueued = false;
  function scheduleDirectWrite(reason = "state-change") {
    if (!SUPABASE_READY || !client || !App?.state) return;
    clearTimeout(directWriteTimer);
    directWriteTimer = setTimeout(async () => {
      if (directWriting) { directWriteQueued = true; return; }
      directWriting = true;
      try {
        do {
          directWriteQueued = false;
          await directWriteChangedTables({ reason });
        } while (directWriteQueued);
      } catch (err) {
        dbStatus(err?.message || "Direct database write failed.", false);
        try { console.error("AITradeX direct database write failed", err); } catch {}
      } finally {
        directWriting = false;
      }
    }, 120);
  }

  let syncTimer = null;
  let syncing = false;
  function scheduleCoreSync() {
    if (!SUPABASE_READY || !client || !App?.state) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      if (syncing) return;
      syncing = true;
      try { await syncCoreTables({ silent: true }); }
      catch (err) { dbStatus(err?.message || "Database fallback sync failed.", false); }
      finally { syncing = false; }
    }, 15000);
  }

  if (App && !App.__dbSyncWrapped) {
    const originalSaveState = App.saveState;
    App.saveState = function () {
      const result = originalSaveState.apply(App, arguments);
      if (!App.__suspendDbAutoWrite) {
        scheduleDirectWrite("App.saveState");
        scheduleCoreSync();
      }
      return result;
    };
    App.__dbSyncWrapped = true;
  }

  window.AITradeXDB = {
    ready: SUPABASE_READY,
    client,
    snapshotTable: SNAPSHOT_TABLE,
    storageBuckets: STORAGE_BUCKETS,
    countsFromState,
    testConnection,
    backupFullState,
    latestSnapshot,
    restoreLatestSnapshot,
    downloadLocalBackup,
    importLocalBackup,
    syncCoreTables,
    pullCoreTables,
    findUserByEmail,
    findUserByMobile,
    findUserById,
    upsertUserRecord,
    createUserAccount,
    directWriteChangedTables,
    scheduleDirectWrite,
    lastSyncStatus,
    uploadUserFile,
    signedUrl
  };

  if (SUPABASE_READY && client && !window.__AITRADEX_DB_BOOT_PULL__) {
    window.__AITRADEX_DB_BOOT_PULL__ = true;
    setTimeout(async () => {
      try { await pullCoreTables(); }
      catch (err) { dbStatus(err?.message || "Database boot load failed.", false); emitDbLoaded({ type: "error", message: err?.message || String(err) }); }
    }, 80);
  }
})();
