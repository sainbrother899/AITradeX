(() => {
  const App = window.AITradeX;
  const Auth = window.AITradeXAuth;
  const root = document.getElementById("adminApp");

  let page = localStorage.getItem("AITradeX_ADMIN_PAGE") || "dashboard";
  let kycSearch = localStorage.getItem("AITradeX_ADMIN_KYC_SEARCH") || "";
  let kycFilter = localStorage.getItem("AITradeX_ADMIN_KYC_FILTER") || "ALL";
  let paymentSearch = localStorage.getItem("AITradeX_ADMIN_PAYMENT_SEARCH") || "";
  let paymentStatusFilter = localStorage.getItem("AITradeX_ADMIN_PAYMENT_STATUS") || "ALL";
  let paymentTypeFilter = localStorage.getItem("AITradeX_ADMIN_PAYMENT_TYPE_FILTER") || "ALL";
  let walletSearch = localStorage.getItem("AITradeX_ADMIN_WALLET_SEARCH") || "";
  let walletStatusFilter = localStorage.getItem("AITradeX_ADMIN_WALLET_STATUS") || "ALL";
  let walletTypeFilter = localStorage.getItem("AITradeX_ADMIN_WALLET_TYPE") || "ALL";

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
    const local = readJson(userKey(user.id, "KYC"), null);
    if (local) return local;

    const stateRow = (App.state.kycRequests || []).find(x => x.userId === user.id);
    if (stateRow) {
      return {
        status: stateRow.status || "NOT_SUBMITTED",
        personal: stateRow.personal || {
          fullName: displayNameFor(user),
          mobile: user.mobile || "",
          email: user.email || "",
          dob: ""
        },
        id: stateRow.idDetails || stateRow.id || {
          type: "PAN Card",
          number: ""
        },
        uploads: stateRow.uploads || {
          frontName: "",
          backName: "",
          selfieName: ""
        },
        submittedAt: stateRow.submittedAt || "",
        approvedAt: stateRow.approvedAt || "",
        rejectedAt: stateRow.rejectedAt || "",
        rejectReason: stateRow.rejectReason || ""
      };
    }

    return {
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
      approvedAt: "",
      rejectedAt: "",
      rejectReason: ""
    };
  }

  function saveKyc(user, kyc) {
    writeJson(userKey(user.id, "KYC"), kyc);

    const existing = (App.state.kycRequests || []).find(x => x.userId === user.id);
    const row = {
      id: existing?.id || App.uid("kyc"),
      userId: user.id,
      status: kyc.status,
      personal: kyc.personal,
      idDetails: kyc.id,
      uploads: kyc.uploads,
      submittedAt: kyc.submittedAt || "",
      approvedAt: kyc.approvedAt || "",
      rejectedAt: kyc.rejectedAt || "",
      rejectReason: kyc.rejectReason || "",
      updatedAt: App.now()
    };

    if (existing) Object.assign(existing, row);
    else App.state.kycRequests.push(row);

    App.saveState();
  }

  function paymentMethodsFor(user) {
    const local = readJson(userKey(user.id, "PAYMENT_METHODS"), []);
    if (local.length) return local;

    return (App.state.paymentMethods || [])
      .filter(m => m.userId === user.id)
      .map(m => ({ ...m }));
  }

  function savePaymentMethods(user, methods) {
    writeJson(userKey(user.id, "PAYMENT_METHODS"), methods);

    App.state.paymentMethods = (App.state.paymentMethods || []).filter(m => m.userId !== user.id);
    methods.forEach(m => {
      App.state.paymentMethods.push({
        ...m,
        userId: user.id,
        source: "ADMIN_PAYMENT_METHOD"
      });
    });

    App.saveState();
  }


  function depositRequestsFor(user) {
    const local = readJson(userKey(user.id, "DEPOSIT_REQUESTS"), []);
    if (local.length) return local;
    return (App.state.depositRequests || [])
      .filter(r => r.userId === user.id)
      .map(r => ({ ...r }));
  }

  function saveDepositRequests(user, requests) {
    writeJson(userKey(user.id, "DEPOSIT_REQUESTS"), requests);
    App.state.depositRequests = (App.state.depositRequests || []).filter(r => r.userId !== user.id);
    requests.forEach(r => App.state.depositRequests.push({ ...r, userId: user.id, userEmail: user.email }));
    App.saveState();
  }

  function withdrawalRequestsFor(user) {
    const local = readJson(userKey(user.id, "WITHDRAWAL_REQUESTS"), []);
    if (local.length) return local;
    return (App.state.withdrawalRequests || [])
      .filter(r => r.userId === user.id)
      .map(r => ({ ...r }));
  }

  function saveWithdrawalRequests(user, requests) {
    writeJson(userKey(user.id, "WITHDRAWAL_REQUESTS"), requests);
    App.state.withdrawalRequests = (App.state.withdrawalRequests || []).filter(r => r.userId !== user.id);
    requests.forEach(r => App.state.withdrawalRequests.push({ ...r, userId: user.id, userEmail: user.email }));
    App.saveState();
  }

  function allWalletRequests() {
    const deposits = allUsers().flatMap(user => depositRequestsFor(user).map(request => ({ user, request, type: "DEPOSIT" })));
    const withdrawals = allUsers().flatMap(user => withdrawalRequestsFor(user).map(request => ({ user, request, type: "WITHDRAWAL" })));
    return [...deposits, ...withdrawals].sort((a, b) => Date.parse(b.request.createdAt || 0) - Date.parse(a.request.createdAt || 0));
  }

  function walletStats() {
    const items = allWalletRequests();
    return {
      total: items.length,
      pending: items.filter(x => x.request.status === "PENDING").length,
      approved: items.filter(x => x.request.status === "APPROVED").length,
      rejected: items.filter(x => x.request.status === "REJECTED").length
    };
  }

  function statusPill(status) {
    const clean = String(status || "NOT_SUBMITTED").replaceAll("_", " ");
    const cls = String(status || "").toLowerCase().replaceAll("_", "-");
    return `<span class="status-pill ${cls}">${clean}</span>`;
  }

  function avatar(name) {
    return `<span class="admin-avatar">${String(name || "A").trim().charAt(0).toUpperCase()}</span>`;
  }

  function esc(value) {
    return App.escapeHtml(value || "");
  }

  function includesText(value, query) {
    return String(value || "").toLowerCase().includes(String(query || "").toLowerCase());
  }

  function dateLine(label, value) {
    if (!value) return "";
    return `<div class="admin-date-line"><span>${label}</span><b>${new Date(value).toLocaleString()}</b></div>`;
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
            <div class="admin-profile-chip">${avatar(admin?.name || "A")}<b>${esc(admin?.name || "Admin")}</b></div>
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
            <label>Email<input id="adminEmail" type="email" required placeholder="control@aitradex.com"/></label>
            <label>Password<input id="adminPassword" type="password" required placeholder="admin123"/></label>
            <button class="btn">Login</button>
          </form>
        </section>
      </main>`;
  }

  function dashboardPage() {
    const users = allUsers();
    const kycRequests = users.map(u => ({ user: u, kyc: kycFor(u) })).filter(x => x.kyc.status === "PENDING");
    const paymentPending = users.flatMap(u => paymentMethodsFor(u).map(m => ({ user: u, method: m }))).filter(x => x.method.status === "PENDING");
    const pendingWallet = allWalletRequests().filter(x => x.request.status === "PENDING").length;

    shell(`
      <section class="metrics-grid">
        ${metric("👥", "Total Users", users.length)}
        ${metric("🛡️", "Pending KYC", kycRequests.length)}
        ${metric("💳", "Pending Methods", paymentPending.length)}
        ${metric("🏦", "Wallet Requests", pendingWallet)}
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
        <div><b>${esc(title || displayNameFor(user))}</b><span>${esc(user.email)} · ${type}</span></div>
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
              <b>${esc(displayNameFor(u))}</b>
              <b>${esc(u.email)}</b>
              <b>${esc(u.mobile || "-")}</b>
              <b>${statusPill(kyc.status)}</b>
              <b>${App.money(App.realBalance(u.id))}</b>
              <b>${App.money(App.demoBalance(u.id))}</b>`;
          }).join("") || `<div class="empty-state">No users yet.</div>`}
        </div>
      </section>
    `);
  }

  function filterBarKyc() {
    return `
      <section class="admin-filter-bar">
        <input value="${esc(kycSearch)}" oninput="AITradeXAdmin.setKycSearch(this.value)" placeholder="Search name, email, mobile, document no."/>
        <div class="filter-chips">
          ${["ALL", "PENDING", "APPROVED", "REJECTED"].map(s => `<button class="${kycFilter === s ? "active" : ""}" onclick="AITradeXAdmin.setKycFilter('${s}')">${s}</button>`).join("")}
        </div>
      </section>`;
  }

  function kycPage() {
    const query = kycSearch.trim().toLowerCase();
    const items = allUsers()
      .map(user => ({ user, kyc: kycFor(user) }))
      .filter(x => x.kyc.status !== "NOT_SUBMITTED")
      .filter(x => kycFilter === "ALL" || x.kyc.status === kycFilter)
      .filter(({ user, kyc }) => {
        if (!query) return true;
        return [
          displayNameFor(user),
          user.email,
          user.mobile,
          kyc.personal.fullName,
          kyc.personal.mobile,
          kyc.id.number,
          kyc.id.type
        ].some(v => includesText(v, query));
      });

    shell(`
      ${filterBarKyc()}
      <section class="panel-card">
        <div class="section-head">
          <div><h3>KYC Requests</h3><span>Approve or reject user identity verification</span></div>
          <span class="admin-count-pill">${items.length} result</span>
        </div>
        <div class="admin-request-list">
          ${items.length ? items.map(({ user, kyc }) => kycRequestCard(user, kyc)).join("") : `<div class="empty-state">No KYC requests found.</div>`}
        </div>
      </section>
    `);
  }

  function kycRequestCard(user, kyc) {
    const isPending = kyc.status === "PENDING";
    return `
      <article class="admin-request-card">
        <div class="request-head">
          <div class="request-user">
            ${avatar(kyc.personal.fullName || displayNameFor(user))}
            <div>
              <b>${esc(kyc.personal.fullName || displayNameFor(user))}</b>
              <span>${esc(user.email)} · ${esc(kyc.personal.mobile || user.mobile || "-")}</span>
            </div>
          </div>
          ${statusPill(kyc.status)}
        </div>

        <div class="request-grid">
          <article><span>DOB</span><b>${esc(kyc.personal.dob || "-")}</b></article>
          <article><span>Document</span><b>${esc(kyc.id.type || "-")}</b></article>
          <article><span>Document No.</span><b>${esc(kyc.id.number || "-")}</b></article>
          <article><span>Submitted</span><b>${kyc.submittedAt ? new Date(kyc.submittedAt).toLocaleString() : "-"}</b></article>
          <article><span>ID Front</span><b>${esc(kyc.uploads.frontName || "-")}</b></article>
          <article><span>ID Back</span><b>${esc(kyc.uploads.backName || "-")}</b></article>
          <article><span>Selfie</span><b>${esc(kyc.uploads.selfieName || "-")}</b></article>
        </div>

        ${dateLine("Approved", kyc.approvedAt)}
        ${dateLine("Rejected", kyc.rejectedAt)}
        ${kyc.rejectReason ? `<div class="reject-box">${esc(kyc.rejectReason)}</div>` : ""}

        ${isPending ? `
          <div class="admin-action-row">
            <button class="approve-btn" onclick="AITradeXAdmin.approveKyc('${user.id}', this)">Approve KYC</button>
            <button class="reject-btn" onclick="AITradeXAdmin.rejectKyc('${user.id}', this)">Reject</button>
          </div>
        ` : `<div class="action-locked">Action completed. Status cannot be changed again from this card.</div>`}
      </article>`;
  }

  function filterBarPayments() {
    return `
      <section class="admin-filter-bar payment-filter-bar">
        <input value="${esc(paymentSearch)}" oninput="AITradeXAdmin.setPaymentSearch(this.value)" placeholder="Search name, email, UPI, bank, account last 4"/>
        <div class="filter-chips">
          ${["ALL", "PENDING", "APPROVED", "REJECTED"].map(s => `<button class="${paymentStatusFilter === s ? "active" : ""}" onclick="AITradeXAdmin.setPaymentStatusFilter('${s}')">${s}</button>`).join("")}
        </div>
        <div class="filter-chips">
          ${["ALL", "UPI", "BANK"].map(s => `<button class="${paymentTypeFilter === s ? "active" : ""}" onclick="AITradeXAdmin.setPaymentTypeFilter('${s}')">${s}</button>`).join("")}
        </div>
      </section>`;
  }

  function paymentsPage() {
    const query = paymentSearch.trim().toLowerCase();
    const items = allUsers()
      .flatMap(user => {
        const kyc = kycFor(user);
        return paymentMethodsFor(user).map(method => ({ user, kyc, method }));
      })
      .filter(x => paymentStatusFilter === "ALL" || x.method.status === paymentStatusFilter)
      .filter(x => paymentTypeFilter === "ALL" || x.method.type === paymentTypeFilter)
      .filter(({ user, kyc, method }) => {
        if (!query) return true;
        return [
          displayNameFor(user),
          user.email,
          user.mobile,
          kyc.personal.fullName,
          method.holderName,
          method.upiId,
          method.bankName,
          method.accountNumber,
          String(method.accountNumber || "").slice(-4),
          method.ifsc
        ].some(v => includesText(v, query));
      });

    shell(`
      ${filterBarPayments()}
      <section class="panel-card">
        <div class="section-head">
          <div><h3>Payment Method Requests</h3><span>Approve UPI and bank accounts after matching KYC name</span></div>
          <span class="admin-count-pill">${items.length} result</span>
        </div>
        <div class="admin-request-list">
          ${items.length ? items.map(({ user, kyc, method }) => paymentRequestCard(user, kyc, method)).join("") : `<div class="empty-state">No payment methods found.</div>`}
        </div>
      </section>
    `);
  }

  function paymentRequestCard(user, kyc, method) {
    const kycName = kyc?.personal?.fullName || displayNameFor(user);
    const holderMatch = String(method.holderName || "").trim().toLowerCase() === String(kycName || "").trim().toLowerCase();
    const isPending = method.status === "PENDING";

    return `
      <article class="admin-request-card">
        <div class="request-head">
          <div class="request-user">
            ${avatar(method.holderName || displayNameFor(user))}
            <div>
              <b>${method.type === "UPI" ? "UPI Method" : "Bank Account"}</b>
              <span>${esc(user.email)} · ${method.type}</span>
            </div>
          </div>
          ${statusPill(method.status)}
        </div>

        <div class="request-grid">
          <article><span>KYC Name</span><b>${esc(kycName)}</b></article>
          <article><span>Holder Name</span><b>${esc(method.holderName || "-")}</b></article>
          <article><span>Name Match</span><b class="${holderMatch ? "profit-text" : "loss-text"}">${holderMatch ? "Matched" : "Mismatch"}</b></article>
          ${method.type === "UPI" ? `
            <article><span>UPI ID</span><b>${esc(method.upiId || "-")}</b></article>
          ` : `
            <article><span>Bank</span><b>${esc(method.bankName || "-")}</b></article>
            <article><span>Account</span><b>****${String(method.accountNumber || "").slice(-4)}</b></article>
            <article><span>IFSC</span><b>${esc(method.ifsc || "-")}</b></article>
            <article><span>Type</span><b>${esc(method.accountType || "-")}</b></article>
          `}
        </div>

        ${dateLine("Approved", method.approvedAt)}
        ${dateLine("Rejected", method.rejectedAt)}
        ${method.deletedAt ? dateLine("Deleted", method.deletedAt) : ""}
        ${method.rejectReason ? `<div class="reject-box">${esc(method.rejectReason)}</div>` : ""}

        <div class="admin-action-row ${isPending ? "" : "single-delete"}">
          ${isPending ? `
            <button class="approve-btn" onclick="AITradeXAdmin.approvePaymentMethod('${user.id}', '${method.id}', this)">Approve Method</button>
            <button class="reject-btn" onclick="AITradeXAdmin.rejectPaymentMethod('${user.id}', '${method.id}', this)">Reject</button>
          ` : ""}
          <button class="delete-btn" onclick="AITradeXAdmin.deletePaymentMethod('${user.id}', '${method.id}', this)">Delete Method</button>
        </div>
      </article>`;
  }

  function filterBarWallet() {
    return `
      <section class="admin-filter-card">
        <input value="${esc(walletSearch)}" oninput="AITradeXAdmin.setWalletSearch(this.value)" placeholder="Search user, email, UTR, method..."/>
        <select onchange="AITradeXAdmin.setWalletStatusFilter(this.value)">
          <option value="ALL" ${walletStatusFilter === "ALL" ? "selected" : ""}>All Status</option>
          <option value="PENDING" ${walletStatusFilter === "PENDING" ? "selected" : ""}>Pending</option>
          <option value="APPROVED" ${walletStatusFilter === "APPROVED" ? "selected" : ""}>Approved</option>
          <option value="REJECTED" ${walletStatusFilter === "REJECTED" ? "selected" : ""}>Rejected</option>
        </select>
        <select onchange="AITradeXAdmin.setWalletTypeFilter(this.value)">
          <option value="ALL" ${walletTypeFilter === "ALL" ? "selected" : ""}>All Types</option>
          <option value="DEPOSIT" ${walletTypeFilter === "DEPOSIT" ? "selected" : ""}>Deposit</option>
          <option value="WITHDRAWAL" ${walletTypeFilter === "WITHDRAWAL" ? "selected" : ""}>Withdrawal</option>
        </select>
      </section>`;
  }

  function walletPage() {
    const stats = walletStats();
    const query = walletSearch.trim().toLowerCase();
    const items = allWalletRequests()
      .filter(x => walletStatusFilter === "ALL" || x.request.status === walletStatusFilter)
      .filter(x => walletTypeFilter === "ALL" || x.type === walletTypeFilter)
      .filter(({ user, request, type }) => {
        if (!query) return true;
        const haystack = [
          displayNameFor(user),
          user.email,
          user.mobile,
          type,
          request.status,
          request.utr,
          request.type,
          request.amount,
          request.methodSnapshot?.upiId,
          request.methodSnapshot?.bankName,
          request.methodSnapshot?.accountNumber,
          request.methodSnapshot?.holderName
        ];
        return haystack.some(v => includesText(v, query));
      });

    shell(`
      <section class="metrics-grid wallet-admin-metrics">
        ${metric("⌛", "Pending", stats.pending)}
        ${metric("✅", "Approved", stats.approved)}
        ${metric("❌", "Rejected", stats.rejected)}
        ${metric("🏦", "Total Requests", stats.total)}
      </section>
      ${filterBarWallet()}
      <section class="panel-card">
        <div class="section-head">
          <div><h3>Wallet Requests</h3><span>Approve or reject deposit and withdrawal requests</span></div>
          <span class="admin-count-pill">${items.length} result</span>
        </div>
        <div class="admin-request-list">
          ${items.length ? items.map(({ user, request, type }) => walletRequestCard(user, request, type)).join("") : `<div class="empty-state">No wallet requests found.</div>`}
        </div>
      </section>
    `);
  }

  function walletRequestCard(user, request, type) {
    const isDeposit = type === "DEPOSIT";
    const isPending = request.status === "PENDING";
    const methodTitle = isDeposit ? `${request.type || "UPI"} Payment` : `${request.methodSnapshot?.type || "Method"} Withdrawal`;
    const methodText = isDeposit
      ? `UTR ${request.utr || "-"}`
      : `${request.methodSnapshot?.type === "UPI" ? request.methodSnapshot?.upiId : `${request.methodSnapshot?.bankName || "Bank"} ****${String(request.methodSnapshot?.accountNumber || "").slice(-4)}`} · ${request.methodSnapshot?.holderName || "-"}`;

    return `
      <article class="admin-request-card wallet-admin-card ${String(request.status || "").toLowerCase()}">
        <div class="request-head">
          <div class="request-user">
            ${avatar(displayNameFor(user))}
            <div>
              <b>${type === "DEPOSIT" ? "Deposit Request" : "Withdrawal Request"}</b>
              <span>${esc(user.email)} · ${esc(methodTitle)}</span>
            </div>
          </div>
          ${statusPill(request.status)}
        </div>

        <div class="request-grid wallet-request-grid">
          <article><span>User</span><b>${esc(displayNameFor(user))}</b></article>
          <article><span>Amount</span><b>${App.money(request.amount || 0)}</b></article>
          <article><span>Current Real Balance</span><b>${App.money(App.realBalance(user.id))}</b></article>
          <article><span>${isDeposit ? "Payment Proof" : "Pay To"}</span><b>${esc(methodText)}</b></article>
          <article><span>Requested On</span><b>${request.createdAt ? new Date(request.createdAt).toLocaleString() : "-"}</b></article>
          <article><span>Request ID</span><b>${esc(request.id)}</b></article>
        </div>

        ${dateLine("Approved", request.approvedAt)}
        ${dateLine("Rejected", request.rejectedAt)}
        ${request.rejectReason ? `<div class="reject-box">${esc(request.rejectReason)}</div>` : ""}

        <div class="admin-action-row ${isPending ? "" : "single-delete"}">
          ${isPending ? `
            <button class="approve-btn" onclick="AITradeXAdmin.${isDeposit ? "approveDeposit" : "approveWithdrawal"}('${user.id}', '${request.id}', this)">${isDeposit ? "Approve Deposit" : "Approve Withdrawal"}</button>
            <button class="reject-btn" onclick="AITradeXAdmin.${isDeposit ? "rejectDeposit" : "rejectWithdrawal"}('${user.id}', '${request.id}', this)">Reject</button>
          ` : ""}
        </div>
      </article>`;
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

  function markButton(button, text) {
    if (!button) return;
    button.disabled = true;
    button.dataset.oldText = button.textContent;
    button.textContent = text;
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
        const login = Auth.loginAdmin || Auth.loginControl;
        login({
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
    setKycSearch(value) {
      kycSearch = value;
      localStorage.setItem("AITradeX_ADMIN_KYC_SEARCH", kycSearch);
      render();
    },
    setKycFilter(value) {
      kycFilter = value;
      localStorage.setItem("AITradeX_ADMIN_KYC_FILTER", kycFilter);
      render();
    },
    setPaymentSearch(value) {
      paymentSearch = value;
      localStorage.setItem("AITradeX_ADMIN_PAYMENT_SEARCH", paymentSearch);
      render();
    },
    setPaymentStatusFilter(value) {
      paymentStatusFilter = value;
      localStorage.setItem("AITradeX_ADMIN_PAYMENT_STATUS", paymentStatusFilter);
      render();
    },
    setPaymentTypeFilter(value) {
      paymentTypeFilter = value;
      localStorage.setItem("AITradeX_ADMIN_PAYMENT_TYPE_FILTER", paymentTypeFilter);
      render();
    },
    setWalletSearch(value) {
      walletSearch = value;
      localStorage.setItem("AITradeX_ADMIN_WALLET_SEARCH", walletSearch);
      render();
    },
    setWalletStatusFilter(value) {
      walletStatusFilter = value;
      localStorage.setItem("AITradeX_ADMIN_WALLET_STATUS", walletStatusFilter);
      render();
    },
    setWalletTypeFilter(value) {
      walletTypeFilter = value;
      localStorage.setItem("AITradeX_ADMIN_WALLET_TYPE", walletTypeFilter);
      render();
    },
    approveDeposit(userId, requestId, button) {
      markButton(button, "Approving...");
      const target = allUsers().find(u => u.id === userId);
      if (!target) return;
      const requests = depositRequestsFor(target);
      const request = requests.find(r => r.id === requestId);
      if (!request) return;
      if (request.status !== "PENDING") {
        App.toast("Deposit action already completed.");
        render();
        return;
      }

      try {
        App.addLedger({
          userId: target.id,
          accountType: "REAL",
          type: "DEPOSIT",
          amount: Number(request.amount || 0),
          referenceId: request.id,
          note: `Approved deposit · UTR ${request.utr || "-"}`
        });
        request.status = "APPROVED";
        request.approvedAt = new Date().toISOString();
        request.reviewedAt = request.approvedAt;
        request.rejectReason = "";
        request.balanceApplied = true;
        saveDepositRequests(target, requests);
        App.toast("Deposit approved and balance updated.");
      } catch (err) {
        App.toast(err.message || "Unable to approve deposit.");
      }
      render();
    },
    rejectDeposit(userId, requestId, button) {
      const target = allUsers().find(u => u.id === userId);
      if (!target) return;
      const requests = depositRequestsFor(target);
      const request = requests.find(r => r.id === requestId);
      if (!request) return;
      if (request.status !== "PENDING") {
        App.toast("Deposit action already completed.");
        render();
        return;
      }
      const reason = prompt("Reject reason:", "Payment proof / UTR could not be verified.");
      if (reason === null) return;
      markButton(button, "Rejecting...");
      request.status = "REJECTED";
      request.rejectReason = reason || "Deposit rejected by admin.";
      request.rejectedAt = new Date().toISOString();
      request.reviewedAt = request.rejectedAt;
      request.balanceApplied = false;
      saveDepositRequests(target, requests);
      App.toast("Deposit rejected.");
      render();
    },
    approveWithdrawal(userId, requestId, button) {
      markButton(button, "Approving...");
      const target = allUsers().find(u => u.id === userId);
      if (!target) return;
      const requests = withdrawalRequestsFor(target);
      const request = requests.find(r => r.id === requestId);
      if (!request) return;
      if (request.status !== "PENDING") {
        App.toast("Withdrawal action already completed.");
        render();
        return;
      }

      const amount = Number(request.amount || 0);
      if (App.realBalance(target.id) < amount) {
        App.toast("Insufficient real balance for withdrawal.");
        render();
        return;
      }

      try {
        App.addLedger({
          userId: target.id,
          accountType: "REAL",
          type: "WITHDRAWAL",
          amount: -amount,
          referenceId: request.id,
          note: "Approved withdrawal payout"
        });
        request.status = "APPROVED";
        request.approvedAt = new Date().toISOString();
        request.reviewedAt = request.approvedAt;
        request.rejectReason = "";
        request.balanceApplied = true;
        saveWithdrawalRequests(target, requests);
        App.toast("Withdrawal approved and balance debited.");
      } catch (err) {
        App.toast(err.message || "Unable to approve withdrawal.");
      }
      render();
    },
    rejectWithdrawal(userId, requestId, button) {
      const target = allUsers().find(u => u.id === userId);
      if (!target) return;
      const requests = withdrawalRequestsFor(target);
      const request = requests.find(r => r.id === requestId);
      if (!request) return;
      if (request.status !== "PENDING") {
        App.toast("Withdrawal action already completed.");
        render();
        return;
      }
      const reason = prompt("Reject reason:", "Withdrawal details could not be verified.");
      if (reason === null) return;
      markButton(button, "Rejecting...");
      request.status = "REJECTED";
      request.rejectReason = reason || "Withdrawal rejected by admin.";
      request.rejectedAt = new Date().toISOString();
      request.reviewedAt = request.rejectedAt;
      request.balanceApplied = false;
      saveWithdrawalRequests(target, requests);
      App.toast("Withdrawal rejected.");
      render();
    },
    approveKyc(userId, button) {
      markButton(button, "Approving...");
      const target = allUsers().find(u => u.id === userId);
      if (!target) return;
      const kyc = kycFor(target);
      if (kyc.status !== "PENDING") {
        App.toast("KYC action already completed.");
        render();
        return;
      }
      kyc.status = "APPROVED";
      kyc.rejectReason = "";
      kyc.approvedAt = new Date().toISOString();
      kyc.rejectedAt = "";
      saveKyc(target, kyc);
      App.toast("KYC approved successfully.");
      render();
    },
    rejectKyc(userId, button) {
      const target = allUsers().find(u => u.id === userId);
      if (!target) return;
      const kyc = kycFor(target);
      if (kyc.status !== "PENDING") {
        App.toast("KYC action already completed.");
        render();
        return;
      }
      const reason = prompt("Reject reason:", "Document details do not match.");
      if (reason === null) return;
      markButton(button, "Rejecting...");
      kyc.status = "REJECTED";
      kyc.rejectReason = reason || "Rejected by admin.";
      kyc.rejectedAt = new Date().toISOString();
      kyc.approvedAt = "";
      saveKyc(target, kyc);
      App.toast("KYC rejected successfully.");
      render();
    },
    approvePaymentMethod(userId, methodId, button) {
      markButton(button, "Approving...");
      const target = allUsers().find(u => u.id === userId);
      if (!target) return;
      const methods = paymentMethodsFor(target);
      const method = methods.find(m => m.id === methodId);
      if (!method) return;
      if (method.status !== "PENDING") {
        App.toast("Payment method action already completed.");
        render();
        return;
      }
      method.status = "APPROVED";
      method.rejectReason = "";
      method.approvedAt = new Date().toISOString();
      method.rejectedAt = "";
      savePaymentMethods(target, methods);
      App.toast("Payment method approved successfully.");
      render();
    },
    rejectPaymentMethod(userId, methodId, button) {
      const target = allUsers().find(u => u.id === userId);
      if (!target) return;
      const methods = paymentMethodsFor(target);
      const method = methods.find(m => m.id === methodId);
      if (!method) return;
      if (method.status !== "PENDING") {
        App.toast("Payment method action already completed.");
        render();
        return;
      }
      const reason = prompt("Reject reason:", "Holder name does not match KYC.");
      if (reason === null) return;
      markButton(button, "Rejecting...");
      method.status = "REJECTED";
      method.rejectReason = reason || "Rejected by admin.";
      method.rejectedAt = new Date().toISOString();
      method.approvedAt = "";
      savePaymentMethods(target, methods);
      App.toast("Payment method rejected successfully.");
      render();
    },
    deletePaymentMethod(userId, methodId, button) {
      const target = allUsers().find(u => u.id === userId);
      if (!target) return;
      const methods = paymentMethodsFor(target);
      const method = methods.find(m => m.id === methodId);
      if (!method) return;

      const label = method.type === "UPI" ? method.upiId : `${method.bankName} ****${String(method.accountNumber || "").slice(-4)}`;
      if (!confirm(`Delete this payment method?\n${label}`)) return;

      markButton(button, "Deleting...");
      const next = methods.filter(m => m.id !== methodId);
      savePaymentMethods(target, next);
      App.toast("Payment method deleted.");
      render();
    }
  };

  render();
})();