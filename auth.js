(() => {
  const App = window.AITradeX;
  const DB = window.AITradeXDB;
  const normEmail = e => String(e || "").trim().toLowerCase();
  const normMobile = m => String(m || "").replace(/\D/g, "").slice(-10);
  const byEmail = e => App.state.users.find(u => normEmail(u.email) === normEmail(e));
  const byMobile = m => { const clean = normMobile(m); return clean ? App.state.users.find(u => normMobile(u.mobile) === clean) : null; };
  const isDb = () => !!(DB && DB.ready);
  const uid = p => App.uid ? App.uid(p) : `${p}_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  function userLockKey(email){return "AITradeX_USER_LOGIN_LOCK_"+normEmail(email)}
  function userLockInfo(email){try{return JSON.parse(localStorage.getItem(userLockKey(email))||"{}")||{}}catch{return {}}}
  function saveUserLock(email,row){localStorage.setItem(userLockKey(email),JSON.stringify(row||{}))}
  function clearUserLock(email){localStorage.removeItem(userLockKey(email))}
  function registerUserFailure(email){const row=userLockInfo(email);const attempts=Number(row.attempts||0)+1;const lockedUntil=attempts>=6?Date.now()+10*60*1000:0;saveUserLock(email,{attempts,lockedUntil,lastFailedAt:Date.now()});return {attempts,lockedUntil}}
  function guardUserLock(email){const row=userLockInfo(email);const lockedUntil=Number(row.lockedUntil||0);if(lockedUntil&&Date.now()<lockedUntil){const mins=Math.ceil((lockedUntil-Date.now())/60000);throw new Error(`Too many wrong login attempts. Try again in ${mins} minute(s).`)}}
  function adminLockKey(email){return "AITradeX_ADMIN_LOGIN_LOCK_"+normEmail(email)}
  function adminLockInfo(email){try{return JSON.parse(localStorage.getItem(adminLockKey(email))||"{}")||{}}catch{return {}}}
  function saveAdminLock(email,row){localStorage.setItem(adminLockKey(email),JSON.stringify(row||{}))}
  function clearAdminLock(email){localStorage.removeItem(adminLockKey(email))}
  function registerAdminFailure(email){const row=adminLockInfo(email);const attempts=Number(row.attempts||0)+1;const lockedUntil=attempts>=5?Date.now()+15*60*1000:0;saveAdminLock(email,{attempts,lockedUntil,lastFailedAt:Date.now()});return {attempts,lockedUntil}}
  function guardAdminLock(email){const row=adminLockInfo(email);const lockedUntil=Number(row.lockedUntil||0);if(lockedUntil&&Date.now()<lockedUntil){const mins=Math.ceil((lockedUntil-Date.now())/60000);throw new Error(`Too many wrong admin login attempts. Try again in ${mins} minute(s).`)}}

  async function ensureDbLoaded(){ if(isDb()) await DB.loadAll(); }
  async function registerUser({name,email,mobile,password,referralCode}){
    email=normEmail(email); mobile=normMobile(mobile);
    if(!name||!email||!mobile||!password) throw new Error("Please fill all required fields.");
    if(!/^\d{10}$/.test(mobile)) throw new Error("Please enter a valid 10 digit mobile number.");
    if(isDb()){
      const existingEmail=await DB.findUser(email);
      const existingMobile=await DB.findUser(mobile);
      const existing=existingEmail || existingMobile;
      if(existing){
        if(existing.password===password && existing.role==="user") { App.setSession(existing.id,"user"); await DB.loadAll(); return existing; }
        throw new Error(existingEmail?"This email is already registered. Please login instead.":"This mobile number is already linked with another account.");
      }
    } else {
      if(byEmail(email)) throw new Error("This email is already registered. Please login instead.");
      if(byMobile(mobile)) throw new Error("This mobile number is already linked with another account.");
    }
    const cleanReferral=String(referralCode||"").trim().toUpperCase();
    if(isDb()) await DB.loadAll();
    const referredBy=cleanReferral?(App.state.users.find(u=>String(u.referralCode||"").toUpperCase()===cleanReferral)?.id||null):null;
    const user={id:uid("user"),name:name.trim(),email,mobile,password,role:"user",status:"ACTIVE",referralCode:"AITX"+Math.random().toString(36).slice(2,8).toUpperCase(),referredBy,aiTradeOn:true,aiTradePercent:75,freeTrialStartedAt:new Date().toISOString(),createdAt:App.now()};
    if(isDb()) await DB.createUser(user);
    App.state.users=App.state.users.filter(u=>u.id!==user.id && normEmail(u.email)!==email && normMobile(u.mobile)!==mobile);
    App.state.users.push(user);
    App.state.profiles=App.state.profiles||[];
    App.state.profiles.push({id:uid("profile"),userId:user.id,name:user.name,email:user.email,mobile:user.mobile,createdAt:App.now()});
    if(referredBy){
      App.state.referrals=App.state.referrals||[];
      const refRow={id:uid("ref"),referrerUserId:referredBy,referredUserId:user.id,status:"REGISTERED",commissionPaid:false,bonuses:{},createdAt:new Date().toISOString()};
      App.state.referrals.push(refRow);
      if(isDb()&&DB.writeReferral) await DB.writeReferral(refRow);
    }
    App.setSession(user.id,"user");
    App.saveState();
    return user;
  }
  async function loginUser({email,password}){
    email=normEmail(email); guardUserLock(email);
    let u=null;
    if(isDb()){ u=await DB.findUser(email); if(u){ App.state.users=App.state.users.filter(x=>x.id!==u.id); App.state.users.push(u); } }
    else u=byEmail(email);
    if(!u||u.password!==password||u.role!=="user"){
      const row=registerUserFailure(email); const left=Math.max(0,6-Number(row.attempts||0));
      throw new Error(left?`Invalid user login details. ${left} attempt(s) left before temporary lock.`:"Invalid user login details. Login temporarily locked.");
    }
    const status=String(u.status||"ACTIVE").toUpperCase(); if(status==="BLOCKED") throw new Error("Your account is blocked."); if(status==="SUSPENDED") throw new Error("Your account is suspended. Please contact support.");
    clearUserLock(email); u.lastLoginAt=new Date().toISOString(); if(isDb()&&DB.writeUser) await DB.writeUser(u); App.setSession(u.id,"user"); if(isDb()) await DB.loadAll(); App.saveState(); return u;
  }
  async function loginControl({email,password}){
    email=normEmail(email); guardAdminLock(email);
    let u=null;
    if(isDb()){ u=await DB.findUser(email); if(u){ App.state.users=App.state.users.filter(x=>x.id!==u.id); App.state.users.push(u); } }
    else u=byEmail(email);
    if(!u||u.password!==password||u.role!=="admin"){
      const row=registerAdminFailure(email); const left=Math.max(0,5-Number(row.attempts||0));
      throw new Error(left?`Invalid control center login. ${left} attempt(s) left before temporary lock.`:"Invalid control center login. Admin login temporarily locked.");
    }
    clearAdminLock(email); u.lastLoginAt=new Date().toISOString(); if(isDb()&&DB.writeUser) await DB.writeUser(u); App.setSession(u.id,"admin"); if(isDb()) await DB.loadAll(); App.addAdminAction?.({action:"ADMIN_LOGIN",targetType:"ADMIN",targetId:u.id,meta:{email}}); return u;
  }
  window.AITradeXAuth={registerUser,loginUser,loginControl,loginAdmin:loginControl};
})();
