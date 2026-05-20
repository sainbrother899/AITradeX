(()=>{
const C=window.AITRADEX_CONFIG||{},has=!!(C.SUPABASE_URL&&C.SUPABASE_ANON_KEY&&window.supabase);
const db=has?window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY):null;
const SK="AITradeX_STATE_V1",SS="AITradeX_SESSION_V1";
const now=()=>new Date().toLocaleString("en-IN");
const uid=(p="id")=>`${p}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const money=n=>"₹"+Number(n||0).toLocaleString("en-IN");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function initial(){return{users:[{id:"control_root",name:"AITradeX Control",email:"control@aitradex.com",password:"admin123",role:"admin",status:"ACTIVE",createdAt:now()}],profiles:[],kycRequests:[],paymentMethods:[],depositRequests:[],withdrawalRequests:[],walletLedger:[],demoLedger:[],trades:[],aiTradeBatches:[],plans:[{id:"free",name:"Free",price:0,signals:5,aiAccess:"Basic",tradeLimit:0},{id:"starter",name:"Starter",price:999,signals:25,aiAccess:"Signals",tradeLimit:10000},{id:"pro",name:"Pro",price:2999,signals:100,aiAccess:"AI Assisted",tradeLimit:50000},{id:"premium",name:"Premium",price:9999,signals:500,aiAccess:"Priority AI",tradeLimit:200000}],subscriptions:[],referrals:[],settings:{minDeposit:Number(C.MIN_DEPOSIT||500),minWithdrawal:Number(C.MIN_WITHDRAWAL||1000),referralFirstDepositPercent:Number(C.REFERRAL_FIRST_DEPOSIT_PERCENT||10),demoBalance:Number(C.DEMO_BALANCE||100000),platformName:"AITradeX",depositUpiId:"aitradex@upi",depositQrImage:"",depositBankName:"AITradeX Bank",depositAccountName:"AITradeX Private Wallet",depositAccountNumber:"123456789012",depositIfsc:"AITX0001234",freeAiTradesPerDay:5}}}
const load=()=>{try{return JSON.parse(localStorage.getItem(SK)||"null")||initial()}catch{return initial()}};
const loadSession=()=>{try{return JSON.parse(localStorage.getItem(SS)||"null")}catch{return null}};

const MARKET_PAIRS={
    CRYPTO: [
      { market: "CRYPTO", pair: "BTC/USDT", symbol: "BINANCE:BTCUSDT", price: "$76,737.55", inr: "₹64,15,894", change: "+2.84%", mood: "up", signal: "BUY" },
      { market: "CRYPTO", pair: "ETH/USDT", symbol: "BINANCE:ETHUSDT", price: "$2,111.72", inr: "₹1,76,434", change: "-1.04%", mood: "down", signal: "SELL" },
      { market: "CRYPTO", pair: "BNB/USDT", symbol: "BINANCE:BNBUSDT", price: "$639.82", inr: "₹53,484", change: "+0.42%", mood: "up", signal: "BUY" },
      { market: "CRYPTO", pair: "SOL/USDT", symbol: "BINANCE:SOLUSDT", price: "$184.46", inr: "₹15,415", change: "+1.20%", mood: "up", signal: "BUY" },
      { market: "CRYPTO", pair: "XRP/USDT", symbol: "BINANCE:XRPUSDT", price: "$2.47", inr: "₹206", change: "+0.62%", mood: "up", signal: "BUY" },
      { market: "CRYPTO", pair: "DOGE/USDT", symbol: "BINANCE:DOGEUSDT", price: "$0.1732", inr: "₹14.47", change: "-0.88%", mood: "down", signal: "SELL" },
      { market: "CRYPTO", pair: "ADA/USDT", symbol: "BINANCE:ADAUSDT", price: "$0.58", inr: "₹48.44", change: "+0.31%", mood: "up", signal: "WAIT" },
      { market: "CRYPTO", pair: "TRX/USDT", symbol: "BINANCE:TRXUSDT", price: "$0.124", inr: "₹10.36", change: "-0.22%", mood: "down", signal: "WAIT" },
      { market: "CRYPTO", pair: "AVAX/USDT", symbol: "BINANCE:AVAXUSDT", price: "$36.72", inr: "₹3,068", change: "+1.72%", mood: "up", signal: "BUY" },
      { market: "CRYPTO", pair: "LINK/USDT", symbol: "BINANCE:LINKUSDT", price: "$15.41", inr: "₹1,288", change: "-0.44%", mood: "down", signal: "SELL" }
    ],
    FOREX: [
      { market: "FOREX", pair: "EUR/USD", symbol: "FX:EURUSD", price: "1.0854", inr: "Euro vs Dollar", change: "+0.18%", mood: "up", signal: "BUY" },
      { market: "FOREX", pair: "GBP/USD", symbol: "FX:GBPUSD", price: "1.2712", inr: "Pound vs Dollar", change: "-0.11%", mood: "down", signal: "SELL" },
      { market: "FOREX", pair: "USD/JPY", symbol: "FX:USDJPY", price: "156.84", inr: "Dollar vs Yen", change: "+0.32%", mood: "up", signal: "BUY" },
      { market: "FOREX", pair: "USD/CHF", symbol: "FX:USDCHF", price: "0.9041", inr: "Dollar vs Franc", change: "-0.09%", mood: "down", signal: "SELL" },
      { market: "FOREX", pair: "USD/CAD", symbol: "FX:USDCAD", price: "1.3682", inr: "Dollar vs CAD", change: "+0.06%", mood: "up", signal: "WAIT" },
      { market: "FOREX", pair: "AUD/USD", symbol: "FX:AUDUSD", price: "0.6648", inr: "Aussie vs Dollar", change: "+0.14%", mood: "up", signal: "BUY" },
      { market: "FOREX", pair: "NZD/USD", symbol: "FX:NZDUSD", price: "0.6121", inr: "Kiwi vs Dollar", change: "-0.21%", mood: "down", signal: "SELL" },
      { market: "FOREX", pair: "USD/INR", symbol: "FX_IDC:USDINR", price: "83.42", inr: "Dollar vs Rupee", change: "+0.05%", mood: "up", signal: "WAIT" },
      { market: "FOREX", pair: "EUR/INR", symbol: "FX_IDC:EURINR", price: "90.52", inr: "Euro vs Rupee", change: "+0.16%", mood: "up", signal: "BUY" },
      { market: "FOREX", pair: "GBP/INR", symbol: "FX_IDC:GBPINR", price: "106.04", inr: "Pound vs Rupee", change: "-0.07%", mood: "down", signal: "WAIT" },
      { market: "FOREX", pair: "XAU/USD", symbol: "OANDA:XAUUSD", price: "$2,421.80", inr: "Gold Spot", change: "+0.74%", mood: "up", signal: "BUY" },
      { market: "FOREX", pair: "XAG/USD", symbol: "OANDA:XAGUSD", price: "$31.28", inr: "Silver Spot", change: "-0.36%", mood: "down", signal: "SELL" }
    ]
};


const FX_API_KEY=String(C.EXCHANGERATE_API_KEY||"25b67ee121b52d7058f61034").trim();
const LIVE_CACHE_KEY="AITradeX_LIVE_PRICE_CACHE_V1";
const LIVE_TTL_MS=30000;
const liveCache=(()=>{try{return JSON.parse(localStorage.getItem(LIVE_CACHE_KEY)||"{}")}catch{return {}}})();
const normPair=pair=>String(pair||"").trim().toUpperCase();
const baseQuote=pair=>{const [base,quote]=normPair(pair).split("/");return {base,quote};};
const isMetalPair=pair=>["XAU/USD","XAG/USD"].includes(normPair(pair));
const isCryptoPair=pair=>Object.values(MARKET_PAIRS).flat().some(x=>normPair(x.pair)===normPair(pair)&&x.market==="CRYPTO");
const fmtPrice=(n,asset="")=>{const v=Number(n);if(!Number.isFinite(v))return "--";const max=v>=1000?2:v>=1?4:8;const text=v.toLocaleString("en-US",{maximumFractionDigits:max});return asset==="CRYPTO"||asset==="METAL"?`$${text}`:text;};
const fmtChange=n=>{const v=Number(n||0);const sign=v>0?"+":"";return `${sign}${v.toFixed(2)}%`;};
function saveLiveCache(){try{localStorage.setItem(LIVE_CACHE_KEY,JSON.stringify(liveCache))}catch{}}
function cachedLive(pair){const row=liveCache[normPair(pair)];if(!row)return null;return Date.now()-Number(row.fetchedMs||0)<LIVE_TTL_MS?row:null;}
async function fetchJson(url){const res=await fetch(url,{cache:"no-store"});if(!res.ok)throw new Error(`HTTP ${res.status}`);return res.json();}
async function fetchCryptoPrice(pair){const symbol=normPair(pair).replace("/","");const url=`https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`;let data;try{data=await fetchJson(url)}catch(e){data=await fetchJson(`https://data-api.binance.vision/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`)}
  const price=Number(data.lastPrice);if(!Number.isFinite(price))throw new Error("Crypto price unavailable");
  return {ok:true,pair:normPair(pair),price,display:fmtPrice(price,"CRYPTO"),change:fmtChange(data.priceChangePercent),mood:Number(data.priceChangePercent||0)>=0?"up":"down",source:"Binance",sourceType:"LIVE_API",fetchedAt:new Date().toISOString(),fetchedMs:Date.now()};
}
async function fetchForexPrice(pair){const {base,quote}=baseQuote(pair);if(!base||!quote)throw new Error("Invalid forex pair");if(isMetalPair(pair))throw new Error("Manual rate required");
  const url=`https://v6.exchangerate-api.com/v6/${encodeURIComponent(FX_API_KEY)}/pair/${encodeURIComponent(base)}/${encodeURIComponent(quote)}`;
  const data=await fetchJson(url);const price=Number(data.conversion_rate);if(data.result!=="success"||!Number.isFinite(price))throw new Error("Forex price unavailable");
  return {ok:true,pair:normPair(pair),price,display:fmtPrice(price,"FOREX"),change:"Live",mood:"up",source:"ExchangeRate-API",sourceType:"LIVE_API",fetchedAt:new Date().toISOString(),fetchedMs:Date.now()};
}

