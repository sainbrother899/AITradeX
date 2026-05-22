(()=>{
const App=window.AITradeX;
const normEmail=e=>String(e||"").trim().toLowerCase();
const normMobile=m=>String(m||"").replace(/\D/g,"").slice(-10);
const byEmail=e=>App.state.users.find(u=>normEmail(u.email)===normEmail(e));
const byMobile=m=>{const clean=normMobile(m);return clean?App.state.users.find(u=>normMobile(u.mobile)===clean):null};
async function registerUser({name,email,mobile,password,referralCode}){
  email=normEmail(email);
  mobile=normMobile(mobile);
  const DB=window.AITradeXDB;
  if(!name||!email||!mobile||!password)throw new Error("Please fill all required fields.");
  if(!/^\d{10}$/.test(mobile))throw new Error("Please enter a valid 10 digit mobile number.");
  if(App.databaseOnly&&(!DB||!DB.ready))throw new Error("Database connection required. Please check Supabase settings.");

  // Database-only signup: pehle exact email/mobile database se check karo.
  let existingEmail=null, existingMobile=null;
  if(DB?.ready){
    try{existingEmail=await DB.findUserByEmail(email);}catch(err){throw new Error(`Unable to check email in database: ${err.message||err}`);}
    try{existingMobile=await DB.findUserByMobile(mobile);}catch(err){throw new Error(`Unable to check mobile in database: ${err.message||err}`);}
  }else{
    existingEmail=byEmail(email);
    existingMobile=byMobile(mobile);
  }
  if(existingEmail){
    if(String(existingEmail.password||existingEmail.password_hash||"")===String(password||"")&&String(existingEmail.role||"user")==="user"){
      App.setSession(existingEmail.id,"user");
      return existingEmail;
    }
    throw new Error("This email is already registered. Please login instead.");
  }
  if(existingMobile){
    if(String(existingMobile.password||existingMobile.password_hash||"")===String(password||"")&&String(existingMobile.role||"user")==="user"){
      App.setSession(existingMobile.id,"user");
      return existingMobile;
    }
    throw new Error("This mobile number is already linked with another account.");
  }

  const cleanReferral=String(referralCode||"").trim().toUpperCase();
  const referredBy=cleanReferral?App.state.users.find(u=>String(u.referralCode||"").toUpperCase()===cleanReferral)?.id||null:null;
  const user={id:App.uid("user"),name:name.trim(),email,mobile,password,role:"user",status:"ACTIVE",referralCode:"AITX"+Math.random().toString(36).slice(2,8).toUpperCase(),referredBy,aiTradeOn:true,aiTradePercent:75,freeTrialStartedAt:new Date().toISOString(),createdAt:App.now()};

  const pushLocal=(savedUser=user)=>{
    App.state.users=Array.isArray(App.state.users)?App.state.users:[];
    App.state.profiles=Array.isArray(App.state.profiles)?App.state.profiles:[];
    App.state.referrals=Array.isArray(App.state.referrals)?App.state.referrals:[];
    const u={...user,...savedUser,password:savedUser.password||savedUser.password_hash||user.password,referralCode:savedUser.referralCode||savedUser.referral_code||user.referralCode};
    const existingIndex=App.state.users.findIndex(x=>x.id===u.id||normEmail(x.email)===email||normMobile(x.mobile)===mobile);
    if(existingIndex>=0)App.state.users[existingIndex]=u; else App.state.users.push(u);
    if(!App.state.profiles.some(p=>p.userId===u.id))App.state.profiles.push({id:App.uid("profile"),userId:u.id,name:u.name,email:u.email,mobile:u.mobile,createdAt:App.now()});
    if(referredBy&&!App.state.referrals.some(r=>r.referredUserId===u.id))App.state.referrals.push({id:App.uid("ref"),referrerUserId:referredBy,referredUserId:u.id,status:"REGISTERED",commissionPaid:false,bonuses:{},createdAt:new Date().toISOString()});
    return u;
  };

  let finalUser=user;
  if(DB?.ready){
    try{
      const result=DB.createUserAccount?await DB.createUserAccount(user):{user:await DB.upsertUserRecord(user),existed:false,match:true};
      if(result?.existed&&!result?.match)throw new Error("This email/mobile is already registered. Please login with the existing password.");
      finalUser=result?.user||user;
    }catch(err){
      const msg=String(err?.message||err||"");
      // Agar insert ke baad policy/duplicate error aaya, to database se recover karke login allow karo.
      let recovered=null;
      try{recovered=await DB.findUserByEmail(email);}catch{}
      if(!recovered){try{recovered=await DB.findUserByMobile(mobile);}catch{}}
      if(recovered&&String(recovered.role||"user")==="user"&&String(recovered.password||recovered.password_hash||"")===String(password||"")){
        finalUser=recovered;
      }else{
        throw new Error(`Signup could not be completed: ${msg}`);
      }
    }
  }

  App.__suspendDbAutoWrite=true;
  try{
    finalUser=pushLocal(finalUser);
    App.saveState();
  }finally{
    App.__suspendDbAutoWrite=false;
  }
  App.setSession(finalUser.id,"user");
  return finalUser;
}
function userLockKey(email){return "AITradeX_USER_LOGIN_LOCK_"+normEmail(email)}
function userLockInfo(email){try{return JSON.parse(localStorage.getItem(userLockKey(email))||"{}")||{}}catch{return {}}}
function saveUserLock(email,row){localStorage.setItem(userLockKey(email),JSON.stringify(row||{}))}
function clearUserLock(email){localStorage.removeItem(userLockKey(email))}
function registerUserFailure(email){const row=userLockInfo(email);const attempts=Number(row.attempts||0)+1;const lockedUntil=attempts>=6?Date.now()+10*60*1000:0;saveUserLock(email,{attempts,lockedUntil,lastFailedAt:Date.now()});return {attempts,lockedUntil}}
function guardUserLock(email){const row=userLockInfo(email);const lockedUntil=Number(row.lockedUntil||0);if(lockedUntil&&Date.now()<lockedUntil){const mins=Math.ceil((lockedUntil-Date.now())/60000);throw new Error(`Too many wrong login attempts. Try again in ${mins} minute(s).`)}}
async function loginUser({email,password}){
  email=normEmail(email);
  const DB=window.AITradeXDB;
  guardUserLock(email);
  if(App.databaseOnly&&(!DB||!DB.ready))throw new Error("Database connection required. Please check Supabase settings.");
  if(DB?.ready){
    try{await DB.pullCoreTables();}catch(err){throw new Error(`Unable to load account from database: ${err.message||err}`);}
  }
  const u=byEmail(email);
  if(!u||u.password!==password||u.role!=="user"){
    const row=registerUserFailure(email);
    const left=Math.max(0,6-Number(row.attempts||0));
    throw new Error(left?`Invalid user login details. ${left} attempt(s) left before temporary lock.`:"Invalid user login details. Login temporarily locked.");
  }
  const status=String(u.status||"ACTIVE").toUpperCase();
  if(status==="BLOCKED")throw new Error("Your account is blocked.");
  if(status==="SUSPENDED")throw new Error("Your account is suspended. Please contact support.");
  clearUserLock(email);
  App.setSession(u.id,"user");
  u.lastLoginAt=App.now();
  App.saveState();
  if(DB?.ready){try{await DB.upsertUserRecord(u);}catch{}}
  return u
}
function adminLockKey(email){return "AITradeX_ADMIN_LOGIN_LOCK_"+normEmail(email)}
function adminLockInfo(email){try{return JSON.parse(localStorage.getItem(adminLockKey(email))||"{}")||{}}catch{return {}}}
function saveAdminLock(email,row){localStorage.setItem(adminLockKey(email),JSON.stringify(row||{}))}
function clearAdminLock(email){localStorage.removeItem(adminLockKey(email))}
function registerAdminFailure(email){const row=adminLockInfo(email);const attempts=Number(row.attempts||0)+1;const lockedUntil=attempts>=5?Date.now()+15*60*1000:0;saveAdminLock(email,{attempts,lockedUntil,lastFailedAt:Date.now()});return {attempts,lockedUntil}}
function guardAdminLock(email){const row=adminLockInfo(email);const lockedUntil=Number(row.lockedUntil||0);if(lockedUntil&&Date.now()<lockedUntil){const mins=Math.ceil((lockedUntil-Date.now())/60000);throw new Error(`Too many wrong admin login attempts. Try again in ${mins} minute(s).`)}}
async function loginControl({email,password}){
  email=normEmail(email);
  const DB=window.AITradeXDB;
  guardAdminLock(email);
  if(App.databaseOnly&&(!DB||!DB.ready))throw new Error("Database connection required. Please check Supabase settings.");
  if(DB?.ready){
    try{await DB.pullCoreTables();}catch(err){throw new Error(`Unable to load admin account from database: ${err.message||err}`);}
  }
  const u=byEmail(email);
  if(!u||u.password!==password||u.role!=="admin"){
    const row=registerAdminFailure(email);
    const left=Math.max(0,5-Number(row.attempts||0));
    throw new Error(left?`Invalid control center login. ${left} attempt(s) left before temporary lock.`:"Invalid control center login. Admin login temporarily locked.");
  }
  clearAdminLock(email);
  App.setSession(u.id,"admin");
  App.addAdminAction?.({action:"ADMIN_LOGIN",targetType:"ADMIN",targetId:u.id,meta:{email}});
  return u
}
window.AITradeXAuth={registerUser,loginUser,loginControl};
})();


(() => {
  const Auth = window.AITradeXAuth;
  const App = window.AITradeX;
  if (!Auth || !App || Auth.loginAdmin) return;

  Auth.loginAdmin = async function ({ email, password }) {
    if (Auth.loginControl) return await Auth.loginControl({ email, password });
    const admin = App.state.users.find(
      u => u.role === "admin" && String(u.email).toLowerCase() === String(email).toLowerCase() && u.password === password
    );
    if (!admin) throw new Error("Invalid admin login.");
    App.setSession(admin.id, "admin");
    return admin;
  };
})();
