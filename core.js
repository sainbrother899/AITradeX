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

const App={config:C,db,state:load(),session:loadSession(),now,uid,money,escapeHtml:esc};
App.marketPairs=MARKET_PAIRS;
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