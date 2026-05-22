
(() => {
  const App = window.AITradeX;
  const C = window.AITRADEX_CONFIG || {};
  const SUPABASE_READY = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);
  const client = SUPABASE_READY ? (App?.db || window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY)) : null;
  const SNAPSHOT_TABLE = "app_state_snapshots";

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

  window.AITradeXDB = {
    ready: SUPABASE_READY,
    client,
    snapshotTable: SNAPSHOT_TABLE,
    countsFromState,
    testConnection,
    backupFullState,
    latestSnapshot,
    restoreLatestSnapshot,
    downloadLocalBackup,
    importLocalBackup
  };
})();
