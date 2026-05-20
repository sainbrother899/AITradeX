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
  let financeSearch = localStorage.getItem("AITradeX_ADMIN_FINANCE_SEARCH") || "";
  let financeStatusFilter = localStorage.getItem("AITradeX_ADMIN_FINANCE_STATUS") || "ALL";
  let usersSearch = localStorage.getItem("AITradeX_ADMIN_USERS_SEARCH") || "";
  let usersStatusFilter = localStorage.getItem("AITradeX_ADMIN_USERS_STATUS") || "ALL";

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

  function financeStats(type) {
    const items = allWalletRequests().filter(x => x.type === type);
    return {
      total: items.length,
      pending: items.filter(x => x.request.status === "PENDING").length,
      approved: items.filter(x => x.request.status === "APPROVED").length,
      rejected: items.filter(x => x.request.status === "REJECTED").length
    };
  }

  function pendingFinanceCount(type) {
    return allWalletRequests().filter(x => x.type === type && x.request.status === "PENDING").length;
  }

  function statusPill(status) {
    const clean = String(status || "NOT_SUBMITTED").replaceAll("_", " ");
    const cls = String(status || "").toLowerCase().replaceAll("_", "-");
    return `<span class="status-pill ${cls}">${clean}</span>`;
  }

  function userStatus(user) {
    return String(user.status || "ACTIVE").toUpperCase();
  }

  function userStatusText(status) {
    const value = String(status || "ACTIVE").toUpperCase();
    if (value === "BLOCKED") return "Login blocked";
    if (value === "SUSPENDED") return "Temporarily suspended";
    return "Allowed to login";
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
  function platformSettings() {
    const defaults = {
      minDeposit: 500,
      minWithdrawal: 1000,
      referralFirstDepositPercent: 10,
      demoBalance: 100000,
      platformName: "AITradeX",
      depositUpiId: "aitradex@upi",
      depositQrImage: "",
      depositBankName: "AITradeX Bank",
      depositAccountName: "AITradeX Private Wallet",
      depositAccountNumber: "123456789012",
      depositIfsc: "AITX0001234"
    };
    App.state.settings = { ...defaults, ...(App.state.settings || {}) };
    return App.state.settings;
  }

  function inputValue(id) {
    return (document.getElementById(id)?.value || "").trim();
  }


  function marketPairs() {
    return App.marketPairs || { CRYPTO: [], FOREX: [] };
  }

  function allTradePairs() {
    const pairs = marketPairs();
    return Object.keys(pairs).flatMap(market => (pairs[market] || []).map(item => ({ ...item, market })));
  }

  function pairDataByPair(pair) {
    const cleanPair = String(pair || "").trim().toUpperCase();
    return allTradePairs().find(item => String(item.pair || "").toUpperCase() === cleanPair) || allTradePairs()[0] || { market: "CRYPTO", pair: "BTC/USDT" };
  }

  function aiTradePairOptions(selected = "BTC/USDT") {
    const pairs = marketPairs();
    return Object.keys(pairs).map(market => `
      <optgroup label="${esc(market)}">
        ${(pairs[market] || []).map(item => `
          <option value="${esc(item.pair)}" ${String(item.pair).toUpperCase() === String(selected).toUpperCase() ? "selected" : ""}>${esc(item.pair)} · ${esc(item.inr || item.symbol || market)}</option>
        `).join("")}
      </optgroup>
    `).join("");
  }

  function aiPairPriceView(pair = "BTC/USDT") {
    const item = pairDataByPair(pair);
    const view = App.pairLiveView ? App.pairLiveView(item) : item;
    const metal = App.isMetalPair && App.isMetalPair(view.pair);
    return {
      pair: view.pair,
      price: view.price || "--",
      source: metal ? (view.priceSource || "TradingView Chart Feed") : (view.priceSource || "Not fetched"),
      change: view.change || "--",
      metal
    };
  }

  function setAiPriceView(row) {
    const priceEl = document.getElementById("aiEntryPriceValue");
    const sourceEl = document.getElementById("aiEntryPriceSource");
    const statusEl = document.getElementById("aiEntryPriceStatus");
    const manualWrap = document.getElementById("aiManualPriceWrap");
    const pair = inputValue("aiTradePair") || "BTC/USDT";
    const meta = aiPairPriceView(pair);
    const finalRow = row || meta;
    if (priceEl) priceEl.textContent = finalRow.display || finalRow.price || "--";
    if (sourceEl) sourceEl.textContent = finalRow.source || "Not fetched";
    if (statusEl) statusEl.textContent = row?.ok ? "Live locked" : (meta.metal ? "Chart feed ready" : "Ready");
    if (manualWrap) manualWrap.classList.toggle("show", !!meta.metal);
  }


  function dateLine(label, value) {
    if (!value) return "";
    return `<div class="admin-date-line"><span>${label}</span><b>${new Date(value).toLocaleString()}</b></div>`;
  }

  function jsArg(value) {
    return JSON.stringify(String(value ?? "")).replace(/</g, "\\u003c");
  }

  function detailCopyRow(label, value, copyValue = value) {
    const clean = value || "-";
    const hasValue = !!value && value !== "-";
    return `
      <article class="withdrawal-detail-row">
        <span>${esc(label)}</span>
        <b>${esc(clean)}</b>
        ${hasValue ? `<button type="button" onclick="AITradeXAdmin.copyText(${jsArg(copyValue)})">Copy</button>` : ""}
      </article>`;
  }

  function withdrawalPayoutDetails(request) {
    const method = request.methodSnapshot || {};
    const type = String(method.type || request.methodType || "").toUpperCase();
    if (type === "UPI") {
      return `
        <section class="withdrawal-detail-panel">
          <div class="withdrawal-detail-title"><span>UPI Payout Details</span><b>Verified Method</b></div>
          <div class="withdrawal-detail-grid">
            ${detailCopyRow("Holder Name", method.holderName)}
            ${detailCopyRow("UPI ID", method.upiId)}
            ${detailCopyRow("Method ID", request.methodId)}
          </div>
        </section>`;
    }

    return `
      <section class="withdrawal-detail-panel">
        <div class="withdrawal-detail-title"><span>Bank Payout Details</span><b>Verified Method</b></div>
        <div class="withdrawal-detail-grid">
          ${detailCopyRow("Account Holder", method.holderName)}
          ${detailCopyRow("Bank Name", method.bankName)}
          ${detailCopyRow("Account Number", method.accountNumber)}
          ${detailCopyRow("IFSC Code", method.ifsc)}
          ${detailCopyRow("Account Type", method.accountType || method.bankType)}
          ${detailCopyRow("Method ID", request.methodId)}
        </div>
      </section>`;
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
            ${navButton("deposits", "⬇️", "Deposits")}
            ${navButton("withdrawals", "⬆️", "Withdrawals")}
            ${navButton("trades", "🤖", "AI Trade Control")}
            ${navButton("settings", "⚙️", "Payment Settings")}
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
      deposits: "Deposits",
      withdrawals: "Withdrawals",
      trades: "AI Trade Control",
      settings: "Payment Settings"
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
    const pendingDeposits = pendingFinanceCount("DEPOSIT");
    const pendingWithdrawals = pendingFinanceCount("WITHDRAWAL");

    shell(`
      <section class="metrics-grid">
        ${metric("👥", "Total Users", users.length)}
        ${metric("🛡️", "Pending KYC", kycRequests.length)}
        ${metric("💳", "Pending Methods", paymentPending.length)}
        ${metric("⬇️", "Pending Deposits", pendingDeposits)}
        ${metric("⬆️", "Pending Withdrawals", pendingWithdrawals)}
        ${metric("🤖", "AI ON Users", allUsers().filter(u => u.aiTradeOn && userStatus(u) === "ACTIVE").length)}
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

  function userFilterBar() {
    return `
      <section class="admin-filter-bar users-filter-bar">
        <input value="${esc(usersSearch)}" oninput="AITradeXAdmin.setUsersSearch(this.value)" placeholder="Search name, email, mobile..."/>
        <div class="filter-chips">
          ${["ALL", "ACTIVE", "SUSPENDED", "BLOCKED"].map(s => `<button class="${usersStatusFilter === s ? "active" : ""}" onclick="AITradeXAdmin.setUsersStatusFilter('${s}')">${s}</button>`).join("")}
        </div>
      </section>`;
  }

  function usersPage() {
    const query = usersSearch.trim().toLowerCase();
    const users = allUsers()
      .filter(u => usersStatusFilter === "ALL" || userStatus(u) === usersStatusFilter)
      .filter(u => {
        if (!query) return true;
        return [displayNameFor(u), u.email, u.mobile, userStatus(u), u.referralCode].some(v => includesText(v, query));
      });

    shell(`
      ${userFilterBar()}
      <section class="panel-card">
        <div class="section-head">
          <div><h3>Users</h3><span>Manage user status, balances and verification summary</span></div>
          <span class="admin-count-pill">${users.length} result</span>
        </div>
        <div class="admin-user-card-list">
          ${users.map(u => userControlCard(u)).join("") || `<div class="empty-state">No users found.</div>`}
        </div>
      </section>
    `);
  }

  function userControlCard(user) {
    const kyc = kycFor(user);
    const status = userStatus(user);
    const deposits = depositRequestsFor(user);
    const withdrawals = withdrawalRequestsFor(user);
    const pendingDeposits = deposits.filter(r => r.status === "PENDING").length;
    const pendingWithdrawals = withdrawals.filter(r => r.status === "PENDING").length;
    return `
      <article class="admin-user-control-card status-${status.toLowerCase()}">
        <div class="user-control-head">
          <div class="request-user">
            ${avatar(displayNameFor(user))}
            <div>
              <b>${esc(displayNameFor(user))}</b>
              <span>${esc(user.email)} · ${esc(user.mobile || "No mobile")}</span>
            </div>
          </div>
          <div class="user-status-stack">
            ${statusPill(status)}
            <small>${userStatusText(status)}</small>
          </div>
        </div>

        <div class="user-control-grid">
          <article><span>KYC</span><b>${statusPill(kyc.status)}</b></article>
          <article><span>Real Balance</span><b>${App.money(App.realBalance(user.id))}</b></article>
          <article><span>Demo Balance</span><b>${App.money(App.demoBalance(user.id))}</b></article>
          <article><span>Pending Deposit</span><b>${pendingDeposits}</b></article>
          <article><span>Pending Withdrawal</span><b>${pendingWithdrawals}</b></article>
          <article><span>Joined</span><b>${esc(user.createdAt || "-")}</b></article>
        </div>

        <div class="admin-action-row user-status-actions">
          <button class="approve-btn" ${status === "ACTIVE" ? "disabled" : ""} onclick="AITradeXAdmin.setUserStatus('${user.id}', 'ACTIVE', this)">Make Active</button>
          <button class="suspend-btn" ${status === "SUSPENDED" ? "disabled" : ""} onclick="AITradeXAdmin.setUserStatus('${user.id}', 'SUSPENDED', this)">Suspend</button>
          <button class="reject-btn" ${status === "BLOCKED" ? "disabled" : ""} onclick="AITradeXAdmin.setUserStatus('${user.id}', 'BLOCKED', this)">Block</button>
        </div>
      </article>`;
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

  function filterBarFinance(sectionType) {
    const placeholder = sectionType === "DEPOSIT" ? "Search user, email, UTR, amount..." : "Search user, email, method, account...";
    return `
      <section class="admin-filter-card">
        <input value="${esc(financeSearch)}" oninput="AITradeXAdmin.setFinanceSearch(this.value)" placeholder="${placeholder}"/>
        <select onchange="AITradeXAdmin.setFinanceStatusFilter(this.value)">
          <option value="ALL" ${financeStatusFilter === "ALL" ? "selected" : ""}>All Status</option>
          <option value="PENDING" ${financeStatusFilter === "PENDING" ? "selected" : ""}>Pending</option>
          <option value="APPROVED" ${financeStatusFilter === "APPROVED" ? "selected" : ""}>Approved</option>
          <option value="REJECTED" ${financeStatusFilter === "REJECTED" ? "selected" : ""}>Rejected</option>
        </select>
      </section>`;
  }

  function financeRequestPage(sectionType) {
    const isDepositSection = sectionType === "DEPOSIT";
    const stats = financeStats(sectionType);
    const query = financeSearch.trim().toLowerCase();
    const items = allWalletRequests()
      .filter(x => x.type === sectionType)
      .filter(x => financeStatusFilter === "ALL" || x.request.status === financeStatusFilter)
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
        ${metric(isDepositSection ? "⬇️" : "⬆️", "Total", stats.total)}
      </section>
      ${filterBarFinance(sectionType)}
      <section class="panel-card">
        <div class="section-head">
          <div><h3>${isDepositSection ? "Deposit Requests" : "Withdrawal Requests"}</h3><span>${isDepositSection ? "Approve user deposits and credit real balance" : "Approve user withdrawals and debit real balance"}</span></div>
          <span class="admin-count-pill">${items.length} result</span>
        </div>
        <div class="admin-request-list">
          ${items.length ? items.map(({ user, request, type }) => walletRequestCard(user, request, type)).join("") : `<div class="empty-state">No ${isDepositSection ? "deposit" : "withdrawal"} requests found.</div>`}
        </div>
      </section>
    `);
  }

  function walletRequestCard(user, request, type) {
    const isDeposit = type === "DEPOSIT";
    const isPending = request.status === "PENDING";
    const method = request.methodSnapshot || {};
    const methodTitle = isDeposit ? `${request.type || "UPI"} Payment` : `${method.type || "Method"} Withdrawal`;
    const methodText = isDeposit
      ? `UTR ${request.utr || "-"}`
      : `${method.type === "UPI" ? method.upiId : `${method.bankName || "Bank"} · ${method.accountNumber || "-"}`} · ${method.holderName || "-"}`;

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
          <article><span>Email</span><b>${esc(user.email)}</b></article>
          <article><span>Mobile</span><b>${esc(user.mobile || "-")}</b></article>
          <article><span>Amount</span><b>${App.money(request.amount || 0)}</b></article>
          <article><span>Current Real Balance</span><b>${App.money(App.realBalance(user.id))}</b></article>
          <article><span>${isDeposit ? "Payment Proof" : "Pay To"}</span><b>${esc(methodText)}</b></article>
          <article><span>Requested On</span><b>${request.createdAt ? new Date(request.createdAt).toLocaleString() : "-"}</b></article>
          <article><span>Request ID</span><b>${esc(request.id)}</b></article>
        </div>

        ${isDeposit ? "" : withdrawalPayoutDetails(request)}

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

  function aiTradeBatches() {
    return (App.state.aiTradeBatches || []).sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
  }

  function aiEligibilityReport(minBalance = 0) {
    const report = {
      eligible: [],
      skipped: [],
      reasons: {
        inactive: 0,
        aiOff: 0,
        limit: 0,
        lowBalance: 0,
        noPool: 0
      }
    };

    allUsers().forEach(u => {
      const status = userStatus(u);
      const balance = App.realBalance(u.id);
      const used = App.aiTradesToday(u.id);
      const limit = App.aiDailyLimit(u.id);
      const allowedPool = App.aiAllowedAmount(u);

      if (status !== "ACTIVE") {
        report.skipped.push({ userId: u.id, reason: "Inactive / suspended / blocked" });
        report.reasons.inactive += 1;
        return;
      }
      if (!u.aiTradeOn) {
        report.skipped.push({ userId: u.id, reason: "AI Auto Trading OFF" });
        report.reasons.aiOff += 1;
        return;
      }
      if (used >= limit) {
        report.skipped.push({ userId: u.id, reason: "Daily AI trade limit completed" });
        report.reasons.limit += 1;
        return;
      }
      if (balance < minBalance) {
        report.skipped.push({ userId: u.id, reason: "Below minimum real balance" });
        report.reasons.lowBalance += 1;
        return;
      }
      if (allowedPool <= 0) {
        report.skipped.push({ userId: u.id, reason: "No AI trade pool available" });
        report.reasons.noPool += 1;
        return;
      }

      report.eligible.push(u);
    });

    return report;
  }

  function skipReasonLine(reasons = {}) {
    const rows = [
      ["AI OFF", reasons.aiOff],
      ["Limit done", reasons.limit],
      ["Low balance", reasons.lowBalance],
      ["Inactive", reasons.inactive],
      ["No pool", reasons.noPool]
    ].filter(([, value]) => Number(value || 0) > 0);
    return rows.length ? rows.map(([label, value]) => `${label}: ${value}`).join(" · ") : "No skipped users";
  }


  function aiPreviewStats(resultPercent = 2, leverage = 1, minBalance = 0, resultType = "PROFIT") {
    const percent = Math.max(0, Number(resultPercent || 0));
    const lev = Math.max(1, Number(leverage || 1));
    const report = aiEligibilityReport(Math.max(0, Number(minBalance || 0)));
    let totalMargin = 0;
    let totalExposure = 0;
    let totalPnl = 0;

    report.eligible.forEach(user => {
      const balance = App.realBalance(user.id);
      const margin = Math.min(balance, App.aiAllowedAmount(user));
      if (!margin || margin <= 0) return;
      const exposure = margin * lev;
      let pnl = exposure * percent / 100;
      if (String(resultType || "PROFIT").toUpperCase() === "LOSS") pnl = -Math.min(balance, pnl);
      if (balance + pnl < 0) pnl = -balance;
      totalMargin += margin;
      totalExposure += exposure;
      totalPnl += pnl;
    });

    const perOneThousand = (1000 * lev * percent / 100) * (String(resultType || "PROFIT").toUpperCase() === "LOSS" ? -1 : 1);
    const perTenThousand = (10000 * lev * percent / 100) * (String(resultType || "PROFIT").toUpperCase() === "LOSS" ? -1 : 1);

    return {
      report,
      totalMargin: Number(totalMargin.toFixed(2)),
      totalExposure: Number(totalExposure.toFixed(2)),
      totalPnl: Number(totalPnl.toFixed(2)),
      perOneThousand: Number(perOneThousand.toFixed(2)),
      perTenThousand: Number(perTenThousand.toFixed(2)),
      leverage: lev,
      percent
    };
  }

  function aiRecentTrades() {
    return (App.state.trades || [])
      .filter(t => t.tradeType === "AI_AUTO")
      .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0))
      .slice(0, 8);
  }

  function tradesPage() {
    const settings = App.state.settings || {};
    const initialStats = aiPreviewStats(2, 1, 0, "PROFIT");
    const previewReport = initialStats.report;
    const aiOnCount = allUsers().filter(u => u.aiTradeOn && userStatus(u) === "ACTIVE").length;
    const eligibleNow = previewReport.eligible.length;
    const batches = aiTradeBatches();
    const recentTrades = aiRecentTrades();
    const lastBatch = batches[0];

    shell(`
      <section class="metrics-grid">
        ${metric("🤖", "AI ON Users", aiOnCount)}
        ${metric("✅", "Valid Now", eligibleNow)}
        ${metric("⏭️", "Skipped Now", previewReport.skipped.length)}
        ${metric("🎁", "Free AI / Day", Number(settings.freeAiTradesPerDay || 5))}
      </section>

      <section class="panel-card ai-desk-panel">
        <div class="section-head ai-desk-head">
          <div><h3>AI Trading Desk</h3><span>Execute one AI auto trade for all valid AI users.</span></div>
          <span class="admin-count-pill">Auto eligibility</span>
        </div>

        <div class="admin-grid-two ai-desk-grid">
          <form class="payment-form-card ai-desk-form" onsubmit="AITradeXAdmin.executeAiTrade(event)">
            <p>EXPERT AUTO TRADE</p>
            <h2>New AI Auto Trade</h2>

            <div class="ai-step-card">
              <div class="ai-step-label"><b>1</b><span>Select pair</span></div>
              <label>Market Pair
                <select id="aiTradePair" required onchange="AITradeXAdmin.onAiPairChange()">
                  ${aiTradePairOptions("BTC/USDT")}
                </select>
                <small>Same full pair list as user trade page.</small>
              </label>
            </div>

            <div class="ai-step-card live-entry-card">
              <div class="ai-step-label"><b>2</b><span>Entry price</span></div>
              <div class="entry-price-box">
                <div><span>Selected Entry</span><b id="aiEntryPriceValue">${aiPairPriceView("BTC/USDT").price}</b><small id="aiEntryPriceSource">${aiPairPriceView("BTC/USDT").source}</small></div>
                <button type="button" onclick="AITradeXAdmin.fetchAiEntryPrice()">Fetch Price</button>
              </div>
              <div id="aiManualPriceWrap" class="manual-price-wrap">
                <label>Manual Fallback Price
                  <input id="aiManualEntryPrice" type="number" min="0" step="0.0001" placeholder="Optional fallback if chart feed is unavailable" oninput="AITradeXAdmin.updateAiPreview()"/>
                </label>
              </div>
              <small id="aiEntryPriceStatus">Ready</small>
            </div>

            <div class="ai-step-card">
              <div class="ai-step-label"><b>3</b><span>Choose side</span></div>
              <div class="ai-toggle-grid two">
                <label class="ai-radio-card buy"><input type="radio" name="aiTradeSide" value="BUY" checked onchange="AITradeXAdmin.updateAiPreview()"/><span>BUY</span><small>Long / upward trade</small></label>
                <label class="ai-radio-card sell"><input type="radio" name="aiTradeSide" value="SELL" onchange="AITradeXAdmin.updateAiPreview()"/><span>SELL</span><small>Short / downward trade</small></label>
              </div>
            </div>

            <div class="ai-step-card">
              <div class="ai-step-label"><b>4</b><span>Result & leverage</span></div>
              <div class="ai-toggle-grid two">
                <label class="ai-radio-card profit"><input type="radio" name="aiTradeResultType" value="PROFIT" checked onchange="AITradeXAdmin.updateAiPreview()"/><span>Profit</span><small>Add P/L to real wallet</small></label>
                <label class="ai-radio-card loss"><input type="radio" name="aiTradeResultType" value="LOSS" onchange="AITradeXAdmin.updateAiPreview()"/><span>Loss</span><small>Deduct P/L from real wallet</small></label>
              </div>
              <div class="ai-inline-fields">
                <label>Profit / Loss %
                  <input id="aiTradeResultPercent" type="number" min="0" step="0.01" value="2" required oninput="AITradeXAdmin.updateAiPreview()"/>
                </label>
                <label>Leverage
                  <select id="aiTradeLeverage" onchange="AITradeXAdmin.updateAiPreview()">
                    <option value="1">1x</option>
                    <option value="2">2x</option>
                    <option value="5">5x</option>
                    <option value="10">10x</option>
                  </select>
                </label>
              </div>
            </div>

            <div class="ai-step-card">
              <div class="ai-step-label"><b>5</b><span>Final check</span></div>
              <label>Minimum Real Balance
                <input id="aiTradeMinBalance" type="number" min="0" value="0" oninput="AITradeXAdmin.updateAiPreview()"/>
                <small>Users below this balance will be skipped. Keep 0 for all valid users.</small>
              </label>
              <label>Trade Note
                <input id="aiTradeNote" value="Expert AI auto trade executed" placeholder="Internal note"/>
              </label>
            </div>

            <button class="save-profile-btn ai-execute-btn">Execute AI Trade</button>
          </form>

          <section class="payment-form-card ai-control-preview ai-desk-summary">
            <p>RISK & P/L PREVIEW</p>
            <h2>Before Execute</h2>
            <div class="review-grid compact-review ai-preview-grid">
              <article><span>Valid users</span><b id="aiPreviewValid">${eligibleNow}</b></article>
              <article><span>Skipped users</span><b id="aiPreviewSkipped">${previewReport.skipped.length}</b></article>
              <article><span>Base AI amount</span><b id="aiPreviewMargin">${App.money(initialStats.totalMargin)}</b></article>
              <article><span>Leverage exposure</span><b id="aiPreviewExposure">${App.money(initialStats.totalExposure)}</b></article>
              <article><span>Per ₹1,000 impact</span><b id="aiPreviewOneK" class="${initialStats.perOneThousand >= 0 ? "profit-text" : "loss-text"}">${App.money(initialStats.perOneThousand)}</b></article>
              <article><span>Per ₹10,000 impact</span><b id="aiPreviewTenK" class="${initialStats.perTenThousand >= 0 ? "profit-text" : "loss-text"}">${App.money(initialStats.perTenThousand)}</b></article>
              <article><span>Total P/L estimate</span><b id="aiPreviewTotalPnl" class="${initialStats.totalPnl >= 0 ? "profit-text" : "loss-text"}">${App.money(initialStats.totalPnl)}</b></article>
              <article><span>Skip reasons</span><b id="aiPreviewReasons">${esc(skipReasonLine(previewReport.reasons))}</b></article>
            </div>
            <div class="premium-bank-card ai-last-card">
              ${lastBatch ? `<div class="copy-row"><b>Last execution</b><span>${lastBatch.appliedCount || 0} applied · ${lastBatch.skippedCount || 0} skipped · ${Number(lastBatch.leverage || 1)}x</span><button type="button">Done</button></div>` : `<div class="copy-row"><b>Last execution</b><span>No AI trade executed yet</span><button type="button">Ready</button></div>`}
            </div>
          </section>
        </div>
      </section>

      <section class="panel-card">
        <div class="section-head"><div><h3>AI Trade Execution Summary</h3><span>Completed AI auto trade batches</span></div></div>
        <div class="admin-list">
          ${batches.length ? batches.slice(0, 8).map(batch => `
            <article class="admin-user-card ai-batch-card">
              <div class="admin-user-main">
                <div><b>${esc(batch.pair)} · ${esc(batch.side)}</b><span>${esc(batch.market)} · ${esc(batch.resultType)} ${Number(batch.resultPercent || 0)}% · ${Number(batch.leverage || 1)}x · Entry ${esc(batch.entryPriceDisplay || batch.entryPrice || "-")} · ${esc(batch.priceSource || "-")}</span></div>
                <div class="admin-user-stats"><span>Applied</span><b>${batch.appliedCount || 0}</b></div>
                <div class="admin-user-stats"><span>Skipped</span><b>${batch.skippedCount || 0}</b></div>
                <div class="admin-user-stats"><span>Exposure</span><b>${App.money(batch.totalExposure || 0)}</b></div>
                <div class="admin-user-stats"><span>Total P/L</span><b class="${Number(batch.totalPnl || 0) >= 0 ? "profit-text" : "loss-text"}">${App.money(batch.totalPnl || 0)}</b></div>
              </div>
              <div class="ai-skip-line">${esc(skipReasonLine(batch.skipReasons || {}))}</div>
            </article>
          `).join("") : `<div class="empty-state">No AI trade batches executed yet.</div>`}
        </div>
      </section>

      <section class="panel-card">
        <div class="section-head"><div><h3>Latest AI Auto Trade Entries</h3><span>User-wise AI auto trades</span></div></div>
        <div class="admin-list">
          ${recentTrades.length ? recentTrades.map(t => {
            const target = allUsers().find(u => u.id === t.userId);
            return `
              <article class="admin-user-card">
                <div class="admin-user-main">
                  <div><b>${esc(t.pair)} · ${esc(t.side)}</b><span>${esc(displayNameFor(target || {}))} · Entry ${esc(t.entryPriceDisplay || t.entryPrice || "-")} · ${esc(t.priceSource || "-")}</span></div>
                  <div class="admin-user-stats"><span>AI Amount</span><b>${App.money(t.marginAmount || 0)}</b></div>
                  <div class="admin-user-stats"><span>Exposure</span><b>${App.money(t.positionSize || 0)}</b></div>
                  <div class="admin-user-stats"><span>P/L</span><b class="${Number(t.pnl || 0) >= 0 ? "profit-text" : "loss-text"}">${App.money(t.pnl || 0)}</b></div>
                  <div class="admin-user-stats"><span>Leverage</span><b>${Number(t.leverage || 1)}x</b></div>
                </div>
              </article>`;
          }).join("") : `<div class="empty-state">AI auto trade entries will appear here after execution.</div>`}
        </div>
      </section>
    `);
  }

  function settingsPage() {
    const settings = platformSettings();
    shell(`
      <section class="panel-card payment-settings-panel">
        <div class="section-head">
          <div><h3>Payment Settings</h3><span>Control the deposit UPI, QR, bank details and wallet limits shown to users.</span></div>
          <span class="admin-count-pill">Admin editable</span>
        </div>

        <div class="admin-grid-two payment-settings-grid">
          <form class="payment-form-card form-grid" onsubmit="AITradeXAdmin.savePaymentSettings(event)">
            <p>UPI / QR DETAILS</p>
            <h2>Deposit Payment Setup</h2>
            <label>UPI ID
              <input id="settingUpiId" value="${esc(settings.depositUpiId)}" placeholder="aitradex@upi" required/>
            </label>
            <label>QR Image
              <input id="settingQrImage" type="file" accept="image/*"/>
            </label>
            <div class="profile-note">Upload a new QR only when you want to replace the current QR. Saved QR is stored in this browser for now.</div>

            <p>BANK DETAILS</p>
            <label>Bank Name
              <input id="settingBankName" value="${esc(settings.depositBankName)}" placeholder="Bank name" required/>
            </label>
            <label>Account Holder Name
              <input id="settingAccountName" value="${esc(settings.depositAccountName)}" placeholder="Account holder name" required/>
            </label>
            <label>Account Number
              <input id="settingAccountNumber" value="${esc(settings.depositAccountNumber)}" placeholder="Account number" required/>
            </label>
            <label>IFSC Code
              <input id="settingIfsc" value="${esc(settings.depositIfsc)}" placeholder="IFSC code" required/>
            </label>

            <p>WALLET LIMITS</p>
            <label>Minimum Deposit
              <input id="settingMinDeposit" type="number" min="1" value="${Number(settings.minDeposit || 500)}" required/>
            </label>
            <label>Minimum Withdrawal
              <input id="settingMinWithdrawal" type="number" min="1" value="${Number(settings.minWithdrawal || 1000)}" required/>
            </label>
            <button class="save-profile-btn">Save Payment Settings</button>
          </form>

          <section class="payment-form-card payment-settings-preview">
            <p>USER SIDE PREVIEW</p>
            <h2>Deposit Details Preview</h2>
            <div class="upi-pay-card settings-upi-preview">
              <div class="qr-large-box">
                ${settings.depositQrImage ? `<img src="${esc(settings.depositQrImage)}" alt="Deposit QR"/>` : `<div class="qr-grid-mark">QR</div>`}
              </div>
              <div class="upi-pay-info">
                <p>PAY VIA UPI</p>
                <h2>${esc(settings.depositUpiId)}</h2>
                <span>This is what users will see on deposit step 3.</span>
              </div>
            </div>
            <div class="premium-bank-card">
              <div class="copy-row"><b>Bank Name</b><span>${esc(settings.depositBankName)}</span><button type="button">Copy</button></div>
              <div class="copy-row"><b>Account Name</b><span>${esc(settings.depositAccountName)}</span><button type="button">Copy</button></div>
              <div class="copy-row"><b>Account No.</b><span>${esc(settings.depositAccountNumber)}</span><button type="button">Copy</button></div>
              <div class="copy-row"><b>IFSC Code</b><span>${esc(settings.depositIfsc)}</span><button type="button">Copy</button></div>
            </div>
            <div class="review-grid compact-review">
              <article><span>Minimum Deposit</span><b>${App.money(settings.minDeposit)}</b></article>
              <article><span>Minimum Withdrawal</span><b>${App.money(settings.minWithdrawal)}</b></article>
            </div>
          </section>
        </div>
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
    if (page === "wallet") { page = "deposits"; localStorage.setItem("AITradeX_ADMIN_PAGE", page); }
    if (page === "deposits") return financeRequestPage("DEPOSIT");
    if (page === "withdrawals") return financeRequestPage("WITHDRAWAL");
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
    setFinanceSearch(value) {
      financeSearch = value;
      localStorage.setItem("AITradeX_ADMIN_FINANCE_SEARCH", financeSearch);
      render();
    },
    setFinanceStatusFilter(value) {
      financeStatusFilter = value;
      localStorage.setItem("AITradeX_ADMIN_FINANCE_STATUS", financeStatusFilter);
      render();
    },
    setUsersSearch(value) {
      usersSearch = value;
      localStorage.setItem("AITradeX_ADMIN_USERS_SEARCH", usersSearch);
      render();
    },
    setUsersStatusFilter(value) {
      usersStatusFilter = value;
      localStorage.setItem("AITradeX_ADMIN_USERS_STATUS", usersStatusFilter);
      render();
    },
    setUserStatus(userId, status, button) {
      const target = allUsers().find(u => u.id === userId);
      if (!target) return;
      const nextStatus = String(status || "ACTIVE").toUpperCase();
      if (!["ACTIVE", "SUSPENDED", "BLOCKED"].includes(nextStatus)) return;
      if (userStatus(target) === nextStatus) {
        App.toast(`User is already ${nextStatus.toLowerCase()}.`);
        return;
      }
      const actionText = nextStatus === "ACTIVE" ? "activate" : nextStatus === "SUSPENDED" ? "suspend" : "block";
      if (!confirm(`Are you sure you want to ${actionText} ${displayNameFor(target)}?`)) return;
      markButton(button, "Updating...");
      target.status = nextStatus;
      target.statusUpdatedAt = App.now();
      App.saveState();
      App.toast(`User status changed to ${nextStatus}.`);
      render();
    },
    copyText(value) {
      const text = String(value || "");
      if (!text) return;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => App.toast("Copied."));
      } else {
        const input = document.createElement("input");
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
        App.toast("Copied.");
      }
    },
    savePaymentSettings(event) {
      event.preventDefault();
      const settings = platformSettings();
      const file = document.getElementById("settingQrImage")?.files?.[0];
      const apply = qrImage => {
        App.state.settings = {
          ...settings,
          depositUpiId: inputValue("settingUpiId") || "aitradex@upi",
          depositQrImage: qrImage ?? (settings.depositQrImage || ""),
          depositBankName: inputValue("settingBankName") || "AITradeX Bank",
          depositAccountName: inputValue("settingAccountName") || "AITradeX Private Wallet",
          depositAccountNumber: inputValue("settingAccountNumber") || "123456789012",
          depositIfsc: inputValue("settingIfsc").toUpperCase() || "AITX0001234",
          minDeposit: Math.max(1, Number(inputValue("settingMinDeposit") || 500)),
          minWithdrawal: Math.max(1, Number(inputValue("settingMinWithdrawal") || 1000))
        };
        App.saveState();
        App.toast("Payment settings saved.");
        render();
      };

      if (file) {
        const reader = new FileReader();
        reader.onload = () => apply(String(reader.result || ""));
        reader.onerror = () => App.toast("QR image could not be saved.");
        reader.readAsDataURL(file);
      } else {
        apply(settings.depositQrImage || "");
      }
    },
    onAiPairChange() {
      this.updateAiPreview();
      setAiPriceView();
      this.fetchAiEntryPrice(false);
    },
    async fetchAiEntryPrice(showToast = true) {
      const pair = inputValue("aiTradePair") || "BTC/USDT";
      const manual = Number(inputValue("aiManualEntryPrice") || 0);
      try {
        const row = await App.getLivePairPrice(pair, manual);
        setAiPriceView(row);
        if (showToast) App.toast(`${pair} entry price locked from ${row.source}.`);
        return row;
      } catch (error) {
        setAiPriceView({ price: "--", source: "Unavailable", display: "--" });
        if (showToast) App.toast(error.message || "Live price unavailable.");
        throw error;
      }
    },
    updateAiPreview() {
      const resultType = document.querySelector('input[name="aiTradeResultType"]:checked')?.value || "PROFIT";
      const resultPercent = Math.max(0, Number(inputValue("aiTradeResultPercent") || 0));
      const leverage = Math.max(1, Number(inputValue("aiTradeLeverage") || 1));
      const minBalance = Math.max(0, Number(inputValue("aiTradeMinBalance") || 0));
      const stats = aiPreviewStats(resultPercent, leverage, minBalance, resultType);
      const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
      const setMoney = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = App.money(value || 0); };
      const setPnl = (id, value) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = App.money(value || 0);
        el.classList.toggle("profit-text", Number(value || 0) >= 0);
        el.classList.toggle("loss-text", Number(value || 0) < 0);
      };
      setText("aiPreviewValid", stats.report.eligible.length);
      setText("aiPreviewSkipped", stats.report.skipped.length);
      setMoney("aiPreviewMargin", stats.totalMargin);
      setMoney("aiPreviewExposure", stats.totalExposure);
      setPnl("aiPreviewOneK", stats.perOneThousand);
      setPnl("aiPreviewTenK", stats.perTenThousand);
      setPnl("aiPreviewTotalPnl", stats.totalPnl);
      setText("aiPreviewReasons", skipReasonLine(stats.report.reasons));
    },
    async executeAiTrade(event) {
      event.preventDefault();
      const selectedPairData = pairDataByPair(inputValue("aiTradePair") || "BTC/USDT");
      const market = selectedPairData.market || "CRYPTO";
      const pair = String(selectedPairData.pair || "BTC/USDT").toUpperCase();
      const side = document.querySelector('input[name="aiTradeSide"]:checked')?.value || "BUY";
      const leverage = Math.max(1, Number(inputValue("aiTradeLeverage") || 1));
      const resultType = document.querySelector('input[name="aiTradeResultType"]:checked')?.value || "PROFIT";
      const resultPercent = Math.max(0, Number(inputValue("aiTradeResultPercent") || 0));
      const minBalance = Math.max(0, Number(inputValue("aiTradeMinBalance") || 0));
      const note = inputValue("aiTradeNote") || "Expert AI auto trade executed";
      let priceRow;
      try {
        priceRow = await this.fetchAiEntryPrice(false);
      } catch (error) {
        App.toast(error.message || "Entry price unavailable. Trade not executed.");
        return;
      }

      const batchId = App.uid("ai_batch");
      const report = aiEligibilityReport(minBalance);
      let appliedCount = 0;
      let totalMargin = 0;
      let totalExposure = 0;
      let totalPnl = 0;

      report.eligible.forEach(target => {
        const balanceBefore = App.realBalance(target.id);
        const margin = Math.min(balanceBefore, App.aiAllowedAmount(target));
        if (!margin || margin <= 0) {
          report.skipped.push({ userId: target.id, reason: "No AI trade pool available" });
          report.reasons.noPool += 1;
          return;
        }

        const exposure = margin * leverage;
        let pnl = exposure * resultPercent / 100;
        if (resultType === "LOSS") pnl = -Math.min(balanceBefore, pnl);
        if (balanceBefore + pnl < 0) pnl = -balanceBefore;

        const tradeId = App.uid("ai_trd");
        const trade = {
          id: tradeId,
          batchId,
          userId: target.id,
          tradeType: "AI_AUTO",
          accountType: "REAL",
          market,
          pair,
          side,
          entryPrice: Number(priceRow.price || 0),
          entryPriceDisplay: priceRow.display || String(priceRow.price || ""),
          priceSource: priceRow.source || "Live API",
          priceSourceType: priceRow.sourceType || "LIVE_API",
          priceLockedAt: priceRow.fetchedAt || new Date().toISOString(),
          leverage,
          marginAmount: Number(margin.toFixed(2)),
          positionSize: Number(exposure.toFixed(2)),
          resultType,
          resultPercent,
          pnl: Number(pnl.toFixed(2)),
          status: "CLOSED",
          source: "ADMIN_AI_TRADING_DESK",
          note,
          balanceBefore: Number(balanceBefore.toFixed(2)),
          balanceAfter: Number((balanceBefore + pnl).toFixed(2)),
          aiPercent: Number(target.aiTradePercent || 25),
          createdAt: new Date().toISOString(),
          createdDate: App.todayKey()
        };

        App.state.trades.unshift(trade);
        if (trade.pnl !== 0) {
          App.addLedger({
            userId: target.id,
            accountType: "REAL",
            type: trade.pnl >= 0 ? "AI_TRADE_PROFIT" : "AI_TRADE_LOSS",
            amount: trade.pnl,
            referenceId: trade.id,
            note: `${pair} ${side} AI auto trade · ${resultType} ${resultPercent}% · ${leverage}x`
          });
        }
        appliedCount += 1;
        totalMargin += margin;
        totalExposure += exposure;
        totalPnl += trade.pnl;
      });

      if (!App.state.aiTradeBatches) App.state.aiTradeBatches = [];
      App.state.aiTradeBatches.unshift({
        id: batchId,
        market,
        pair,
        side,
        entryPrice: Number(priceRow.price || 0),
        entryPriceDisplay: priceRow.display || String(priceRow.price || ""),
        priceSource: priceRow.source || "Live API",
        priceSourceType: priceRow.sourceType || "LIVE_API",
        priceLockedAt: priceRow.fetchedAt || new Date().toISOString(),
        leverage,
        resultType,
        resultPercent,
        minBalance,
        note,
        totalMargin: Number(totalMargin.toFixed(2)),
        totalExposure: Number(totalExposure.toFixed(2)),
        appliedCount,
        skippedCount: report.skipped.length,
        skipReasons: report.reasons,
        totalPnl: Number(totalPnl.toFixed(2)),
        createdAt: new Date().toISOString()
      });
      App.saveState();
      App.toast(appliedCount ? `AI trade applied to ${appliedCount} valid user(s). ${report.skipped.length} skipped.` : "No valid AI users found. Trade was not applied.");
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