(() => {
  const App = window.AITradeX;
  const Auth = window.AITradeXAuth;
  const root = document.getElementById("app");

  let page = localStorage.getItem("AITradeX_ACTIVE_PAGE") || "home";
  let authMode = "login";
  let accountMode = localStorage.getItem("AITradeX_ACCOUNT_MODE") || "REAL";
  let drawerOpen = false;
  let autoPercent = Number(localStorage.getItem("AITradeX_AUTO_PERCENT") || 25);
  let autoTradeOn = localStorage.getItem("AITradeX_AUTO_ON") === "true";
  let selectedPair = localStorage.getItem("AITradeX_SELECTED_PAIR") || "BTC/USDT";

  const pairs = [
    { pair: "BTC/USDT", price: "$76,737.55", inr: "₹64,15,894", change: "+2.84%", mood: "up", signal: "BUY" },
    { pair: "ETH/USDT", price: "$2,111.72", inr: "₹1,76,434", change: "-1.04%", mood: "down", signal: "SELL" },
    { pair: "SOL/USDT", price: "$184.46", inr: "₹15,415", change: "+1.20%", mood: "up", signal: "BUY" },
    { pair: "BNB/USDT", price: "$639.82", inr: "₹53,484", change: "-0.28%", mood: "down", signal: "WAIT" },
    { pair: "XRP/USDT", price: "$2.47", inr: "₹206", change: "+0.62%", mood: "up", signal: "BUY" }
  ];

  const leverageOptions = [1, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];

  function user() {
    return App.currentUser();
  }

  function currentBalance() {
    const u = user();
    if (!u) return 0;
    return accountMode === "DEMO" ? App.demoBalance(u.id) : App.realBalance(u.id);
  }

  function realBalance() {
    const u = user();
    return u ? App.realBalance(u.id) : 0;
  }

  function demoBalance() {
    const u = user();
    return u ? App.demoBalance(u.id) : 0;
  }

  function pnlValue() {
    const u = user();
    if (!u) return 0;
    return App.state.trades
      .filter(t => t.userId === u.id && t.accountType === accountMode && t.status === "CLOSED")
      .reduce((sum, t) => sum + Number(t.pnl || 0), 0);
  }

  function selectedPairData() {
    return pairs.find(p => p.pair === selectedPair) || pairs[0];
  }

  function avatar(name) {
    const u = user();
    const avatarData = u ? localStorage.getItem(`AITradeX_AVATAR_${u.id}`) : "";
    if (avatarData) {
      return `<span class="avatar image-avatar"><img src="${avatarData}" alt="Avatar"/></span>`;
    }
    return `<span class="avatar">${String(name || "A").trim().charAt(0).toUpperCase()}</span>`;
  }

  function displayName() {
    const u = user();
    if (!u) return "User";
    return localStorage.getItem(`AITradeX_DISPLAY_NAME_${u.id}`) || u.name || "User";
  }

  function profileNameChip() {
    return `<button class="profile-chip visible-profile" onclick="AITradeXUser.go('profile')"><b>${App.escapeHtml(displayName())}</b>${avatar(displayName())}</button>`;
  }

  function accountSwitch(compact = false) {
    return `
      <div class="account-segment ${compact ? "compact" : ""}" aria-label="Account mode">
        <button class="${accountMode === "REAL" ? "active" : ""}" onclick="AITradeXUser.setAccountMode('REAL')">Real</button>
        <button class="${accountMode === "DEMO" ? "active" : ""}" onclick="AITradeXUser.setAccountMode('DEMO')">Demo</button>
      </div>`;
  }

  function appHeader() {
    const u = user();
    return `
      <header class="app-topbar compact-header">
        <button class="menu-btn" onclick="AITradeXUser.toggleDrawer()">☰</button>
        <div class="app-brand">
          <b>AITradeX</b>
        </div>
        ${profileNameChip()}
      </header>
      ${drawerOpen ? menuDrawer() : ""}`;
  }

  function menuDrawer() {
    const u = user();
    return `
      <div class="drawer-backdrop" onclick="AITradeXUser.toggleDrawer(false)"></div>
      <aside class="side-drawer">
        <div class="drawer-head">
          ${avatar(displayName())}
          <div>
            <b>${App.escapeHtml(displayName() || "AITradeX User")}</b>
            <span>${accountMode} account active</span>
          </div>
        </div>
        <button onclick="AITradeXUser.go('profile')" class="drawer-item">👤 Profile</button>
        <button onclick="AITradeXUser.go('kyc')" class="drawer-item">🛡️ KYC Verification</button>
        <button onclick="AITradeXUser.go('payments')" class="drawer-item">💳 My Payment Methods</button>
        <button onclick="AITradeXUser.go('referral')" class="drawer-item">🎁 Referral</button>
        <button onclick="AITradeXUser.go('support')" class="drawer-item">🎧 Support</button>
        <button onclick="AITradeXUser.logout()" class="drawer-item danger">🚪 Logout</button>
      </aside>`;
  }

  function bottomNav() {
    const nav = [
      ["home", "⌂", "Home"],
      ["trade", "⇅", "Trade"],
      ["wallet", "▣", "Wallet"],
      ["pnl", "↗", "P/L"],
      ["history", "☰", "History"]
    ];
    return `
      <nav class="bottom-nav">
        ${nav.map(([key, icon, label]) => `
          <button class="${page === key ? "active" : ""}" onclick="AITradeXUser.go('${key}')">
            <i>${icon}</i><span>${label}</span>
          </button>`).join("")}
      </nav>`;
  }

  function shell(content) {
    root.innerHTML = `
      <div class="aitx-app">
        ${appHeader()}
        <main class="app-content">${content}</main>
        ${bottomNav()}
      </div>`;
  }

  function landing() {
    root.innerHTML = `
      <main class="public-wrap">
        <nav class="public-nav">
          <div class="brand"><span>AI</span><b>AITradeX</b></div>
          <div class="public-actions">
            <a href="#plans">Plans</a>
            <a href="#security">Security</a>
            <button onclick="AITradeXUser.scrollAuth()" class="btn small">Get Started</button>
          </div>
        </nav>

        <section class="hero-section">
          <div class="hero-copy">
            <p class="eyebrow">AI Real Trading Platform</p>
            <h1>AI powered trading experience with secure INR wallet.</h1>
            <p class="hero-text">AITradeX combines a premium trading dashboard, TradingView style charts, real and demo account modes, KYC verification, subscriptions, referrals and a clean wallet ledger.</p>
            <div class="hero-buttons">
              <button onclick="AITradeXUser.scrollAuth()" class="btn">Create Account</button>
              <button onclick="AITradeXUser.setAuthMode('login')" class="btn ghost">User Login</button>
            </div>
            <div class="trust-pills"><span>KYC Verified</span><span>INR Wallet</span><span>Real + Demo</span></div>
          </div>

          <div class="hero-terminal">
            <div class="terminal-head"><div><span>BTC/USDT</span><strong>₹58,42,210</strong></div><em>+2.84%</em></div>
            <div class="fake-chart"></div>
            <div class="terminal-grid"><div><span>AI Signal</span><b>BUY</b></div><div><span>Leverage</span><b>2000x</b></div><div><span>Risk</span><b>Adaptive</b></div></div>
          </div>
        </section>

        <section id="plans" class="landing-grid">
          <article><i>💰</i><h3>Secure Wallet</h3><p>Deposit, withdrawal, pending funds and ledger-based balance.</p></article>
          <article><i>📈</i><h3>AI Trading</h3><p>Buy/Sell, pairs, amount, leverage up to 2000x, real and demo accounts.</p></article>
          <article><i>🤝</i><h3>Referral</h3><p>10% one-time commission only on first approved deposit.</p></article>
        </section>

        <section id="authBox" class="auth-section">
          <div class="auth-copy"><p class="eyebrow">User Access</p><h2>${authMode === "login" ? "Login to AITradeX" : "Create AITradeX account"}</h2><p>User panel is fully separate from the control center. No control wording is shown here.</p></div>
          <div class="auth-card">
            <div class="auth-tabs"><button class="${authMode === "login" ? "active" : ""}" onclick="AITradeXUser.setAuthMode('login')">Login</button><button class="${authMode === "register" ? "active" : ""}" onclick="AITradeXUser.setAuthMode('register')">Register</button></div>
            ${authMode === "login" ? loginForm() : registerForm()}
          </div>
        </section>

        <section id="security" class="security-note"><b>AITradeX Security:</b> KYC approval and verified payment methods help reduce fraud risk before withdrawals.</section>
      </main>`;
  }

  function loginForm() {
    return `<form onsubmit="AITradeXUser.login(event)" class="form-grid"><label>Email<input id="loginEmail" type="email" required placeholder="you@example.com"/></label><label>Password<input id="loginPassword" type="password" required placeholder="Password"/></label><button class="btn">Login</button></form>`;
  }

  function registerForm() {
    return `<form onsubmit="AITradeXUser.register(event)" class="form-grid"><label>Full Name<input id="regName" required placeholder="Your name"/></label><label>Email<input id="regEmail" type="email" required placeholder="you@example.com"/></label><label>Mobile<input id="regMobile" required placeholder="10 digit mobile"/></label><label>Password<input id="regPassword" type="password" required placeholder="Create password"/></label><label>Referral Code <small>Optional</small><input id="regReferral" placeholder="Referral code"/></label><button class="btn">Create Account</button></form>`;
  }

  function homePage() {
    const u = user();
    const balance = currentBalance();
    const pnl = pnlValue();
    const tradeAmount = balance * autoPercent / 100;
    const pair = selectedPairData();

    shell(`
      <section class="account-overview-card ${accountMode.toLowerCase()}">
        <div class="overview-top">
          <div>
            <p>${accountMode === "REAL" ? "REAL ACCOUNT" : "DEMO ACCOUNT"}</p>
            <h1>${App.money(balance)}</h1>
            <span>${accountMode === "REAL" ? "Available real equity" : "Practice balance for learning"}</span>
          </div>
          ${accountSwitch()}
        </div>
        <div class="overview-mini single-mode">
          <article><span>${accountMode === "REAL" ? "Real Wallet" : "Demo Wallet"}</span><b>${App.money(balance)}</b></article>
          <article><span>Today P/L</span><b class="${pnl >= 0 ? "profit-text" : "loss-text"}">${App.money(pnl)}</b></article>
          <article><span>Mode</span><b>${accountMode === "REAL" ? "Live" : "Practice"}</b></article>
        </div>
      </section>

      <section class="market-ticker">
        ${pairs.map(p => `
          <article class="ticker-card ${p.mood} ${selectedPair === p.pair ? "selected" : ""}" onclick="AITradeXUser.selectPair('${p.pair}')">
            <div><h3>${p.pair}</h3><small>${p.inr}</small></div>
            <strong>${p.price}</strong>
            <span>${p.change}</span>
          </article>`).join("")}
      </section>

      <section class="compact-grid">
        <article><span>AI Status</span><b>${autoTradeOn ? "Active" : "Ready"}</b><small>Signal engine</small></article>
        <article><span>Open Trades</span><b>0</b><small>${accountMode} positions</small></article>
        <article><span>KYC</span><b>${App.kycStatus(u.id).replace("_", " ")}</b><small>Verification</small></article>
        <article><span>Selected Pair</span><b>${selectedPair}</b><small>${pair.signal} bias</small></article>
      </section>

      <section class="premium-card live-signal-card">
        <div class="card-row">
          <div>
            <p>AI SIGNAL LIVE</p>
            <h2>${pair.signal} ${selectedPair}</h2>
            <h4>AI confidence is based on live market behaviour and selected account mode.</h4>
          </div>
          <div class="confidence-ring">82%</div>
        </div>
        <div class="signal-grid">
          <article><span>Entry</span><b>Market</b></article>
          <article><span>Target</span><b>Auto</b></article>
          <article><span>Stop Loss</span><b>Smart</b></article>
          <article><span>Expires</span><b>30m</b></article>
        </div>
      </section>

      <section class="premium-card auto-card">
        <div class="card-row">
          <div><p>AI TRADE CONTROL</p><h2>Auto Trade Amount</h2><h4>Choose how much ${accountMode} balance AI can use for future automatic trades.</h4></div>
          <button class="ai-power ${autoTradeOn ? "on" : ""}" onclick="AITradeXUser.toggleAutoTrade()">${autoTradeOn ? "ON" : "OFF"}</button>
        </div>
        <div class="percent-grid">
          ${[25, 50, 75, 100].map(v => `<button class="${autoPercent === v ? "active" : ""}" onclick="AITradeXUser.setAutoPercent(${v})">${v}%</button>`).join("")}
        </div>
        <div class="auto-summary">
          <article><span>Selected</span><b>${autoPercent}%</b></article>
          <article><span>AI Trade Amount</span><b>${App.money(tradeAmount)}</b></article>
        </div>
      </section>
    `);
  }

  function tradePage() {
    const pair = selectedPairData();

    shell(`
      <section class="trade-command">
        <div>
          <p>${accountMode} ACCOUNT</p>
          <h1>${selectedPair}</h1>
          <span>${pair.price} · ${pair.inr} · ${pair.change}</span>
        </div>
        <div class="trade-live">LIVE</div>
      </section>

      <section class="chart-shell">
        <div class="chart-toolbar">
          <span>1m</span><span>5m</span><span>30m</span><span>1h</span><span>4h</span><span>1D</span><button>⚙</button>
        </div>
        <div class="responsive-chart">
          <div class="chart-watermark">TradingView Chart Area</div>
        </div>
      </section>

      <section class="premium-card order-ticket">
        <div class="card-row">
          <div><p>ORDER TICKET</p><h2>Place Order</h2><span class="ticket-mode">${accountMode} account selected from Home</span></div>
        </div>
        <label>Coin Pair<select onchange="AITradeXUser.selectPair(this.value)">${pairs.map(p => `<option ${selectedPair === p.pair ? "selected" : ""}>${p.pair}</option>`).join("")}</select></label>
        <div class="form-row">
          <label>Order Type<select><option>Market</option><option>Limit</option></select></label>
          <label>Leverage<select>${leverageOptions.map(x => `<option>${x}x</option>`).join("")}</select></label>
        </div>
        <label>Margin Amount<input type="number" placeholder="Enter INR amount"/></label>
        <div class="form-row">
          <label>Take Profit Optional<input placeholder="TP price"/></label>
          <label>Stop Loss Optional<input placeholder="SL price"/></label>
        </div>
        <div class="buy-sell-row">
          <button class="buy-btn">BUY / LONG</button>
          <button class="sell-btn">SELL / SHORT</button>
        </div>
      </section>

      <section class="premium-card depth-card">
        <div class="card-row"><div><p>MARKET DEPTH</p><h2>Order Book</h2></div><span class="mini-live">LIVE</span></div>
        <div class="depth-table">
          <span>Price</span><span>Qty</span><span>Total</span>
          <b class="red">$77,147.07</b><b>1.5562</b><b>$120,057</b>
          <b class="red">$77,104.78</b><b>0.2684</b><b>$20,691</b>
          <b class="green">$76,737.55</b><b>0.8940</b><b>$68,603</b>
          <b class="green">$76,612.11</b><b>2.1180</b><b>$162,279</b>
        </div>
      </section>

      <section class="premium-card">
        <p>OPEN POSITIONS</p>
        <h2>Active AI Trades</h2>
        <div class="empty-state">No active ${accountMode.toLowerCase()} positions yet.</div>
      </section>
    `);
  }

  function walletPage() {
    const u = user();
    const balance = currentBalance();

    shell(`
      <section class="wallet-hero-card ${accountMode.toLowerCase()}">
        <div class="card-row">
          <div><p>${accountMode} WALLET</p><h1>${accountMode === "REAL" ? "Real Wallet Equity" : "Demo Practice Equity"}</h1><span class="ticket-mode">Account mode selected from Home</span></div>
        </div>
        <strong>${App.money(balance)}</strong>
        <span>${accountMode === "REAL" ? "Deposits and withdrawals enabled" : "Practice wallet only"}</span>
      </section>

      <section class="wallet-grid">
        <article><span>Available Balance</span><b>${App.money(balance)}</b><p>${accountMode === "REAL" ? "Ready for trading" : "Practice trading"}</p></article>
        <article><span>Withdrawable</span><b>${accountMode === "REAL" ? App.money(realBalance()) : "Not available"}</b><p>${accountMode === "REAL" ? "After checks" : "Demo cannot withdraw"}</p></article>
        <article><span>Pending Deposit</span><b>${App.money(App.pendingDeposit(u.id))}</b><p>Waiting approval</p></article>
        <article><span>Pending Withdrawal</span><b>${App.money(App.pendingWithdrawal(u.id))}</b><p>Under review</p></article>
      </section>

      ${accountMode === "REAL" ? `
        <section class="wallet-actions">
          <button>Deposit</button><button>Withdrawal</button><button>History</button>
        </section>
        <section class="step-preview">
          <div><span>01</span><b>Amount</b></div>
          <div><span>02</span><b>UPI / Bank</b></div>
          <div><span>03</span><b>Pay with QR</b></div>
          <div><span>04</span><b>12-digit UTR</b></div>
        </section>
      ` : `
        <section class="premium-card"><p>DEMO WALLET</p><h2>Practice Mode</h2><div class="empty-state">Demo wallet is for learning. Deposit and withdrawal are available only in Real Account.</div></section>
      `}
    `);
  }

  function pnlPage() {
    const pnl = pnlValue();
    shell(`
      <section class="compact-grid">
        <article><span>Total Trades</span><b>0</b><small>${accountMode} trades</small></article>
        <article><span>Total P/L</span><b class="${pnl >= 0 ? "profit-text" : "loss-text"}">${App.money(pnl)}</b><small>Closed trades</small></article>
        <article><span>Win Rate</span><b>0%</b><small>Performance</small></article>
        <article><span>Referral Bonus</span><b>₹0</b><small>One-time credit</small></article>
      </section>
      <section class="premium-card"><p>P/L ANALYTICS</p><h2>Performance Overview</h2><div class="analytics-graph"><i></i></div></section>
    `);
  }

  function historyPage() {
    shell(`
      <section class="premium-card history-table-card">
        <div class="card-row">
          <div><p>AI TRADE HISTORY</p><h2>AI Auto Trades</h2></div>
          <span class="history-mode">${accountMode}</span>
        </div>
        <div class="trade-history-table">
          <span>Pair</span><span>Side</span><span>Lev.</span><span>Amount</span><span>P/L</span><span>Status</span>
          <b>BTC/USDT</b><b>BUY</b><b>10x</b><b>₹10,000</b><b class="profit-text">+₹0.00</b><b>Closed</b>
          <b>ETH/USDT</b><b>SELL</b><b>5x</b><b>₹5,000</b><b class="loss-text">-₹0.00</b><b>Closed</b>
        </div>
      </section>

      <section class="premium-card history-table-card">
        <div class="card-row">
          <div><p>MANUAL TRADE HISTORY</p><h2>Your Buy/Sell Trades</h2></div>
          <span class="history-mode">${accountMode}</span>
        </div>
        <div class="trade-history-table">
          <span>Pair</span><span>Side</span><span>Lev.</span><span>Amount</span><span>P/L</span><span>Status</span>
          <b>BTC/USDT</b><b>BUY</b><b>20x</b><b>₹2,000</b><b class="profit-text">+₹0.00</b><b>Closed</b>
          <b>SOL/USDT</b><b>SELL</b><b>50x</b><b>₹1,500</b><b class="loss-text">-₹0.00</b><b>Closed</b>
        </div>
        <div class="empty-state small-note">Wallet history stays inside Wallet page only.</div>
      </section>
    `);
  }

  function kycPage() {
    shell(`<section class="premium-card"><p>KYC VERIFICATION</p><h2>4 Step Verification</h2><div class="step-preview vertical"><div><span>01</span><b>Personal Details</b></div><div><span>02</span><b>ID Details</b></div><div><span>03</span><b>ID Card + Selfie Upload</b></div><div><span>04</span><b>Review & Submit</b></div></div></section>`);
  }

  function paymentPage() {
    shell(`<section class="premium-card"><p>PAYMENT METHODS</p><h2>My Payment Methods</h2><div class="empty-state">Holder name will auto-fill from approved KYC. Max 2 UPI and 2 Bank accounts.</div></section>`);
  }

  function referralPage() {
    const u = user();
    shell(`<section class="premium-card"><p>REFERRAL</p><h2>Invite & Earn</h2><div class="ref-code">${u.referralCode || "-"}</div><div class="empty-state">10% commission only on first approved deposit.</div></section>`);
  }

  function profilePage() {
    const u = user();
    const savedName = displayName();
    const avatarData = localStorage.getItem(`AITradeX_AVATAR_${u.id}`) || "";

    shell(`
      <section class="premium-card profile-editor-card">
        <p>PROFILE</p>
        <h2>Edit Profile</h2>

        <div class="profile-preview">
          ${avatar(savedName)}
          <div>
            <b>${App.escapeHtml(savedName)}</b>
            <span>${App.escapeHtml(u.email)}</span>
          </div>
        </div>

        <div class="profile-form">
          <label>Display Name<input id="profileNameInput" value="${App.escapeHtml(savedName)}" placeholder="Your display name"/></label>
          <label>Avatar Image<input id="profileAvatarInput" type="file" accept="image/*"/></label>
          <button class="save-profile-btn" onclick="AITradeXUser.saveProfile()">Save Profile</button>
        </div>

        <div class="profile-note">
          Avatar अभी browser में save होगा. बाद में इसे Supabase Storage से connect करेंगे.
        </div>
      </section>

      <section class="premium-card">
        <p>ACCOUNT DETAILS</p>
        <h2>Basic Information</h2>
        <div class="profile-info-grid">
          <article><span>Email</span><b>${App.escapeHtml(u.email)}</b></article>
          <article><span>Mobile</span><b>${App.escapeHtml(u.mobile || "-")}</b></article>
          <article><span>Account Mode</span><b>${accountMode}</b></article>
          <article><span>Referral Code</span><b>${App.escapeHtml(u.referralCode || "-")}</b></article>
        </div>
      </section>
    `);
  }

  function supportPage() {
    shell(`<section class="premium-card"><p>SUPPORT</p><h2>Help Center</h2><div class="empty-state">Support tickets will be connected later.</div></section>`);
  }

  function render() {
    const u = user();
    if (!u || u.role !== "user") return landing();

    if (page === "home") return homePage();
    if (page === "trade") return tradePage();
    if (page === "wallet") return walletPage();
    if (page === "pnl") return pnlPage();
    if (page === "history") return historyPage();
    if (page === "kyc") return kycPage();
    if (page === "payments") return paymentPage();
    if (page === "referral") return referralPage();
    if (page === "profile") return profilePage();
    if (page === "support") return supportPage();
    return homePage();
  }

  window.AITradeXUser = {
    setAuthMode(mode) {
      authMode = mode;
      landing();
      setTimeout(() => document.getElementById("authBox")?.scrollIntoView({ behavior: "smooth" }), 50);
    },
    scrollAuth() {
      document.getElementById("authBox")?.scrollIntoView({ behavior: "smooth" });
    },
    register(event) {
      event.preventDefault();
      try {
        Auth.registerUser({
          name: regName.value,
          email: regEmail.value,
          mobile: regMobile.value,
          password: regPassword.value,
          referralCode: regReferral.value.trim()
        });
        page = "home";
        localStorage.setItem("AITradeX_ACTIVE_PAGE", page);
        App.toast("Account created successfully.");
        render();
      } catch (err) {
        App.toast(err.message);
      }
    },
    login(event) {
      event.preventDefault();
      try {
        Auth.loginUser({ email: loginEmail.value, password: loginPassword.value });
        page = "home";
        localStorage.setItem("AITradeX_ACTIVE_PAGE", page);
        App.toast("Logged in successfully.");
        render();
      } catch (err) {
        App.toast(err.message);
      }
    },
    go(next) {
      page = next;
      drawerOpen = false;
      localStorage.setItem("AITradeX_ACTIVE_PAGE", page);
      render();
    },
    toggleDrawer(force) {
      drawerOpen = typeof force === "boolean" ? force : !drawerOpen;
      render();
    },
    setAccountMode(mode) {
      accountMode = mode === "DEMO" ? "DEMO" : "REAL";
      localStorage.setItem("AITradeX_ACCOUNT_MODE", accountMode);
      render();
    },
    selectPair(pair) {
      selectedPair = pair;
      localStorage.setItem("AITradeX_SELECTED_PAIR", selectedPair);
      render();
    },
    setAutoPercent(value) {
      autoPercent = Number(value);
      localStorage.setItem("AITradeX_AUTO_PERCENT", autoPercent);
      render();
    },
    toggleAutoTrade() {
      autoTradeOn = !autoTradeOn;
      localStorage.setItem("AITradeX_AUTO_ON", String(autoTradeOn));
      render();
    },
    saveProfile() {
      const u = user();
      if (!u) return;

      const nameInput = document.getElementById("profileNameInput");
      const fileInput = document.getElementById("profileAvatarInput");
      const nextName = String(nameInput?.value || "").trim();

      if (!nextName) {
        App.toast("Display name required.");
        return;
      }

      localStorage.setItem(`AITradeX_DISPLAY_NAME_${u.id}`, nextName);

      const file = fileInput?.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          localStorage.setItem(`AITradeX_AVATAR_${u.id}`, reader.result);
          App.toast("Profile updated.");
          render();
        };
        reader.readAsDataURL(file);
      } else {
        App.toast("Profile updated.");
        render();
      }
    },
    logout() {
      App.clearSession();
      page = "home";
      drawerOpen = false;
      localStorage.removeItem("AITradeX_ACTIVE_PAGE");
      landing();
    }
  };

  render();
})();