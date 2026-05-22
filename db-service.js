
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
    storageBuckets: STORAGE_BUCKETS,
    countsFromState,
    testConnection,
    backupFullState,
    latestSnapshot,
    restoreLatestSnapshot,
    downloadLocalBackup,
    importLocalBackup,
    uploadUserFile,
    signedUrl
  };
})();
