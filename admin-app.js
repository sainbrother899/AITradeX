(() => {
  const App = window.AITradeX;
  const Auth = window.AITradeXAuth;
  const root = document.getElementById("adminApp");

  let page = localStorage.getItem("AITradeX_ADMIN_PAGE") || "dashboard";

  function adminUser() {
    return App.currentUser();
  }

  function allUsers() {
    return App.state.users.filter(u => u.role === "user");
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || "") || fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function userKey(userId, name) {
    return `AITradeX_${name}_${userId}`;
  }

  function displayNameFor(user) {
    return localStorage.getItem(`AITradeX_DISPLAY_NAME_${user.id}`) || user.name || "User";
  }

  function kycFor(user) {
    return readJson(userKey(user.id, "KYC"), {
      status: "NOT_SUBMITTED",
      personal: {
        fullName: displayNameFor(user),
        mobile: user.mobile || "",
        email: user.email || "",
        dob: ""
      },
      id: {
        type: "PAN Card",
        number: ""
      },
      uploads: {
        frontName: "",
        backName: "",
        selfieName: ""
      },
      submittedAt: "",
      rejectReason: ""
    });
  }

  function saveKyc(user, kyc) {
    writeJson(userKey(user.id, "KYC"), kyc);
  }

  function paymentMethodsFor(user) {
    return readJson(userKey(user.id, "PAYMENT_METHODS"), []);
  }

  function savePaymentMethods(user, methods) {
    writeJson(userKey(user.id, "PAYMENT_METHODS"), methods);
  }

  function statusPill(status) {
    const clean = String(status || "NOT_SUBMITTED").replaceAll("_", " ");
    const cls = String(status || "").toLowerCase().replaceAll("_", "-");
    return `<span class="status-pill ${cls}">${clean}</span>`;
  }

  function avatar(name) {
    return `<span class="admin-avatar">${String(name || "A").trim().charAt(0).toUpperCase()}</span>`;
  }

  function shell(content) {
    const admin = adminUser();
    root.innerHTML = `
      <div class="app-shell control-shell">
        <aside class="sidebar">
          <div class="side-brand brand"><span>AI</span><b>AITradeX</b></div>
          <nav>
            ${navButton("dashboard", "📊", "Dashboard")}
            ${navButton("users", "👥", "Users")}
            ${navButton("kyc", "🛡️", "KYC Requests")}
            ${navButton("payments", "💳", "Payment Methods")}
            ${navButton("wallet", "🏦", "Wallet Requests")}
            ${navButton("trades", "📈", "Trade Control")}
            ${navButton("settings", "⚙️", "Settings")}
          </nav>
          <button class="logout-btn" onclick="AITradeXAdmin.logout()">🚪 Logout</button>
        </aside>
        <main class="main-area">
          <div class="page-title">
            <div>
              <p>Control Center</p>
              <h1>${pageTitle()}</h1>
            </div>
            <div class="admin-profile-chip">${avatar(admin?.name || "A")}<b>${App.escapeHtml(admin?.name || "Admin")}</b></div>
          </div>
          ${content}
        </main>
      </div>`;
  }

  function navButton(key, icon, label) {
    return `<button class="${page === key ? "active" : ""}" onclick="AITradeXAdmin.go('${key}')">${icon} ${label}</button>`;
  }

  function pageTitle() {
    const titles = {
      dashboard: "Dashboard",
      users: "User Management",
      kyc: "KYC Requests",
      payments: "Payment Method Requests",
      wallet: "Wallet Requests",
      trades: "Trade Control",
      settings: "Settings"
    };
    return titles[page] || "Dashboard";
  }

  function loginPage() {
    root.innerHTML = `
      <main class="control-login">
        <section class="control-card">
          <div class="brand center"><span>AI</span><b>AITradeX</b></div>
          <p class="eyebrow">Control Center</p>
          <h1>Admin Login</h1>
          <form onsubmit="AITradeXAdmin.login(event)" class="form-grid">
            <label>Email<input id="adminEmail" type="email" required placeholder="admin@aitradex.com"/></label>
            <label>Password<input id="adminPassword" type="password" required placeholder="Password"/></label>
            <button class="btn">Login</button>
          </form>
        </section>
      </main>`;
  }

  function dashboardPage() {
    const users = allUsers();
    const kycRequests = users.map(u => ({ user: u, kyc: kycFor(u) })).filter(x => x.kyc.status === "PENDING");
    const paymentPending = users.flatMap(u => paymentMethodsFor(u).map(m => ({ user: u, method: m }))).filter(x => x.method.status === "PENDING");

    shell(`
      <section class="metrics-grid">
        ${metric("👥", "Total Users", users.length)}
        ${metric("🛡️", "Pending KYC", kycRequests.length)}
        ${metric("💳", "Pending Methods", paymentPending.length)}
        ${metric("🏦", "Wallet Requests", "0")}
      </section>

      <section class="admin-grid-two">
        <div class="panel-card">
          <div class="section-head"><div><h3>Latest KYC Requests</h3><span>Pending verification</span></div><button onclick="AITradeXAdmin.go('kyc')" class="mini-action">View All</button></div>
          <div class="admin-list">
            ${kycRequests.length ? kycRequests.slice(0, 5).map(({ user, kyc }) => smallRequestRow(user, kyc.status, kyc.personal.fullName, "KYC")).join("") : `<div class="empty-state">No pending KYC requests.</div>`}
          </div>
        </div>

        <div class="panel-card">
          <div class="section-head"><div><h3>Payment Method Requests</h3><span>Pending approval</span></div><button onclick="AITradeXAdmin.go('payments')" class="mini-action">View All</button></div>
          <div class="admin-list">
            ${paymentPending.length ? paymentPending.slice(0, 5).map(({ user, method }) => smallRequestRow(user, method.status, method.type === "UPI" ? method.upiId : method.bankName, method.type)).join("") : `<div class="empty-state">No pending payment methods.</div>`}
          </div>
        </div>
      </section>
    `);
  }

  function metric(icon, label, value) {
    return `
      <article class="metric-card">
        <div class="metric-top"><span>${label}</span><i>${icon}</i></div>
        <strong>${value}</strong>
        <small>AITradeX control</small>
      </article>`;
  }

  function smallRequestRow(user, status, title, type) {
    return `
      <article class="admin-small-row">
        ${avatar(displayNameFor(user))}
        <div><b>${App.escapeHtml(title || displayNameFor(user))}</b><span>${App.escapeHtml(user.email)} · ${type}</span></div>
        ${statusPill(status)}
      </article>`;
  }

  function usersPage() {
    const users = allUsers();
    shell(`
      <section class="panel-card">
        <div class="section-head"><div><h3>Users</h3><span>All registered users</span></div></div>
        <div class="admin-table users-table">
          <span>Name</span><span>Email</span><span>Mobile</span><span>KYC</span><span>Real</span><span>Demo</span>
          ${users.map(u => {
            const kyc = kycFor(u);
            return `
              <b>${App.escapeHtml(displayNameFor(u))}</b>
              <b>${App.escapeHtml(u.email)}</b>
              <b>${App.escapeHtml(u.mobile || "-")}</b>
              <b>${statusPill(kyc.status)}</b>
              <b>${App.money(App.realBalance(u.id))}</b>
              <b>${App.money(App.demoBalance(u.id))}</b>`;
          }).join("") || `<div class="empty-state">No users yet.</div>`}
        </div>
      </section>
    `);
  }

  function kycPage() {
    const items = allUsers().map(user => ({ user, kyc: kycFor(user) })).filter(x => x.kyc.status !== "NOT_SUBMITTED");

    shell(`
      <section class="panel-card">
        <div class="section-head">
          <div><h3>KYC Requests</h3><span>Approve or reject user identity verification</span></div>
        </div>
        <div class="admin-request-list">
          ${items.length ? items.map(({ user, kyc }) => kycRequestCard(user, kyc)).join("") : `<div class="empty-state">No KYC submissions yet.</div>`}
        </div>
      </section>
    `);
  }

  function kycRequestCard(user, kyc) {
    return `
      <article class="admin-request-card">
        <div class="request-head">
          <div class="request-user">
            ${avatar(kyc.personal.fullName || displayNameFor(user))}
            <div>
              <b>${App.escapeHtml(kyc.personal.fullName || displayNameFor(user))}</b>
              <span>${App.escapeHtml(user.email)} · ${App.escapeHtml(kyc.personal.mobile || user.mobile || "-")}</span>
            </div>
          </div>
          ${statusPill(kyc.status)}
        </div>

        <div class="request-grid">
          <article><span>DOB</span><b>${App.escapeHtml(kyc.personal.dob || "-")}</b></article>
          <article><span>Document</span><b>${App.escapeHtml(kyc.id.type || "-")}</b></article>
          <article><span>Document No.</span><b>${App.escapeHtml(kyc.id.number || "-")}</b></article>
          <article><span>Submitted</span><b>${kyc.submittedAt ? new Date(kyc.submittedAt).toLocaleString() : "-"}</b></article>
          <article><span>ID Front</span><b>${App.escapeHtml(kyc.uploads.frontName || "-")}</b></article>
          <article><span>ID Back</span><b>${App.escapeHtml(kyc.uploads.backName || "-")}</b></article>
          <article><span>Selfie</span><b>${App.escapeHtml(kyc.uploads.selfieName || "-")}</b></article>
        </div>

        ${kyc.rejectReason ? `<div class="reject-box">${App.escapeHtml(kyc.rejectReason)}</div>` : ""}

        <div class="admin-action-row">
          <button class="approve-btn" onclick="AITradeXAdmin.approveKyc('${user.id}')">Approve KYC</button>
          <button class="reject-btn" onclick="AITradeXAdmin.rejectKyc('${user.id}')">Reject</button>
        </div>
      </article>`;
  }

  function paymentsPage() {
    const items = allUsers().flatMap(user => {
      const kyc = kycFor(user);
      return paymentMethodsFor(user).map(method => ({ user, kyc, method }));
    });

    shell(`
      <section class="panel-card">
        <div class="section-head">
          <div><h3>Payment Method Requests</h3><span>Approve UPI and bank accounts after matching KYC name</span></div>
        </div>
        <div class="admin-request-list">
          ${items.length ? items.map(({ user, kyc, method }) => paymentRequestCard(user, kyc, method)).join("") : `<div class="empty-state">No payment methods submitted yet.</div>`}
        </div>
      </section>
    `);
  }

  function paymentRequestCard(user, kyc, method) {
    const kycName = kyc?.personal?.fullName || displayNameFor(user);
    const holderMatch = String(method.holderName || "").trim().toLowerCase() === String(kycName || "").trim().toLowerCase();

    return `
      <article class="admin-request-card">
        <div class="request-head">
          <div class="request-user">
            ${avatar(method.holderName || displayNameFor(user))}
            <div>
              <b>${method.type === "UPI" ? "UPI Method" : "Bank Account"}</b>
              <span>${App.escapeHtml(user.email)} · ${method.type}</span>
            </div>
          </div>
          ${statusPill(method.status)}
        </div>

        <div class="request-grid">
          <article><span>KYC Name</span><b>${App.escapeHtml(kycName)}</b></article>
          <article><span>Holder Name</span><b>${App.escapeHtml(method.holderName || "-")}</b></article>
          <article><span>Name Match</span><b class="${holderMatch ? "profit-text" : "loss-text"}">${holderMatch ? "Matched" : "Mismatch"}</b></article>
          ${method.type === "UPI" ? `
            <article><span>UPI ID</span><b>${App.escapeHtml(method.upiId || "-")}</b></article>
          ` : `
            <article><span>Bank</span><b>${App.escapeHtml(method.bankName || "-")}</b></article>
            <article><span>Account</span><b>****${String(method.accountNumber || "").slice(-4)}</b></article>
            <article><span>IFSC</span><b>${App.escapeHtml(method.ifsc || "-")}</b></article>
            <article><span>Type</span><b>${App.escapeHtml(method.accountType || "-")}</b></article>
          `}
        </div>

        ${method.rejectReason ? `<div class="reject-box">${App.escapeHtml(method.rejectReason)}</div>` : ""}

        <div class="admin-action-row">
          <button class="approve-btn" onclick="AITradeXAdmin.approvePaymentMethod('${user.id}', '${method.id}')">Approve Method</button>
          <button class="reject-btn" onclick="AITradeXAdmin.rejectPaymentMethod('${user.id}', '${method.id}')">Reject</button>
        </div>
      </article>`;
  }

  function walletPage() {
    shell(`
      <section class="panel-card">
        <div class="section-head"><div><h3>Wallet Requests</h3><span>Deposit and withdrawal approvals will be built next.</span></div></div>
        <div class="empty-state">Next phase: deposit approval, withdrawal approval, ledger and pending balance.</div>
      </section>
    `);
  }

  function tradesPage() {
    shell(`
      <section class="panel-card">
        <div class="section-head"><div><h3>Trade Control</h3><span>Trade close and profit/loss settlement will be built after wallet flow.</span></div></div>
        <div class="empty-state">Next phase: open positions, close trade, add profit/loss, update history.</div>
      </section>
    `);
  }

  function settingsPage() {
    shell(`
      <section class="panel-card">
        <div class="section-head"><div><h3>Settings</h3><span>Platform settings will be connected later.</span></div></div>
        <div class="empty-state">Later: UPI QR, bank deposit details, subscription plans, leverage limits and signals.</div>
      </section>
    `);
  }

  function render() {
    const current = adminUser();
    if (!current || current.role !== "admin") return loginPage();

    if (page === "dashboard") return dashboardPage();
    if (page === "users") return usersPage();
    if (page === "kyc") return kycPage();
    if (page === "payments") return paymentsPage();
    if (page === "wallet") return walletPage();
    if (page === "trades") return tradesPage();
    if (page === "settings") return settingsPage();
    return dashboardPage();
  }

  window.AITradeXAdmin = {
    login(event) {
      event.preventDefault();
      try {
        Auth.loginAdmin({
          email: adminEmail.value,
          password: adminPassword.value
        });
        page = "dashboard";
        localStorage.setItem("AITradeX_ADMIN_PAGE", page);
        App.toast("Admin logged in.");
        render();
      } catch (err) {
        App.toast(err.message);
      }
    },
    logout() {
      App.clearSession();
      localStorage.removeItem("AITradeX_ADMIN_PAGE");
      page = "dashboard";
      loginPage();
    },
    go(next) {
      page = next;
      localStorage.setItem("AITradeX_ADMIN_PAGE", page);
      render();
    },
    approveKyc(userId) {
      const target = allUsers().find(u => u.id === userId);
      if (!target) return;
      const kyc = kycFor(target);
      kyc.status = "APPROVED";
      kyc.rejectReason = "";
      kyc.approvedAt = new Date().toISOString();
      saveKyc(target, kyc);
      App.toast("KYC approved.");
      render();
    },
    rejectKyc(userId) {
      const target = allUsers().find(u => u.id === userId);
      if (!target) return;
      const reason = prompt("Reject reason:", "Document details do not match.");
      if (reason === null) return;
      const kyc = kycFor(target);
      kyc.status = "REJECTED";
      kyc.rejectReason = reason || "Rejected by admin.";
      kyc.rejectedAt = new Date().toISOString();
      saveKyc(target, kyc);
      App.toast("KYC rejected.");
      render();
    },
    approvePaymentMethod(userId, methodId) {
      const target = allUsers().find(u => u.id === userId);
      if (!target) return;
      const methods = paymentMethodsFor(target);
      const method = methods.find(m => m.id === methodId);
      if (!method) return;
      method.status = "APPROVED";
      method.rejectReason = "";
      method.approvedAt = new Date().toISOString();
      savePaymentMethods(target, methods);
      App.toast("Payment method approved.");
      render();
    },
    rejectPaymentMethod(userId, methodId) {
      const target = allUsers().find(u => u.id === userId);
      if (!target) return;
      const reason = prompt("Reject reason:", "Holder name does not match KYC.");
      if (reason === null) return;
      const methods = paymentMethodsFor(target);
      const method = methods.find(m => m.id === methodId);
      if (!method) return;
      method.status = "REJECTED";
      method.rejectReason = reason || "Rejected by admin.";
      method.rejectedAt = new Date().toISOString();
      savePaymentMethods(target, methods);
      App.toast("Payment method rejected.");
      render();
    }
  };

  render();
})();