const App={config:C,db,state:load(),session:loadSession(),now,uid,money,escapeHtml:esc};
App.marketPairs=MARKET_PAIRS;

App.livePrices=liveCache;
App.isMetalPair=isMetalPair;
App.isCryptoPair=isCryptoPair;
App.getCachedPairPrice=pair=>cachedLive(pair);
App.pairLiveView=item=>{const cached=cachedLive(item?.pair);return cached?{...item,live:true,price:cached.display,rawPrice:cached.price,change:cached.change||item.change,mood:cached.mood||item.mood,priceSource:cached.source,priceFetchedAt:cached.fetchedAt}:item};
App.getLivePairPrice=async(pair,manualPrice)=>{
  const clean=normPair(pair);
  const manual=Number(manualPrice||0);
  if(isMetalPair(clean)){
    if(!manual||manual<=0)throw new Error(`${clean} needs manual entry price.`);
    const row={ok:true,pair:clean,price:manual,display:fmtPrice(manual,"METAL"),change:"Manual",mood:"up",source:"Manual Rate",sourceType:"MANUAL",fetchedAt:new Date().toISOString(),fetchedMs:Date.now()};
    liveCache[clean]=row;saveLiveCache();return row;
  }
  const cached=cachedLive(clean);if(cached)return cached;
  const row=isCryptoPair(clean)?await fetchCryptoPrice(clean):await fetchForexPrice(clean);
  liveCache[clean]=row;saveLiveCache();return row;
};
App.refreshLivePrices=async(pairs,onEach)=>{
  const unique=[...new Set((pairs||[]).map(x=>typeof x==="string"?x:x?.pair).filter(Boolean).map(normPair))];
  const out=[];
  for(const pair of unique){
    if(isMetalPair(pair)){continue;}
    try{const row=await App.getLivePairPrice(pair);out.push(row);if(typeof onEach==="function")onEach(row);}catch(err){if(typeof onEach==="function")onEach({ok:false,pair,error:err.message||"Price unavailable"});}
  }
  return out;
};

