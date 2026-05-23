(() => {
  const App = window.AITradeX;
  const C = window.AITRADEX_CONFIG || {};
  const ready = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);
  const client = ready ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
  const iso = v => { const n = Date.parse(v || ""); return Number.isFinite(n) ? new Date(n).toISOString() : new Date().toISOString(); };
  const num = v => Number(v || 0);
  const text = v => String(v ?? "");
  const lower = v => text(v).trim().toLowerCase();
  const cleanMobile = v => text(v).replace(/\D/g, "").slice(-10);
  const clone = v => { try { return JSON.parse(JSON.stringify(v || {})); } catch { return {}; } };
  const defaults = () => clone(App?.state || {});
  let syncTimer = null;
  let syncing = false;
  let loading = null;

  function status(message, ok = true) {
    const row = { ok, message, at: new Date().toISOString() };
    try { localStorage.setItem("AITradeX_DB_LAST_SYNC", JSON.stringify(row)); } catch {}
    return row;
  }
  function lastSyncStatus(){ try{return JSON.parse(localStorage.getItem("AITradeX_DB_LAST_SYNC")||"null");}catch{return null;} }
  function assertReady(){ if(!ready || !client) throw new Error("Supabase is not configured."); }
  async function safeSelect(table, query="*"){
    try{ const {data,error}=await client.from(table).select(query); if(error) throw error; return data||[]; }
    catch(err){ console.warn(`[AITradeX DB] ${table} load skipped:`, err?.message||err); return []; }
  }
  async function safeMaybe(table, query="*"){
    const rows = await safeSelect(table, query); return rows;
  }
  async function upsert(table, rows, options={}){
    if(!ready || !client || !rows || !rows.length) return {table,count:0};
    const {error}=await client.from(table).upsert(rows, options.onConflict ? {onConflict:options.onConflict} : undefined);
    if(error) throw new Error(`${table}: ${error.message}`);
    return {table,count:rows.length};
  }
  async function removeMissing(table, ids){
    if(!ready || !client) return {table,deleted:0};
    const keep = new Set((ids||[]).filter(Boolean).map(String));
    const {data,error}=await client.from(table).select("id");
    if(error) throw new Error(`${table} stale-row scan: ${error.message}`);
    const stale=(data||[]).map(r=>String(r.id)).filter(id=>!keep.has(id));
    for(let i=0;i<stale.length;i+=100){
      const chunk=stale.slice(i,i+100);
      const res=await client.from(table).delete().in("id", chunk);
      if(res.error) throw new Error(`${table} stale-row delete: ${res.error.message}`);
    }
    return {table,deleted:stale.length};
  }

  function rowUser(u){ return { id:text(u.id), name:text(u.name), email:lower(u.email), mobile:cleanMobile(u.mobile), role:text(u.role||"user"), status:text(u.status||"ACTIVE"), referral_code:text(u.referralCode||u.referral_code||""), referred_by:u.referredBy||u.referred_by||null, password_hash:u.passwordHash||u.password_hash||u.password||null, ai_trade_on:!!u.aiTradeOn, ai_trade_percent:num(u.aiTradePercent||25), free_trial_started_at:u.freeTrialStartedAt?iso(u.freeTrialStartedAt):null, last_login_at:(u.lastLoginAt||u.last_login_at)?iso(u.lastLoginAt||u.last_login_at):null, updated_at:new Date().toISOString(), avatar_url:u.avatarUrl||u.avatar_url||null, avatar_path:u.avatarPath||u.avatar_path||null, created_at:iso(u.createdAt||u.created_at)}; }
  function stateUser(r){ const pass=r.password_hash||""; return { id:r.id, name:r.name||"", email:r.email||"", mobile:r.mobile||"", role:r.role||"user", status:r.status||"ACTIVE", referralCode:r.referral_code||"", referredBy:r.referred_by||null, password:pass, passwordHash:pass, aiTradeOn:!!r.ai_trade_on, aiTradePercent:num(r.ai_trade_percent||25), freeTrialStartedAt:r.free_trial_started_at||"", lastLoginAt:r.last_login_at||"", avatarUrl:r.avatar_url||"", avatarPath:r.avatar_path||"", createdAt:r.created_at||"" }; }
  function rowLedger(x){ return {id:text(x.id), user_id:x.userId||x.user_id, account_type:x.accountType||x.account_type||"REAL", type:x.type||"WALLET", amount:num(x.amount), reference_id:text(x.referenceId||x.reference_id||x.id), note:text(x.note), balance_after:num(x.balanceAfter||x.balance_after), created_at:iso(x.createdAt||x.created_at)}; }
  function stateLedger(r){ return {id:r.id,userId:r.user_id,accountType:r.account_type||"REAL",type:r.type,amount:num(r.amount),referenceId:r.reference_id,note:r.note||"",balanceAfter:num(r.balance_after),createdAt:r.created_at}; }
  function rowKyc(x){ const raw=clone(x); return {id:text(x.id), user_id:x.userId||x.user_id, user_email:x.userEmail||x.user_email||x.personal?.email||"", full_name:x.personal?.fullName||x.fullName||x.full_name||"", mobile:x.personal?.mobile||x.mobile||"", id_number:x.idDetails?.number||x.id?.number||x.id_number||"", address:x.personal?.address||x.address||"", status:x.status||"PENDING", reviewed_at:x.approvedAt||x.rejectedAt?iso(x.approvedAt||x.rejectedAt):null, created_at:iso(x.submittedAt||x.createdAt||x.created_at), raw}; }
  function stateKyc(r){ const raw=r.raw&&typeof r.raw==="object"?r.raw:{}; return {...raw,id:r.id,userId:r.user_id,userEmail:r.user_email,status:r.status||raw.status||"PENDING",submittedAt:raw.submittedAt||r.created_at,approvedAt:raw.approvedAt||"",rejectedAt:raw.rejectedAt||"",rejectReason:raw.rejectReason||""}; }
  function rowMethod(x){ const raw=clone(x); return {id:text(x.id),user_id:x.userId||x.user_id,user_email:x.userEmail||x.user_email||"",type:x.type||"BANK",holder_name:x.holderName||x.holder_name||"",upi_id:x.upiId||x.upi_id||"",bank_name:x.bankName||x.bank_name||"",account_number:x.accountNumber||x.account_number||"",ifsc:x.ifsc||"",status:x.status||"PENDING",rejection_reason:x.rejectReason||x.rejection_reason||"",created_at:iso(x.createdAt||x.created_at),raw}; }
  function stateMethod(r){ const raw=r.raw&&typeof r.raw==="object"?r.raw:{}; return {...raw,id:r.id,userId:r.user_id,userEmail:r.user_email,type:r.type,status:r.status||raw.status||"PENDING",holderName:r.holder_name||raw.holderName||"",upiId:r.upi_id||raw.upiId||"",bankName:r.bank_name||raw.bankName||"",accountNumber:r.account_number||raw.accountNumber||"",ifsc:r.ifsc||raw.ifsc||"",rejectReason:r.rejection_reason||raw.rejectReason||"",createdAt:r.created_at||raw.createdAt}; }
  function rowDeposit(x){ const raw=clone(x); return {id:text(x.id),user_id:x.userId||x.user_id,user_email:x.userEmail||x.user_email||"",amount:num(x.amount),method:x.type||x.method||"UPI",utr:text(x.utr),status:x.status||"PENDING",balance_applied:!!(x.balanceApplied||x.balance_applied),first_deposit_referral_checked:!!(x.firstDepositReferralChecked||x.first_deposit_referral_checked),proof_image:x.proofImage||x.proof_image||null,admin_note:x.adminNote||x.rejectReason||x.admin_note||"",created_at:iso(x.createdAt||x.created_at),raw}; }
  function stateDeposit(r){ const raw=r.raw&&typeof r.raw==="object"?r.raw:{}; return {...raw,id:r.id,userId:r.user_id,userEmail:r.user_email,amount:num(r.amount),type:r.method||raw.type||"UPI",method:r.method||raw.method||"UPI",utr:r.utr||raw.utr||"",status:r.status||raw.status||"PENDING",balanceApplied:!!r.balance_applied,firstDepositReferralChecked:!!r.first_deposit_referral_checked,adminNote:r.admin_note||raw.adminNote||"",rejectReason:raw.rejectReason||r.admin_note||"",createdAt:r.created_at||raw.createdAt}; }
  function rowWithdrawal(x){ const raw=clone(x); return {id:text(x.id),user_id:x.userId||x.user_id,user_email:x.userEmail||x.user_email||"",amount:num(x.amount),payment_method_id:x.methodId||x.payment_method_id||"",status:x.status||"PENDING",hold_applied:x.holdApplied!==false,admin_note:x.adminNote||x.rejectReason||x.admin_note||"",created_at:iso(x.createdAt||x.created_at),raw}; }
  function stateWithdrawal(r){ const raw=r.raw&&typeof r.raw==="object"?r.raw:{}; return {...raw,id:r.id,userId:r.user_id,userEmail:r.user_email,amount:num(r.amount),methodId:r.payment_method_id||raw.methodId||"",status:r.status||raw.status||"PENDING",holdApplied:r.hold_applied!==false,adminNote:r.admin_note||raw.adminNote||"",rejectReason:raw.rejectReason||r.admin_note||"",createdAt:r.created_at||raw.createdAt}; }
  function rowTrade(x){ const raw=clone(x); return {id:text(x.id),user_id:x.userId||x.user_id,batch_id:x.batchId||x.batch_id||null,trade_type:x.tradeType||x.trade_type||"MANUAL",account_type:x.accountType||x.account_type||"REAL",order_type:x.orderType||x.order_type||"MARKET",market:x.market||"CRYPTO",pair:x.pair||"",side:x.side||"",status:x.status||"OPEN",source:x.source||"",entry_price:num(x.entryPrice||x.entry_price),entry_price_display:x.entryPriceDisplay||x.entry_price_display||"",exit_price:num(x.exitPrice||x.closePrice||x.exit_price),exit_price_display:x.exitPriceDisplay||x.closePriceDisplay||x.exit_price_display||"",limit_price:num(x.limitPrice||x.limit_price),limit_price_display:x.limitPriceDisplay||x.limit_price_display||"",leverage:num(x.leverage||1),margin_amount:num(x.marginAmount||x.amount||x.margin_amount),margin_locked:!!(x.marginLocked||x.margin_locked),position_size:num(x.positionSize||x.position_size),pnl:num(x.pnl),settlement_amount:num(x.settlementAmount||x.settlement_amount),target_type:x.targetType||x.target_type||"",target_percent:num(x.targetPercent||x.target_percent),close_reason:x.closeReason||x.close_reason||"",closed_by:x.closedBy||x.closed_by||"",note:x.note||"",raw,created_at:iso(x.createdAt||x.created_at),opened_at:x.openedAt?iso(x.openedAt):null,closed_at:x.closedAt?iso(x.closedAt):null}; }
  function stateTrade(r){ const raw=r.raw&&typeof r.raw==="object"?r.raw:{}; return {...raw,id:r.id,userId:r.user_id,batchId:r.batch_id||raw.batchId,tradeType:r.trade_type||raw.tradeType||"MANUAL",accountType:r.account_type||raw.accountType||"REAL",orderType:r.order_type||raw.orderType||"MARKET",market:r.market||raw.market||"CRYPTO",pair:r.pair||raw.pair,side:r.side||raw.side,status:r.status||raw.status,source:r.source||raw.source,entryPrice:num(r.entry_price||raw.entryPrice),entryPriceDisplay:r.entry_price_display||raw.entryPriceDisplay,exitPrice:num(r.exit_price||raw.exitPrice),exitPriceDisplay:r.exit_price_display||raw.exitPriceDisplay,limitPrice:num(r.limit_price||raw.limitPrice),limitPriceDisplay:r.limit_price_display||raw.limitPriceDisplay,leverage:num(r.leverage||raw.leverage||1),marginAmount:num(r.margin_amount||raw.marginAmount||raw.amount),marginLocked:!!r.margin_locked,positionSize:num(r.position_size||raw.positionSize),pnl:num(r.pnl||raw.pnl),settlementAmount:num(r.settlement_amount||raw.settlementAmount),targetType:r.target_type||raw.targetType, targetPercent:num(r.target_percent||raw.targetPercent),closeReason:r.close_reason||raw.closeReason,closedBy:r.closed_by||raw.closedBy,note:r.note||raw.note,createdAt:r.created_at||raw.createdAt,openedAt:r.opened_at||raw.openedAt,closedAt:r.closed_at||raw.closedAt}; }
  function rowNotification(x){ const raw=clone(x); return {id:text(x.id),audience:x.audience||"USER",user_id:x.userId||x.user_id||null,title:x.title||"",message:x.message||"",type:x.type||"INFO",link_page:x.linkPage||x.link_page||"",reference_id:x.referenceId||x.reference_id||"",read:!!x.read,raw,created_at:iso(x.createdAt||x.created_at)}; }
  function stateNotification(r){ const raw=r.raw&&typeof r.raw==="object"?r.raw:{}; return {...raw,id:r.id,audience:r.audience,userId:r.user_id,title:r.title,message:r.message,type:r.type,linkPage:r.link_page,referenceId:r.reference_id,read:!!r.read,createdAt:r.created_at}; }
  function rowAdminLog(x){ return {id:text(x.id),admin_user_id:x.adminUserId||x.admin_user_id||null,action:x.action||"ACTION",target_type:x.targetType||x.target_type||"",target_id:x.targetId||x.target_id||"",meta:x.meta||{},created_at:iso(x.createdAt||x.created_at)}; }
  function stateAdminLog(r){ return {id:r.id,adminUserId:r.admin_user_id,action:r.action,targetType:r.target_type,targetId:r.target_id,meta:r.meta||{},createdAt:r.created_at}; }
  function rowBatch(x){ const raw=clone(x); return {id:text(x.id),batch_type:x.batchType||x.batch_type||"INSTANT",market:x.market||"CRYPTO",pair:x.pair||"",side:x.side||"",leverage:num(x.leverage||1),status:x.status||"OPEN",entry_price:num(x.entryPrice||x.entry_price),entry_price_display:x.entryPriceDisplay||x.entry_price_display||"",target_type:x.targetType||x.target_type||"",target_percent:num(x.targetPercent||x.target_percent),min_balance:num(x.minBalance||x.min_balance),total_margin:num(x.totalMargin||x.total_margin),total_exposure:num(x.totalExposure||x.total_exposure),total_pnl:num(x.totalPnl||x.total_pnl),applied_count:num(x.appliedCount||x.applied_count),skipped_count:num(x.skippedCount||x.skipped_count),skip_reasons:x.skipReasons||x.skip_reasons||{},note:x.note||"",raw,created_at:iso(x.createdAt||x.created_at),closed_at:x.closedAt?iso(x.closedAt):null}; }
  function stateBatch(r){ const raw=r.raw&&typeof r.raw==="object"?r.raw:{}; return {...raw,id:r.id,batchType:r.batch_type||raw.batchType,market:r.market||raw.market,pair:r.pair||raw.pair,side:r.side||raw.side,leverage:num(r.leverage||raw.leverage),status:r.status||raw.status,entryPrice:num(r.entry_price||raw.entryPrice),entryPriceDisplay:r.entry_price_display||raw.entryPriceDisplay,targetType:r.target_type||raw.targetType,targetPercent:num(r.target_percent||raw.targetPercent),minBalance:num(r.min_balance||raw.minBalance),totalMargin:num(r.total_margin||raw.totalMargin),totalExposure:num(r.total_exposure||raw.totalExposure),totalPnl:num(r.total_pnl||raw.totalPnl),appliedCount:num(r.applied_count||raw.appliedCount),skippedCount:num(r.skipped_count||raw.skippedCount),skipReasons:r.skip_reasons||raw.skipReasons||{},note:r.note||raw.note,createdAt:r.created_at||raw.createdAt,closedAt:r.closed_at||raw.closedAt}; }
  function rowPlan(x){ const raw=clone(x); return {id:text(x.id),name:text(x.name||"Plan"),price:num(x.price),signals:num(x.signals||x.aiTradeLimit),ai_access:text(x.aiAccess||x.ai_access||"AI Access"),trade_limit:num(x.tradeLimit||x.trade_limit||x.signals),is_active:String(x.status||"ACTIVE").toUpperCase()!=="INACTIVE",raw}; }
  function statePlan(r){ const raw=r.raw&&typeof r.raw==="object"?r.raw:{}; return {...raw,id:r.id,name:r.name||raw.name||"Plan",price:num(r.price||raw.price),signals:num(r.signals||raw.signals||r.trade_limit||raw.tradeLimit),aiAccess:r.ai_access||raw.aiAccess||"AI Access",tradeLimit:num(r.trade_limit||raw.tradeLimit),status:r.is_active===false?"INACTIVE":(raw.status||"ACTIVE")}; }
  function rowSubscription(x){ const raw=clone(x); return {id:text(x.id),user_id:x.userId||x.user_id,plan_id:x.planId||x.plan_id,plan_name:x.planName||x.plan_name||"",amount:num(x.amount||x.price),status:x.status||"ACTIVE",starts_at:x.startsAt||x.starts_at?iso(x.startsAt||x.starts_at):null,expires_at:x.expiresAt||x.expires_at?iso(x.expiresAt||x.expires_at):null,raw,created_at:iso(x.createdAt||x.created_at)}; }
  function stateSubscription(r){ const raw=r.raw&&typeof r.raw==="object"?r.raw:{}; return {...raw,id:r.id,userId:r.user_id,planId:r.plan_id,planName:r.plan_name,amount:num(r.amount),price:num(raw.price||r.amount),status:r.status||raw.status||"ACTIVE",startsAt:r.starts_at||raw.startsAt,expiresAt:r.expires_at||raw.expiresAt,createdAt:r.created_at||raw.createdAt}; }
  function rowReferral(x){ const raw=clone(x); return {id:text(x.id),referrer_user_id:x.referrerUserId||x.referrer_user_id,referred_user_id:x.referredUserId||x.referred_user_id,status:x.status||"REGISTERED",commission_paid:!!(x.commissionPaid||x.commission_paid||x.bonuses?.deposit?.credited||x.bonuses?.subscription?.credited),commission_amount:num(x.commissionAmount||x.commission_amount||x.bonuses?.deposit?.amount||0)+num(x.bonuses?.subscription?.amount||0),raw,created_at:iso(x.createdAt||x.created_at)}; }
  function stateReferral(r){ const raw=r.raw&&typeof r.raw==="object"?r.raw:{}; return {...raw,id:r.id,referrerUserId:r.referrer_user_id,referredUserId:r.referred_user_id,status:r.status||raw.status||"REGISTERED",commissionPaid:!!r.commission_paid,commissionAmount:num(r.commission_amount),createdAt:r.created_at||raw.createdAt}; }
  function rowSupportTicket(x){ return {id:text(x.id),user_id:x.userId||x.user_id,user_email:x.userEmail||x.user_email||"",subject:text(x.subject),category:text(x.category||"Other"),message:text(x.message),status:x.status||"OPEN",replies:Array.isArray(x.replies)?x.replies:[],created_at:iso(x.createdAt||x.created_at),updated_at:iso(x.updatedAt||x.updated_at||x.createdAt||x.created_at)}; }
  function stateSupportTicket(r){ return {id:r.id,userId:r.user_id,userEmail:r.user_email,subject:r.subject,category:r.category,message:r.message,status:r.status,replies:r.replies||[],createdAt:r.created_at,updatedAt:r.updated_at}; }

  async function findUser(login){
    assertReady(); const key=lower(login), mob=cleanMobile(login);
    let query=client.from("users").select("*").limit(1);
    const filter = mob && /^\d{10}$/.test(mob) ? `email.eq.${key},mobile.eq.${mob}` : `email.eq.${key}`;
    const {data,error}=await client.from("users").select("*").or(filter).limit(1);
    if(error) throw error; return data?.[0]?stateUser(data[0]):null;
  }
  async function createUser(user){ assertReady(); const row=rowUser(user); const {error}=await client.from("users").insert(row); if(error) throw error; return user; }
  async function updateUser(user){ assertReady(); await upsert("users", [rowUser(user)], {onConflict:"id"}); return user; }
  async function loadAll(){
    assertReady();
    if(loading) return loading;
    loading=(async()=>{
      const base=defaults();
      const [users,methods,kyc,deposits,withdrawals,ledger,trades,batches,logs,notifications,settingsRows,plans,subs,refs,support]=await Promise.all([
        safeSelect("users"),safeSelect("payment_methods"),safeSelect("kyc_requests"),safeSelect("deposit_requests"),safeSelect("withdrawal_requests"),safeSelect("wallet_ledger"),safeSelect("trade_orders"),safeSelect("ai_trade_batches"),safeSelect("admin_action_logs"),safeSelect("notifications"),safeSelect("app_settings"),safeSelect("plans"),safeSelect("subscriptions"),safeSelect("referrals"),safeSelect("support_tickets")
      ]);
      const pulledUsers=users.map(stateUser);
      const localAdmin=(base.users||[]).filter(u=>u.role==="admin");
      const adminIds=new Set(pulledUsers.filter(u=>u.role==="admin").map(u=>u.id));
      App.state={...base,
        users:[...pulledUsers,...localAdmin.filter(a=>!adminIds.has(a.id))],
        paymentMethods:methods.map(stateMethod),
        kycRequests:kyc.map(stateKyc),
        depositRequests:deposits.map(stateDeposit),
        withdrawalRequests:withdrawals.map(stateWithdrawal),
        walletLedger:ledger.map(stateLedger).filter(x=>String(x.accountType||"REAL").toUpperCase()==="REAL"),
        demoLedger:ledger.map(stateLedger).filter(x=>String(x.accountType||"REAL").toUpperCase()==="DEMO"),
        trades:trades.map(stateTrade).sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0)),
        aiTradeBatches:batches.map(stateBatch).filter(b=>String(b.batchType||"").toUpperCase()!=="LIVE"),
        aiLiveBatches:batches.map(stateBatch).filter(b=>String(b.batchType||"").toUpperCase()==="LIVE"),
        adminActionLogs:logs.map(stateAdminLog).sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0)),
        notifications:notifications.map(stateNotification),
        supportTickets:(support||[]).map(stateSupportTicket),
        subscriptions:(subs||[]).map(stateSubscription),
        referrals:(refs||[]).map(stateReferral)
      };
      const settingsRow=settingsRows.find(x=>x.id==="main")||settingsRows.find(x=>x.id==="global");
      const settings=settingsRow?.settings; if(settings&&typeof settings==="object") App.state.settings={...base.settings,...settings};
      if(plans.length) App.state.plans=plans.map(statePlan);
      status(`Loaded database rows: users ${users.length}, KYC ${kyc.length}, deposits ${deposits.length}, withdrawals ${withdrawals.length}.`, true);
      loading=null; return App.state;
    })();
    return loading;
  }
  async function fullSync(){
    assertReady(); if(syncing) return {skipped:true}; syncing=true;
    try{
      const s=App.state||{};
      await upsert("users", (s.users||[]).map(rowUser), {onConflict:"id"});
      await upsert("payment_methods", (s.paymentMethods||[]).map(rowMethod), {onConflict:"id"});
      await removeMissing("payment_methods", (s.paymentMethods||[]).map(x=>x.id));
      await upsert("kyc_requests", (s.kycRequests||[]).map(rowKyc), {onConflict:"id"});
      await upsert("deposit_requests", (s.depositRequests||[]).map(rowDeposit), {onConflict:"id"});
      await upsert("withdrawal_requests", (s.withdrawalRequests||[]).map(rowWithdrawal), {onConflict:"id"});
      await upsert("wallet_ledger", [...(s.walletLedger||[]),...(s.demoLedger||[])].map(rowLedger), {onConflict:"id"});
      await upsert("trade_orders", (s.trades||[]).map(rowTrade), {onConflict:"id"});
      await upsert("ai_trade_batches", [...(s.aiTradeBatches||[]),...(s.aiLiveBatches||[])].map(rowBatch), {onConflict:"id"});
      await upsert("notifications", (s.notifications||[]).map(rowNotification), {onConflict:"id"});
      await upsert("admin_action_logs", (s.adminActionLogs||[]).map(rowAdminLog), {onConflict:"id"});
      await upsert("plans", (s.plans||[]).map(rowPlan), {onConflict:"id"});
      await upsert("subscriptions", (s.subscriptions||[]).map(rowSubscription), {onConflict:"id"});
      await upsert("referrals", (s.referrals||[]).map(rowReferral), {onConflict:"id"});
      await upsert("support_tickets", (s.supportTickets||[]).map(rowSupportTicket), {onConflict:"id"});
      await upsert("app_settings", [{id:"main",settings:clone(s.settings||{}),updated_at:new Date().toISOString()}], {onConflict:"id"});
      status("Database saved.", true); return {ok:true};
    }catch(err){ status(err?.message||"Database save failed", false); throw err; }
    finally{ syncing=false; }
  }
  function scheduleFullSync(){
    // Phase 5.17 strict database runtime: no hidden/background full-state sync.
    // Business actions use action-specific write* methods; manual fullSync remains only for admin repair/export workflows.
    return {disabled:true, reason:"Action-based database runtime"};
  }
  async function testConnection(){ if(!ready) return {ok:false,message:"Supabase is not configured."}; try{ const {error}=await client.from("users").select("id",{head:true,count:"exact"}); if(error) throw error; return {ok:true,message:"Supabase connected."}; }catch(err){ return {ok:false,message:err?.message||"Supabase connection failed."}; } }
  async function sendTelegramMessage(textHtml){
    const st=App?.state?.settings||{}; if(!st.telegramEnabled||!st.telegramBotToken||!st.telegramChatId) return {ok:false,skipped:true};
    const res=await fetch(`https://api.telegram.org/bot${st.telegramBotToken}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:st.telegramChatId,text:textHtml,parse_mode:"HTML",disable_web_page_preview:true})});
    const json=await res.json().catch(()=>({})); if(!res.ok||json.ok===false) throw new Error(json.description||"Telegram send failed"); return json;
  }

  async function writeUser(row){ assertReady(); const clean=rowUser(row); const {error}=await client.from("users").upsert(clean,{onConflict:"id"}); if(error) throw error; return clean; }
  async function writeKycRequest(row){ assertReady(); const clean=rowKyc(row); const {error}=await client.from("kyc_requests").upsert(clean,{onConflict:"id"}); if(error) throw error; return clean; }
  async function writePaymentMethod(row){ assertReady(); const clean=rowMethod(row); const {error}=await client.from("payment_methods").upsert(clean,{onConflict:"id"}); if(error) throw error; return clean; }
  async function writeDepositRequest(row){ assertReady(); const clean=rowDeposit(row); const {error}=await client.from("deposit_requests").upsert(clean,{onConflict:"id"}); if(error) throw error; return clean; }
  async function writeWithdrawalRequest(row){ assertReady(); const clean=rowWithdrawal(row); const {error}=await client.from("withdrawal_requests").upsert(clean,{onConflict:"id"}); if(error) throw error; return clean; }
  async function writeLedger(row){ assertReady(); const clean=rowLedger(row); const {error}=await client.from("wallet_ledger").upsert(clean,{onConflict:"id"}); if(error) throw error; return clean; }
  async function writeTrade(row){ assertReady(); const clean=rowTrade(row); const {error}=await client.from("trade_orders").upsert(clean,{onConflict:"id"}); if(error) throw error; return clean; }
  async function deleteTrade(id){ assertReady(); const clean=text(id); if(!clean) return false; const {error}=await client.from("trade_orders").delete().eq("id", clean); if(error) throw error; return true; }
  async function writeAiBatch(row){ assertReady(); const clean=rowBatch(row); const {error}=await client.from("ai_trade_batches").upsert(clean,{onConflict:"id"}); if(error) throw error; return clean; }
  async function deleteAiBatch(id){ assertReady(); const clean=text(id); if(!clean) return false; const {error}=await client.from("ai_trade_batches").delete().eq("id", clean); if(error) throw error; return true; }
  async function writePlan(row){ assertReady(); const clean=rowPlan(row); const {error}=await client.from("plans").upsert(clean,{onConflict:"id"}); if(error) throw error; return clean; }
  async function writeSubscription(row){ assertReady(); const clean=rowSubscription(row); const {error}=await client.from("subscriptions").upsert(clean,{onConflict:"id"}); if(error) throw error; return clean; }
  async function writeReferral(row){ assertReady(); const clean=rowReferral(row); const {error}=await client.from("referrals").upsert(clean,{onConflict:"id"}); if(error) throw error; return clean; }
  async function writeSupportTicket(row){ assertReady(); const clean=rowSupportTicket(row); const {error}=await client.from("support_tickets").upsert(clean,{onConflict:"id"}); if(error) throw error; return clean; }
  async function writeNotification(row){ assertReady(); const clean=rowNotification(row); const {error}=await client.from("notifications").upsert(clean,{onConflict:"id"}); if(error) throw error; return clean; }
  async function writeAdminAction(row){ assertReady(); const clean=rowAdminLog(row); const {error}=await client.from("admin_action_logs").upsert(clean,{onConflict:"id"}); if(error) throw error; return clean; }
  async function deletePaymentMethod(id){ assertReady(); const cleanId=text(id); if(!cleanId) throw new Error("Payment method ID missing."); const {error}=await client.from("payment_methods").delete().eq("id",cleanId); if(error) throw error; return {ok:true,id:cleanId}; }
  async function deleteNotification(id){ assertReady(); const cleanId=text(id); if(!cleanId) throw new Error("Notification ID missing."); const {error}=await client.from("notifications").delete().eq("id",cleanId); if(error) throw error; return {ok:true,id:cleanId}; }
  async function writeSettings(settings){ assertReady(); const row={id:"main",settings:{...clone(settings||App.state.settings||{}),databaseRuntimeVersion:"5.27",updatedBy:"admin"},updated_at:new Date().toISOString()}; const {error}=await client.from("app_settings").upsert(row,{onConflict:"id"}); if(error) throw error; return row; }
  function fire(promise,label){ if(!ready) return; Promise.resolve(promise).catch(err=>{ console.warn(`[AITradeX DB] ${label||"write"} failed:`, err?.message||err); status(`${label||"DB write"} failed: ${err?.message||err}`, false); }); }

  async function uploadUserFile({bucket,folder="uploads",label="file",file,userId}){
    assertReady();
    if(!file) throw new Error("No file selected.");
    const safeBucket=text(bucket).trim();
    if(!safeBucket) throw new Error("Storage bucket missing.");
    const ext=(String(file.name||"file").split(".").pop()||"bin").replace(/[^a-z0-9]/gi,"").toLowerCase()||"bin";
    const cleanFolder=text(folder||"uploads").replace(/[^a-z0-9/_-]/gi,"-").replace(/-+/g,"-");
    const cleanLabel=text(label||"file").replace(/[^a-z0-9_-]/gi,"-").replace(/-+/g,"-");
    const path=`${cleanFolder}/${text(userId||"guest")}/${Date.now()}_${cleanLabel}.${ext}`;
    const {error}=await client.storage.from(safeBucket).upload(path,file,{upsert:true,contentType:file.type||"application/octet-stream"});
    if(error) throw error;
    const {data}=client.storage.from(safeBucket).getPublicUrl(path);
    return {bucket:safeBucket,path,url:data?.publicUrl||"",name:file.name||`${cleanLabel}.${ext}`,size:file.size||0,type:file.type||"",uploadedAt:new Date().toISOString()};
  }

  async function backupFullState({savedBy="admin",note="Manual backup"}={}){ assertReady(); const payload={app_version:"AITradeX-Phase5.15",saved_by:savedBy,note,counts:{users:(App.state.users||[]).length},state:clone(App.state)}; const {data,error}=await client.from("app_state_snapshots").insert(payload).select("id,saved_at,counts,note").single(); if(error) throw error; return data; }
  async function latestSnapshot(){ assertReady(); const {data,error}=await client.from("app_state_snapshots").select("id,saved_at,saved_by,note,counts,state").order("saved_at",{ascending:false}).limit(1).maybeSingle(); if(error) throw error; return data; }
  async function restoreLatestSnapshot(){ const snap=await latestSnapshot(); if(!snap?.state) throw new Error("No database backup found."); App.state=snap.state; await fullSync(); return snap; }
  function downloadLocalBackup(){ const blob=new Blob([JSON.stringify({app:"AITradeX",exportedAt:new Date().toISOString(),state:clone(App.state)},null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`aitradex-backup-${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},400); }
  function importLocalBackup(file){ return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=async()=>{ try{ const json=JSON.parse(String(r.result||"{}")); App.state=json.state||json; await fullSync(); resolve(true); }catch(e){reject(e);} }; r.onerror=()=>reject(new Error("Unable to read backup file.")); r.readAsText(file); }); }

  const api={ready,client,loadAll,pullCoreTables:loadAll,syncCoreTables:fullSync,fullSync,scheduleFullSync,testConnection,findUser,createUser,updateUser,writeUser,writeKycRequest,writePaymentMethod,writeDepositRequest,writeWithdrawalRequest,writeLedger,writeTrade,deleteTrade,writeAiBatch,deleteAiBatch,writePlan,writeSubscription,writeReferral,writeSupportTicket,writeNotification,writeAdminAction,deletePaymentMethod,deleteNotification,writeSettings,uploadUserFile,fire,lastSyncStatus,sendTelegramMessage,backupFullState,latestSnapshot,restoreLatestSnapshot,downloadLocalBackup,importLocalBackup};
  window.AITradeXDB=api; window.AppDB=api;
})();
