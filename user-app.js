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
  let selectedMarket = localStorage.getItem("AITradeX_SELECTED_MARKET") || "CRYPTO";
  let selectedPair = localStorage.getItem("AITradeX_SELECTED_PAIR") || "BTC/USDT";
  let tradeAmountPreview = Number(localStorage.getItem("AITradeX_TRADE_AMOUNT_PREVIEW") || 1000);
  let tradeLeveragePreview = Number(localStorage.getItem("AITradeX_TRADE_LEVERAGE_PREVIEW") || 10);
  let selectorSheet = null;
  let chartInterval = localStorage.getItem("AITradeX_CHART_INTERVAL") || "15";
  let chartStyle = localStorage.getItem("AITradeX_CHART_STYLE") || "1";
  let chartTheme = localStorage.getItem("AITradeX_CHART_THEME") || "dark";
  let chartToolbar = localStorage.getItem("AITradeX_CHART_TOOLBAR") !== "false";
  let kycStep = Number(localStorage.getItem("AITradeX_KYC_STEP") || 1);
  let paymentType = localStorage.getItem("AITradeX_PAYMENT_TYPE") || "UPI";
  let walletMode = localStorage.getItem("AITradeX_WALLET_MODE") || "DEPOSIT";
  let depositStep = Number(localStorage.getItem("AITradeX_DEPOSIT_STEP") || 1);
  let withdrawalStep = Number(localStorage.getItem("AITradeX_WITHDRAWAL_STEP") || 1);
  let depositDraft = readJson("AITradeX_DEPOSIT_DRAFT", { amount: "", type: "UPI", utr: "" });
  let withdrawalDraft = readJson("AITradeX_WITHDRAWAL_DRAFT", { amount: "", methodId: "" });
  let priceRefreshTimer = null;
  let manualRiskCloseLock = false;
  let manualCloseSelectorOpen = false;

  const marketPairs = App.marketPairs || { CRYPTO: [], FOREX: [] };
  function pairsForMarket() {
    return marketPairs[selectedMarket] || marketPairs.CRYPTO;
  }

  function allTrendingPairs() {
    return [...marketPairs.CRYPTO, ...marketPairs.FOREX];
  }

  function marketFeedForPair() {
    const pair = selectedPairData();
    const isForex = selectedMarket === "FOREX";
    const isMetal = pair.pair === "XAU/USD" || pair.pair === "XAG/USD";

    if (isMetal) {
      return [
        { left: "Bid", mid: pair.price, right: "0.02%", mood: "up" },
        { left: "Ask", mid: pair.price, right: "0.03%", mood: "up" },
        { left: "Volatility", mid: "High", right: pair.change, mood: pair.mood },
        { left: "Session", mid: "Global", right: "Active", mood: "up" }
      ];
    }

    if (isForex) {
      return [
        { left: "Bid", mid: pair.price, right: "0.01%", mood: "up" },
        { left: "Ask", mid: pair.price, right: "0.02%", mood: "up" },
        { left: "Spread", mid: "Tight", right: pair.change, mood: pair.mood },
        { left: "Session", mid: "FX", right: "Open", mood: "up" }
      ];
    }

    return [
      { left: "Bid", mid: pair.price, right: "0.02%", mood: "up" },
      { left: "Ask", mid: pair.price, right: "0.03%", mood: "up" },
      { left: "Volume", mid: "Rising", right: pair.change, mood: pair.mood },
      { left: "Depth", mid: "Active", right: pair.signal, mood: pair.signal === "SELL" ? "down" : "up" }
    ];
  }

  function tradeFeedForMarket() {
    const pair = selectedPairData();
    const isForex = selectedMarket === "FOREX";
    const isMetal = pair.pair === "XAU/USD" || pair.pair === "XAG/USD";

    if (isMetal) {
      return [
        { pair: pair.pair, action: `${pair.pair.includes("XAU") ? "Gold" : "Silver"} momentum ${pair.signal}`, size: "₹25,000", lev: "20x", change: pair.change, mood: pair.mood, time: "Now" },
        { pair: pair.pair, action: "Volatility alert active", size: "₹18,500", lev: "10x", change: pair.mood === "up" ? "+0.24%" : "-0.24%", mood: pair.mood, time: "1m" },
        { pair: pair.pair, action: "AI entry zone forming", size: "₹12,000", lev: "50x", change: pair.mood === "up" ? "+0.18%" : "-0.18%", mood: pair.mood, time: "3m" },
        { pair: pair.pair, action: "Global session watch", size: "₹9,000", lev: "25x", change: pair.mood === "up" ? "+0.11%" : "-0.11%", mood: pair.mood, time: "5m" }
      ];
    }

    if (isForex) {
      return [
        { pair: pair.pair, action: `${pair.signal} setup forming`, size: "₹18,000", lev: "50x", change: pair.change, mood: pair.mood, time: "Now" },
        { pair: pair.pair, action: "Spread watch active", size: "₹12,000", lev: "25x", change: pair.mood === "up" ? "+0.09%" : "-0.09%", mood: pair.mood, time: "1m" },
        { pair: pair.pair, action: "Trend confirmation pending", size: "₹15,500", lev: "100x", change: pair.mood === "up" ? "+0.12%" : "-0.12%", mood: pair.mood, time: "3m" },
        { pair: pair.pair, action: "Currency strength alert", size: "₹8,500", lev: "20x", change: pair.mood === "up" ? "+0.06%" : "-0.06%", mood: pair.mood, time: "5m" }
      ];
    }

    return [
      { pair: pair.pair, action: `${pair.signal} signal detected`, size: "₹22,000", lev: "20x", change: pair.change, mood: pair.mood, time: "Now" },
      { pair: pair.pair, action: "Volume movement watch", size: "₹14,000", lev: "10x", change: pair.mood === "up" ? "+0.42%" : "-0.42%", mood: pair.mood, time: "1m" },
      { pair: pair.pair, action: "Breakout zone active", size: "₹9,500", lev: "50x", change: pair.mood === "up" ? "+0.27%" : "-0.27%", mood: pair.mood, time: "2m" },
      { pair: pair.pair, action: "AI risk monitor", size: "₹5,000", lev: "100x", change: pair.mood === "up" ? "+0.16%" : "-0.16%", mood: pair.mood, time: "4m" }
    ];
  }

  const leverageOptions = [1, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];

  function user() {
    return App.currentUser();
  }

  function currentBalance() {
    const u = user();
    if (!u) return 0;
    return accountMode === "DEMO" ? App.demoBalance(u.id) : App.realBalance(u.id);
  }

  function manualOpenPositions() {
    const u = user();
    if (!u) return [];
    return App.state.trades.filter(t =>
      t.userId === u.id &&
      t.tradeType === "MANUAL" &&
      t.status === "OPEN"
    );
  }

  function positionCurrentPrice(position) {
    const cached = App.getCachedPairPrice ? App.getCachedPairPrice(position.pair) : null;
    const fallback = Number(position.entryPrice || 0);
    const current = Number(cached?.price || fallback);
    return Number.isFinite(current) && current > 0 ? current : fallback;
  }

  function positionCurrentDisplay(position) {
    const cached = App.getCachedPairPrice ? App.getCachedPairPrice(position.pair) : null;
    if (cached?.display) return cached.display;
    const current = positionCurrentPrice(position);
    return current ? String(current) : "--";
  }

  function manualPositionRawPnl(position) {
    const entry = Number(position.entryPrice || 0);
    const current = positionCurrentPrice(position);
    const exposure = Number(position.positionSize || 0);
    if (!entry || !current || !exposure) return 0;
    const direction = String(position.side || "BUY").toUpperCase() === "SELL" ? -1 : 1;
    return exposure * ((current - entry) / entry) * direction;
  }

  function manualPositionMaxLoss(position) {
    const margin = Math.max(0, Number(position.marginAmount || 0));
    if (position.marginLocked) return margin;
    const balanceNow = Math.max(0, positionBalance(position));
    if (!margin && !balanceNow) return 0;
    if (!margin) return balanceNow;
    if (!balanceNow) return margin;
    return Math.min(margin, balanceNow);
  }

  function manualPositionPnl(position) {
    const raw = manualPositionRawPnl(position);
    if (raw < 0) return Math.max(raw, -manualPositionMaxLoss(position));
    return raw;
  }

  function manualReservedMargin(account = accountMode) {
    return manualOpenPositions()
      .filter(position => (position.accountType || accountMode) === account)
      .reduce((sum, position) => sum + Math.max(0, Number(position.marginAmount || 0)), 0);
  }

  function availableForNewManualTrade() {
    return Math.max(0, currentBalance());
  }

  function totalManualLivePnl() {
    return manualOpenPositions().reduce((sum, position) => sum + manualPositionPnl(position), 0);
  }

  function positionBalance(position) {
    const u = user();
    if (!u) return 0;
    return position.accountType === "DEMO" ? App.demoBalance(u.id) : App.realBalance(u.id);
  }

  function settleManualPosition(position, reason = "USER_CLOSE") {
    const u = user();
    if (!u || !position || position.status !== "OPEN") return false;
    const current = positionCurrentPrice(position);
    let pnl = manualPositionPnl(position);
    const margin = Math.max(0, Number(position.marginAmount || 0));
    if (pnl < -margin) pnl = -margin;
    if (!position.marginLocked) {
      const balanceNow = positionBalance(position);
      if (balanceNow + pnl < 0) pnl = -balanceNow;
    }
    const settlementAmount = position.marginLocked ? Math.max(0, margin + pnl) : pnl;
    position.exitPrice = current;
    position.exitPriceDisplay = positionCurrentDisplay(position);
    position.exitPriceSource = (App.getCachedPairPrice && App.getCachedPairPrice(position.pair)?.source) || position.priceSource || "Live price cache";
    position.closedAt = new Date().toISOString();
    position.pnl = pnl;
    position.settlementAmount = settlementAmount;
    position.closeReason = reason;
    position.status = "CLOSED";
    if (settlementAmount !== 0) {
      App.addLedger({
        userId: u.id,
        accountType: position.accountType || accountMode,
        type: position.marginLocked ? "MANUAL_TRADE_SETTLEMENT" : (pnl >= 0 ? "MANUAL_TRADE_PROFIT" : "MANUAL_TRADE_LOSS"),
        amount: settlementAmount,
        referenceId: position.id,
        note: position.marginLocked
          ? `${position.pair} manual ${position.side} closed · margin ${App.money(margin)} · P/L ${pnl >= 0 ? "+" : ""}${App.money(pnl)}`
          : `${position.pair} manual ${position.side} closed`
      });
    } else {
      App.saveState();
    }
    return true;
  }

  function autoCloseRiskPositions() {
    if (manualRiskCloseLock) return 0;
    manualRiskCloseLock = true;
    let closed = 0;
    try {
      manualOpenPositions().forEach(position => {
        const rawPnl = manualPositionRawPnl(position);
        const maxLoss = manualPositionMaxLoss(position);
        if (rawPnl < 0 && maxLoss > 0 && Math.abs(rawPnl) >= maxLoss) {
          if (settleManualPosition(position, "AUTO_RISK_CLOSE")) closed += 1;
        }
      });
    } finally {
      manualRiskCloseLock = false;
    }
    if (closed) {
      App.toast(`${closed} manual position auto-closed to protect balance.`);
      setTimeout(() => render(), 0);
    }
    return closed;
  }

  function manualLiveBarHtml() {
    const positions = manualOpenPositions();
    if (!positions.length) return "";
    const pnl = totalManualLivePnl();
    const label = pnl >= 0 ? "Profit" : "Loss";
    const countText = positions.length === 1 ? "1 Active Position" : `${positions.length} Active Positions`;
    return `
      <section class="top-live-position-bar ${pnl >= 0 ? "profit" : "loss"}" id="manualLivePositionBar">
        <span id="manualLivePositionText">${countText} ${pnl >= 0 ? "+" : ""}${App.money(pnl)} (${label})</span>
        <button onclick="AITradeXUser.closeManualLivePositions()">Close</button>
      </section>`;
  }

  function manualCloseSelectorHtml() {
    if (!manualCloseSelectorOpen) return "";
    const positions = manualOpenPositions();
    if (!positions.length) return "";
    return `
      <div class="manual-close-backdrop" onclick="AITradeXUser.cancelManualCloseSelector()"></div>
      <section class="manual-close-modal">
        <div class="manual-close-head">
          <div>
            <b>Select position to close</b>
            <span>${positions.length} active manual ${positions.length === 1 ? "position" : "positions"}</span>
          </div>
          <button onclick="AITradeXUser.cancelManualCloseSelector()">×</button>
        </div>
        <div class="manual-close-list">
          ${positions.map(position => {
            const pnl = manualPositionPnl(position);
            const cls = pnl >= 0 ? "profit-text" : "loss-text";
            return `
              <article>
                <div>
                  <b>${App.escapeHtml(position.pair)} ${App.escapeHtml(position.side)}</b>
                  <span>${Number(position.leverage || 1)}x · Margin ${App.money(position.marginAmount || 0)} · Live ${App.escapeHtml(positionCurrentDisplay(position))}</span>
                </div>
                <strong class="${cls}">${pnl >= 0 ? "+" : ""}${App.money(pnl)}</strong>
                <button onclick="AITradeXUser.closeManualPositionById('${position.id}')">Close</button>
              </article>`;
          }).join("")}
        </div>
      </section>`;
  }

  function updateManualLiveViews() {
    if (autoCloseRiskPositions()) return;
    const positions = manualOpenPositions();
    const pnl = positions.reduce((sum, position) => sum + manualPositionPnl(position), 0);
    const label = pnl >= 0 ? "Profit" : "Loss";
    const countText = positions.length === 1 ? "1 Active Position" : `${positions.length} Active Positions`;

    const bar = document.getElementById("manualLivePositionBar");
    if (bar) {
      if (!positions.length) {
        bar.remove();
      } else {
        bar.classList.toggle("profit", pnl >= 0);
        bar.classList.toggle("loss", pnl < 0);
        const text = document.getElementById("manualLivePositionText");
        if (text) text.textContent = `${countText} ${pnl >= 0 ? "+" : ""}${App.money(pnl)} (${label})`;
      }
    }

    positions.forEach(position => {
      const currentEl = document.querySelector(`[data-manual-current="${position.id}"]`);
      const pnlEl = document.querySelector(`[data-manual-pnl="${position.id}"]`);
      const pnlValue = manualPositionPnl(position);
      if (currentEl) currentEl.textContent = positionCurrentDisplay(position);
      if (pnlEl) {
        pnlEl.textContent = `${pnlValue >= 0 ? "+" : ""}${App.money(pnlValue)}`;
        pnlEl.classList.toggle("profit-text", pnlValue >= 0);
        pnlEl.classList.toggle("loss-text", pnlValue < 0);
      }
    });
  }

  function updateManualLiveBar() {
    updateManualLiveViews();
  }

  function updateTradeAmountPreviewDom() {
    const margin = Math.max(0, Number(tradeAmountPreview || 0));
    const leverage = Math.max(1, Number(tradeLeveragePreview || 1));
    const positionSize = margin * leverage;
    const marginEl = document.querySelector("[data-trade-preview-margin]");
    const positionEl = document.querySelector("[data-trade-preview-position]");
    const summaryEl = document.querySelector("[data-trade-preview-summary]");
    if (marginEl) marginEl.textContent = App.money(margin);
    if (positionEl) positionEl.textContent = App.money(positionSize);
    if (summaryEl) summaryEl.textContent = `${selectedMarket} · ${selectedPair} · ${accountMode} · Margin ${App.money(margin)} · Position ${App.money(positionSize)}`;
  }

  function realBalance() {
    const u = user();
    return u ? App.realBalance(u.id) : 0;
  }

  function demoBalance() {
    const u = user();
    return u ? App.demoBalance(u.id) : 0;
  }

  function currentAiSettings() {
    const u = user();
    if (!u) return { enabled: autoTradeOn, percent: autoPercent };
    if (typeof u.aiTradeOn === "undefined") u.aiTradeOn = autoTradeOn;
    if (!u.aiTradePercent) u.aiTradePercent = autoPercent;
    autoTradeOn = !!u.aiTradeOn;
    autoPercent = Number(u.aiTradePercent || 25);
    return { enabled: autoTradeOn, percent: autoPercent };
  }

  function aiDailyUsage() {
    const u = user();
    if (!u) return { used: 0, limit: 5 };
    return { used: App.aiTradesToday(u.id), limit: App.aiDailyLimit(u.id) };
  }

  function tradeRows(type) {
    const u = user();
    if (!u) return [];
    return (App.state.trades || [])
      .filter(t => t.userId === u.id && t.accountType === accountMode && t.tradeType === type)
      .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
  }

  function pnlValue() {
    const u = user();
    if (!u) return 0;
    return App.state.trades
      .filter(t => t.userId === u.id && t.accountType === accountMode && t.status === "CLOSED")
      .reduce((sum, t) => sum + Number(t.pnl || 0), 0);
  }

  function selectedPairData() {
    const row = pairsForMarket().find(p => p.pair === selectedPair) || pairsForMarket()[0];
    return App.pairLiveView ? App.pairLiveView(row) : row;
  }

  function ensurePairForMarket() {
    const list = pairsForMarket();
    if (!list.some(p => p.pair === selectedPair)) {
      selectedPair = list[0].pair;
      localStorage.setItem("AITradeX_SELECTED_PAIR", selectedPair);
    }
  }

  function changeClass(value) {
    return String(value || "").trim().startsWith("-") ? "loss-text" : "profit-text";
  }

  function pairView(item) {
    return App.pairLiveView ? App.pairLiveView(item) : item;
  }

  function liveAttr(pair) {
    return `data-live-pair="${App.escapeHtml(pair)}"`;
  }

  function applyLivePriceRow(row) {
    if (!row || !row.ok) return;
    document.querySelectorAll(`[data-live-pair="${CSS.escape(row.pair)}"]`).forEach(el => {
      const type = el.getAttribute("data-live-type") || "price";
      if (type === "price") {
        el.textContent = row.display;
        el.classList.add("live-price-tick");
        setTimeout(() => el.classList.remove("live-price-tick"), 350);
      }
      if (type === "change") {
        el.textContent = row.change || "Live";
        el.classList.toggle("profit-text", row.mood !== "down");
        el.classList.toggle("loss-text", row.mood === "down");
      }
      if (type === "line") el.innerHTML = `${row.display} · <em class="${row.mood === "down" ? "loss-text" : "profit-text"}">${row.change || "Live"}</em> · ${row.source}`;
      if (type === "source") el.textContent = row.source || "Live API";
    });
    updateManualLiveBar();
  }

  function refreshVisiblePrices(items) {
    const baseList = (items || []).map(p => typeof p === "string" ? p : p.pair).filter(Boolean);
    const openList = manualOpenPositions().map(position => position.pair).filter(Boolean);
    const list = [...new Set([...baseList, ...openList])];
    if (!list.length) return;

    if (App.refreshLivePrices) App.refreshLivePrices(list, applyLivePriceRow);
    if (App.startCryptoLiveTicker) App.startCryptoLiveTicker(list, applyLivePriceRow);
    if (App.startMetalChartTicker) App.startMetalChartTicker(list, applyLivePriceRow);

    if (priceRefreshTimer) clearInterval(priceRefreshTimer);
    priceRefreshTimer = setInterval(() => {
      if (App.refreshLivePrices) App.refreshLivePrices(list.filter(pair => !(App.isCryptoPair && App.isCryptoPair(pair)) && !(App.isMetalPair && App.isMetalPair(pair))), applyLivePriceRow);
    }, 60000);
  }

  function selectorSheetHtml() {
    if (!selectorSheet) return "";

    if (selectorSheet === "pair") {
      return `
        <div class="sheet-backdrop" onclick="AITradeXUser.closeSheet()"></div>
        <section class="selector-sheet">
          <div class="sheet-handle"></div>
          <div class="sheet-title">
            <div><p>${selectedMarket}</p><h3>Select Pair</h3></div>
            <button onclick="AITradeXUser.closeSheet()">×</button>
          </div>
          <div class="sheet-grid pair-sheet-grid">
            ${pairsForMarket().map(raw => { const p = pairView(raw); return `
              <button class="${selectedPair === p.pair ? "active" : ""}" onclick="AITradeXUser.selectPair('${p.pair}')">
                <b>${p.pair}</b>
                <span data-live-pair="${p.pair}" data-live-type="price">${p.price}</span>
                <em data-live-pair="${p.pair}" data-live-type="change" class="${changeClass(p.change)}">${p.change}</em>
              </button>
            `; }).join("")}
          </div>
        </section>`;
    }

    if (selectorSheet === "leverage") {
      return `
        <div class="sheet-backdrop" onclick="AITradeXUser.closeSheet()"></div>
        <section class="selector-sheet compact-sheet">
          <div class="sheet-handle"></div>
          <div class="sheet-title">
            <div><p>LEVERAGE</p><h3>Select Leverage</h3></div>
            <button onclick="AITradeXUser.closeSheet()">×</button>
          </div>
          <div class="sheet-grid leverage-sheet-grid">
            ${leverageOptions.map(x => `
              <button class="${tradeLeveragePreview === x ? "active" : ""}" onclick="AITradeXUser.setTradeLeverage(${x});AITradeXUser.closeSheet();">${x}x</button>
            `).join("")}
          </div>
        </section>`;
    }

    if (selectorSheet === "chart-settings") {
      return `
        <div class="sheet-backdrop" onclick="AITradeXUser.closeSheet()"></div>
        <section class="selector-sheet compact-sheet chart-settings-sheet">
          <div class="sheet-handle"></div>
          <div class="sheet-title">
            <div><p>CHART</p><h3>Chart Settings</h3></div>
            <button onclick="AITradeXUser.closeSheet()">×</button>
          </div>

          <div class="settings-block">
            <span>Chart Type</span>
            <div class="settings-chips">
              <button class="${chartStyle === "1" ? "active" : ""}" onclick="AITradeXUser.setChartStyle('1')">Candles</button>
              <button class="${chartStyle === "2" ? "active" : ""}" onclick="AITradeXUser.setChartStyle('2')">Line</button>
              <button class="${chartStyle === "3" ? "active" : ""}" onclick="AITradeXUser.setChartStyle('3')">Area</button>
            </div>
          </div>

          <div class="settings-block">
            <span>Theme</span>
            <div class="settings-chips">
              <button class="${chartTheme === "dark" ? "active" : ""}" onclick="AITradeXUser.setChartTheme('dark')">Dark</button>
              <button class="${chartTheme === "light" ? "active" : ""}" onclick="AITradeXUser.setChartTheme('light')">Light</button>
            </div>
          </div>

          <div class="settings-block">
            <span>TradingView Toolbar</span>
            <div class="settings-chips">
              <button class="${chartToolbar ? "active" : ""}" onclick="AITradeXUser.setChartToolbar(true)">Show</button>
              <button class="${!chartToolbar ? "active" : ""}" onclick="AITradeXUser.setChartToolbar(false)">Hide</button>
            </div>
          </div>
        </section>`;
    }

    return "";
  }

  function renderTradingViewChart(symbol) {
    const container = document.getElementById("tradingview_chart_container");
    if (!container) return;

    container.innerHTML = `
      <div class="chart-loading-state" id="aitx_chart_loader">
        <div class="chart-spinner"></div>
        <b>${symbol}</b>
        <span>Loading TradingView chart...</span>
      </div>`;

    if (!window.TradingView || !window.TradingView.widget) {
      setTimeout(() => renderTradingViewChart(symbol), 800);
      return;
    }

    setTimeout(() => {
      const freshContainer = document.getElementById("tradingview_chart_container");
      if (!freshContainer) return;

      freshContainer.innerHTML = `
        <div class="chart-loading-state" id="aitx_chart_loader">
          <div class="chart-spinner"></div>
          <b>${symbol}</b>
          <span>Loading TradingView chart...</span>
        </div>`;

      new window.TradingView.widget({
        autosize: true,
        symbol,
        interval: chartInterval,
        timezone: "Asia/Kolkata",
        theme: chartTheme,
        style: chartStyle,
        locale: "en",
        toolbar_bg: chartTheme === "dark" ? "#050814" : "#ffffff",
        enable_publishing: false,
        hide_top_toolbar: !chartToolbar,
        hide_side_toolbar: !chartToolbar,
        allow_symbol_change: false,
        save_image: false,
        withdateranges: chartToolbar,
        calendar: false,
        support_host: "https://www.tradingview.com",
        container_id: "tradingview_chart_container"
      });

      const revealChart = () => {
        const frame = freshContainer.querySelector("iframe");
        const loader = document.getElementById("aitx_chart_loader");
        if (frame) {
          frame.classList.add("aitx-tv-ready");
          if (loader) loader.classList.add("hide-loader");
          setTimeout(() => loader?.remove(), 450);
          return true;
        }
        return false;
      };

      const watch = setInterval(() => {
        if (revealChart()) clearInterval(watch);
      }, 120);

      setTimeout(() => {
        clearInterval(watch);
        revealChart();
      }, 4500);
    }, 80);
  }

  function scheduleTradingViewChart() {
    const pair = selectedPairData();
    setTimeout(() => renderTradingViewChart(pair.symbol), 80);
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

  function userKey(name) {
    const u = user();
    return u ? `AITradeX_${name}_${u.id}` : "";
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

  function platformSettings() {
    const defaults = {
      minDeposit: 500,
      minWithdrawal: 1000,
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

  function jsArg(value) {
    return JSON.stringify(String(value ?? ""));
  }

  function currentKyc() {
    const u = user();
    if (!u) return null;
    return readJson(userKey("KYC"), {
      status: "NOT_SUBMITTED",
      personal: {
        fullName: displayName(),
        mobile: u.mobile || "",
        email: u.email || "",
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

  function saveKycData(data) {
    writeJson(userKey("KYC"), data);
    syncKycToState(data);
  }

  function syncKycToState(data) {
    const u = user();
    if (!u || !App.state.kycRequests) return;

    const existing = App.state.kycRequests.find(x => x.userId === u.id);
    const row = {
      id: existing?.id || App.uid("kyc"),
      userId: u.id,
      status: data.status,
      personal: data.personal,
      idDetails: data.id,
      uploads: data.uploads,
      submittedAt: data.submittedAt || "",
      rejectReason: data.rejectReason || "",
      updatedAt: App.now()
    };

    if (existing) Object.assign(existing, row);
    else App.state.kycRequests.push(row);

    App.saveState();
  }

  function syncPaymentMethodsToState(methods) {
    const u = user();
    if (!u || !App.state.paymentMethods) return;

    App.state.paymentMethods = App.state.paymentMethods.filter(m => m.userId !== u.id);
    methods.forEach(m => {
      App.state.paymentMethods.push({
        ...m,
        userId: u.id,
        source: "USER_PAYMENT_METHOD"
      });
    });

    App.saveState();
  }

  function verifiedKycName() {
    const kyc = currentKyc();
    return kyc?.personal?.fullName || displayName();
  }

  function paymentMethods() {
    return readJson(userKey("PAYMENT_METHODS"), []);
  }

  function savePaymentMethods(methods) {
    writeJson(userKey("PAYMENT_METHODS"), methods);
    syncPaymentMethodsToState(methods);
  }

  function paymentCounts() {
    const methods = paymentMethods();
    return {
      UPI: methods.filter(m => m.type === "UPI").length,
      BANK: methods.filter(m => m.type === "BANK").length
    };
  }

  function approvedPaymentMethods() {
    return paymentMethods().filter(m => m.status === "APPROVED");
  }

  function depositRequests() {
    return readJson(userKey("DEPOSIT_REQUESTS"), []);
  }

  function normalizeUtr(value) {
    return String(value || "").replace(/\D/g, "").slice(0, 12);
  }

  function isDuplicateDepositUtr(utr) {
    const cleanUtr = normalizeUtr(utr);
    if (!cleanUtr) return false;

    const localDuplicate = depositRequests().some(r => normalizeUtr(r.utr) === cleanUtr);
    const stateDuplicate = (App.state.depositRequests || []).some(r => normalizeUtr(r.utr) === cleanUtr);

    return localDuplicate || stateDuplicate;
  }

  function saveDepositRequests(requests) {
    writeJson(userKey("DEPOSIT_REQUESTS"), requests);
    syncDepositRequestsToState(requests);
  }

  function withdrawalRequests() {
    return readJson(userKey("WITHDRAWAL_REQUESTS"), []);
  }

  function saveWithdrawalRequests(requests) {
    writeJson(userKey("WITHDRAWAL_REQUESTS"), requests);
    syncWithdrawalRequestsToState(requests);
  }

  function syncDepositRequestsToState(requests) {
    const u = user();
    if (!u || !App.state.depositRequests) return;

    App.state.depositRequests = App.state.depositRequests.filter(r => r.userId !== u.id);
    requests.forEach(r => App.state.depositRequests.push({ ...r, userId: u.id }));
    App.saveState();
  }

  function syncWithdrawalRequestsToState(requests) {
    const u = user();
    if (!u || !App.state.withdrawalRequests) return;

    App.state.withdrawalRequests = App.state.withdrawalRequests.filter(r => r.userId !== u.id);
    requests.forEach(r => App.state.withdrawalRequests.push({ ...r, userId: u.id }));
    App.saveState();
  }

  function pendingDepositAmount() {
    return depositRequests()
      .filter(r => r.status === "PENDING")
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }

  function pendingWithdrawalAmount() {
    return withdrawalRequests()
      .filter(r => r.status === "PENDING")
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }

  function availableRealBalance() {
    return Math.max(0, realBalance() - pendingWithdrawalAmount());
  }

  function methodLabel(method) {
    if (!method) return "-";
    if (method.type === "UPI") return `${method.upiId} · ${method.holderName}`;
    return `${method.bankName} · ****${String(method.accountNumber || "").slice(-4)} · ${method.holderName}`;
  }

  function statusPill(status) {
    const clean = String(status || "NOT_SUBMITTED").replaceAll("_", " ");
    const cls = String(status || "").toLowerCase().replaceAll("_", "-");
    return `<span class="status-pill ${cls}">${clean}</span>`;
  }

  function maskDocNumber(value) {
    const text = String(value || "");
    if (text.length <= 4) return text || "-";
    return "XXXXXX" + text.slice(-4);
  }

  function kycDetailsGrid(kyc, title = "Verified Details") {
    return `
      <section class="premium-card kyc-result-details">
        <p>${title}</p>
        <h2>${App.escapeHtml(kyc.personal.fullName || "-")}</h2>
        <div class="review-grid">
          <article><span>Full Name</span><b>${App.escapeHtml(kyc.personal.fullName || "-")}</b></article>
          <article><span>Mobile</span><b>${App.escapeHtml(kyc.personal.mobile || "-")}</b></article>
          <article><span>Email</span><b>${App.escapeHtml(kyc.personal.email || "-")}</b></article>
          <article><span>DOB</span><b>${App.escapeHtml(kyc.personal.dob || "-")}</b></article>
          <article><span>Document</span><b>${App.escapeHtml(kyc.id.type || "-")}</b></article>
          <article><span>Document No.</span><b>${App.escapeHtml(maskDocNumber(kyc.id.number))}</b></article>
          <article><span>ID Front</span><b>${App.escapeHtml(kyc.uploads.frontName || "-")}</b></article>
          <article><span>ID Back</span><b>${App.escapeHtml(kyc.uploads.backName || "-")}</b></article>
          <article><span>Selfie</span><b>${App.escapeHtml(kyc.uploads.selfieName || "-")}</b></article>
          ${kyc.submittedAt ? `<article><span>Submitted On</span><b>${new Date(kyc.submittedAt).toLocaleString()}</b></article>` : ""}
          ${kyc.approvedAt ? `<article><span>Approved On</span><b>${new Date(kyc.approvedAt).toLocaleString()}</b></article>` : ""}
          ${kyc.rejectedAt ? `<article><span>Rejected On</span><b>${new Date(kyc.rejectedAt).toLocaleString()}</b></article>` : ""}
        </div>
      </section>`;
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
        ${selectorSheetHtml()}
        ${manualLiveBarHtml()}
        ${manualCloseSelectorHtml()}
        ${bottomNav()}
      </div>`;
    updateManualLiveBar();
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
    const ai = currentAiSettings();
    const usage = aiDailyUsage();
    const tradeAmount = accountMode === "REAL" ? balance * ai.percent / 100 : 0;
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
        ${allTrendingPairs().map(raw => { const p = pairView(raw); return `
          <article class="ticker-card ${p.mood} ${selectedPair === p.pair ? "selected" : ""}" onclick="AITradeXUser.selectPair('${p.pair}')">
            <div><h3>${p.pair}</h3><small data-live-pair="${p.pair}" data-live-type="source">${p.priceSource || p.inr}</small></div>
            <strong data-live-pair="${p.pair}" data-live-type="price">${p.price}</strong>
            <span data-live-pair="${p.pair}" data-live-type="change" class="${changeClass(p.change)}">${p.change}</span>
          </article>`; }).join("")}
      </section>

      <section class="compact-grid">
        <article><span>AI Status</span><b>${ai.enabled ? "Active" : "OFF"}</b><small>${usage.used}/${usage.limit} AI trades today</small></article>
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
          <button class="ai-power ${ai.enabled ? "on" : ""}" onclick="AITradeXUser.toggleAutoTrade()">${ai.enabled ? "ON" : "OFF"}</button>
        </div>
        <div class="percent-grid">
          ${[25, 50, 75, 100].map(v => `<button class="${ai.percent === v ? "active" : ""}" onclick="AITradeXUser.setAutoPercent(${v})">${v}%</button>`).join("")}
        </div>
        <div class="auto-summary">
          <article><span>Selected</span><b>${ai.percent}%</b></article>
          <article><span>AI Trade Pool</span><b>${App.money(tradeAmount)}</b></article>
          <article><span>Daily AI Trades</span><b>${usage.used}/${usage.limit}</b></article>
        </div>
      </section>
    `);
    refreshVisiblePrices(allTrendingPairs());
  }

  function tradePage() {
    const pair = selectedPairData();
    const balance = currentBalance();
    const positionSize = tradeAmountPreview * tradeLeveragePreview;

    shell(`
      <section class="trade-command clean-pair-card">
        <div>
          <p>${selectedMarket} MARKET</p>
          <h1>${selectedPair}</h1>
          <span data-live-pair="${pair.pair}" data-live-type="line">${pair.price} · ${pair.inr} · <em class="${changeClass(pair.change)}">${pair.change}</em></span>
        </div>
        <button class="change-pair-btn" onclick="AITradeXUser.openSheet('pair')">Change Pair</button>
      </section>

      <section class="trade-select-bar app-selector-bar market-only-bar">
        <div class="market-switch">
          <button class="${selectedMarket === "CRYPTO" ? "active" : ""}" onclick="AITradeXUser.setMarket('CRYPTO')">Crypto</button>
          <button class="${selectedMarket === "FOREX" ? "active" : ""}" onclick="AITradeXUser.setMarket('FOREX')">Forex</button>
        </div>
      </section>

      <section class="pair-rate-list">
        ${pairsForMarket().map(raw => { const p = pairView(raw); return `
          <button class="${selectedPair === p.pair ? "active" : ""}" onclick="AITradeXUser.selectPair('${p.pair}')">
            <b>${p.pair}</b>
            <span data-live-pair="${p.pair}" data-live-type="price">${p.price}</span>
            <em data-live-pair="${p.pair}" data-live-type="change" class="${changeClass(p.change)}">${p.change}</em>
          </button>
        `; }).join("")}
      </section>

      <section class="chart-shell tradingview-shell">
        <div class="chart-toolbar working-timeframes">
          ${[
            ["1", "1m"],
            ["5", "5m"],
            ["15", "15m"],
            ["30", "30m"],
            ["60", "1h"],
            ["240", "4h"],
            ["D", "1D"]
          ].map(([value, label]) => `<button class="${chartInterval === value ? "active" : ""}" onclick="AITradeXUser.setChartInterval('${value}')">${label}</button>`).join("")}
          <button class="chart-settings-btn" onclick="AITradeXUser.openSheet('chart-settings')">⚙</button>
        </div>
        <div class="responsive-chart tradingview-widget-frame">
          <div id="tradingview_chart_container" class="tradingview-chart-container"></div>
        </div>
      </section>

      <section class="premium-card order-ticket pro-order-ticket">
        <div class="card-row">
          <div>
            <p>ORDER TICKET</p>
            <h2>Buy / Sell Order</h2>
            <span class="ticket-mode">${accountMode} account selected from Home</span>
          </div>
          <span class="ticket-chip">${selectedMarket}</span>
        </div>

        <div class="trade-account-mini ${accountMode.toLowerCase()}">
          <div><span>Account</span><b>${accountMode}</b></div>
          <div><span>Available</span><b>${App.money(balance)}</b></div>
        </div>

        <div class="form-row">
          <label>Order Type<select><option>Market</option><option>Limit</option></select></label>
          <div class="app-field">
            <span>Leverage</span>
            <button class="app-select-btn full" onclick="AITradeXUser.openSheet('leverage')">
              <b>${tradeLeveragePreview}x</b>
              <em>Change</em>
            </button>
          </div>
        </div>

        <label>Margin Amount
          <input type="number" value="${tradeAmountPreview}" min="1" oninput="AITradeXUser.setTradeAmount(this.value)" placeholder="Enter INR amount"/>
        </label>

        <div class="trade-preview-grid">
          <article><span>Available</span><b>${App.money(balance)}</b></article>
          <article><span>Margin</span><b data-trade-preview-margin>${App.money(tradeAmountPreview)}</b></article>
          <article><span>Leverage</span><b>${tradeLeveragePreview}x</b></article>
          <article><span>Position Size</span><b data-trade-preview-position>${App.money(positionSize)}</b></article>
        </div>

        <div class="form-row">
          <label>Take Profit Optional<input placeholder="TP price"/></label>
          <label>Stop Loss Optional<input placeholder="SL price"/></label>
        </div>

        <div class="buy-sell-row">
          <button class="buy-btn" onclick="AITradeXUser.placeManualTrade('BUY')">BUY / LONG</button>
          <button class="sell-btn" onclick="AITradeXUser.placeManualTrade('SELL')">SELL / SHORT</button>
        </div>

        <div class="confirm-summary">
          <b>Order Summary</b>
          <span data-trade-preview-summary>${selectedMarket} · ${selectedPair} · ${accountMode} · Margin ${App.money(tradeAmountPreview)} · Position ${App.money(positionSize)}</span>
        </div>
      </section>

      <section class="premium-card market-feed-card">
        <div class="card-row">
          <div><p>MARKET FEED</p><h2>${selectedMarket === "CRYPTO" ? "Crypto Depth" : "Forex Bid / Ask"}</h2></div>
          <span class="mini-live">LIVE</span>
        </div>
        <div class="depth-table pair-market-feed">
          <span>Metric</span><span>Value</span><span>Signal</span>
          ${marketFeedForPair().map(row => `
            <b>${row.left}</b>
            <b>${row.mid}</b>
            <b class="${row.mood === "up" ? "profit-text" : "loss-text"}">${row.right}</b>
          `).join("")}
        </div>
      </section>

      <section class="premium-card trade-feed-card">
        <div class="card-row">
          <div><p>TRADE FEED</p><h2>${selectedPair} Activity</h2></div>
          <span class="history-mode">${selectedMarket}</span>
        </div>
        <div class="trade-feed-list">
          ${tradeFeedForMarket().map(item => `
            <article class="${item.pair === selectedPair ? "active" : ""}">
              <div>
                <b>${item.pair}</b>
                <span>${item.action} · ${item.lev} · ${item.time}</span>
              </div>
              <div>
                <strong>${item.size}</strong>
                <em class="${changeClass(item.change)}">${item.change}</em>
              </div>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="premium-card">
        <p>OPEN POSITIONS</p>
        <h2>Active Manual Trades</h2>
        ${manualOpenPositions().length ? `
          <div class="manual-open-list">
            ${manualOpenPositions().map(position => {
              const pnl = manualPositionPnl(position);
              return `
                <article>
                  <div><b>${App.escapeHtml(position.pair)}</b><span>${App.escapeHtml(position.side)} · ${Number(position.leverage || 1)}x · ${App.escapeHtml(position.accountType || accountMode)} · Entry ${App.escapeHtml(position.entryPriceDisplay || String(position.entryPrice || "--"))} · Live <em data-manual-current="${position.id}">${App.escapeHtml(positionCurrentDisplay(position))}</em></span></div>
                  <strong data-manual-pnl="${position.id}" class="${pnl >= 0 ? "profit-text" : "loss-text"}">${pnl >= 0 ? "+" : ""}${App.money(pnl)}</strong>
                </article>`;
            }).join("")}
          </div>
        ` : `<div class="empty-state">No active manual positions yet.</div>`}
      </section>
    `);

    refreshVisiblePrices(pairsForMarket());
    scheduleTradingViewChart();
  }
  function walletPage() {
    if (accountMode === "DEMO") {
      shell(`
        <section class="demo-wallet-center">
          <div class="demo-wallet-card">
            <div class="demo-wallet-icon">🧪</div>
            <p>DEMO ACCOUNT MODE</p>
            <h1>You are now in Demo Account Mode</h1>
            <h4>Deposit and withdrawal features are not available in demo mode. Demo balance is only for practice trading.</h4>
            <div class="demo-wallet-balance">
              <span>Demo Balance</span>
              <b>${App.money(demoBalance())}</b>
            </div>
            <button onclick="AITradeXUser.setAccountMode('REAL')">Switch to Real Account</button>
          </div>
        </section>
      `);
      return;
    }

    const kyc = currentKyc();
    const approvedMethods = approvedPaymentMethods();
    const deposits = depositRequests();
    const withdrawals = withdrawalRequests();
    const settings = platformSettings();
    const minDeposit = Number(settings.minDeposit || 500);
    const minWithdrawal = Number(settings.minWithdrawal || 1000);
    const selectedWithdrawalMethod = approvedMethods.find(m => m.id === withdrawalDraft.methodId) || approvedMethods[0] || null;
    const depositTitles = ["Enter Amount", "Select Payment Method", "Payment Details", "Review & Submit"];
    const withdrawalTitles = ["Enter Amount", "Select Approved Method", "Review Withdrawal", "Submit Request"];
    const platformUpi = settings.depositUpiId || "aitradex@upi";
    const bankDetails = {
      accountName: settings.depositAccountName || "AITradeX Private Wallet",
      bankName: settings.depositBankName || "AITradeX Bank",
      accountNumber: settings.depositAccountNumber || "123456789012",
      ifsc: settings.depositIfsc || "AITX0001234"
    };

    shell(`
      <section class="wallet-hero-card compact-wallet-head">
        <div class="card-row">
          <div>
            <p>REAL WALLET</p>
            <h1>${walletMode === "DEPOSIT" ? "Deposit Center" : "Withdrawal Center"}</h1>
            <span class="ticket-mode">Real account wallet operations only.</span>
          </div>
          ${statusPill(kyc.status)}
        </div>

        <div class="wallet-focus-grid ${walletMode.toLowerCase()}">
          <article>
            <span>Available Balance</span>
            <b>${App.money(availableRealBalance())}</b>
          </article>
          ${walletMode === "DEPOSIT" ? `
            <article>
              <span>Pending Deposit</span>
              <b>${App.money(pendingDepositAmount())}</b>
            </article>
          ` : `
            <article>
              <span>Pending Withdrawal</span>
              <b>${App.money(pendingWithdrawalAmount())}</b>
            </article>
          `}
        </div>
      </section>

      <section class="wallet-flow-tabs">
        <button class="${walletMode === "DEPOSIT" ? "active" : ""}" onclick="AITradeXUser.setWalletMode('DEPOSIT')">Deposit</button>
        <button class="${walletMode === "WITHDRAWAL" ? "active" : ""}" onclick="AITradeXUser.setWalletMode('WITHDRAWAL')">Withdrawal</button>
      </section>

      ${walletMode === "DEPOSIT" ? `
        <section class="premium-card wallet-flow-card premium-wallet-flow">
          <div class="wallet-flow-head">
            <div>
              <p>DEPOSIT REQUEST</p>
              <h2>${depositTitles[depositStep - 1]}</h2>
            </div>
            <span>Step ${depositStep}/4</span>
          </div>

          ${depositStep === 1 ? `
            <label>Deposit Amount
              <input id="depositAmountInput" type="number" min="${minDeposit}" value="${App.escapeHtml(depositDraft.amount)}" placeholder="Minimum ${App.money(minDeposit)}"/>
            </label>
            <div class="profile-note">Minimum deposit amount is ${App.money(minDeposit)}.</div>
          ` : ""}

          ${depositStep === 2 ? `
            <div class="wallet-method-choice compact-method-choice">
              <button class="${depositDraft.type === "UPI" ? "active" : ""}" onclick="AITradeXUser.setDepositType('UPI')">
                <b>UPI / QR</b>
                <span>Instant payment via UPI</span>
              </button>
              <button class="${depositDraft.type === "BANK" ? "active" : ""}" onclick="AITradeXUser.setDepositType('BANK')">
                <b>Bank Transfer</b>
                <span>NEFT / IMPS / Bank transfer</span>
              </button>
            </div>
          ` : ""}

          ${depositStep === 3 ? `
            ${depositDraft.type === "UPI" ? `
              <div class="upi-pay-card">
                <div class="qr-large-box">
                  ${settings.depositQrImage ? `<img src="${App.escapeHtml(settings.depositQrImage)}" alt="Deposit QR"/>` : `<div class="qr-grid-mark">QR</div>`}
                </div>
                <div class="upi-pay-info">
                  <p>PAY VIA UPI</p>
                  <h2>${platformUpi}</h2>
                  <span>Pay exact amount: ${App.money(depositDraft.amount || 0)}</span>
                  <div class="copy-row">
                    <b>UPI ID</b>
                    <span>${platformUpi}</span>
                    <button onclick="AITradeXUser.copyText(${jsArg(platformUpi)})">Copy</button>
                  </div>
                  <div class="copy-row">
                    <b>Amount</b>
                    <span>${App.money(depositDraft.amount || 0)}</span>
                    <button onclick="AITradeXUser.copyText(${jsArg(depositDraft.amount || 0)})">Copy</button>
                  </div>
                </div>
              </div>
            ` : `
              <div class="premium-bank-card">
                <div class="copy-row">
                  <b>Account Name</b>
                  <span>${bankDetails.accountName}</span>
                  <button onclick="AITradeXUser.copyText(${jsArg(bankDetails.accountName)})">Copy</button>
                </div>
                <div class="copy-row">
                  <b>Bank Name</b>
                  <span>${bankDetails.bankName}</span>
                  <button onclick="AITradeXUser.copyText(${jsArg(bankDetails.bankName)})">Copy</button>
                </div>
                <div class="copy-row">
                  <b>Account Number</b>
                  <span>${bankDetails.accountNumber}</span>
                  <button onclick="AITradeXUser.copyText(${jsArg(bankDetails.accountNumber)})">Copy</button>
                </div>
                <div class="copy-row">
                  <b>IFSC Code</b>
                  <span>${bankDetails.ifsc}</span>
                  <button onclick="AITradeXUser.copyText(${jsArg(bankDetails.ifsc)})">Copy</button>
                </div>
                <div class="copy-row">
                  <b>Amount</b>
                  <span>${App.money(depositDraft.amount || 0)}</span>
                  <button onclick="AITradeXUser.copyText(${jsArg(depositDraft.amount || 0)})">Copy</button>
                </div>
              </div>
            `}
            <label>UTR / Transaction ID
              <input id="depositUtrInput" type="text" inputmode="numeric" maxlength="12" pattern="[0-9]{12}" value="${App.escapeHtml(normalizeUtr(depositDraft.utr))}" placeholder="Enter 12 digit UTR" oninput="this.value=this.value.replace(/\D/g,'').slice(0,12)"/>
            </label>
            <div class="profile-note">Only a unique 12 digit UTR is accepted.</div>
          ` : ""}

          ${depositStep === 4 ? `
            <div class="review-grid compact-review">
              <article><span>Amount</span><b>${App.money(depositDraft.amount || 0)}</b></article>
              <article><span>Payment Type</span><b>${depositDraft.type}</b></article>
              <article><span>UTR</span><b>${App.escapeHtml(depositDraft.utr || "-")}</b></article>
              <article><span>Status</span><b>Will be Pending</b></article>
            </div>
          ` : ""}

          <div class="wizard-actions">
            <button class="btn ghost" onclick="AITradeXUser.prevDepositStep()" ${depositStep === 1 ? "disabled" : ""}>Back</button>
            ${depositStep < 4 ? `<button class="btn" onclick="AITradeXUser.nextDepositStep()">Next</button>` : `<button class="btn" onclick="AITradeXUser.submitDepositRequest()">Submit Deposit</button>`}
          </div>
        </section>
      ` : `
        <section class="premium-card wallet-flow-card premium-wallet-flow">
          <div class="wallet-flow-head">
            <div>
              <p>WITHDRAWAL REQUEST</p>
              <h2>${withdrawalTitles[withdrawalStep - 1]}</h2>
            </div>
            <span>Step ${withdrawalStep}/4</span>
          </div>

          ${kyc.status !== "APPROVED" ? `
            <div class="kyc-required-box">KYC approval is required before withdrawal.</div>
            <button class="save-profile-btn" onclick="AITradeXUser.go('kyc')">Go to KYC</button>
          ` : approvedMethods.length === 0 ? `
            <div class="kyc-required-box">No approved withdrawal method found. Add UPI/Bank in Payment Methods and wait for admin approval.</div>
            <button class="save-profile-btn" onclick="AITradeXUser.go('payments')">Go to Payment Methods</button>
          ` : `
            ${withdrawalStep === 1 ? `
              <label>Withdrawal Amount
                <input id="withdrawalAmountInput" type="number" min="${minWithdrawal}" value="${App.escapeHtml(withdrawalDraft.amount)}" placeholder="Minimum ${App.money(minWithdrawal)}"/>
              </label>
              <div class="profile-note">Minimum withdrawal amount is ${App.money(minWithdrawal)}. Available balance: ${App.money(availableRealBalance())}</div>
            ` : ""}

            ${withdrawalStep === 2 ? `
              <div class="approved-method-list premium-approved-list">
                ${approvedMethods.map(m => `
                  <button class="${(withdrawalDraft.methodId || selectedWithdrawalMethod?.id) === m.id ? "active" : ""}" onclick="AITradeXUser.selectWithdrawalMethod('${m.id}')">
                    <b>${m.type === "UPI" ? "UPI" : "Bank"}</b>
                    <span>${App.escapeHtml(methodLabel(m))}</span>
                  </button>
                `).join("")}
              </div>
              <div class="profile-note">Only admin-approved methods are available. New account entry is not allowed during withdrawal.</div>
            ` : ""}

            ${withdrawalStep === 3 || withdrawalStep === 4 ? `
              <div class="review-grid compact-review">
                <article><span>Amount</span><b>${App.money(withdrawalDraft.amount || 0)}</b></article>
                <article><span>Method</span><b>${selectedWithdrawalMethod?.type || "-"}</b></article>
                <article><span>Pay To</span><b>${App.escapeHtml(methodLabel(selectedWithdrawalMethod))}</b></article>
                <article><span>Status</span><b>Will be Pending</b></article>
              </div>
              <div class="profile-note">After submit, this amount will be counted as pending withdrawal until admin approval/rejection.</div>
            ` : ""}

            <div class="wizard-actions">
              <button class="btn ghost" onclick="AITradeXUser.prevWithdrawalStep()" ${withdrawalStep === 1 ? "disabled" : ""}>Back</button>
              ${withdrawalStep < 4 ? `<button class="btn" onclick="AITradeXUser.nextWithdrawalStep()">Next</button>` : `<button class="btn" onclick="AITradeXUser.submitWithdrawalRequest()">Submit Withdrawal</button>`}
            </div>
          `}
        </section>
      `}

      <section class="premium-card wallet-history-card compact-wallet-history">
        <p>WALLET HISTORY</p>
        <h2>Requests</h2>
        <div class="wallet-request-list">
          ${[...deposits.map(r => ({ ...r, kind: "Deposit" })), ...withdrawals.map(r => ({ ...r, kind: "Withdrawal" }))]
            .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0))
            .map(r => `
              <article class="${String(r.status || "").toLowerCase()}">
                <div>
                  <b>${r.kind} · ${App.money(r.amount)}</b>
                  <span>${r.kind === "Deposit" ? `${r.type} · UTR ${App.escapeHtml(r.utr || "-")}` : App.escapeHtml(methodLabel(r.methodSnapshot))}</span>
                  <small>${r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</small>
                </div>
                ${statusPill(r.status)}
              </article>
            `).join("") || `<div class="empty-state">No wallet requests yet.</div>`}
        </div>
      </section>
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

  function formatHistoryDate(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function historyStatus(t) {
    const reason = String(t.closeReason || "").toUpperCase();
    if (reason === "AUTO_RISK_CLOSE") return "Auto Closed";
    return App.escapeHtml(t.status || "Closed").replace(/_/g, " ");
  }

  function tradeHistoryCard(t, type) {
    const pnl = Number(t.pnl || 0);
    const profit = pnl >= 0;
    const title = type === "AI_AUTO" ? "AI Auto Trade" : "Manual Trade";
    const entry = t.entryPriceDisplay || (t.entryPrice ? String(t.entryPrice) : "-");
    const close = t.exitPriceDisplay || (t.exitPrice ? String(t.exitPrice) : (type === "AI_AUTO" ? "Settled" : "-"));
    const amountLabel = type === "AI_AUTO" ? "AI Amount" : "Margin";
    const timeLabel = type === "AI_AUTO" ? "Executed" : "Closed";
    const resultLine = type === "AI_AUTO"
      ? `${App.escapeHtml(t.resultType || (profit ? "PROFIT" : "LOSS"))} ${Number(t.resultPercent || 0)}%`
      : historyStatus(t);

    return `
      <article class="history-trade-card ${profit ? "profit" : "loss"}">
        <div class="history-trade-top">
          <div>
            <p>${title}</p>
            <h3>${App.escapeHtml(t.pair || "-")} <span>${App.escapeHtml(t.side || "-")}</span></h3>
          </div>
          <strong class="${profit ? "profit-text" : "loss-text"}">${profit ? "+" : ""}${App.money(pnl)}</strong>
        </div>
        <div class="history-trade-meta">
          <span>${App.escapeHtml(t.market || "-")}</span>
          <span>${Number(t.leverage || 1)}x</span>
          <span>${resultLine}</span>
        </div>
        <div class="history-trade-grid">
          <article><span>Entry Price</span><b>${App.escapeHtml(entry)}</b></article>
          <article><span>${type === "AI_AUTO" ? "Settlement" : "Close Price"}</span><b>${App.escapeHtml(close)}</b></article>
          <article><span>${amountLabel}</span><b>${App.money(t.marginAmount || t.amount || 0)}</b></article>
          <article><span>Exposure</span><b>${App.money(t.positionSize || ((t.marginAmount || t.amount || 0) * Number(t.leverage || 1)))}</b></article>
          <article><span>Opened</span><b>${formatHistoryDate(t.openedAt || t.createdAt)}</b></article>
          <article><span>${timeLabel}</span><b>${formatHistoryDate(t.closedAt || t.createdAt)}</b></article>
        </div>
        <div class="history-trade-foot">
          <span>${App.escapeHtml(t.priceSource || "Live price")}</span>
          <b>${type === "AI_AUTO" ? "AI Auto" : "Manual"}</b>
        </div>
      </article>`;
  }

  function historyCards(rows, type, emptyText) {
    if (!rows.length) return `<div class="empty-state">${emptyText}</div>`;
    return `<div class="unified-history-grid">${rows.map(t => tradeHistoryCard(t, type)).join("")}</div>`;
  }

  function historySummaryCard(label, rows) {
    const total = rows.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
    const wins = rows.filter(t => Number(t.pnl || 0) >= 0).length;
    const losses = rows.filter(t => Number(t.pnl || 0) < 0).length;
    return `
      <article>
        <span>${label}</span>
        <b class="${total >= 0 ? "profit-text" : "loss-text"}">${total >= 0 ? "+" : ""}${App.money(total)}</b>
        <small>${rows.length} closed · ${wins} profit · ${losses} loss</small>
      </article>`;
  }

  function historyPage() {
    const aiRows = tradeRows("AI_AUTO");
    const manualRows = tradeRows("MANUAL");
    const allRows = [...aiRows, ...manualRows];
    shell(`
      <section class="compact-grid trade-history-summary">
        ${historySummaryCard("Total Trade P/L", allRows)}
        ${historySummaryCard("Manual Trades", manualRows)}
        ${historySummaryCard("AI Auto Trades", aiRows)}
        <article><span>Account</span><b>${accountMode}</b><small>Unified history view</small></article>
      </section>

      <section class="premium-card history-table-card unified-history-card">
        <div class="card-row">
          <div><p>TRADE HISTORY</p><h2>AI Auto Trades</h2></div>
          <span class="history-mode">${accountMode}</span>
        </div>
        ${historyCards(aiRows, "AI_AUTO", "No AI auto trades yet. When admin executes AI Trading Desk, entries will show here.")}
      </section>

      <section class="premium-card history-table-card unified-history-card">
        <div class="card-row">
          <div><p>TRADE HISTORY</p><h2>Manual Trades</h2></div>
          <span class="history-mode">${accountMode}</span>
        </div>
        ${historyCards(manualRows, "MANUAL", "No manual trades yet. Closed manual trades will show here.")}
        <div class="empty-state small-note">Wallet deposit and withdrawal history stays inside Wallet page only.</div>
      </section>
    `);
  }

  function kycPage() {
    const kyc = currentKyc();

    if (kyc.status === "APPROVED") {
      shell(`
        <section class="premium-card kyc-result-card approved">
          <div class="result-icon">✓</div>
          <p>KYC APPROVED</p>
          <h2>KYC Approved Successfully</h2>
          <h4>Your identity verification has been approved. You can now add payment methods and request withdrawals after approval.</h4>
          ${statusPill(kyc.status)}
        </section>
        ${kycDetailsGrid(kyc, "VERIFIED DETAILS")}
      `);
      return;
    }

    if (kyc.status === "PENDING") {
      shell(`
        <section class="premium-card kyc-result-card pending">
          <div class="result-icon">⌛</div>
          <p>KYC SUBMITTED</p>
          <h2>KYC Submitted Successfully</h2>
          <h4>Your KYC is under verification. Admin will review your submitted details shortly.</h4>
          ${statusPill(kyc.status)}
        </section>
        ${kycDetailsGrid(kyc, "SUBMITTED DETAILS")}
      `);
      return;
    }

    if (kyc.status === "REJECTED") {
      shell(`
        <section class="premium-card kyc-result-card rejected">
          <div class="result-icon">!</div>
          <p>KYC REJECTED</p>
          <h2>KYC Verification Rejected</h2>
          <h4>Your KYC was rejected. Please check the reason and resubmit your details.</h4>
          ${statusPill(kyc.status)}
          ${kyc.rejectReason ? `<div class="reject-box">${App.escapeHtml(kyc.rejectReason)}</div>` : ""}
          <button class="save-profile-btn" onclick="AITradeXUser.resubmitKyc()">Resubmit KYC</button>
        </section>
        ${kycDetailsGrid(kyc, "REJECTED DETAILS")}
      `);
      return;
    }

    shell(`
      <section class="premium-card kyc-status-card">
        <div class="card-row">
          <div>
            <p>KYC VERIFICATION</p>
            <h2>Identity Verification</h2>
            <span class="ticket-mode">Complete KYC before verified withdrawals.</span>
          </div>
          ${statusPill(kyc.status)}
        </div>
      </section>

      <section class="kyc-stepper">
        ${[1, 2, 3, 4].map(step => `
          <button class="${kycStep === step ? "active" : ""} ${kycStep > step ? "done" : ""}" onclick="AITradeXUser.setKycStep(${step})">
            <b>${step}</b>
            <span>${["Personal", "ID", "Uploads", "Review"][step - 1]}</span>
          </button>
        `).join("")}
      </section>

      <section class="premium-card kyc-form-card">
        ${kycStep === 1 ? `
          <p>STEP 1</p>
          <h2>Personal Details</h2>
          <div class="form-grid kyc-grid">
            <label>Full Name<input id="kycFullName" value="${App.escapeHtml(kyc.personal.fullName || "")}" placeholder="As per document"/></label>
            <label>Mobile<input id="kycMobile" value="${App.escapeHtml(kyc.personal.mobile || "")}" placeholder="10 digit mobile"/></label>
            <label>Email<input id="kycEmail" disabled value="${App.escapeHtml(kyc.personal.email || "")}"/></label>
            <label>Date of Birth<input id="kycDob" type="date" value="${App.escapeHtml(kyc.personal.dob || "")}"/></label>
          </div>
        ` : ""}

        ${kycStep === 2 ? `
          <p>STEP 2</p>
          <h2>ID Details</h2>
          <div class="form-grid kyc-grid">
            <label>Document Type
              <select id="kycDocType">
                ${["PAN Card", "Aadhaar Card", "Passport", "Driving License"].map(t => `<option ${kyc.id.type === t ? "selected" : ""}>${t}</option>`).join("")}
              </select>
            </label>
            <label>Document Number<input id="kycDocNumber" value="${App.escapeHtml(kyc.id.number || "")}" placeholder="Enter document number"/></label>
          </div>
        ` : ""}

        ${kycStep === 3 ? `
          <p>STEP 3</p>
          <h2>Upload Documents</h2>
          <div class="upload-grid">
            <label class="upload-box">
              <span>ID Front</span>
              <input id="kycFront" type="file" accept="image/*,.pdf"/>
              <b>${App.escapeHtml(kyc.uploads.frontName || "Upload front side")}</b>
            </label>
            <label class="upload-box">
              <span>ID Back</span>
              <input id="kycBack" type="file" accept="image/*,.pdf"/>
              <b>${App.escapeHtml(kyc.uploads.backName || "Upload back side")}</b>
            </label>
            <label class="upload-box">
              <span>Selfie</span>
              <input id="kycSelfie" type="file" accept="image/*"/>
              <b>${App.escapeHtml(kyc.uploads.selfieName || "Upload selfie")}</b>
            </label>
          </div>
          <div class="profile-note">अभी files का नाम save होगा. Production में इन्हें Supabase Storage में upload करेंगे.</div>
        ` : ""}

        ${kycStep === 4 ? `
          <p>STEP 4</p>
          <h2>Review & Submit</h2>
          <div class="review-grid">
            <article><span>Full Name</span><b>${App.escapeHtml(kyc.personal.fullName || "-")}</b></article>
            <article><span>Mobile</span><b>${App.escapeHtml(kyc.personal.mobile || "-")}</b></article>
            <article><span>Email</span><b>${App.escapeHtml(kyc.personal.email || "-")}</b></article>
            <article><span>DOB</span><b>${App.escapeHtml(kyc.personal.dob || "-")}</b></article>
            <article><span>Document</span><b>${App.escapeHtml(kyc.id.type || "-")}</b></article>
            <article><span>Document No.</span><b>${App.escapeHtml(maskDocNumber(kyc.id.number))}</b></article>
            <article><span>ID Front</span><b>${App.escapeHtml(kyc.uploads.frontName || "-")}</b></article>
            <article><span>ID Back</span><b>${App.escapeHtml(kyc.uploads.backName || "-")}</b></article>
            <article><span>Selfie</span><b>${App.escapeHtml(kyc.uploads.selfieName || "-")}</b></article>
          </div>
        ` : ""}

        <div class="wizard-actions">
          <button class="btn ghost" onclick="AITradeXUser.prevKycStep()" ${kycStep === 1 ? "disabled" : ""}>Back</button>
          ${kycStep < 4 ? `<button class="btn" onclick="AITradeXUser.saveKycStep()">Save & Next</button>` : `<button class="btn" onclick="AITradeXUser.submitKyc()">Submit KYC</button>`}
        </div>
      </section>
    `);
  }

  function paymentPage() {
    const kyc = currentKyc();
    const methods = paymentMethods();
    const counts = paymentCounts();
    const kycReady = kyc.status === "APPROVED";
    const holder = verifiedKycName();
    const canAddUpi = counts.UPI < 2;
    const canAddBank = counts.BANK < 2;

    shell(`
      <section class="premium-card payment-head-card">
        <div class="card-row">
          <div>
            <p>PAYMENT METHODS</p>
            <h2>Withdrawal Accounts</h2>
            <span class="ticket-mode">Holder name auto-fills from approved KYC.</span>
          </div>
          ${statusPill(kyc.status)}
        </div>
        ${!kycReady ? `<div class="kyc-required-box">Complete and approve KYC first to add payment methods.</div>` : `<div class="verified-name-box"><span>Verified Name</span><b>${App.escapeHtml(holder)}</b></div>`}
      </section>

      <section class="payment-type-tabs">
        <button class="${paymentType === "UPI" ? "active" : ""}" onclick="AITradeXUser.setPaymentType('UPI')">UPI (${counts.UPI}/2)</button>
        <button class="${paymentType === "BANK" ? "active" : ""}" onclick="AITradeXUser.setPaymentType('BANK')">Bank (${counts.BANK}/2)</button>
      </section>

      <section class="premium-card payment-form-card">
        ${paymentType === "UPI" ? `
          <p>ADD UPI</p>
          <h2>UPI Verification</h2>
          <div class="form-grid">
            <label>Holder Name<input value="${App.escapeHtml(holder)}" disabled/></label>
            <label>UPI ID<input id="upiIdInput" ${!kycReady || !canAddUpi ? "disabled" : ""} placeholder="yourname@upi"/></label>
          </div>
          <button class="save-profile-btn" onclick="AITradeXUser.addUpiMethod()" ${!kycReady || !canAddUpi ? "disabled" : ""}>Submit UPI for Verification</button>
          ${!canAddUpi ? `<div class="profile-note">Maximum 2 UPI methods allowed.</div>` : ""}
        ` : `
          <p>ADD BANK</p>
          <h2>Bank Verification</h2>
          <div class="form-grid kyc-grid">
            <label>Holder Name<input value="${App.escapeHtml(holder)}" disabled/></label>
            <label>Bank Name<input id="bankNameInput" ${!kycReady || !canAddBank ? "disabled" : ""} placeholder="Bank name"/></label>
            <label>Account Number<input id="bankAccInput" ${!kycReady || !canAddBank ? "disabled" : ""} placeholder="Account number"/></label>
            <label>Confirm Account Number<input id="bankAccConfirmInput" ${!kycReady || !canAddBank ? "disabled" : ""} placeholder="Confirm account number"/></label>
            <label>IFSC Code<input id="bankIfscInput" ${!kycReady || !canAddBank ? "disabled" : ""} placeholder="IFSC code"/></label>
            <label>Account Type<select id="bankTypeInput" ${!kycReady || !canAddBank ? "disabled" : ""}><option>Savings</option><option>Current</option></select></label>
          </div>
          <button class="save-profile-btn" onclick="AITradeXUser.addBankMethod()" ${!kycReady || !canAddBank ? "disabled" : ""}>Submit Bank for Verification</button>
          ${!canAddBank ? `<div class="profile-note">Maximum 2 bank accounts allowed.</div>` : ""}
        `}
      </section>

      <section class="premium-card">
        <p>SAVED METHODS</p>
        <h2>Your Methods</h2>
        <div class="payment-method-list">
          ${methods.length ? methods.map(m => `
            <article class="method-card ${String(m.status || "").toLowerCase()}">
              <div class="method-icon">${m.status === "APPROVED" ? "✓" : m.status === "REJECTED" ? "!" : "⌛"}</div>
              <div>
                <b>${m.type === "UPI" ? "UPI" : "Bank Account"}</b>
                <span>${m.type === "UPI" ? App.escapeHtml(m.upiId) : `${App.escapeHtml(m.bankName)} · ****${String(m.accountNumber || "").slice(-4)}`}</span>
                <small>Holder: ${App.escapeHtml(m.holderName)}</small>
                ${m.approvedAt ? `<small>Approved: ${new Date(m.approvedAt).toLocaleString()}</small>` : ""}
                ${m.rejectedAt ? `<small>Rejected: ${new Date(m.rejectedAt).toLocaleString()}</small>` : ""}
                ${m.rejectReason ? `<small class="loss-text">Reason: ${App.escapeHtml(m.rejectReason)}</small>` : ""}
              </div>
              ${statusPill(m.status)}
            </article>
          `).join("") : `<div class="empty-state">No payment methods added yet.</div>`}
        </div>
      </section>
    `);
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
    ensurePairForMarket();
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
    copyText(value) {
      const text = String(value || "");
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
    setAccountMode(mode) {
      accountMode = mode === "DEMO" ? "DEMO" : "REAL";
      localStorage.setItem("AITradeX_ACCOUNT_MODE", accountMode);
      render();
    },
    setWalletMode(mode) {
      walletMode = mode === "WITHDRAWAL" ? "WITHDRAWAL" : "DEPOSIT";
      localStorage.setItem("AITradeX_WALLET_MODE", walletMode);
      render();
    },
    setDepositType(type) {
      depositDraft.type = type === "BANK" ? "BANK" : "UPI";
      localStorage.setItem("AITradeX_DEPOSIT_DRAFT", JSON.stringify(depositDraft));
      render();
    },
    nextDepositStep() {
      const minDeposit = Number(platformSettings().minDeposit || 500);

      if (depositStep === 1) {
        const amount = Number(document.getElementById("depositAmountInput")?.value || 0);
        if (!amount || amount < minDeposit) {
          App.toast(`Minimum deposit is ${App.money(minDeposit)}.`);
          return;
        }
        depositDraft.amount = amount;
      }

      if (depositStep === 3) {
        const utr = normalizeUtr(document.getElementById("depositUtrInput")?.value || "");
        if (!/^\d{12}$/.test(utr)) {
          App.toast("Enter exactly 12 digit UTR.");
          return;
        }
        if (isDuplicateDepositUtr(utr)) {
          App.toast("This UTR is already submitted. Enter a unique UTR.");
          return;
        }
        depositDraft.utr = utr;
      }

      localStorage.setItem("AITradeX_DEPOSIT_DRAFT", JSON.stringify(depositDraft));
      depositStep = Math.min(4, depositStep + 1);
      localStorage.setItem("AITradeX_DEPOSIT_STEP", String(depositStep));
      render();
    },
    prevDepositStep() {
      depositStep = Math.max(1, depositStep - 1);
      localStorage.setItem("AITradeX_DEPOSIT_STEP", String(depositStep));
      render();
    },
    submitDepositRequest() {
      const amount = Number(depositDraft.amount || 0);
      const minDeposit = Number(platformSettings().minDeposit || 500);
      const utr = normalizeUtr(depositDraft.utr);
      if (!amount || amount < minDeposit || !/^\d{12}$/.test(utr)) {
        App.toast("Complete deposit details with exactly 12 digit UTR.");
        return;
      }
      if (isDuplicateDepositUtr(utr)) {
        App.toast("This UTR is already submitted. Enter a unique UTR.");
        return;
      }

      const requests = depositRequests();
      requests.unshift({
        id: App.uid("dep"),
        amount,
        type: depositDraft.type || "UPI",
        utr,
        status: "PENDING",
        createdAt: new Date().toISOString(),
        rejectReason: ""
      });
      saveDepositRequests(requests);

      depositDraft = { amount: "", type: "UPI", utr: "" };
      depositStep = 1;
      localStorage.setItem("AITradeX_DEPOSIT_DRAFT", JSON.stringify(depositDraft));
      localStorage.setItem("AITradeX_DEPOSIT_STEP", "1");
      App.toast("Deposit request submitted.");
      render();
    },
    selectWithdrawalMethod(methodId) {
      withdrawalDraft.methodId = methodId;
      localStorage.setItem("AITradeX_WITHDRAWAL_DRAFT", JSON.stringify(withdrawalDraft));
      render();
    },
    nextWithdrawalStep() {
      const minWithdrawal = Number(platformSettings().minWithdrawal || 1000);
      const approved = approvedPaymentMethods();

      if (currentKyc().status !== "APPROVED") {
        App.toast("KYC approval required.");
        return;
      }

      if (!approved.length) {
        App.toast("Approved payment method required.");
        return;
      }

      if (withdrawalStep === 1) {
        const amount = Number(document.getElementById("withdrawalAmountInput")?.value || 0);
        if (!amount || amount < minWithdrawal) {
          App.toast(`Minimum withdrawal is ${App.money(minWithdrawal)}.`);
          return;
        }
        if (amount > availableRealBalance()) {
          App.toast("Insufficient available balance.");
          return;
        }
        withdrawalDraft.amount = amount;
      }

      if (withdrawalStep === 2) {
        if (!withdrawalDraft.methodId) withdrawalDraft.methodId = approved[0].id;
        if (!approved.some(m => m.id === withdrawalDraft.methodId)) {
          App.toast("Select an approved method.");
          return;
        }
      }

      localStorage.setItem("AITradeX_WITHDRAWAL_DRAFT", JSON.stringify(withdrawalDraft));
      withdrawalStep = Math.min(4, withdrawalStep + 1);
      localStorage.setItem("AITradeX_WITHDRAWAL_STEP", String(withdrawalStep));
      render();
    },
    prevWithdrawalStep() {
      withdrawalStep = Math.max(1, withdrawalStep - 1);
      localStorage.setItem("AITradeX_WITHDRAWAL_STEP", String(withdrawalStep));
      render();
    },
    submitWithdrawalRequest() {
      const amount = Number(withdrawalDraft.amount || 0);
      const method = approvedPaymentMethods().find(m => m.id === withdrawalDraft.methodId) || approvedPaymentMethods()[0];
      if (!amount || amount < 1000 || !method) {
        App.toast("Complete withdrawal details first.");
        return;
      }

      if (amount > availableRealBalance()) {
        App.toast("Insufficient available balance.");
        return;
      }

      const requests = withdrawalRequests();
      requests.unshift({
        id: App.uid("wd"),
        amount,
        methodId: method.id,
        methodSnapshot: method,
        status: "PENDING",
        createdAt: new Date().toISOString(),
        rejectReason: ""
      });
      saveWithdrawalRequests(requests);

      withdrawalDraft = { amount: "", methodId: "" };
      withdrawalStep = 1;
      localStorage.setItem("AITradeX_WITHDRAWAL_DRAFT", JSON.stringify(withdrawalDraft));
      localStorage.setItem("AITradeX_WITHDRAWAL_STEP", "1");
      App.toast("Withdrawal request submitted.");
      render();
    },
    resubmitKyc() {
      const kyc = currentKyc();
      kyc.status = "NOT_SUBMITTED";
      kyc.rejectReason = "";
      kyc.rejectedAt = "";
      kyc.approvedAt = "";
      saveKycData(kyc);
      kycStep = 1;
      localStorage.setItem("AITradeX_KYC_STEP", "1");
      App.toast("You can resubmit KYC now.");
      render();
    },
    setKycStep(step) {
      kycStep = Math.min(4, Math.max(1, Number(step || 1)));
      localStorage.setItem("AITradeX_KYC_STEP", String(kycStep));
      render();
    },
    prevKycStep() {
      kycStep = Math.max(1, kycStep - 1);
      localStorage.setItem("AITradeX_KYC_STEP", String(kycStep));
      render();
    },
    saveKycStep() {
      const kyc = currentKyc();
      if (kyc.status === "PENDING" || kyc.status === "APPROVED") {
        App.toast("KYC already submitted.");
        return;
      }

      if (kycStep === 1) {
        kyc.personal.fullName = document.getElementById("kycFullName")?.value?.trim() || "";
        kyc.personal.mobile = document.getElementById("kycMobile")?.value?.trim() || "";
        kyc.personal.email = document.getElementById("kycEmail")?.value?.trim() || kyc.personal.email;
        kyc.personal.dob = document.getElementById("kycDob")?.value || "";
        if (!kyc.personal.fullName || !kyc.personal.mobile) {
          App.toast("Full name and mobile required.");
          return;
        }
      }

      if (kycStep === 2) {
        kyc.id.type = document.getElementById("kycDocType")?.value || "PAN Card";
        kyc.id.number = document.getElementById("kycDocNumber")?.value?.trim() || "";
        if (!kyc.id.number) {
          App.toast("Document number required.");
          return;
        }
      }

      if (kycStep === 3) {
        const front = document.getElementById("kycFront")?.files?.[0];
        const back = document.getElementById("kycBack")?.files?.[0];
        const selfie = document.getElementById("kycSelfie")?.files?.[0];
        if (front) kyc.uploads.frontName = front.name;
        if (back) kyc.uploads.backName = back.name;
        if (selfie) kyc.uploads.selfieName = selfie.name;
        if (!kyc.uploads.frontName || !kyc.uploads.backName || !kyc.uploads.selfieName) {
          App.toast("Front, back and selfie required.");
          return;
        }
      }

      saveKycData(kyc);
      kycStep = Math.min(4, kycStep + 1);
      localStorage.setItem("AITradeX_KYC_STEP", String(kycStep));
      render();
    },
    submitKyc() {
      const kyc = currentKyc();
      if (!kyc.personal.fullName || !kyc.personal.mobile || !kyc.id.number || !kyc.uploads.frontName || !kyc.uploads.backName || !kyc.uploads.selfieName) {
        App.toast("Complete all KYC steps first.");
        return;
      }

      kyc.status = "PENDING";
      kyc.submittedAt = new Date().toISOString();
      kyc.rejectReason = "";
      saveKycData(kyc);
      App.toast("KYC submitted for verification.");
      render();
    },
    setPaymentType(type) {
      paymentType = type === "BANK" ? "BANK" : "UPI";
      localStorage.setItem("AITradeX_PAYMENT_TYPE", paymentType);
      render();
    },
    addUpiMethod() {
      const kyc = currentKyc();
      if (kyc.status !== "APPROVED") {
        App.toast("KYC approval required.");
        return;
      }

      const methods = paymentMethods();
      if (methods.filter(m => m.type === "UPI").length >= 2) {
        App.toast("Maximum 2 UPI methods allowed.");
        return;
      }

      const upiId = document.getElementById("upiIdInput")?.value?.trim() || "";
      if (!upiId || !upiId.includes("@")) {
        App.toast("Valid UPI ID required.");
        return;
      }

      methods.unshift({
        id: `PM-${Date.now()}`,
        type: "UPI",
        holderName: verifiedKycName(),
        upiId,
        status: "PENDING",
        createdAt: new Date().toISOString()
      });
      savePaymentMethods(methods);
      App.toast("UPI submitted for verification.");
      render();
    },
    addBankMethod() {
      const kyc = currentKyc();
      if (kyc.status !== "APPROVED") {
        App.toast("KYC approval required.");
        return;
      }

      const methods = paymentMethods();
      if (methods.filter(m => m.type === "BANK").length >= 2) {
        App.toast("Maximum 2 bank accounts allowed.");
        return;
      }

      const bankName = document.getElementById("bankNameInput")?.value?.trim() || "";
      const accountNumber = document.getElementById("bankAccInput")?.value?.trim() || "";
      const confirmAccount = document.getElementById("bankAccConfirmInput")?.value?.trim() || "";
      const ifsc = document.getElementById("bankIfscInput")?.value?.trim() || "";
      const accountType = document.getElementById("bankTypeInput")?.value || "Savings";

      if (!bankName || !accountNumber || !ifsc) {
        App.toast("Bank name, account number and IFSC required.");
        return;
      }

      if (accountNumber !== confirmAccount) {
        App.toast("Account number does not match.");
        return;
      }

      methods.unshift({
        id: `PM-${Date.now()}`,
        type: "BANK",
        holderName: verifiedKycName(),
        bankName,
        accountNumber,
        ifsc,
        accountType,
        status: "PENDING",
        createdAt: new Date().toISOString()
      });
      savePaymentMethods(methods);
      App.toast("Bank account submitted for verification.");
      render();
    },
    setChartInterval(value) {
      chartInterval = value;
      localStorage.setItem("AITradeX_CHART_INTERVAL", chartInterval);
      render();
    },
    setChartStyle(value) {
      chartStyle = value;
      localStorage.setItem("AITradeX_CHART_STYLE", chartStyle);
      selectorSheet = null;
      render();
    },
    setChartTheme(value) {
      chartTheme = value;
      localStorage.setItem("AITradeX_CHART_THEME", chartTheme);
      selectorSheet = null;
      render();
    },
    setChartToolbar(value) {
      chartToolbar = !!value;
      localStorage.setItem("AITradeX_CHART_TOOLBAR", String(chartToolbar));
      selectorSheet = null;
      render();
    },
    openSheet(type) {
      selectorSheet = type;
      render();
    },
    closeSheet() {
      selectorSheet = null;
      render();
    },
    setTradeAmount(value) {
      tradeAmountPreview = Math.max(0, Number(value || 0));
      localStorage.setItem("AITradeX_TRADE_AMOUNT_PREVIEW", String(tradeAmountPreview));
      updateTradeAmountPreviewDom();
    },
    setTradeLeverage(value) {
      tradeLeveragePreview = Math.max(1, Number(String(value).replace("x", "") || 1));
      localStorage.setItem("AITradeX_TRADE_LEVERAGE_PREVIEW", String(tradeLeveragePreview));
      render();
    },
    setMarket(market) {
      selectedMarket = market === "FOREX" ? "FOREX" : "CRYPTO";
      localStorage.setItem("AITradeX_SELECTED_MARKET", selectedMarket);
      const list = pairsForMarket();
      selectedPair = list[0].pair;
      localStorage.setItem("AITradeX_SELECTED_PAIR", selectedPair);
      selectorSheet = null;
      render();
    },
    selectPair(pair) {
      selectedPair = pair;
      const found = [...marketPairs.CRYPTO, ...marketPairs.FOREX].find(p => p.pair === pair);
      if (found) {
        selectedMarket = found.market;
        localStorage.setItem("AITradeX_SELECTED_MARKET", selectedMarket);
      }
      localStorage.setItem("AITradeX_SELECTED_PAIR", selectedPair);
      selectorSheet = null;
      render();
    },
    async placeManualTrade(side) {
      const u = user();
      if (!u) return;
      const margin = Number(tradeAmountPreview || 0);
      const leverage = Math.max(1, Number(tradeLeveragePreview || 1));
      if (!margin || margin <= 0) {
        App.toast("Enter valid margin amount.");
        return;
      }
      const availableMargin = availableForNewManualTrade();
      if (margin > availableMargin) {
        App.toast(`Available manual margin is ${App.money(availableMargin)}. Close a position or reduce amount.`);
        return;
      }
      App.toast("Locking live entry price...");
      let lockedPrice = null;
      try {
        lockedPrice = App.getLivePairPrice ? await App.getLivePairPrice(selectedPair) : null;
      } catch (error) {
        lockedPrice = App.getCachedPairPrice ? App.getCachedPairPrice(selectedPair) : null;
      }
      const pair = selectedPairData();
      const entryPrice = Number(lockedPrice?.price || pair.rawPrice || 0);
      if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
        App.toast("Live entry price unavailable. Please try again.");
        return;
      }
      const tradeId = App.uid("trd");
      try {
        App.addLedger({
          userId: u.id,
          accountType: accountMode,
          type: "MANUAL_TRADE_MARGIN_LOCK",
          amount: -margin,
          referenceId: tradeId,
          note: `${selectedPair} manual ${String(side || "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY"} margin locked`
        });
      } catch (error) {
        App.toast(error.message || "Insufficient balance for this trade.");
        return;
      }
      const trade = {
        id: tradeId,
        userId: u.id,
        tradeType: "MANUAL",
        accountType: accountMode,
        market: selectedMarket,
        pair: selectedPair,
        side: String(side || "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY",
        entryPrice,
        entryPriceDisplay: lockedPrice?.display || pair.price || String(entryPrice),
        priceSource: lockedPrice?.source || pair.priceSource || "Live price cache",
        priceSourceType: lockedPrice?.sourceType || "LIVE_PRICE",
        priceLockedAt: lockedPrice?.fetchedAt || new Date().toISOString(),
        leverage,
        marginAmount: margin,
        marginLocked: true,
        positionSize: margin * leverage,
        pnl: 0,
        status: "OPEN",
        source: "USER_MANUAL",
        createdAt: new Date().toISOString(),
        createdDate: App.todayKey()
      };
      App.state.trades.unshift(trade);
      App.saveState();
      App.toast(`${trade.side} manual trade opened at ${trade.entryPriceDisplay}.`);
      render();
    },
    closeManualLivePositions() {
      const positions = manualOpenPositions();
      if (!positions.length) {
        App.toast("No manual position is active.");
        return;
      }
      if (positions.length === 1) {
        try {
          settleManualPosition(positions[0], "USER_CLOSE");
          App.toast("Manual position closed.");
          render();
        } catch (error) {
          App.toast(error.message || "Position close failed.");
        }
        return;
      }
      manualCloseSelectorOpen = true;
      render();
    },
    cancelManualCloseSelector() {
      manualCloseSelectorOpen = false;
      render();
    },
    closeManualPositionById(positionId) {
      const target = manualOpenPositions().find(position => position.id === positionId);
      if (!target) {
        App.toast("Position not found.");
        manualCloseSelectorOpen = false;
        render();
        return;
      }
      try {
        settleManualPosition(target, "USER_CLOSE");
        manualCloseSelectorOpen = false;
        App.toast("Manual position closed.");
        render();
      } catch (error) {
        App.toast(error.message || "Position close failed.");
      }
    },
    setAutoPercent(value) {
      const u = user();
      autoPercent = Number(value);
      localStorage.setItem("AITradeX_AUTO_PERCENT", autoPercent);
      if (u) {
        u.aiTradePercent = autoPercent;
        App.saveState();
      }
      render();
    },
    toggleAutoTrade() {
      const u = user();
      autoTradeOn = !autoTradeOn;
      localStorage.setItem("AITradeX_AUTO_ON", String(autoTradeOn));
      if (u) {
        u.aiTradeOn = autoTradeOn;
        if (!u.aiTradePercent) u.aiTradePercent = autoPercent || 25;
        App.saveState();
      }
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