const cryptoStreamSymbol=pair=>normPair(pair).replace("/","").toLowerCase();
let cryptoTickerSocket=null,cryptoTickerKey="",cryptoTickerRetry=null,cryptoTickerSaveTimer=0;
function cryptoPairBySymbol(symbol){
  const clean=String(symbol||"").toUpperCase();
  return (MARKET_PAIRS.CRYPTO||[]).find(x=>normPair(x.pair).replace("/","")===clean)||null;
}
function cryptoTickerRow(data){
  const symbol=String(data?.s||"").toUpperCase();
  const item=cryptoPairBySymbol(symbol);
  if(!item)return null;
  const eventType=String(data?.e||"").toLowerCase();
  const cached=liveCache[normPair(item.pair)]||{};
  const rawPrice=eventType==="trade"?data.p:data.c;
  const price=Number(rawPrice);
  if(!Number.isFinite(price))return null;
  const changePct=eventType==="trade"?Number(String(cached.change||"0").replace("%","").replace("+","")):Number(data.P||0);
  const row={
    ok:true,
    pair:normPair(item.pair),
    price,
    display:fmtPrice(price,"CRYPTO"),
    change:eventType==="trade"?(cached.change||"Live"):fmtChange(changePct),
    mood:eventType==="trade"?(cached.mood||"up"):(changePct>=0?"up":"down"),
    source:eventType==="trade"?"Binance Trade Stream":"Binance Ticker Stream",
    sourceType:eventType==="trade"?"LIVE_TRADE_STREAM":"LIVE_TICKER_STREAM",
    fetchedAt:new Date().toISOString(),
    fetchedMs:Date.now()
  };
  if(eventType!=="trade")return {...cached,...row,price:cached.price||row.price,display:cached.display||row.display,source:cached.source||row.source,sourceType:cached.sourceType||row.sourceType,fetchedAt:cached.fetchedAt||row.fetchedAt,fetchedMs:cached.fetchedMs||row.fetchedMs,change:row.change,mood:row.mood};
  return row;
}
function saveTickerCacheSoon(){
  const t=Date.now();
  if(t-cryptoTickerSaveTimer<8000)return;
  cryptoTickerSaveTimer=t;
  saveLiveCache();
}
App.stopCryptoLiveTicker=()=>{
  if(cryptoTickerRetry){clearTimeout(cryptoTickerRetry);cryptoTickerRetry=null;}
  if(cryptoTickerSocket){try{cryptoTickerSocket.close();}catch{}}
  cryptoTickerSocket=null;cryptoTickerKey="";
};
App.startCryptoLiveTicker=(pairs,onEach)=>{
  const cryptoPairs=[...new Set((pairs||[]).map(x=>typeof x==="string"?x:x?.pair).filter(Boolean).map(normPair).filter(isCryptoPair))];
  if(!cryptoPairs.length||!("WebSocket" in window)){return false;}
  const streams=cryptoPairs.flatMap(p=>[`${cryptoStreamSymbol(p)}@trade`,`${cryptoStreamSymbol(p)}@ticker`]).sort();
  const key=streams.join("/");
  if(key===cryptoTickerKey&&cryptoTickerSocket&&[WebSocket.OPEN,WebSocket.CONNECTING].includes(cryptoTickerSocket.readyState))return true;
  App.stopCryptoLiveTicker();
  cryptoTickerKey=key;
  const url=`wss://data-stream.binance.vision:443/stream?streams=${streams.join("/")}`;
  const connect=()=>{
    try{
      cryptoTickerSocket=new WebSocket(url);
      cryptoTickerSocket.onmessage=event=>{
        try{
          const payload=JSON.parse(event.data||"{}");
          const data=payload.data||payload;
          const row=cryptoTickerRow(data);
          if(!row)return;
          liveCache[row.pair]=row;
          saveTickerCacheSoon();
          if(typeof onEach==="function")onEach(row);
        }catch{}
      };
      cryptoTickerSocket.onclose=()=>{
        if(cryptoTickerKey===key){
          cryptoTickerRetry=setTimeout(connect,3500);
        }
      };
      cryptoTickerSocket.onerror=()=>{
        try{cryptoTickerSocket.close();}catch{}
      };
    }catch{
      cryptoTickerRetry=setTimeout(connect,5000);
    }
  };
  connect();
  return true;
};

