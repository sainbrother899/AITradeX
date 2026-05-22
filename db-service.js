
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
    return (App?.state?.users || []).map(u => ({
      id: String(u.id),
      name: u.name || "",
      email: String(u.email || "").toLowerCase(),
      mobile: u.mobile || "",
      role: u.role || "user",
      status: u.status || "ACTIVE",
      referral_code: u.referralCode || u.referral_code || "",
      referred_by: u.referredBy || u.referred_by || null,
      password_hash: u.password || u.password_hash || null,
      ai_trade_on: !!u.aiTradeOn,
      ai_trade_percent: Number(u.aiTradePercent || 25),
      free_trial_started_at: u.freeTrialStartedAt ? dateIso(u.freeTrialStartedAt) : null,
      created_at: dateIso(u.createdAt || u.created_at)
    }));
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
    const total = results.reduce((s, r) => s + Number(r.count || 0), 0);
    dbStatus(`Core tables synced: ${total} row(s).`, true);
    if (!silent && App?.toast) App.toast("Core database sync completed.");
    return { ok: true, total, results, syncedAt: new Date().toISOString() };
  }

  function camelUser(r) {
    return {
      id: r.id, name: r.name || "", email: r.email || "", mobile: r.mobile || "", role: r.role || "user", status: r.status || "ACTIVE",
      referralCode: r.referral_code || "", referredBy: r.referred_by || null, password: r.password_hash || "",
      aiTradeOn: !!r.ai_trade_on, aiTradePercent: Number(r.ai_trade_percent || 25), freeTrialStartedAt: r.free_trial_started_at || "", createdAt: r.created_at || ""
    };
  }
  function camelLedger(r) { return { id: r.id, userId: r.user_id, accountType: r.account_type || "REAL", type: r.type, amount: Number(r.amount || 0), referenceId: r.reference_id, note: r.note || "", balanceAfter: Number(r.balance_after || 0), createdAt: r.created_at }; }
  function camelDeposit(r) { return { id: r.id, userId: r.user_id, userEmail: r.user_email, amount: Number(r.amount || 0), type: r.method || "UPI", utr: r.utr || "", status: r.status || "PENDING", balanceApplied: !!r.balance_applied, firstDepositReferralChecked: !!r.first_deposit_referral_checked, adminNote: r.admin_note || "", createdAt: r.created_at }; }
  function camelWithdrawal(r) { return { id: r.id, userId: r.user_id, userEmail: r.user_email, amount: Number(r.amount || 0), methodId: r.payment_method_id || "", status: r.status || "PENDING", holdApplied: !!r.hold_applied, adminNote: r.admin_note || "", createdAt: r.created_at }; }
  function camelMethod(r) { return { id: r.id, userId: r.user_id, userEmail: r.user_email, type: r.type || "BANK", holderName: r.holder_name || "", upiId: r.upi_id || "", bankName: r.bank_name || "", accountNumber: r.account_number || "", ifsc: r.ifsc || "", status: r.status || "PENDING", rejectReason: r.rejection_reason || "", createdAt: r.created_at }; }
  function camelKyc(r) { return { id: r.id, userId: r.user_id, userEmail: r.user_email, fullName: r.full_name || "", mobile: r.mobile || "", idNumber: r.id_number || "", address: r.address || "", status: r.status || "PENDING", reviewedAt: r.reviewed_at || "", createdAt: r.created_at }; }
  function camelNotification(r) { return { id: r.id, audience: r.audience || "USER", userId: r.user_id || "", title: r.title || "", message: r.message || "", type: r.type || "INFO", linkPage: r.link_page || "", referenceId: r.reference_id || "", read: !!r.read, createdAt: r.created_at }; }
  function camelAdminAction(r) { return { id: String(r.id), adminUserId: r.admin_user_id || "admin", action: r.action || "ADMIN_ACTION", targetType: r.target_type || "SYSTEM", targetId: r.target_id || "", meta: r.meta || {}, createdAt: r.created_at || "" }; }

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
    const [users, methods, kyc, deposits, withdrawals, ledger, trades, batches, adminLogs, notifications] = await Promise.all([
      fetchTable("users"),
      fetchTable("payment_methods"),
      fetchTable("kyc_requests"),
      fetchTable("deposit_requests"),
      fetchTable("withdrawal_requests"),
      fetchTable("wallet_ledger"),
      fetchTable("trade_orders"),
      fetchTable("ai_trade_batches"),
      fetchTable("admin_action_logs"),
      fetchTable("notifications")
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
    App.saveState();
    dbStatus(`Core tables loaded from Supabase: ${users.length + deposits.length + withdrawals.length + ledger.length + trades.length + batches.length} row(s).`, true);
    return { users: users.length, methods: methods.length, kyc: kyc.length, deposits: deposits.length, withdrawals: withdrawals.length, walletLedger: ledger.length, trades: trades.length, aiBatches: batches.length, adminActionLogs: adminLogs.length, notifications: notifications.length };
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
      catch (err) { dbStatus(err?.message || "Database sync failed.", false); }
      finally { syncing = false; }
    }, 1200);
  }

  if (App && !App.__dbSyncWrapped) {
    const originalSaveState = App.saveState;
    App.saveState = function () {
      const result = originalSaveState.apply(App, arguments);
      scheduleCoreSync();
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
    lastSyncStatus,
    uploadUserFile,
    signedUrl
  };
})();