App.saveState=()=>localStorage.setItem(SK,JSON.stringify(App.state));
App.setSession=(userId,role)=>{App.session={userId,role,savedAt:Date.now()};localStorage.setItem(SS,JSON.stringify(App.session))};
App.clearSession=()=>{App.session=null;localStorage.removeItem(SS)};
App.currentUser=()=>App.state.users.find(u=>u.id===App.session?.userId)||null;
App.realBalance=id=>App.state.walletLedger.filter(x=>x.userId===id).reduce((s,x)=>s+Number(x.amount||0),0);
App.demoBalance=id=>{const rows=App.state.demoLedger.filter(x=>x.userId===id);return rows.reduce((s,x)=>s+Number(x.amount||0),Number(App.state.settings.demoBalance||100000))};
App.pendingDeposit=id=>App.state.depositRequests.filter(x=>x.userId===id&&x.status==="PENDING").reduce((s,x)=>s+Number(x.amount||0),0);
App.pendingWithdrawal=id=>App.state.withdrawalRequests.filter(x=>x.userId===id&&x.status==="PENDING").reduce((s,x)=>s+Number(x.amount||0),0);
App.kycStatus=id=>([...App.state.kycRequests].reverse().find(x=>x.userId===id)?.status)||"NOT_SUBMITTED";
App.activeSubscription=id=>App.state.subscriptions.filter(x=>x.userId===id&&x.status==="ACTIVE").sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))[0]||null;

App.todayKey=()=>new Date().toISOString().slice(0,10);
App.aiTradesToday=userId=>App.state.trades.filter(t=>t.userId===userId&&t.tradeType==="AI_AUTO"&&String(t.createdDate||"")===App.todayKey()).length;
App.aiDailyLimit=userId=>{const sub=App.activeSubscription(userId);if(sub){const plan=App.state.plans.find(p=>p.id===sub.planId)||{};return Number(sub.aiTradeLimit||sub.signals||plan.signals||50)||50}return Number(App.state.settings.freeAiTradesPerDay||5)};
App.aiSettings=user=>({enabled:!!user?.aiTradeOn,percent:Number(user?.aiTradePercent||25)});
App.aiAllowedAmount=user=>{const settings=App.aiSettings(user);if(!settings.enabled)return 0;return Math.max(0,App.realBalance(user.id))*settings.percent/100};
App.addLedger=({userId,accountType="REAL",type,amount,referenceId,note=""})=>{const list=accountType==="DEMO"?App.state.demoLedger:App.state.walletLedger;if(list.some(x=>x.type===type&&x.referenceId===referenceId))return false;const before=accountType==="DEMO"?App.demoBalance(userId):App.realBalance(userId),after=before+Number(amount||0);if(after<0)throw new Error("Insufficient balance");list.push({id:uid("ledger"),userId,accountType,type,amount:Number(amount||0),referenceId,note,balanceAfter:after,createdAt:now()});App.saveState();return true};
App.toast=m=>{let e=document.querySelector(".toast");if(e)e.remove();e=document.createElement("div");e.className="toast";e.textContent=m;document.body.appendChild(e);setTimeout(()=>e.classList.add("show"),10);setTimeout(()=>{e.classList.remove("show");setTimeout(()=>e.remove(),250)},2600)};
App.saveState();window.AITradeX=App;
})();