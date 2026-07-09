import { useState, useRef, useEffect, useCallback } from "react";
import ImageInput from "./ImageInput.jsx";

const API = "https://api.familyfinances.uk";

function getFamilySlug() {
  const parts = window.location.hostname.split('.');
  if (parts.length >= 3 && parts[0] !== 'www') return parts[0];
  return 'werlich';
}
const FAMILY_SLUG = getFamilySlug();
const SUPER_ADMIN = 'werlich@outlook.com';

const C = {
  bg:"#F7F4F0", surface:"#FFFFFF", surface2:"#F0EDE8", border:"#E8E2D9", border2:"#D4CFC8",
  text:"#1A1714", text2:"#6B6560", text3:"#A09890",
  terra:"#C4603A", terra2:"#E07F5A", terra3:"#F5E6DF",
  green:"#3D8B6E", green2:"#EAF4EF", red:"#C43A3A", red2:"#F5E6E6",
  gold:"#B8860B", navy:"#2C3E6B",
  shadow:"0 1px 3px rgba(26,23,20,0.08), 0 1px 2px rgba(26,23,20,0.04)",
  shadow2:"0 4px 16px rgba(26,23,20,0.10), 0 2px 4px rgba(26,23,20,0.06)",
};

const CATEGORIES = [
  {id:"groceries",    label:"Groceries",     color:"#3D8B6E",bg:"#EAF4EF",icon:"🛒"},
  {id:"restaurants",  label:"Restaurants",   color:"#C4603A",bg:"#F5E6DF",icon:"🍽️"},
  {id:"gas",          label:"Gas",           color:"#B8860B",bg:"#FBF4E0",icon:"⛽"},
  {id:"clothing",     label:"Clothing",      color:"#7B5EA7",bg:"#F0EBF8",icon:"👗"},
  {id:"subscriptions",label:"Subscriptions", color:"#2C6E8A",bg:"#E5F2F7",icon:"📱"},
  {id:"phone",        label:"Phone",         color:"#1A6B8A",bg:"#DDF0F7",icon:"📞"},
  {id:"utilities",    label:"Utilities",     color:"#5A6E7A",bg:"#EDF1F4",icon:"💡"},
  {id:"mortgage",     label:"Mortgage",      color:"#C43A3A",bg:"#F5E6E6",icon:"🏠"},
  {id:"car_loan",     label:"Car Loan",      color:"#1A5276",bg:"#D6EAF8",icon:"🚘"},
  {id:"insurance",    label:"Insurance",     color:"#8A5A2C",bg:"#F7EDE0",icon:"🛡️"},
  {id:"auto",         label:"Auto",          color:"#2C6B5A",bg:"#E0F2EC",icon:"🚗"},
  {id:"health",       label:"Health/Fitness",color:"#3D8B6E",bg:"#EAF4EF",icon:"💪"},
  {id:"kids",         label:"Kids",          color:"#C4603A",bg:"#F5E6DF",icon:"🧒"},
  {id:"pet",          label:"Pet",           color:"#6B8A3D",bg:"#EEF4E0",icon:"🐾"},
  {id:"giving",       label:"Giving/Tithe",  color:"#8A2C6B",bg:"#F7E0EF",icon:"🙏"},
  {id:"amazon",       label:"Amazon/Online", color:"#8A6B2C",bg:"#F7F0E0",icon:"📦"},
  {id:"home",         label:"Home/Lawn",     color:"#4A7A3D",bg:"#E8F4E5",icon:"🏡"},
  {id:"personal",     label:"Personal Care", color:"#7A3D8A",bg:"#F2E8F5",icon:"✂️"},
  {id:"medical",      label:"Medical",       color:"#C43A3A",bg:"#F5E6E6",icon:"🏥"},
  {id:"business",     label:"Business Trip", color:"#2E4057",bg:"#E8ECF0",icon:"💼"},
  {id:"entertainment", label:"Entertainment",  color:"#6A3D9A",bg:"#EEE6F8",icon:"🎬"},
  {id:"cc_payment",   label:"CC Payment",    color:"#8A2C2C",bg:"#F5E6E6",icon:"💳"},
  {id:"other",        label:"Other",         color:"#6B6560",bg:"#F0EDE8",icon:"📌"},
];

const BUDGET = {
  groceries:1311,restaurants:250,gas:300,clothing:100,subscriptions:230,
  phone:363,utilities:168,mortgage:3024,insurance:208,auto:150,health:189,kids:80,
  pet:50,giving:1500,amazon:200,home:64,personal:55,medical:100,entertainment:100,other:100,
};

const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const fmt=(n)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
const pct=(a,b)=>Math.min(100,Math.round((a/b)*100));
function monthsUntil(ds){if(!ds)return null;const t=new Date(ds),n=new Date();return(t.getFullYear()-n.getFullYear())*12+(t.getMonth()-n.getMonth());}
function useIsMobile(){const[m,setM]=useState(window.innerWidth<768);useEffect(()=>{const h=()=>setM(window.innerWidth<768);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h);},[]);return m;}

// ── API HELPERS ───────────────────────────────────────────────────────────────
// Identity: /api/whoami runs on the Pages app (which Cloudflare Access
// fronts) and mints a short-lived signed token for the verified user. We
// send that token to the worker instead of a raw, forgeable email string.
let _identity = null; // { email, token, expiry }
async function getIdentity() {
  if (_identity && Date.now() < _identity.expiry - 30000) return _identity;
  try {
    const res = await fetch('/api/whoami', {credentials:'include'});
    if (!res.ok) { _identity = null; return null; }
    const data = await res.json();
    if (!data?.token) { _identity = null; return null; }
    const expiry = Number(data.token.split(':')[1]) || (Date.now() + 4*60*1000);
    _identity = { email: data.email, token: data.token, expiry };
    return _identity;
  } catch(_) { return null; }
}

async function apiFetch(path, opts={}) {
  try {
    const identity = await getIdentity();
    const res = await fetch(`${API}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(identity ? {'X-Identity-Token': identity.token} : {}),
        ...opts.headers,
      },
      ...opts,
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('API error', res.status, data);
      if (res.status === 401) return {error: 'Unauthorized', status: 401};
      return {ok: false, error: data?.error || res.status};
    }
    return data;
  } catch(e) {
    console.error('API fetch error:', e);
    return {ok: false, error: e.message};
  }
}

// ── CSV PARSERS ───────────────────────────────────────────────────────────────
// Detect credit card payments — these should NOT be expenses, they're debt payments
const CC_PAYMENT_PATTERNS = /CHASE CREDIT CRD|CARDMEMBER SERV|BEST BUY.*PAYMENT|BEST BUY PYMT|APPLE.{0,10}CARD|APPLECARD|AMAZON.*CARD|SYNCHRONY|US BANK|USBANK|U\.S\. BANK|ACH DEBIT PAYPAL|CITI.*CARD|DISCOVER.*PAYMENT|BARCLAYS|CAPITAL ONE.*PYMT/i;

function isCreditCardPayment(desc) {
  return CC_PAYMENT_PATTERNS.test(desc.toUpperCase());
}

function categorize(desc) {
  const d=desc.toUpperCase();
  if(/PAYROLL|DIRECT DEPOSIT|ACH CREDIT|ACH DEP|DIRECT DEP|PAYCHECK|SALARY|WAGES|DEPOSIT/.test(d))return"income";
  if(/ROCKET MORTGAGE|WATERCRESS|MORTGAGE/.test(d))return"mortgage";
  if(/ADVENTIST|TITHE|OFFERING|CHURCH|GIVING/.test(d))return"giving";
  if(/KROGER|MEIJER|COSTCO WHSE|TRADER JOE|ALDI|WHOLE FOODS|GIANT EAGLE/.test(d))return"groceries";
  if(/COSTCO GAS|MARATHON|SHELL|BP#|SHEETZ|SUNOCO|EXXON|CHEVRON|SPEEDWAY|HAHN QUICK/.test(d))return"gas";
  if(/MCDONALD|BURGER KING|WENDY|CHIPOTLE|PANDA EXPRESS|STARBUCKS|SUBWAY|TACO BELL|PIZZA|RESTAURANT|CAFE|SUSHI|ESTILO BRAZIL|QAMARIA|WHITS/.test(d))return"restaurants";
  if(/AMAZON MKTPL|AMAZON\.COM|AMZN\.COM/.test(d))return"amazon";
  if(/TMOBILE|T-MOBILE|AT&T|VERIZON|BOOST MOBILE|CRICKET|MINT MOBILE|METRO PCS|SPRINT|US CELLULAR/.test(d))return"phone";
  if(/APPLE\.COM|SPOTIFY|NETFLIX|HULU|DISNEY|MICROSOFT|VIVINT|BREEZELINE/.test(d))return"subscriptions";
  if(/AEP|EVERBRIGHT|SUBURBAN NATURAL|DOMINION|DUKE ENERGY/.test(d))return"utilities";
  if(/GEICO|PROGRESSIVE|ALLSTATE|KANGURO|NORTHWESTERN MUTUAL|INSURANCE/.test(d))return"insurance";
  if(/VALVOLINE|AUTOZONE|VIOC|JIFFY LUBE|O'REILLY|NAPA|TOMMY|CAR WASH|IRON PONY|MOTOR VEHIC|BMV/.test(d))return"auto";
  if(/OHIO HEALTH|OHIOHEALTH|NATIONWIDE CHILDREN|CVS\/PHARMACY|WALGREEN|MEDICAL|DENTAL|DOCTOR|HOSPITAL|ANESTHESIA|PERIODONT/.test(d))return"medical";
  if(/JIU JITS|GYM|FITNESS|PLANET FITNESS|ORANGE THEORY|YMCA|RELSON/.test(d))return"health";
  if(/HOME DEPOT|LOWE'S|EXPERIGREEN|LAWN|DUST BUSTER|CLEANING/.test(d))return"home";
  if(/PETLAND|PETSMART|PETCO|GREENIES|CHUCKIT/.test(d))return"pet";
  if(/GREAT CLIPS|SALON|BARBER|BEAUTY|PURLISSE/.test(d))return"personal";
  if(/OLENTANGY|SCHOOL|DAYCARE/.test(d))return"kids";
  if(/NETFLIX|HULU|DISNEY\+|HBO|YOUTUBE|AMAZON PRIME|APPLE TV|PARAMOUNT|PEACOCK|CRUNCHYROLL|AMC|CINEMA|MOVIE|THEATER|THEATRE|TICKETMASTER|STUBHUB|EVENT|CONCERT|ESPN|SPORT|DAVE AND BUSTER|BOWLING|ARCADE|LASER QUEST|TOPGOLF|MINIATURE GOLF|ESCAPE ROOM|TRAMPOLINE|MUSEUM|ZOO|AQUARIUM|TICKET|ENTERTAINMENT/.test(d))return"entertainment";
  return"other";
}

function parseChaseCSV(text){
  const lines=text.trim().split('\n');const txs=[];
  for(let i=1;i<lines.length;i++){
    const cols=lines[i].match(/(".*?"|[^,]+)(?=,|$)/g);
    if(!cols||cols.length<6)continue;
    const date=cols[0].replace(/"/g,'').trim();
    const desc=cols[2].replace(/"/g,'').trim();
    const amount=parseFloat(cols[5].replace(/"/g,'').trim());
    if(isNaN(amount)||amount===0)continue;
    const[m,d]=date.split('/');if(!m||!d)continue;
    // Chase: negative = expense, positive = deposit/income
    if(amount>0){
      txs.push({id:crypto.randomUUID(),date:`${m.padStart(2,'0')}/${d.padStart(2,'0')}`,merchant:desc,amount,category:'income',source:"Chase",type:'income'});
    } else {
      txs.push({id:crypto.randomUUID(),date:`${m.padStart(2,'0')}/${d.padStart(2,'0')}`,merchant:desc,amount:Math.abs(amount),category:categorize(desc),source:"Chase"});
    }
  }
  return txs;
}

function parsePNCCSV(text){
  const lines=text.trim().split('\n');const txs=[];
  for(let i=1;i<lines.length;i++){
    // Parse CSV properly handling quoted fields
    const cols=[];
    let cur='',inQ=false;
    for(const ch of lines[i]+','){
      if(ch==='"'){inQ=!inQ;}
      else if(ch===','&&!inQ){cols.push(cur.trim());cur='';}
      else cur+=ch;
    }
    if(cols.length<3)continue;
    let dateStr=cols[0].replace(/"/g,'').trim();
    const desc=cols[1].replace(/"/g,'').trim();
    const amtRaw=cols[2].replace(/"/g,'').trim();
    const isIncome=amtRaw.includes('+');
    const isExpense=amtRaw.includes('-');
    if(!isIncome&&!isExpense)continue;
    const amount=parseFloat(amtRaw.replace(/[^0-9.]/g,''));
    if(isNaN(amount)||amount<=0)continue;
    // Handle PENDING dates
    if(dateStr.toUpperCase().includes('PENDING')){
      const m=dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if(m) dateStr=`${m[3]}-${m[1]}-${m[2]}`; else continue;
    }
    let mm,dd;
    if(dateStr.match(/\d{4}-\d{2}-\d{2}/)){
      const parts=dateStr.split('-');mm=parts[1];dd=parts[2];
    } else {
      const parts=dateStr.split('/');
      if(parts.length<2)continue;
      mm=parts[0];dd=parts[1];
    }
    const type=isIncome?'income':'expense';
    const cat=isIncome?'income':categorize(desc);
    txs.push({id:crypto.randomUUID(),date:`${mm.padStart(2,'0')}/${dd.padStart(2,'0')}`,merchant:desc,amount,category:cat,source:"PNC",type});
  }
  return txs;
}

function parseGenericCSV(text){
  const header=text.split('\n')[0].toLowerCase();
  if(header.includes('transaction description'))return parsePNCCSV(text);
  if(header.includes('withdrawals')||header.includes('deposits'))return parsePNCCSV(text);
  if(header.includes('post date')||header.includes('transaction date'))return parseChaseCSV(text);
  return parseChaseCSV(text);
}

// Detect debt payments — STRICT matching, only specific known patterns
const DEBT_MATCH_PATTERNS = {
  'BEST BUY': /BEST\s*BUY/i,
  'CHASE': /CHASE\s*CREDIT|CARDMEMBER\s*SERV/i,
  'APPLE': /APPLE.{0,10}CARD|APPLECARD|GSBANK/i,
  'US BANK': /US\s*BANK|USBANK/i,
  'ROCKET MORTGAGE': /ROCKET\s*MORTGAGE/i,
  'WATERCRESS': /WATERCRESS/i,
  'CAR': /AUTO\s*LOAN|VEHICLE\s*LOAN/i,  // Very strict, must say "auto loan"
};

function detectDebtPayments(txs, debts) {
  const matches = [];
  for (const tx of txs) {
    const desc = tx.merchant.toUpperCase();
    for (const debt of debts) {
      const name = debt.name.toUpperCase();
      let matched = false;
      // Match by account pattern first (e.g. last 4 digits "1144")
      if (debt.account_pattern && debt.account_pattern.trim()) {
        const pattern = debt.account_pattern.trim();
        matched = desc.includes(pattern.toUpperCase());
      }
      // Fall back to name-based pattern matching
      if (!matched) {
        for (const [key, pattern] of Object.entries(DEBT_MATCH_PATTERNS)) {
          if (name.includes(key) && pattern.test(desc)) {
            matched = true;
            break;
          }
        }
      }
      if (matched) {
        matches.push({ tx, debt, suggestedBalance: Math.max(0, debt.balance - tx.amount) });
      }
    }
  }
  return matches;
}

async function parseWithClaude(fileData, fileType, mode='transactions', customSys=null, customMsg=null) {
  const cats = CATEGORIES.map(c=>c.id).join(", ");
  let sys, userMsg;

  if (customSys) {
    sys = customSys;
    userMsg = customMsg || "Extract data from this document.";
  } else if (mode === 'debt') {
    sys = `You are a financial document parser. Extract loan/debt details from this document. Return ONLY a JSON object with: {"name":"loan name","balance":number,"original_balance":number,"payment":number,"rate":number,"deadline":"MMM YYYY or ongoing","deadline_date":"YYYY-MM-DD or null","type":"loan or deferred or promo","note":"brief description"}`;
    userMsg = "Extract the loan/debt details from this document.";
  } else {
    sys = `Parse financial transactions from this bank statement. Return ONLY a JSON array. Each item must have:
{"date":"MM/DD","merchant":"name","amount":number,"category":"one of [${cats}]","source":"Chase or PNC","type":"expense or income"}
Rules:
- Expenses (withdrawals, payments, purchases): positive amount, type="expense"
- Income (deposits, payroll, direct deposit, transfers IN): positive amount, type="income", category="other"
- Skip internal transfers between accounts
- Include ALL transactions`;
    userMsg = "Parse all transactions including income deposits and expenses.";
  }

  // Normalize file type — Claude only supports jpeg/png/gif/webp
  let mediaType = fileType || "image/jpeg";
  if (["image/heic","image/heif","image/tiff"].includes(mediaType)) mediaType = "image/jpeg";
  if (!["image/jpeg","image/png","image/gif","image/webp","application/pdf"].includes(mediaType)) mediaType = "image/jpeg";

  const isImage = mediaType.startsWith("image/");
  const msgContent = isImage
    ? [{type:"image",source:{type:"base64",media_type:mediaType,data:fileData}},{type:"text",text:userMsg}]
    : [{type:"document",source:{type:"base64",media_type:"application/pdf",data:fileData}},{type:"text",text:userMsg}];

  // Call via Worker proxy to avoid CORS issues
  const res = await fetch("https://api.familyfinances.uk/api/ai/parse", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:2000,system:sys,messages:[{role:"user",content:msgContent}]})
  });

  if (!res.ok) throw new Error(`Proxy ${res.status}: ${(await res.text()).slice(0,150)}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  const text = data.content?.find(b=>b.type==="text")?.text || (mode==="debt"?"{}":"[]");
  return JSON.parse(text.replace(/```json|```/g,"").trim());
}

// ── DEBT COLORS ───────────────────────────────────────────────────────────────
const DEBT_COLORS = [
  {color:"#C43A3A",bg:"#F5E6E6"},{color:"#C4603A",bg:"#F5E6DF"},
  {color:"#B8860B",bg:"#FBF4E0"},{color:"#2C3E6B",bg:"#E8EBF5"},
  {color:"#3D8B6E",bg:"#EAF4EF"},{color:"#7B5EA7",bg:"#F0EBF8"},
  {color:"#5A6E7A",bg:"#EDF1F4"},{color:"#8A2C6B",bg:"#F7E0EF"},
];

// ── UI COMPONENTS ─────────────────────────────────────────────────────────────
function Bar({value,max,color,h=5}){
  return <div style={{background:C.surface2,borderRadius:99,height:h,overflow:"hidden"}}>
    <div style={{width:`${pct(value,max)}%`,height:"100%",background:value>max?C.red:color,borderRadius:99,transition:"width .5s ease"}}/>
  </div>;
}

function StatCard({label,value,sub,color,bg,mobile}){
  return <div style={{background:bg||C.surface,borderRadius:mobile?14:16,padding:mobile?"14px 16px":"18px 20px",boxShadow:C.shadow,border:`1px solid ${C.border}`,flex:1,minWidth:0}}>
    <div style={{fontSize:10,fontWeight:600,color:C.text3,textTransform:"uppercase",letterSpacing:.8,marginBottom:4,fontFamily:"'DM Sans',sans-serif"}}>{label}</div>
    <div style={{fontSize:mobile?18:24,fontWeight:700,color:color||C.text,letterSpacing:"-0.5px",marginBottom:2,fontFamily:"'DM Sans',sans-serif"}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:C.text3,fontFamily:"'DM Sans',sans-serif"}}>{sub}</div>}
  </div>;
}

function CatRow({cat,actual,budget}){
  const over=actual>budget;
  return <div style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:`1px solid ${C.border}`}}>
    <div style={{width:34,height:34,borderRadius:10,background:cat.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{cat.icon}</div>
    <div style={{flex:1,minWidth:0}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif"}}>{cat.label}</span>
        <span style={{fontSize:13,fontWeight:700,color:over?C.red:C.text,fontFamily:"'DM Sans',sans-serif"}}>{fmt(actual)}</span>
      </div>
      <Bar value={actual} max={budget} color={cat.color}/>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
        <span style={{fontSize:11,color:C.text3,fontFamily:"'DM Sans',sans-serif"}}>Budget {fmt(budget)}</span>
        <span style={{fontSize:11,color:over?C.red:C.green,fontFamily:"'DM Sans',sans-serif"}}>{over?`${fmt(actual-budget)} over`:`${fmt(budget-actual)} left`}</span>
      </div>
    </div>
  </div>;
}

// ── DEBT CARD (draggable) ─────────────────────────────────────────────────────
function DebtCard({debt, onUpdate, onDelete, onDragStart, onDragOver, onDrop, isDragging, monthPayments=[]}) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({...debt});
  const months = monthsUntil(debt.deadline_date);
  const paid = (debt.original_balance || debt.balance) - debt.balance;
  const original = debt.original_balance || debt.balance;
  const urgent = months !== null && months <= 8;

  const save = () => { onUpdate(debt.id, editData); setEditing(false); };

  return (
    <div
      draggable
      onDragStart={() => onDragStart(debt.id)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(debt.id); }}
      onDrop={() => onDrop(debt.id)}
      style={{
        background:C.surface, borderRadius:16, padding:"18px 20px",
        boxShadow:C.shadow, border:`1px solid ${urgent?debt.color:C.border}`,
        opacity:isDragging?0.4:1, cursor:"grab", transition:"opacity .2s",
        userSelect:"none"
      }}
    >
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0}}>
          <span style={{fontSize:16,cursor:"grab",color:C.text3}}>⠿</span>
          <div style={{width:10,height:10,borderRadius:"50%",background:debt.color,flexShrink:0}}/>
          {editing
            ? <input value={editData.name} onChange={e=>setEditData(p=>({...p,name:e.target.value}))}
                style={{fontSize:14,fontWeight:700,border:`1px solid ${C.border2}`,borderRadius:8,padding:"3px 8px",fontFamily:"'DM Sans',sans-serif",color:C.text,background:C.surface2,flex:1}}/>
            : <span style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"'DM Sans',sans-serif"}}>{debt.name}</span>}
          {urgent&&<span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,background:debt.bg,color:debt.color,fontFamily:"'DM Sans',sans-serif",flexShrink:0}}>URGENT</span>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0,marginLeft:8}}>
          {editing
            ? <><button onClick={save} style={{background:C.green,color:"#fff",border:"none",borderRadius:8,padding:"4px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Save</button>
                <button onClick={()=>setEditing(false)} style={{background:C.surface2,color:C.text2,border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 10px",fontSize:12,cursor:"pointer"}}>✕</button></>
            : <><button onClick={()=>setEditing(true)} style={{background:C.surface2,color:C.text2,border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 10px",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Edit</button>
                <button onClick={()=>onDelete(debt.id)} style={{background:"none",color:C.text3,border:"none",fontSize:14,cursor:"pointer",padding:"4px"}}>🗑</button></>}
        </div>
      </div>

      {editing ? (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          {[
            {label:"Current Balance",key:"balance",type:"number"},
            {label:"Monthly Payment",key:"payment",type:"number"},
            {label:"Interest Rate %",key:"rate",type:"number"},
            {label:"Deadline",key:"deadline",type:"text"},
            {label:"Deadline Date (YYYY-MM-DD)",key:"deadline_date",type:"text"},
            {label:"Account # / Payment Keyword",key:"account_pattern",type:"text"},
          ].map(f=>(
            <div key={f.key} style={{gridColumn:(f.key==="deadline_date"||f.key==="account_pattern")?"1/-1":"auto"}}>
              <div style={{fontSize:10,color:C.text3,fontFamily:"'DM Sans',sans-serif",marginBottom:3,textTransform:"uppercase",letterSpacing:.5}}>{f.label}</div>
              <input type={f.type} value={editData[f.key]||""} onChange={e=>setEditData(p=>({...p,[f.key]:f.type==="number"?parseFloat(e.target.value):e.target.value}))}
                style={{width:"100%",boxSizing:"border-box",background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:8,color:C.text,padding:"6px 10px",fontSize:13,fontFamily:"'DM Sans',sans-serif"}}/>
            </div>
          ))}
          <div style={{gridColumn:"1/-1"}}>
            <div style={{fontSize:10,color:C.text3,fontFamily:"'DM Sans',sans-serif",marginBottom:3,textTransform:"uppercase",letterSpacing:.5}}>Notes</div>
            <textarea value={editData.note||""} onChange={e=>setEditData(p=>({...p,note:e.target.value}))}
              style={{width:"100%",boxSizing:"border-box",background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:8,color:C.text,padding:"6px 10px",fontSize:13,fontFamily:"'DM Sans',sans-serif",resize:"vertical",minHeight:60}}/>
          </div>
        </div>
      ) : (
        <>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <div>
              <div style={{fontSize:22,fontWeight:700,color:debt.color,letterSpacing:"-0.5px",fontFamily:"'DM Sans',sans-serif"}}>{fmt(debt.balance)}</div>
              <div style={{fontSize:11,color:C.text3,fontFamily:"'DM Sans',sans-serif"}}>of {fmt(original)} original · {fmt(debt.payment)}/mo · {debt.rate>0?`${debt.rate}% APR`:"0% promo"}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:20,fontWeight:700,color:C.green,fontFamily:"'DM Sans',sans-serif"}}>{pct(paid,original)}%</div>
              <div style={{fontSize:11,color:C.text3,fontFamily:"'DM Sans',sans-serif"}}>paid off</div>
            </div>
          </div>
          <Bar value={paid} max={original} color={debt.color} h={6}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:6,marginBottom:(debt.note||monthPayments.length)?10:0}}>
            <span style={{fontSize:11,color:C.text3,fontFamily:"'DM Sans',sans-serif"}}>Deadline: {debt.deadline}{months!==null?` · ${months} months`:""}</span>
          </div>
          {monthPayments.length>0&&(
            <div style={{marginBottom:debt.note?10:0,padding:"8px 12px",background:C.green2,borderRadius:10,border:`1px solid ${C.green}33`}}>
              <div style={{fontSize:10,fontWeight:700,color:C.green,textTransform:"uppercase",letterSpacing:.6,marginBottom:6}}>Payments this month</div>
              {monthPayments.map((p,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"2px 0"}}>
                  <span style={{color:C.text2,fontFamily:"'DM Sans',sans-serif"}}>{p.date} · {p.merchant}</span>
                  <span style={{fontWeight:700,color:C.green,fontFamily:"'DM Sans',sans-serif"}}>−{fmt(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
          {debt.note&&<div style={{fontSize:12,color:C.text2,background:debt.bg||C.terra3,borderRadius:10,padding:"8px 12px",lineHeight:1.6,fontFamily:"'DM Sans',sans-serif"}}>{debt.note}</div>}
        </>
      )}
    </div>
  );
}

// ── ADD DEBT MODAL ────────────────────────────────────────────────────────────
function AddDebtModal({onAdd, onClose}) {
  const [mode, setMode] = useState("ai"); // "ai" or "manual"
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [form, setForm] = useState({name:"",balance:"",payment:"",rate:"",deadline:"ongoing",deadline_date:"",note:"",account_pattern:""});
  const fileRef = useRef();
  const camRef = useRef();

  const handleFile = async (file) => {
    setLoading(true);
    try {
      const base64 = await new Promise(res=>{const r=new FileReader();r.onload=e=>res(e.target.result.split(',')[1]);r.readAsDataURL(file);});
      const result = await parseWithClaude(base64, file.type, 'debt');
      if (result && result.name) {
        setExtracted(result);
        setForm({
          name: result.name || "",
          balance: result.balance || "",
          payment: result.payment || "",
          rate: result.rate || 0,
          deadline: result.deadline || "ongoing",
          deadline_date: result.deadline_date || "",
          note: result.note || "",
        });
        setMode("manual");
      } else {
        alert("Could not extract debt details. Please fill in manually.");
        setMode("manual");
      }
    } catch(e) {
      alert("Failed to read file. Please fill in manually.");
      setMode("manual");
    }
    setLoading(false);
  };

  const submit = () => {
    if (!form.name || !form.balance) return alert("Name and balance are required.");
    const colorIdx = Math.floor(Math.random() * DEBT_COLORS.length);
    onAdd({
      ...form,
      balance: parseFloat(form.balance),
      original_balance: parseFloat(form.balance),
      payment: parseFloat(form.payment) || 0,
      rate: parseFloat(form.rate) || 0,
      deadline_date: form.deadline_date || null,
      ...DEBT_COLORS[colorIdx],
    });
    onClose();
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(26,23,20,0.6)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:600,maxHeight:"90vh",overflowY:"auto",padding:"24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{margin:0,fontSize:20,fontWeight:700,fontFamily:"'Sora',sans-serif",color:C.text}}>Add New Debt</h2>
          <button onClick={onClose} style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,color:C.text2}}>✕</button>
        </div>

        <div style={{display:"flex",gap:8,marginBottom:20}}>
          {[["ai","📸 Scan Document"],["manual","✏️ Manual Entry"]].map(([m,l])=>(
            <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"10px",borderRadius:12,border:`1px solid ${mode===m?C.terra:C.border}`,background:mode===m?C.terra3:C.surface,color:mode===m?C.terra:C.text2,fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,cursor:"pointer"}}>
              {l}
            </button>
          ))}
        </div>

        {mode==="ai"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input ref={fileRef} type="file" accept="image/*,.pdf,.png,.jpg,.jpeg,.heic" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
            <input ref={camRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
            {loading
              ? <div style={{border:`2px dashed ${C.border2}`,borderRadius:16,padding:"32px",textAlign:"center",background:C.surface2}}>
                  <div style={{fontSize:28,marginBottom:8}}>⏳</div>
                  <div style={{fontSize:13,color:C.text3,fontFamily:"'DM Sans',sans-serif"}}>Reading with AI...</div>
                </div>
              : <>
                  <button onClick={()=>camRef.current.click()} style={{width:"100%",padding:"14px",borderRadius:12,border:`1px solid ${C.border2}`,background:C.surface2,color:C.text,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                    📷 Take Photo of Loan Statement
                  </button>
                  <button onClick={()=>fileRef.current.click()} style={{width:"100%",padding:"14px",borderRadius:12,border:`1px solid ${C.border2}`,background:C.surface2,color:C.text,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                    🖼️ Choose from Gallery (PNG, JPG, PDF)
                  </button>
                  <div style={{border:`2px dashed ${C.terra}`,borderRadius:12,padding:"14px",textAlign:"center",background:C.terra3,cursor:"text",outline:"none",fontFamily:"'DM Sans',sans-serif"}}
                    tabIndex={0}
                    onPaste={e=>{const files=Array.from(e.clipboardData?.items||[]).filter(i=>i.kind==="file").map(i=>i.getAsFile()).filter(Boolean);if(files.length>0){e.preventDefault();handleFile(files[0]);}}}>
                    <span style={{fontSize:16,marginRight:6}}>📋</span>
                    <span style={{fontSize:13,color:C.terra,fontWeight:600}}>Tap here → long press → Paste</span>
                  </div>
                </>}
            <button onClick={()=>setMode("manual")} style={{width:"100%",padding:"10px",background:"none",border:`1px solid ${C.border}`,borderRadius:12,color:C.text2,fontFamily:"'DM Sans',sans-serif",fontSize:13,cursor:"pointer"}}>Fill in manually instead</button>
          </div>
        )}

        {mode==="manual"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {extracted&&<div style={{background:C.green2,borderRadius:12,padding:"10px 14px",fontSize:12,color:C.green,fontFamily:"'DM Sans',sans-serif"}}>✓ Details extracted from document — review and confirm below</div>}
            {[
              {label:"Debt Name *",key:"name",type:"text",placeholder:"e.g. Car Loan, Best Buy"},
              {label:"Current Balance *",key:"balance",type:"number",placeholder:"e.g. 4878.34"},
              {label:"Monthly Payment",key:"payment",type:"number",placeholder:"e.g. 267.66"},
              {label:"Interest Rate %",key:"rate",type:"number",placeholder:"e.g. 7.37 (0 for promo)"},
              {label:"Deadline",key:"deadline",type:"text",placeholder:"e.g. Dec 2027 or ongoing"},
              {label:"Deadline Date (YYYY-MM-DD)",key:"deadline_date",type:"text",placeholder:"e.g. 2027-12-06"},
              {label:"Account # / Payment Keyword",key:"account_pattern",type:"text",placeholder:"e.g. 1144 or ROCKET MORTGAGE"},
            ].map(f=>(
              <div key={f.key}>
                <div style={{fontSize:11,color:C.text3,fontFamily:"'DM Sans',sans-serif",marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>{f.label}</div>
                <input type={f.type} value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                  placeholder={f.placeholder}
                  style={{width:"100%",boxSizing:"border-box",background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:10,color:C.text,padding:"10px 14px",fontSize:14,fontFamily:"'DM Sans',sans-serif"}}/>
              </div>
            ))}
            <div>
              <div style={{fontSize:11,color:C.text3,fontFamily:"'DM Sans',sans-serif",marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Notes</div>
              <textarea value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))}
                placeholder="Any notes about this debt..."
                style={{width:"100%",boxSizing:"border-box",background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:10,color:C.text,padding:"10px 14px",fontSize:14,fontFamily:"'DM Sans',sans-serif",resize:"vertical",minHeight:70}}/>
            </div>
            <button onClick={submit} style={{width:"100%",background:C.terra,color:"#fff",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:`0 4px 12px ${C.terra}44`}}>
              Add Debt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DEBT PAYMENT DETECTOR MODAL ───────────────────────────────────────────────
function DebtPaymentModal({matches, onConfirm, onClose}) {
  const [selected, setSelected] = useState(matches.map(m => m.debt.id));
  const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(26,23,20,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.surface,borderRadius:24,width:"100%",maxWidth:500,padding:"24px",boxShadow:C.shadow2}}>
        <h2 style={{margin:"0 0 6px",fontSize:20,fontWeight:700,fontFamily:"'Sora',sans-serif",color:C.text}}>Debt Payments Detected</h2>
        <p style={{margin:"0 0 20px",fontSize:13,color:C.text3,fontFamily:"'DM Sans',sans-serif"}}>We found payments that match your debts. Select which ones to update:</p>
        {matches.map(m=>(
          <div key={m.debt.id} onClick={()=>toggle(m.debt.id)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px",borderRadius:14,border:`1px solid ${selected.includes(m.debt.id)?C.terra:C.border}`,background:selected.includes(m.debt.id)?C.terra3:C.surface2,marginBottom:10,cursor:"pointer"}}>
            <div style={{width:20,height:20,borderRadius:6,background:selected.includes(m.debt.id)?C.terra:C.surface,border:`2px solid ${selected.includes(m.debt.id)?C.terra:C.border2}`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,flexShrink:0}}>{selected.includes(m.debt.id)?"✓":""}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif"}}>{m.debt.name}</div>
              <div style={{fontSize:11,color:C.text3,fontFamily:"'DM Sans',sans-serif"}}>Payment: {fmt(m.tx.amount)} → New balance: {fmt(m.suggestedBalance)}</div>
            </div>
          </div>
        ))}
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={onClose} style={{flex:1,padding:"12px",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:12,color:C.text2,fontFamily:"'DM Sans',sans-serif",fontSize:13,cursor:"pointer"}}>Skip</button>
          <button onClick={()=>onConfirm(matches.filter(m=>selected.includes(m.debt.id)))} style={{flex:2,padding:"12px",background:C.terra,border:"none",borderRadius:12,color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer"}}>Update {selected.length} Debt{selected.length!==1?"s":""}</button>
        </div>
      </div>
    </div>
  );
}

// ── ADD SAVINGS GOAL MODAL ────────────────────────────────────────────────────
function AddGoalModal({onAdd, onClose}) {
  const [form, setForm] = useState({name:"",target_amount:"",current_amount:"0",target_date:"",icon:"💰",color:"#3D8B6E"});
  const ICONS = ["💰","🏠","✈️","🚗","💍","🎓","🏝️","💼","🎁","💎","🚨","⚡"];

  const submit = () => {
    if (!form.name || !form.target_amount) return alert("Name and target amount required");
    onAdd({
      ...form,
      target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount) || 0,
      target_date: form.target_date || null,
    });
    onClose();
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(26,23,20,0.6)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.surface,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto",padding:"24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{margin:0,fontSize:20,fontWeight:700,fontFamily:"'Sora',sans-serif",color:C.text}}>New Savings Goal</h2>
          <button onClick={onClose} style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16}}>✕</button>
        </div>

        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:C.text3,fontFamily:"'Sora',sans-serif",marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Icon</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {ICONS.map(i=>(
              <button key={i} onClick={()=>setForm(p=>({...p,icon:i}))}
                style={{width:40,height:40,borderRadius:10,border:`2px solid ${form.icon===i?C.green:C.border}`,background:form.icon===i?C.green2:C.surface,fontSize:20,cursor:"pointer"}}>{i}</button>
            ))}
          </div>
        </div>

        {[
          {label:"Goal Name *",key:"name",type:"text",placeholder:"e.g. Emergency Fund"},
          {label:"Target Amount *",key:"target_amount",type:"number",placeholder:"e.g. 10000"},
          {label:"Current Savings",key:"current_amount",type:"number",placeholder:"e.g. 0"},
          {label:"Target Date",key:"target_date",type:"date",placeholder:""},
        ].map(f=>(
          <div key={f.key} style={{marginBottom:14}}>
            <div style={{fontSize:11,color:C.text3,fontFamily:"'Sora',sans-serif",marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>{f.label}</div>
            <input type={f.type} value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
              placeholder={f.placeholder}
              style={{width:"100%",boxSizing:"border-box",background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:10,color:C.text,padding:"10px 14px",fontSize:14,fontFamily:"'Sora',sans-serif"}}/>
          </div>
        ))}

        <button onClick={submit} style={{width:"100%",background:C.green,color:"#fff",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif",marginTop:8}}>
          Create Goal
        </button>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function Finance({onBack}) {
  const mobile = useIsMobile();
  const now = new Date();
  const [tab, setTab] = useState("dashboard");
  const [income, setIncome] = useState(0);
  const [debts, setDebts] = useState([]);
  const [txs, setTxs] = useState([]);
  const [editTx, setEditTx] = useState(null);
  const [expandedTx, setExpandedTx] = useState(null);
  const [receiptItems, setReceiptItems] = useState({}); // txId -> [{name, amount, category}]
  const [uploadingReceipt, setUploadingReceipt] = useState(null);
  const receiptRef = useRef();
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [savings, setSavings] = useState([]);
  const [debtPaymentMatches, setDebtPaymentMatches] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [apiReady, setApiReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authError, setAuthError] = useState(false);
  const [incomeSources, setIncomeSources] = useState([]);
  const [monthlyData, setMonthlyData] = useState({});
  const [monthBudgets, setMonthBudgets] = useState({});
  const [customCategories, setCustomCategories] = useState([]);
  const [showHouseholdPanel, setShowHouseholdPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(()=>localStorage.getItem('darkMode')==='1');
  const [sortTx, setSortTx] = useState('date');
  const [txSearch, setTxSearch] = useState('');
  const [undoToast, setUndoToast] = useState(null);
  const [yoyData, setYoyData] = useState(null);
  const [pendingImport, setPendingImport] = useState(null); // {txs, selected: Set}
  const [familyName, setFamilyName] = useState('Family Finances');
  const [adminFamilies, setAdminFamilies] = useState([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [newFamily, setNewFamily] = useState({slug:'', name:'', owner_email:'', members:''});
  const [showDisclaimer, setShowDisclaimer] = useState(()=>localStorage.getItem('disclaimerAccepted')!=='1');
  const [chartView, setChartView] = useState('grid'); // 'grid' | 'list'
  const [householdMembers, setHouseholdMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [displayNameEdit, setDisplayNameEdit] = useState('');
  const budgetSaveTimer = useRef(null);
  const [receiptFirstLoading, setReceiptFirstLoading] = useState(false);
  const [receiptFirstResult, setReceiptFirstResult] = useState(null); // {merchant,date,total,items,txId}
  const receiptFirstRef = useRef();
  const receiptFirstCamRef = useRef();
  const inputRef = useRef();

  // Compute total monthly income from sources
  const computedIncome = incomeSources.reduce((sum, s) => {
    if (s.frequency === 'biweekly') return sum + (s.amount * 26 / 12);
    if (s.frequency === 'weekly') return sum + (s.amount * 52 / 12);
    return sum + s.amount;
  }, 0);
  // Auto-detected income transactions from uploaded statements
  const detectedIncomeTxs = txs.filter(t => t.type === 'income' || (t.amount > 0 && /credit/i.test(t.merchant)));
  const detectedIncomeTotal = detectedIncomeTxs.reduce((s, t) => s + t.amount, 0);
  const totalComputedIncome = computedIncome + detectedIncomeTotal;
  const cameraRef = useRef();

  // Simple paste zone component inline
  function PasteZone({onFiles}) {
    const ref = useRef();
    useEffect(()=>{
      const el = ref.current;
      if (!el) return;
      const h = (e) => {
        const files = Array.from(e.clipboardData?.items||[]).filter(i=>i.kind==="file").map(i=>i.getAsFile()).filter(Boolean);
        if (files.length > 0) { e.preventDefault(); onFiles(files); }
      };
      el.addEventListener("paste", h);
      return () => el.removeEventListener("paste", h);
    }, [onFiles]);
    return (
      <div ref={ref} tabIndex={0} style={{border:`2px dashed ${C.terra}`,borderRadius:12,padding:"16px",textAlign:"center",background:C.terra3,cursor:"text",outline:"none",fontFamily:"'DM Sans',sans-serif"}}>
        <span style={{fontSize:18,marginRight:8}}>📋</span>
        <span style={{fontSize:13,color:C.terra,fontWeight:600}}>Tap here → long press → Paste</span>
        <div style={{fontSize:11,color:C.text3,marginTop:4}}>For screenshots copied on iPhone</div>
      </div>
    );
  }

  const monthKey = `${selectedYear}-${String(selectedMonth+1).padStart(2,'0')}`;

  // ── LOAD DATA ─────────────────────────────────────────────────────────────
  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (apiReady) loadTransactions();
  }, [monthKey, apiReady]);

  useEffect(() => {
    if (tab === 'dashboard') { loadMonthlyData(); loadYoY(); }
  }, [tab, selectedYear, selectedMonth]);

  const loadYoY = async () => {
    const curYear = now.getFullYear();
    const mm = String(selectedMonth + 1).padStart(2, '0');
    const [cur, prev] = await Promise.all([
      apiFetch(`/api/transactions?month=${curYear}-${mm}`),
      apiFetch(`/api/transactions?month=${curYear - 1}-${mm}`),
    ]);
    const calcSpend = arr => (Array.isArray(arr)?arr:[]).filter(t=>t.amount>0&&!/credit/i.test(t.merchant)&&t.category!=='income'&&t.category!=='cc_payment'&&!isCreditCardPayment(t.merchant||'')).reduce((s,t)=>s+t.amount,0);
    setYoyData({cur:calcSpend(cur),prev:calcSpend(prev),month:MONTHS[selectedMonth],curYear,prevYear:curYear-1});
  };

  const showUndo = (message, onUndo) => {
    setUndoToast(p=>{ if(p?.timer) clearTimeout(p.timer); return null; });
    const timer = setTimeout(()=>setUndoToast(null), 10000);
    setUndoToast({message, onUndo, timer});
  };

  const autoSaveBudgets = (newBudgets) => {
    if (budgetSaveTimer.current) clearTimeout(budgetSaveTimer.current);
    budgetSaveTimer.current = setTimeout(()=>apiFetch(`/api/monthly?month=${monthKey}`,{method:'PUT',body:JSON.stringify({income,budgets:newBudgets})}), 900);
  };

  const loadMonthlyData = async () => {
    const result = {};
    const now2 = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now2.getFullYear(), now2.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const [txArr, mData] = await Promise.all([
        apiFetch(`/api/transactions?month=${key}`),
        apiFetch(`/api/monthly?month=${key}`),
      ]);
      const txs2 = Array.isArray(txArr) ? txArr : [];
      const inc = mData?.income || 0;
      const byCat2 = {};
      txs2.filter(t=>t.amount>0 && !/credit/i.test(t.merchant) && t.category!=='income').forEach(t=>{
        byCat2[t.category]=(byCat2[t.category]||0)+t.amount;
      });
      const spent = Object.values(byCat2).reduce((s,v)=>s+v,0);
      result[key] = {income:inc, spent, net:inc-spent, byCat:byCat2, label:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]};
    }
    setMonthlyData(result);
  };

  const loadAll = async () => {
    // Load family branding
    const familyInfo = await apiFetch('/api/families/current');
    if (familyInfo?.name) setFamilyName(familyInfo.name);
    const meData = await apiFetch('/api/me');
    if (meData?.error === 'Unauthorized' || meData?.status === 401) {
      setAuthError(true);
      return;
    } else if (meData?.email) {
      setCurrentUser(meData);
    }

    const [userData, debtData, savingsData, catData, srcData] = await Promise.all([
      apiFetch('/api/user'),
      apiFetch('/api/debts'),
      apiFetch('/api/savings'),
      apiFetch('/api/categories'),
      apiFetch('/api/income-sources'),
    ]);
    if (userData) setIncome(userData.income || 0);
    if (Array.isArray(debtData)) setDebts(debtData);
    if (Array.isArray(savingsData)) setSavings(savingsData);
    if (Array.isArray(catData)) setCustomCategories(catData);
    if (Array.isArray(srcData)) setIncomeSources(srcData);
    setApiReady(true);
  };

  const applyDebtPayments = async (currentDebts) => {
    const debtList = currentDebts || debts;
    if (!debtList.length) return 0;
    // Collect ALL months that have transactions
    const monthKeys = [];
    for (let yr = 2024; yr <= new Date().getFullYear() + 1; yr++) {
      for (let m = 1; m <= 12; m++) {
        monthKeys.push(`${yr}-${String(m).padStart(2,'0')}`);
      }
    }
    // Sum payments per debt across all months
    const paidByDebt = {};
    for (const mKey of monthKeys) {
      const txArr = await apiFetch(`/api/transactions?month=${mKey}`);
      if (!Array.isArray(txArr) || txArr.length === 0) continue;
      const matches = detectDebtPayments(txArr, debtList);
      for (const m2 of matches) {
        paidByDebt[m2.debt.id] = (paidByDebt[m2.debt.id] || 0) + m2.tx.amount;
      }
    }
    // Compute new balance from original_balance minus total paid (idempotent)
    let updated = 0;
    for (const [debtId, totalPaid] of Object.entries(paidByDebt)) {
      const debt = debtList.find(d => d.id === debtId);
      if (!debt) continue;
      const newBalance = Math.max(0, (debt.original_balance || debt.balance) - totalPaid);
      await updateDebt(debtId, {balance: newBalance});
      updated++;
    }
    return updated;
  };

  const loadTransactions = async () => {
    const [txData, monthData] = await Promise.all([
      apiFetch(`/api/transactions?month=${monthKey}`),
      apiFetch(`/api/monthly?month=${monthKey}`),
    ]);
    const txArr = Array.isArray(txData) ? txData : [];
    setTxs(txArr);
    // Load month-specific income and budgets if available
    if (monthData?.income && monthData.income > 0) setIncome(monthData.income);
    if (monthData?.budgets) setMonthBudgets(typeof monthData.budgets==='string' ? JSON.parse(monthData.budgets) : monthData.budgets);
    // Eagerly load receipt items for transactions that have them (needed for byCat budget split)
    const txsWithReceipts = txArr.filter(t => t.has_receipt);
    if (txsWithReceipts.length > 0) {
      const allItems = {};
      await Promise.all(txsWithReceipts.map(async t => {
        const items = await apiFetch(`/api/receipt-items?tx_id=${t.id}`);
        if (Array.isArray(items) && items.length > 0) allItems[t.id] = items;
      }));
      setReceiptItems(allItems);
    } else {
      setReceiptItems({});
    }
    // Note: debt balance updates happen only at import time or via Re-scan button
    // to avoid balance drift when switching months.
  };

  // ── COMPUTED ──────────────────────────────────────────────────────────────
  const allCats = [...CATEGORIES, ...customCategories.map(c=>({...c,id:c.id}))];
  const ccPaymentTxs = txs.filter(t=>t.category==='cc_payment' || isCreditCardPayment(t.merchant||''));
  const expenses = txs.filter(t=>t.amount>0 && !/credit/i.test(t.merchant) && t.category!=='cc_payment' && !isCreditCardPayment(t.merchant||''));
  const totalSpend = expenses.reduce((s,t)=>s+t.amount,0);
  const net = income - totalSpend;
  const byCat = {};
  allCats.forEach(c=>{byCat[c.id]=0;});
  expenses.forEach(t=>{
    const items = receiptItems[t.id];
    if (items?.length > 0) {
      // Distribute by receipt line item categories
      items.forEach(item=>{
        byCat[item.category] = (byCat[item.category]||0) + item.amount;
      });
      // Any difference between receipt total and tx amount goes to tx category
      const receiptTotal = items.reduce((s,i)=>s+i.amount, 0);
      const remainder = t.amount - receiptTotal;
      if (Math.abs(remainder) > 0.01) byCat[t.category] = (byCat[t.category]||0) + remainder;
    } else {
      byCat[t.category] = (byCat[t.category]||0) + t.amount;
    }
  });
  const totalDebt = debts.reduce((s,d)=>s+d.balance,0);
  const totalPaid = debts.reduce((s,d)=>s+((d.original_balance||d.balance)-d.balance),0);
  const totalOrig = debts.reduce((s,d)=>s+(d.original_balance||d.balance),0);
  const totalMin = debts.reduce((s,d)=>s+d.payment,0);
  const availableForDebt = Math.max(0, income - totalSpend);

  // ── DEBT ACTIONS ──────────────────────────────────────────────────────────
  const addDebt = async (debtData) => {
    const result = await apiFetch('/api/debts', {
      method: 'POST',
      body: JSON.stringify({...debtData, priority: debts.length + 1}),
    });
    if (result?.ok) {
      await loadAll();
    }
  };

  const updateDebt = async (id, data) => {
    await apiFetch(`/api/debts/${id}`, {method:'PUT', body:JSON.stringify(data)});
    setDebts(prev => prev.map(d => d.id===id ? {...d,...data} : d));
  };

  const deleteDebt = async (id) => {
    if (!confirm("Delete this debt?")) return;
    await apiFetch(`/api/debts/${id}`, {method:'DELETE'});
    setDebts(prev => prev.filter(d => d.id!==id));
  };

  // ── SAVINGS ACTIONS ──────────────────────────────────────────────────────
  const addGoal = async (goalData) => {
    const result = await apiFetch('/api/savings', {
      method: 'POST',
      body: JSON.stringify({...goalData, priority: savings.length + 1}),
    });
    if (result?.ok) await loadAll();
  };

  const updateGoal = async (id, data) => {
    await apiFetch(`/api/savings/${id}`, {method:'PUT', body:JSON.stringify(data)});
    setSavings(prev => prev.map(g => g.id===id ? {...g,...data} : g));
  };

  const deleteGoal = async (id) => {
    if (!confirm("Delete this savings goal?")) return;
    await apiFetch(`/api/savings/${id}`, {method:'DELETE'});
    setSavings(prev => prev.filter(g => g.id!==id));
  };

  // ── DRAG TO REORDER ───────────────────────────────────────────────────────
  const handleDragStart = (id) => setDragId(id);
  const handleDragOver = (id) => setDragOverId(id);
  const handleDrop = async (targetId) => {
    if (!dragId || dragId===targetId) { setDragId(null); setDragOverId(null); return; }
    const newDebts = [...debts];
    const fromIdx = newDebts.findIndex(d=>d.id===dragId);
    const toIdx = newDebts.findIndex(d=>d.id===targetId);
    const [moved] = newDebts.splice(fromIdx, 1);
    newDebts.splice(toIdx, 0, moved);
    const reordered = newDebts.map((d,i) => ({...d, priority: i+1}));
    setDebts(reordered);
    setDragId(null); setDragOverId(null);
    await apiFetch('/api/debts/reorder', {
      method:'POST',
      body: JSON.stringify(reordered.map(d=>({id:d.id,priority:d.priority})))
    });
  };

  // ── FILE UPLOAD ───────────────────────────────────────────────────────────
  const uploadReceiptFirst = async (file) => {
    setReceiptFirstLoading(true);
    setReceiptFirstResult(null);
    try {
      const base64 = await new Promise(res=>{const r=new FileReader();r.onload=e=>res(e.target.result.split(',')[1]);r.readAsDataURL(file);});
      let mediaType = file.type || 'image/jpeg';
      if (['image/heic','image/heif','image/tiff'].includes(mediaType)) mediaType = 'image/jpeg';
      if (!['image/jpeg','image/png','image/gif','image/webp','application/pdf'].includes(mediaType)) mediaType = 'image/jpeg';
      const catIds = allCats.map(c=>c.id).join(', ');
      const sys = `You are a receipt parser. Extract from this receipt and return ONLY valid JSON with this exact shape:
{"merchant":"Store Name","date":"MM/DD","total":number,"items":[{"name":"item name","amount":number,"category":"category_id"}]}
Category IDs available: ${catIds}
Rules: total = sum of all items. date format MM/DD. amounts are numbers (no $ sign).`;
      const data = await parseWithClaude(base64, mediaType, 'receipt-first', sys, 'Extract merchant, date, total, and all line items from this receipt.');
      const parsed = typeof data === 'string' ? JSON.parse(data.replace(/```json|```/g,'').trim()) : data;
      // Create a transaction in DB for this receipt
      const txId = crypto.randomUUID();
      const mm = (parsed.date||'01/01').split('/')[0].padStart(2,'0');
      const key = `${selectedYear}-${mm}`;
      const topCat = parsed.items?.length > 0
        ? (parsed.items.sort((a,b)=>b.amount-a.amount)[0].category || 'other')
        : 'other';
      await apiFetch(`/api/transactions?month=${key}`, {method:'POST', body:JSON.stringify([{
        id: txId, date: parsed.date||'01/01', merchant: parsed.merchant||file.name,
        amount: parsed.total || parsed.items?.reduce((s,i)=>s+i.amount,0) || 0,
        category: topCat, source: 'Receipt', has_receipt: 1
      }])});
      // Save items
      if (parsed.items?.length > 0) {
        await apiFetch('/api/receipt-items', {method:'POST', body:JSON.stringify({tx_id:txId, items:parsed.items})});
        setReceiptItems(prev=>({...prev,[txId]:parsed.items}));
      }
      await apiFetch(`/api/transactions/${txId}`, {method:'PUT', body:JSON.stringify({has_receipt:1})});
      setReceiptFirstResult({...parsed, txId, month_key:key});
      await loadTransactions();
    } catch(e) {
      alert(`Receipt parse failed: ${e.message}`);
    }
    setReceiptFirstLoading(false);
  };

  const processFiles = async (files) => {
    setLoading(true); const l = [];
    const newTxs = [];
    for (const file of files) {
      try {
        l.push(`Reading ${file.name}...`); setLog([...l]);
        let parsed = [];
        if (file.name.toLowerCase().endsWith('.csv')) {
          const text = await file.text();
          parsed = parseGenericCSV(text);
          l.push(`✓ ${file.name}: ${parsed.length} transactions (CSV)`); setLog([...l]);
        } else {
          const base64 = await new Promise(res=>{const r=new FileReader();r.onload=e=>res(e.target.result.split(',')[1]);r.readAsDataURL(file);});
          parsed = await parseWithClaude(base64, file.type, 'transactions');
          parsed = (Array.isArray(parsed)?parsed:[]).map(t=>({...t,id:crypto.randomUUID(),amount:Math.abs(t.amount)})).filter(t=>t.amount>0);
          l.push(`✓ ${file.name}: ${parsed.length} transactions (AI)`); setLog([...l]);
        }
        newTxs.push(...parsed);
      } catch(err) { l.push(`✗ ${file.name}: ${err.message}`); setLog([...l]); }
    }
    if (newTxs.length > 0) {
      // Show review screen — user picks which to import
      const selected = new Set(newTxs.map(t => t.id));
      setPendingImport({txs: newTxs, selected});
      setLoading(false);
      return;
    } else {
      l.push('⚠ No transactions extracted from file'); setLog([...l]);
    }
    setLoading(false);
  };

  const saveImportedTxs = async (txsToSave) => {
    const l = [];
    setLog([]);
    // Separate income, credit card payments, and expenses
    const incomeTxs = txsToSave.filter(t => t.type === 'income');
    const ccPayments = txsToSave.filter(t => t.type !== 'income' && isCreditCardPayment(t.merchant));
    const expenseTxs = txsToSave.filter(t => t.type !== 'income' && !isCreditCardPayment(t.merchant));
    l.push(`Importing: ${expenseTxs.length} expenses, ${ccPayments.length} CC payments, ${incomeTxs.length} income`); setLog([...l]);

      // Tag CC payments with their own category so they're saved but excluded from expense totals
      const ccPaymentTagged = ccPayments.map(t => ({...t, category:'cc_payment'}));

      // Group expenses by their actual month
      const byMonth = {};
      const incomeByMonth = {};
      for (const tx of [...expenseTxs, ...ccPaymentTagged]) {
        const [mm] = (tx.date || '01/01').split('/');
        const key = `${selectedYear}-${String(parseInt(mm)).padStart(2,'0')}`;
        if (!byMonth[key]) byMonth[key] = [];
        byMonth[key].push(tx);
      }
      // Also save income txs to byMonth so they show in transactions list
      const incomeTxsByMonth = {};
      for (const tx of incomeTxs) {
        const [mm, dd] = (tx.date || '01/01').split('/');
        let monthNum = parseInt(mm);
        let year = selectedYear;
        const day = parseInt(dd);
        const lastDay = new Date(year, monthNum, 0).getDate();
        if (day >= lastDay - 2) {
          monthNum++;
          if (monthNum > 12) { monthNum = 1; year++; }
        }
        const key = `${year}-${String(monthNum).padStart(2,'0')}`;
        if (!incomeByMonth[key]) incomeByMonth[key] = 0;
        incomeByMonth[key] += tx.amount;
        // Also save the actual income transaction with negative amount as marker
        if (!incomeTxsByMonth[key]) incomeTxsByMonth[key] = [];
        incomeTxsByMonth[key].push({...tx, category:'income'});
      }
      // Merge income txs into byMonth so they get saved
      for (const [k,arr] of Object.entries(incomeTxsByMonth)) {
        if (!byMonth[k]) byMonth[k] = [];
        byMonth[k].push(...arr);
      }

      const monthKeys = [...new Set([...Object.keys(byMonth), ...Object.keys(incomeByMonth)])];
      l.push(`Saving to ${monthKeys.length} month(s): ${monthKeys.join(', ')}`); setLog([...l]);

      for (const key of monthKeys) {
        if (byMonth[key]?.length > 0) {
          // Check existing transactions for duplicates and receipt-first matches
          const existing = await apiFetch(`/api/transactions?month=${key}`);
          const existingArr = existing || [];
          const receiptTxs = existingArr.filter(t => t.source === 'Receipt');
          const exactKeys = new Set(existingArr.filter(t=>t.source!=='Receipt').map(t => `${t.date}|${t.merchant}|${t.amount}`));
          const newOnly = [];
          let mergedCount = 0;
          for (const t of byMonth[key]) {
            if (exactKeys.has(`${t.date}|${t.merchant}|${t.amount}`)) continue; // exact dup
            // Check if a receipt-first tx matches by amount (±2%) and date (±3 days)
            const tAmt = t.amount;
            const [tMM, tDD] = (t.date||'01/01').split('/').map(Number);
            const tDayOfYear = tMM * 31 + tDD;
            const receiptMatch = receiptTxs.find(r => {
              const [rMM, rDD] = (r.date||'01/01').split('/').map(Number);
              const rDayOfYear = rMM * 31 + rDD;
              const amtDiff = Math.abs(r.amount - tAmt) / (tAmt || 1);
              const dayDiff = Math.abs(rDayOfYear - tDayOfYear);
              return amtDiff < 0.03 && dayDiff <= 4;
            });
            if (receiptMatch) {
              // Merge: update receipt tx to have CSV merchant name + mark as matched
              await apiFetch(`/api/transactions/${receiptMatch.id}`, {method:'PUT', body:JSON.stringify({category: t.category})});
              l.push(`🔗 Matched receipt "${receiptMatch.merchant}" → CSV "${t.merchant}" (${fmt(t.amount)})`); setLog([...l]);
              mergedCount++;
            } else {
              newOnly.push(t);
            }
          }
          const skipped = byMonth[key].length - newOnly.length - mergedCount;
          if (skipped > 0) l.push(`⊘ Skipped ${skipped} exact duplicate(s) for ${key}`);
          if (mergedCount > 0) l.push(`✓ Linked ${mergedCount} CSV transaction(s) to existing receipts`);
          setLog([...l]);
          if (newOnly.length === 0) continue;
          const BATCH_SIZE = 10;
          let allOk = true;
          for (let b = 0; b < newOnly.length; b += BATCH_SIZE) {
            const chunk = newOnly.slice(b, b + BATCH_SIZE);
            const saveRes = await apiFetch(`/api/transactions?month=${key}`, {method:'POST', body:JSON.stringify(chunk)});
            if (!saveRes?.ok) { allOk = false; break; }
          }
          l.push(allOk ? `✓ Saved ${newOnly.length} new expenses to ${key}` : `✗ Save failed for ${key}`); setLog([...l]);
        }
        // Save income as monthly setting
        if (incomeByMonth[key] > 0) {
          await apiFetch(`/api/monthly?month=${key}`, {method:'PUT', body:JSON.stringify({income: incomeByMonth[key]})});
          l.push(`✓ Income set to ${fmt(incomeByMonth[key])} for ${key}`); setLog([...l]);
        }
      }

      // Update current month income if detected
      if (incomeByMonth[monthKey]) {
        setIncome(incomeByMonth[monthKey]);
      }

      await loadTransactions();
      l.push(`✓ Dashboard updated`); setLog([...l]);
      // Auto-match CC/loan payments to debts and update balances
      if (debts.length > 0 && ccPayments.length > 0) {
        const matches = detectDebtPayments(ccPayments, debts);
        if (matches.length > 0) {
          // Auto-apply (no confirmation modal)
          for (const m of matches) {
            await updateDebt(m.debt.id, {balance: m.suggestedBalance});
          }
          l.push(`✓ Auto-updated ${matches.length} debt balance(s)`); setLog([...l]);
        }
      }
  };

  const confirmDebtPayments = async (confirmed) => {
    for (const m of confirmed) {
      await updateDebt(m.debt.id, {balance: m.suggestedBalance});
    }
    setDebtPaymentMatches(null);
  };

  const uploadReceipt = async (txId, file) => {    setUploadingReceipt(txId);
    try {
      const base64 = await new Promise(res=>{const r=new FileReader();r.onload=e=>res(e.target.result.split(',')[1]);r.readAsDataURL(file);});
      // Normalize media type — Claude only supports jpeg/png/gif/webp/pdf
      let mediaType = file.type || 'image/jpeg';
      if (['image/heic','image/heif','image/tiff'].includes(mediaType)) mediaType = 'image/jpeg';
      if (!['image/jpeg','image/png','image/gif','image/webp','application/pdf'].includes(mediaType)) mediaType = 'image/jpeg';
      const cats = allCats.map(c=>`${c.id} (${c.label})`).join(', ');
      const sys = `Parse this receipt image and return ONLY a JSON array of purchased line items. Each object: {"name":"short item name","amount":number,"category":"best matching category id from: ${allCats.map(c=>c.id).join(', ')}"}.
Rules:
- Include every product/item with its price
- Skip subtotals, tax, tips, and totals
- For groceries from stores like Costco/Walmart/Meijer, identify what each item actually is (produce, meat, household, etc.) and pick the best category
- Keep item names short (2-4 words max)`;
      const res = await fetch("https://api.familyfinances.uk/api/ai/parse", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:2000,system:sys,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:mediaType,data:base64}},{type:"text",text:"Parse all purchased line items from this receipt."}]}]})
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      const text = data.content?.find(b=>b.type==="text")?.text||"[]";
      const items = JSON.parse(text.replace(/```json|```/g,"").trim());
      if (!Array.isArray(items) || items.length === 0) throw new Error("No items found in receipt");
      // Save to DB
      await apiFetch('/api/receipt-items', {method:'POST', body:JSON.stringify({tx_id:txId, items})});
      // Mark transaction as having a receipt
      await apiFetch(`/api/transactions/${txId}`, {method:'PUT', body:JSON.stringify({has_receipt:true})});
      setTxs(prev=>prev.map(t=>t.id===txId?{...t,has_receipt:1}:t));
      setReceiptItems(prev=>({...prev,[txId]:items}));
      setExpandedTx(txId);
    } catch(e) { alert("Could not parse receipt: "+e.message); }
    setUploadingReceipt(null);
  };

  const updateIncome = async (val) => {
    setIncome(val);
    // Save to both user record AND monthly settings so CSV-imported months don't override manual input
    await Promise.all([
      apiFetch('/api/user', {method:'PUT', body:JSON.stringify({income:val})}),
      apiFetch(`/api/monthly?month=${monthKey}`, {method:'PUT', body:JSON.stringify({income:val, budgets:monthBudgets})}),
    ]);
  };

  const T=(t)=>({
    padding:mobile?"8px 14px":"9px 18px",borderRadius:99,border:"none",cursor:"pointer",
    fontSize:mobile?12:13,fontWeight:600,fontFamily:"'DM Sans',sans-serif",
    background:tab===t?C.terra:C.surface,color:tab===t?"#fff":C.text2,
    boxShadow:tab===t?`0 2px 8px ${C.terra}44`:C.shadow,transition:"all .2s",whiteSpace:"nowrap",
  });

  if (authError) {
    return (
      <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,padding:32,fontFamily:"'DM Sans',sans-serif"}}>
        <div style={{fontSize:48}}>🔒</div>
        <h2 style={{margin:0,color:C.text,fontFamily:"'Sora',sans-serif",fontSize:22}}>Access Required</h2>
        <p style={{margin:0,color:C.text2,textAlign:"center",maxWidth:380,fontSize:14,lineHeight:1.6}}>
          This portal is protected by Cloudflare Access. Please authenticate via the email link sent to your address, then refresh this page.
        </p>
        <button onClick={()=>window.location.reload()} style={{background:C.terra,color:"#fff",border:"none",borderRadius:10,padding:"10px 28px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Refresh Page</button>
      </div>
    );
  }

  // Export transactions as CSV
  const exportCSV = () => {
    const rows = [['Date','Merchant','Amount','Category','Source']];
    expenses.forEach(t => rows.push([t.date, `"${t.merchant.replace(/"/g,'""')}"`, t.amount, t.category, t.source||'']));
    const csv = rows.map(r=>r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
    a.download = `transactions-${monthKey}.csv`;
    a.click();
  };

  // Settings / household helpers
  const loadHouseholdMembers = async () => {
    const data = await apiFetch('/api/households/members');
    if (Array.isArray(data)) setHouseholdMembers(data);
  };
  const createHousehold = async () => {
    const name = prompt('Household name (e.g. "Werlich Family"):');
    if (!name) return;
    await apiFetch('/api/households', {method:'POST', body:JSON.stringify({name})});
    const me = await apiFetch('/api/me');
    if (me?.email) setCurrentUser(me);
    await loadHouseholdMembers();
  };
  const inviteMember = async () => {
    if (!inviteEmail.trim()) return;
    const res = await apiFetch('/api/households/invite', {method:'POST', body:JSON.stringify({email:inviteEmail.trim()})});
    if (res?.ok) { setInviteEmail(''); await loadHouseholdMembers(); }
    else alert(res?.error || 'Invite failed');
  };
  const saveDisplayName = async () => {
    await apiFetch('/api/me', {method:'PUT', body:JSON.stringify({display_name:displayNameEdit})});
    setCurrentUser(p=>({...p, display_name:displayNameEdit}));
  };

  // Bill reminders: debts with deadline within 60 days
  const today = new Date();
  const upcomingBills = debts.filter(d => {
    if (!d.deadline_date) return false;
    const days = Math.round((new Date(d.deadline_date) - today) / 86400000);
    return days >= 0 && days <= 60;
  }).sort((a,b)=>new Date(a.deadline_date)-new Date(b.deadline_date));

  return (
    <div data-dark={darkMode?'true':'false'} style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans','Segoe UI',sans-serif",colorScheme:darkMode?'dark':'light'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&display=swap');
        [data-dark="true"] { filter: invert(0.88) hue-rotate(180deg); }
        [data-dark="true"] img, [data-dark="true"] video, [data-dark="true"] canvas { filter: invert(1) hue-rotate(180deg); }
        [data-dark="true"] .emoji-no-invert { filter: invert(1) hue-rotate(180deg); }
      `}</style>

      {showAddDebt && <AddDebtModal onAdd={addDebt} onClose={()=>setShowAddDebt(false)}/>}

      {/* ── Disclaimer Modal ── */}
      {showDisclaimer && (
        <div style={{position:"fixed",inset:0,zIndex:9000,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:C.surface,borderRadius:20,padding:32,maxWidth:480,width:"100%",boxShadow:"0 16px 60px rgba(0,0,0,0.4)",fontFamily:"'DM Sans',sans-serif"}}>
            <div style={{fontSize:22,fontWeight:800,color:C.text,fontFamily:"'Sora',sans-serif",marginBottom:4}}>Before you continue</div>
            <div style={{fontSize:12,color:C.terra,fontWeight:700,marginBottom:20,textTransform:"uppercase",letterSpacing:.6}}>Terms of Use — Please read carefully</div>
            <div style={{fontSize:13,color:C.text2,lineHeight:1.7,marginBottom:24}}>
              <p style={{margin:"0 0 12px"}}>This is a <strong>personal finance tool</strong> provided for convenience by a private individual, not a registered financial institution or software company.</p>
              <p style={{margin:"0 0 12px"}}>By using this app you agree that:</p>
              <ul style={{margin:"0 0 12px",paddingLeft:20}}>
                <li style={{marginBottom:6}}>This service is provided <strong>as-is, with no guarantees</strong> of availability, accuracy, or data security.</li>
                <li style={{marginBottom:6}}>The operator is <strong>not liable</strong> for any data loss, data breach, or financial decisions made based on information shown in this app.</li>
                <li style={{marginBottom:6}}>Your data is stored in a shared cloud database. While access controls are in place, <strong>no system is 100% secure</strong>.</li>
                <li style={{marginBottom:6}}>This tool is for <strong>personal use only</strong> and should not be used as a substitute for professional financial advice.</li>
                <li>The operator may discontinue this service at any time <strong>without notice</strong>.</li>
              </ul>
              <p style={{margin:0,color:C.text3,fontSize:12}}>By clicking "I Understand, Continue" you acknowledge that you have read and accept these terms.</p>
            </div>
            <button onClick={()=>{localStorage.setItem('disclaimerAccepted','1');setShowDisclaimer(false);}}
              style={{width:"100%",background:C.terra,color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif",marginBottom:10}}>
              I Understand, Continue
            </button>
            <div style={{textAlign:"center",fontSize:11,color:C.text3}}>This notice will not appear again on this device.</div>
          </div>
        </div>
      )}
      {debtPaymentMatches && <DebtPaymentModal matches={debtPaymentMatches} onConfirm={confirmDebtPayments} onClose={()=>setDebtPaymentMatches(null)}/>}

      {/* ── Import Review Modal ── */}
      {pendingImport && (()=>{
        const {txs: allTxs, selected} = pendingImport;
        const allCatsLocal = [...CATEGORIES, ...customCategories.map(c=>({...c,id:c.id}))];
        const groups = [
          {label:'💳 Credit Card Payments', key:'cc', items: allTxs.filter(t=>t.category==='cc_payment'||isCreditCardPayment(t.merchant||''))},
          {label:'⬆ Income / Deposits',    key:'inc', items: allTxs.filter(t=>t.type==='income')},
          {label:'🧾 Expenses',             key:'exp', items: allTxs.filter(t=>t.type!=='income'&&!isCreditCardPayment(t.merchant||'')&&t.category!=='cc_payment')},
        ].filter(g=>g.items.length>0);
        const toggleAll = (items, on) => {
          const next = new Set(selected);
          items.forEach(t => on ? next.add(t.id) : next.delete(t.id));
          setPendingImport(p=>({...p, selected: next}));
        };
        const toggle = (id) => {
          const next = new Set(selected);
          next.has(id) ? next.delete(id) : next.add(id);
          setPendingImport(p=>({...p, selected: next}));
        };
        return (
          <div style={{position:"fixed",inset:0,zIndex:4000,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>{if(e.target===e.currentTarget)setPendingImport(null);}}>
            <div style={{background:C.bg,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:680,maxHeight:"85vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 -8px 40px rgba(0,0,0,0.3)"}}>
              <div style={{padding:"18px 20px 12px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
                <div>
                  <div style={{fontSize:16,fontWeight:700,color:C.text,fontFamily:"'Sora',sans-serif"}}>Review Import</div>
                  <div style={{fontSize:11,color:C.text3,marginTop:2}}>{selected.size} of {allTxs.length} selected · uncheck anything you don't want</div>
                </div>
                <button onClick={()=>setPendingImport(null)} style={{background:"none",border:"none",color:C.text3,fontSize:20,cursor:"pointer",padding:"0 4px"}}>✕</button>
              </div>
              <div style={{overflowY:"auto",flex:1,padding:"12px 20px"}}>
                {groups.map(g=>{
                  const allOn = g.items.every(t=>selected.has(t.id));
                  const anyOn = g.items.some(t=>selected.has(t.id));
                  return (
                    <div key={g.key} style={{marginBottom:16}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                        <input type="checkbox" checked={allOn} ref={el=>{if(el)el.indeterminate=!allOn&&anyOn;}} onChange={e=>toggleAll(g.items,e.target.checked)} style={{width:15,height:15,cursor:"pointer"}}/>
                        <span style={{fontSize:12,fontWeight:700,color:C.text2,fontFamily:"'Sora',sans-serif"}}>{g.label} ({g.items.length})</span>
                      </div>
                      {g.items.map(t=>{
                        const cat=allCatsLocal.find(c=>c.id===t.category)||allCatsLocal[allCatsLocal.length-1];
                        return (
                          <label key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,marginBottom:3,background:selected.has(t.id)?C.surface:C.surface2+'88',cursor:"pointer",border:`1px solid ${selected.has(t.id)?C.border:"transparent"}`}}>
                            <input type="checkbox" checked={selected.has(t.id)} onChange={()=>toggle(t.id)} style={{width:15,height:15,cursor:"pointer",flexShrink:0}}/>
                            <div style={{width:28,height:28,borderRadius:7,background:cat.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{cat.icon}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:12,fontWeight:600,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.merchant}</div>
                              <div style={{fontSize:10,color:C.text3}}>{t.date} · {cat.label}</div>
                            </div>
                            <div style={{fontSize:12,fontWeight:700,color:t.type==='income'?C.green:C.text,flexShrink:0}}>{t.type==='income'?'+':''}{fmt(t.amount)}</div>
                          </label>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`,display:"flex",gap:10,flexShrink:0}}>
                <button onClick={()=>setPendingImport(null)} style={{flex:1,background:C.surface2,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px",fontSize:13,color:C.text2,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
                <button onClick={async()=>{
                  const toSave = allTxs.filter(t=>selected.has(t.id));
                  setPendingImport(null);
                  setLoading(true);
                  await saveImportedTxs(toSave);
                  setLoading(false);
                }} style={{flex:2,background:C.terra,color:"#fff",border:"none",borderRadius:10,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
                  Import {selected.size} Transaction{selected.size!==1?'s':''}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {undoToast && (
        <div style={{position:"fixed",bottom:mobile?80:24,left:"50%",transform:"translateX(-50%)",zIndex:3000,background:"#1A1714",color:"#fff",borderRadius:12,padding:"12px 20px",display:"flex",alignItems:"center",gap:16,boxShadow:"0 8px 32px rgba(0,0,0,0.3)",fontFamily:"'DM Sans',sans-serif",minWidth:260,maxWidth:"90vw"}}>
          <span style={{fontSize:13,flex:1}}>{undoToast.message}</span>
          <button onClick={()=>{undoToast.onUndo();clearTimeout(undoToast.timer);setUndoToast(null);}}
            style={{background:C.terra,color:"#fff",border:"none",borderRadius:8,padding:"5px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>Undo</button>
          <button onClick={()=>{clearTimeout(undoToast.timer);setUndoToast(null);}}
            style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:16,padding:"0 4px"}}>✕</button>
        </div>
      )}

      {/* SETTINGS PANEL */}
      {showSettings && (
        <div style={{position:"fixed",inset:0,background:"rgba(26,23,20,0.5)",zIndex:2000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&setShowSettings(false)}>
          <div style={{background:C.surface,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:560,maxHeight:"85vh",overflowY:"auto",padding:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:700,fontFamily:"'Sora',sans-serif",color:C.text}}>⚙️ Settings</h2>
              <button onClick={()=>setShowSettings(false)} style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,color:C.text2}}>✕</button>
            </div>

            {/* Profile */}
            <div style={{marginBottom:20,padding:"14px 16px",background:C.surface2,borderRadius:14,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:12,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:.6,marginBottom:10}}>Profile</div>
              <div style={{fontSize:12,color:C.text3,marginBottom:6}}>Email: <strong style={{color:C.text}}>{currentUser?.email}</strong></div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input value={displayNameEdit} onChange={e=>setDisplayNameEdit(e.target.value)} placeholder="Display name (e.g. Jose)"
                  style={{flex:1,background:C.surface,border:`1px solid ${C.border2}`,borderRadius:8,padding:"7px 10px",fontSize:13,color:C.text,fontFamily:"'DM Sans',sans-serif"}}/>
                <button onClick={saveDisplayName} style={{background:C.terra,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Save</button>
              </div>
            </div>

            {/* Dark Mode */}
            <div style={{marginBottom:20,padding:"14px 16px",background:C.surface2,borderRadius:14,border:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:C.text}}>🌙 Dark Mode</div>
                <div style={{fontSize:11,color:C.text3,marginTop:2}}>Easier on the eyes at night</div>
              </div>
              <button onClick={()=>{const n=!darkMode;setDarkMode(n);localStorage.setItem('darkMode',n?'1':'0');}}
                style={{width:48,height:26,borderRadius:99,border:"none",cursor:"pointer",background:darkMode?C.terra:C.border2,position:"relative",transition:"background .2s",padding:0}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:darkMode?25:3,transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.2)"}}/>
              </button>
            </div>

            {/* Household */}
            <div style={{padding:"14px 16px",background:C.surface2,borderRadius:14,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:12,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:.6,marginBottom:10}}>Household</div>
              {currentUser?.household_id ? (
                <>
                  <div style={{fontSize:12,color:C.text3,marginBottom:12}}>Household ID: <strong style={{color:C.text,fontSize:11}}>{currentUser.household_id}</strong></div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:8}}>Members</div>
                  {householdMembers.length === 0
                    ? <div style={{fontSize:12,color:C.text3,marginBottom:12}}>Loading members... <button onClick={loadHouseholdMembers} style={{background:"none",border:"none",color:C.terra,cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>Refresh</button></div>
                    : householdMembers.map(m=>(
                      <div key={m.email} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                        <span style={{color:C.text}}>{m.display_name||m.email}</span>
                        <span style={{color:C.text3,textTransform:"capitalize"}}>{m.role}</span>
                      </div>
                    ))}
                  <div style={{display:"flex",gap:8,marginTop:12}}>
                    <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="email@example.com"
                      style={{flex:1,background:C.surface,border:`1px solid ${C.border2}`,borderRadius:8,padding:"7px 10px",fontSize:12,color:C.text,fontFamily:"'DM Sans',sans-serif"}}/>
                    <button onClick={inviteMember} style={{background:C.green,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Invite</button>
                  </div>
                </>
              ) : (
                <div>
                  <div style={{fontSize:13,color:C.text2,marginBottom:12}}>You're not part of a household yet. Create one to share access with family or coworkers.</div>
                  <button onClick={createHousehold} style={{background:C.terra,color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",width:"100%"}}>
                    🏠 Create Household
                  </button>
                </div>
              )}
            </div>

            {/* Super Admin — only visible to werlich@outlook.com */}
            {currentUser?.email === SUPER_ADMIN && (
              <div style={{marginTop:20,padding:"14px 16px",background:"#1A1714",borderRadius:14,border:`1px solid #333`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:showAdminPanel?14:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:.6}}>🔑 Super Admin — Family Instances</div>
                  <button onClick={async()=>{
                    if(!showAdminPanel){
                      const res = await apiFetch('/api/admin/families');
                      setAdminFamilies(Array.isArray(res)?res:[]);
                    }
                    setShowAdminPanel(p=>!p);
                  }} style={{background:"#333",border:"none",color:"#fff",borderRadius:8,padding:"4px 12px",fontSize:11,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                    {showAdminPanel?'Hide':'Manage'}
                  </button>
                </div>
                {showAdminPanel && (<>
                  {/* Existing families */}
                  {adminFamilies.map(f=>(
                    <div key={f.slug} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:"#222",borderRadius:8,marginBottom:6}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:"#fff"}}>{f.name}</div>
                        <div style={{fontSize:10,color:"#888",marginTop:2}}>
                          <a href={`https://${f.slug}.familyfinances.uk`} target="_blank" rel="noreferrer" style={{color:C.terra,textDecoration:"none"}}>{f.slug}.familyfinances.uk</a>
                          {' · '}{f.owner_email}
                        </div>
                      </div>
                      {f.slug !== 'werlich' && (
                        <button onClick={async()=>{
                          if(!window.confirm(`Delete family "${f.name}"? This cannot be undone.`))return;
                          await apiFetch(`/api/admin/families/${f.slug}`,{method:'DELETE'});
                          setAdminFamilies(p=>p.filter(x=>x.slug!==f.slug));
                        }} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:14,padding:"0 4px"}}>✕</button>
                      )}
                    </div>
                  ))}
                  {/* Create new family */}
                  <div style={{marginTop:12,padding:"12px",background:"#222",borderRadius:10}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#aaa",marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>New Family Instance</div>
                    <input value={newFamily.name} onChange={e=>setNewFamily(p=>({...p,name:e.target.value}))} placeholder="Family name (e.g. Johnson Family)"
                      style={{width:"100%",boxSizing:"border-box",background:"#333",border:"1px solid #444",borderRadius:8,color:"#fff",padding:"7px 10px",fontSize:12,marginBottom:6,fontFamily:"'DM Sans',sans-serif"}}/>
                    <input value={newFamily.slug} onChange={e=>setNewFamily(p=>({...p,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')}))} placeholder="Subdomain slug (e.g. johnson)"
                      style={{width:"100%",boxSizing:"border-box",background:"#333",border:"1px solid #444",borderRadius:8,color:"#fff",padding:"7px 10px",fontSize:12,marginBottom:4,fontFamily:"'DM Sans',sans-serif"}}/>
                    {newFamily.slug && <div style={{fontSize:10,color:C.terra,marginBottom:6}}>→ {newFamily.slug}.familyfinances.uk</div>}
                    <input value={newFamily.owner_email} onChange={e=>setNewFamily(p=>({...p,owner_email:e.target.value}))} placeholder="Admin email (e.g. john@gmail.com)"
                      style={{width:"100%",boxSizing:"border-box",background:"#333",border:"1px solid #444",borderRadius:8,color:"#fff",padding:"7px 10px",fontSize:12,marginBottom:6,fontFamily:"'DM Sans',sans-serif"}}/>
                    <input value={newFamily.members} onChange={e=>setNewFamily(p=>({...p,members:e.target.value}))} placeholder="Additional members (comma-separated emails)"
                      style={{width:"100%",boxSizing:"border-box",background:"#333",border:"1px solid #444",borderRadius:8,color:"#fff",padding:"7px 10px",fontSize:12,marginBottom:10,fontFamily:"'DM Sans',sans-serif"}}/>
                    <button onClick={async()=>{
                      if(!newFamily.slug||!newFamily.name||!newFamily.owner_email){alert('Fill in all required fields');return;}
                      const res = await apiFetch('/api/admin/families',{method:'POST',body:JSON.stringify({slug:newFamily.slug,name:newFamily.name,owner_email:newFamily.owner_email})});
                      if(res?.ok){
                        const refreshed = await apiFetch('/api/admin/families');
                        setAdminFamilies(Array.isArray(refreshed)?refreshed:[]);
                        setNewFamily({slug:'',name:'',owner_email:'',members:''});
                      } else { alert('Failed to create family'); }
                    }} style={{width:"100%",background:C.terra,color:"#fff",border:"none",borderRadius:8,padding:"9px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
                      Create Family Instance
                    </button>
                    <div style={{fontSize:10,color:"#666",marginTop:8,lineHeight:1.5}}>
                      After creating: add all member emails to Cloudflare Access → Applications → your {'{slug}'}.familyfinances.uk policy.
                    </div>
                  </div>
                </>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:mobile?"14px 16px":"20px 40px",boxShadow:C.shadow}}>
        {mobile ? (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <button onClick={onBack} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:99,color:C.text2,cursor:"pointer",fontSize:11,padding:"5px 12px",fontFamily:"'DM Sans',sans-serif"}}>← Home</button>
                <div>
                  <h1 style={{margin:0,fontSize:18,fontWeight:700,fontFamily:"'Sora',sans-serif",color:C.text}}>{familyName}</h1>
                  <div style={{fontSize:11,color:C.text3}}>{MONTHS[selectedMonth]} {selectedYear}</div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:10,color:C.text3}}>Income</div>
                  <div style={{fontSize:16,fontWeight:700,color:C.green}}>{fmt(income)}</div>
                </div>
                <div onClick={()=>{setShowSettings(true);setDisplayNameEdit(currentUser?.display_name||'');loadHouseholdMembers();}}
                  style={{width:34,height:34,borderRadius:"50%",background:C.terra3,border:`2px solid ${C.terra}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:C.terra,cursor:"pointer",flexShrink:0}}>
                  {currentUser ? (currentUser.display_name||currentUser.email||'?')[0].toUpperCase() : '⚙'}
                </div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.surface2,borderRadius:12,padding:"8px 14px",border:`1px solid ${C.border}`}}>
              <button onClick={()=>{if(selectedMonth===0){setSelectedMonth(11);setSelectedYear(y=>y-1);}else setSelectedMonth(m=>m-1);}} style={{background:"none",border:"none",color:C.text2,cursor:"pointer",fontSize:20,padding:"0 4px"}}>‹</button>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:13,fontWeight:600,color:C.text}}>{MONTHS[selectedMonth]} {selectedYear}</div>
                <div style={{fontSize:10,color:C.text3}}>{new Date(selectedYear,selectedMonth,1).toLocaleDateString('en-US',{month:'short',day:'numeric'})} – {new Date(selectedYear,selectedMonth+1,0).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
              </div>
              <button onClick={()=>{if(selectedMonth===11){setSelectedMonth(0);setSelectedYear(y=>y+1);}else setSelectedMonth(m=>m+1);}} style={{background:"none",border:"none",color:C.text2,cursor:"pointer",fontSize:20,padding:"0 4px"}}>›</button>
            </div>
          </div>
        ) : (
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:20}}>
              <button onClick={onBack} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:99,color:C.text2,cursor:"pointer",fontSize:12,padding:"6px 14px",fontFamily:"'DM Sans',sans-serif"}}>← Home</button>
              <div>
                <h1 style={{margin:0,fontSize:24,fontWeight:700,fontFamily:"'Sora',sans-serif",color:C.text}}>{familyName}</h1>
                <div style={{fontSize:12,color:C.text3,marginTop:2}}>{currentUser?.display_name||currentUser?.email||'Family'} · {MONTHS[selectedMonth]} {selectedYear} · <span style={{color:C.terra}}>v2.0.2</span></div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,background:C.surface2,borderRadius:12,padding:"8px 14px",border:`1px solid ${C.border}`}}>
              <button onClick={()=>{if(selectedMonth===0){setSelectedMonth(11);setSelectedYear(y=>y-1);}else setSelectedMonth(m=>m-1);}} style={{background:"none",border:"none",color:C.text2,cursor:"pointer",fontSize:18,padding:"0 4px"}}>‹</button>
              <div style={{textAlign:"center",minWidth:140}}>
                <div style={{fontSize:14,fontWeight:600,color:C.text}}>{MONTHS[selectedMonth]} {selectedYear}</div>
                <div style={{fontSize:11,color:C.text3}}>{new Date(selectedYear,selectedMonth,1).toLocaleDateString('en-US',{month:'short',day:'numeric'})} – {new Date(selectedYear,selectedMonth+1,0).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
              </div>
              <button onClick={()=>{if(selectedMonth===11){setSelectedMonth(0);setSelectedYear(y=>y+1);}else setSelectedMonth(m=>m+1);}} style={{background:"none",border:"none",color:C.text2,cursor:"pointer",fontSize:18,padding:"0 4px"}}>›</button>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:20}}>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,color:C.text3,textTransform:"uppercase",letterSpacing:.8}}>Monthly Income</div>
                <div style={{fontSize:24,fontWeight:700,color:C.green}}>{fmt(income)}</div>
              </div>
              {currentUser && (
                <div onClick={()=>{setShowSettings(true);setDisplayNameEdit(currentUser.display_name||'');loadHouseholdMembers();}}
                  title={currentUser.email} style={{width:38,height:38,borderRadius:"50%",background:C.terra3,border:`2px solid ${C.terra}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:C.terra,cursor:"pointer",flexShrink:0}}>
                  {(currentUser.display_name||currentUser.email||'?')[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* TABS — desktop horizontal scroll, mobile bottom nav */}
      {!mobile && (
        <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"12px 40px",display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none"}}>
          {[["dashboard","Overview"],["budget","Budget"],["debts","Debts"],["savings","Savings"],["insights","Insights"],["transactions","Transactions"],["upload","Upload"]].map(([t,l])=>
            <button key={t} style={T(t)} onClick={()=>setTab(t)}>{l}</button>)}
        </div>
      )}
      {mobile && (
        <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-around",padding:"6px 0 max(6px,env(safe-area-inset-bottom))",boxShadow:"0 -2px 12px rgba(26,23,20,0.08)"}}>
          {[["dashboard","🏠","Home"],["budget","💰","Budget"],["debts","💳","Debts"],["savings","🎯","Save"],["transactions","📋","Txns"],["upload","📤","Upload"]].map(([t,icon,label])=>(
            <button key={t} onClick={()=>setTab(t)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:1,padding:"4px 6px",minWidth:44}}>
              <span style={{fontSize:20}}>{icon}</span>
              <span style={{fontSize:9,fontWeight:tab===t?700:500,color:tab===t?C.terra:C.text3,fontFamily:"'DM Sans',sans-serif"}}>{label}</span>
              {tab===t&&<div style={{width:4,height:4,borderRadius:"50%",background:C.terra,marginTop:1}}/>}
            </button>
          ))}
        </div>
      )}

      <div style={{padding:mobile?"16px":"32px 40px",paddingBottom:mobile?"90px":undefined,maxWidth:1200,margin:"0 auto"}}>

        {/* DASHBOARD */}
        {tab==="dashboard"&&<div>
          {/* Bill reminders */}
          {upcomingBills.length > 0 && (
            <div style={{marginBottom:mobile?14:20,background:"#FBF4E0",border:"1px solid #E8D87A",borderRadius:14,padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:12,fontWeight:700,color:C.gold,textTransform:"uppercase",letterSpacing:.6}}>⏰ Upcoming Deadlines</div>
              {upcomingBills.map(d=>{
                const days = Math.round((new Date(d.deadline_date) - today) / 86400000);
                return <div key={d.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
                  <span style={{fontWeight:600,color:C.text}}>{d.name}</span>
                  <span style={{color:days<=14?C.red:C.gold,fontWeight:700}}>{days===0?"Today!":days===1?"Tomorrow":`${days} days`} · {fmt(d.balance)}</span>
                </div>;
              })}
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"repeat(4,1fr)",gap:mobile?10:16,marginBottom:mobile?16:28}}>
            <StatCard mobile={mobile} label="Total Spent" value={fmt(totalSpend)} sub={`${pct(totalSpend,income)}% of income`} color={totalSpend>income?C.red:C.text}/>
            <StatCard mobile={mobile} label="Remaining" value={fmt(net)} sub={net>=0?"On track":"Over budget"} color={net>=0?C.green:C.red} bg={net>=0?C.green2:C.red2}/>
            {!mobile&&<StatCard label="Transactions" value={expenses.length} sub={MONTHS[selectedMonth]}/>}
            {!mobile&&<StatCard label="Total Debt" value={fmt(totalDebt)} sub={`${pct(totalPaid,totalOrig)}% paid off`} color={C.terra}/>}
          </div>
          {expenses.length===0
            ?<div style={{background:C.surface,borderRadius:20,padding:mobile?"40px 24px":"60px 40px",textAlign:"center",boxShadow:C.shadow,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:36,marginBottom:14}}>📂</div>
              <div style={{fontSize:mobile?16:18,fontWeight:600,fontFamily:"'Sora',sans-serif",color:C.text,marginBottom:8}}>No transactions yet</div>
              <div style={{fontSize:13,color:C.text3,marginBottom:20}}>Upload your Chase or PNC statements to get started</div>
              <button onClick={()=>setTab("upload")} style={{background:C.terra,color:"#fff",border:"none",borderRadius:12,padding:"12px 24px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Upload Statements →</button>
            </div>
            :<div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:mobile?14:20}}>
              <div style={{background:C.surface,borderRadius:16,padding:mobile?"16px":"20px 24px",boxShadow:C.shadow,border:`1px solid ${C.border}`,gridColumn:mobile?"1":"1/-1"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontSize:13,fontWeight:600,color:C.text}}>Monthly Budget</span>
                  <span style={{fontSize:12,color:C.text3}}>{fmt(totalSpend)} of {fmt(income)}</span>
                </div>
                <Bar value={totalSpend} max={income} color={C.terra} h={mobile?8:10}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                  <span style={{fontSize:11,color:C.text3}}>{pct(totalSpend,income)}% used</span>
                  <span style={{fontSize:11,color:net>=0?C.green:C.red,fontWeight:600}}>{net>=0?`${fmt(net)} remaining`:`${fmt(Math.abs(net))} over budget`}</span>
                </div>
              </div>
              <div style={{background:C.surface,borderRadius:16,padding:mobile?"16px":"20px 24px",boxShadow:C.shadow,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:3}}>By Category</div>
                <div style={{fontSize:12,color:C.text3,marginBottom:12}}>Top spending areas</div>
                {allCats.filter(c=>byCat[c.id]>0).sort((a,b)=>byCat[b.id]-byCat[a.id]).slice(0,mobile?6:8).map(c=><CatRow key={c.id} cat={c} actual={byCat[c.id]} budget={monthBudgets[c.id]||BUDGET[c.id]||100}/>)}
              </div>
              <div style={{background:C.surface,borderRadius:16,padding:mobile?"16px":"20px 24px",boxShadow:C.shadow,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:3}}>All Categories</div>
                <div style={{fontSize:12,color:C.text3,marginBottom:12}}>Complete breakdown</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {allCats.filter(c=>byCat[c.id]>0).sort((a,b)=>byCat[b.id]-byCat[a.id]).map(c=>(
                    <div key={c.id} style={{background:c.bg,borderRadius:12,padding:"10px 12px"}}>
                      <div style={{fontSize:11,color:C.text2,marginBottom:4}}>{c.icon} {c.label}</div>
                      <div style={{fontSize:mobile?15:17,fontWeight:700,color:byCat[c.id]>(monthBudgets[c.id]||BUDGET[c.id])?C.red:c.color}}>{fmt(byCat[c.id])}</div>
                      <Bar value={byCat[c.id]} max={monthBudgets[c.id]||BUDGET[c.id]||100} color={c.color} h={3}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>}

          {/* ── CHARTS ── */}
          {Object.keys(monthlyData).length > 0 && (()=>{
            const months6 = Object.keys(monthlyData).sort();
            const maxVal = Math.max(...months6.map(k=>Math.max(monthlyData[k].income,monthlyData[k].spent)),1);
            const curKey = `${selectedYear}-${String(selectedMonth+1).padStart(2,'0')}`;
            const curData = monthlyData[curKey] || {};
            const catData = allCats.filter(c=>(curData.byCat||{})[c.id]>0).sort((a,b)=>(curData.byCat[b.id]||0)-(curData.byCat[a.id]||0)).slice(0,8);
            const maxCat = Math.max(...catData.map(c=>(curData.byCat||{})[c.id]||0),1);
            const nets = months6.map(k=>monthlyData[k].net);
            const maxNet = Math.max(...nets.map(Math.abs),1);
            const W=300, H=100, PAD=30;
            const pts = nets.map((n,i)=>{
              const x = PAD + (i/(months6.length-1||1))*(W-PAD*2);
              const y = H/2 - (n/maxNet)*(H/2-10);
              return `${x},${y}`;
            }).join(' ');

            // Shared card styles
            const card = {background:C.surface,borderRadius:16,padding:mobile?"14px":"18px 20px",boxShadow:C.shadow,border:`1px solid ${C.border}`};

            // Grid view: 2 columns of compact squares
            const gridCharts = (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:mobile?10:14}}>
                {/* Category squares */}
                {catData.slice(0,6).map(c=>{
                  const val=(curData.byCat||{})[c.id]||0;
                  const pct2=Math.min(100,Math.round((val/maxCat)*100));
                  return <div key={c.id} style={{...card,display:"flex",flexDirection:"column",gap:6}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:16}}>{c.icon}</span>
                      <span style={{fontSize:10,fontWeight:700,color:c.color,fontFamily:"'DM Sans',sans-serif"}}>{fmt(val)}</span>
                    </div>
                    <div style={{fontSize:11,fontWeight:600,color:C.text2,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.label}</div>
                    <div style={{background:C.surface2,borderRadius:99,height:5,overflow:"hidden"}}>
                      <div style={{width:`${pct2}%`,height:"100%",background:c.color,borderRadius:99}}/>
                    </div>
                  </div>;
                })}
                {/* Inc vs Exp mini */}
                <div style={{...card,gridColumn:"1/-1"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:"'Sora',sans-serif"}}>Income vs Expenses</span>
                    <div style={{display:"flex",gap:10}}>
                      <span style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:C.text3}}><span style={{width:8,height:8,background:C.green,borderRadius:2,display:"inline-block"}}/>Inc</span>
                      <span style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:C.text3}}><span style={{width:8,height:8,background:C.terra,borderRadius:2,display:"inline-block"}}/>Exp</span>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"flex-end",gap:mobile?4:8,height:80}}>
                    {months6.map(k=>{
                      const d=monthlyData[k];
                      const incH=Math.round((d.income/maxVal)*68);
                      const spH=Math.round((d.spent/maxVal)*68);
                      return <div key={k} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                        <div style={{display:"flex",alignItems:"flex-end",gap:1,height:68}}>
                          <div style={{width:mobile?8:12,height:incH,background:C.green,borderRadius:"3px 3px 0 0",minHeight:2}}/>
                          <div style={{width:mobile?8:12,height:spH,background:C.terra,borderRadius:"3px 3px 0 0",minHeight:2}}/>
                        </div>
                        <div style={{fontSize:8,color:C.text3}}>{d.label}</div>
                      </div>;
                    })}
                  </div>
                </div>
              </div>
            );

            // List view: full-width cards stacked
            const listCharts = (
              <div style={{display:"flex",flexDirection:"column",gap:mobile?10:14}}>
                {catData.length>0&&<div style={card}>
                  <div style={{fontSize:13,fontWeight:700,fontFamily:"'Sora',sans-serif",color:C.text,marginBottom:10}}>Spending by Category</div>
                  {catData.map(c=>{
                    const val=(curData.byCat||{})[c.id]||0;
                    return <div key={c.id} style={{marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                        <span style={{fontSize:12,color:C.text}}>{c.icon} {c.label}</span>
                        <span style={{fontSize:12,fontWeight:700,color:c.color}}>{fmt(val)}</span>
                      </div>
                      <div style={{background:C.surface2,borderRadius:99,height:7,overflow:"hidden"}}>
                        <div style={{width:`${Math.round((val/maxCat)*100)}%`,height:"100%",background:c.color,borderRadius:99}}/>
                      </div>
                    </div>;
                  })}
                </div>}
                <div style={card}>
                  <div style={{fontSize:13,fontWeight:700,fontFamily:"'Sora',sans-serif",color:C.text,marginBottom:10}}>Income vs Expenses — Last 6 months</div>
                  <div style={{display:"flex",alignItems:"flex-end",gap:mobile?6:12,height:110}}>
                    {months6.map(k=>{
                      const d=monthlyData[k];
                      const incH=Math.round((d.income/maxVal)*90);
                      const spH=Math.round((d.spent/maxVal)*90);
                      return <div key={k} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                        <div style={{display:"flex",alignItems:"flex-end",gap:2,height:90}}>
                          <div title={`Income: ${fmt(d.income)}`} style={{width:mobile?10:16,height:incH,background:C.green,borderRadius:"3px 3px 0 0",minHeight:2}}/>
                          <div title={`Spent: ${fmt(d.spent)}`} style={{width:mobile?10:16,height:spH,background:C.terra,borderRadius:"3px 3px 0 0",minHeight:2}}/>
                        </div>
                        <div style={{fontSize:9,color:C.text3}}>{d.label}</div>
                      </div>;
                    })}
                  </div>
                  <div style={{display:"flex",gap:16,marginTop:8}}>
                    <span style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.text3}}><span style={{width:10,height:10,background:C.green,borderRadius:2,display:"inline-block"}}/>Income</span>
                    <span style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.text3}}><span style={{width:10,height:10,background:C.terra,borderRadius:2,display:"inline-block"}}/>Expenses</span>
                  </div>
                </div>
                <div style={card}>
                  <div style={{fontSize:13,fontWeight:700,fontFamily:"'Sora',sans-serif",color:C.text,marginBottom:4}}>Net Savings Trend</div>
                  <div style={{fontSize:11,color:C.text3,marginBottom:8}}>Income minus expenses</div>
                  <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:mobile?80:H}}>
                    <line x1={PAD} y1={H/2} x2={W-PAD} y2={H/2} stroke={C.border2} strokeWidth="1" strokeDasharray="4 3"/>
                    {nets.map((n,i)=>{
                      const x=PAD+(i/(months6.length-1||1))*(W-PAD*2);
                      const y=H/2-(n/maxNet)*(H/2-10);
                      return <g key={i}>
                        <circle cx={x} cy={y} r={3} fill={n>=0?C.green:C.red}/>
                        <text x={x} y={n>=0?y-7:y+12} textAnchor="middle" fontSize="7" fill={n>=0?C.green:C.red} fontFamily="DM Sans">{n>=0?"+":""}{Math.round(n/100)/10}k</text>
                      </g>;
                    })}
                    <polyline points={pts} fill="none" stroke={nets[nets.length-1]>=0?C.green:C.red} strokeWidth="2"/>
                    {months6.map((k,i)=>{
                      const x=PAD+(i/(months6.length-1||1))*(W-PAD*2);
                      return <text key={k} x={x} y={H-2} textAnchor="middle" fontSize="7" fill={C.text3} fontFamily="DM Sans">{monthlyData[k].label}</text>;
                    })}
                  </svg>
                </div>
              </div>
            );

            return (
              <div style={{marginTop:20}}>
                <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
                  <div style={{display:"flex",gap:2,background:C.surface2,borderRadius:99,padding:3,border:`1px solid ${C.border}`}}>
                    {[['grid','⊞'],['list','≡']].map(([v,icon])=>(
                      <button key={v} onClick={()=>setChartView(v)} style={{background:chartView===v?C.terra:"none",color:chartView===v?"#fff":C.text3,border:"none",borderRadius:99,padding:"4px 12px",fontSize:14,cursor:"pointer",transition:"all .15s"}}>
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                {chartView==='grid' ? gridCharts : listCharts}
              </div>
            );
          })()}

          {/* Year-over-Year */}
          {yoyData && (yoyData.cur > 0 || yoyData.prev > 0) && (
            <div style={{background:C.surface,borderRadius:16,padding:mobile?"16px":"20px 24px",boxShadow:C.shadow,border:`1px solid ${C.border}`,marginTop:mobile?14:20}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"'Sora',sans-serif",marginBottom:2}}>📅 Year-over-Year: {yoyData.month}</div>
              <div style={{fontSize:11,color:C.text3,marginBottom:14}}>{yoyData.prevYear} vs {yoyData.curYear}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <div style={{background:C.surface2,borderRadius:12,padding:"14px 16px"}}>
                  <div style={{fontSize:11,color:C.text3,marginBottom:4}}>{yoyData.prevYear}</div>
                  <div style={{fontSize:20,fontWeight:700,color:C.text,fontFamily:"'Sora',sans-serif"}}>{fmt(yoyData.prev)}</div>
                </div>
                <div style={{background:yoyData.cur>yoyData.prev?C.red2:C.green2,borderRadius:12,padding:"14px 16px"}}>
                  <div style={{fontSize:11,color:C.text3,marginBottom:4}}>{yoyData.curYear}</div>
                  <div style={{fontSize:20,fontWeight:700,color:yoyData.cur>yoyData.prev?C.red:C.green,fontFamily:"'Sora',sans-serif"}}>{fmt(yoyData.cur)}</div>
                </div>
              </div>
              {yoyData.prev > 0 && yoyData.cur > 0 && (
                <div style={{padding:"10px 14px",background:yoyData.cur>yoyData.prev?C.red2:C.green2,borderRadius:10,fontSize:12,color:yoyData.cur>yoyData.prev?C.red:C.green,fontWeight:700}}>
                  {yoyData.cur>yoyData.prev
                    ?`⬆ ${fmt(yoyData.cur-yoyData.prev)} more than ${yoyData.prevYear} (+${Math.round(((yoyData.cur-yoyData.prev)/yoyData.prev)*100)}%)`
                    :`⬇ ${fmt(yoyData.prev-yoyData.cur)} less than ${yoyData.prevYear} (-${Math.round(((yoyData.prev-yoyData.cur)/yoyData.prev)*100)}%)`}
                </div>
              )}
            </div>
          )}
        </div>}

        {/* BUDGET */}
        {tab==="budget"&&(()=>{
          const effectiveBudget = (id) => monthBudgets[id] || BUDGET[id] || 0;
          const totalBudgeted = allCats.reduce((s,c)=>s+effectiveBudget(c.id),0);
          return <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
              <div>
                <div style={{fontSize:mobile?18:24,fontWeight:700,fontFamily:"'Sora',sans-serif",color:C.text}}>Monthly Budget</div>
                <div style={{fontSize:12,color:C.text3,marginTop:2}}>{MONTHS[selectedMonth]} {selectedYear} · Total budgeted: {fmt(totalBudgeted)}</div>
              </div>
              <div style={{fontSize:12,color:C.text3,fontStyle:"italic"}}>Auto-saves as you type</div>
            </div>
            <div style={{background:C.surface,borderRadius:16,padding:mobile?"16px":"20px 24px",boxShadow:C.shadow,border:`1px solid ${C.border}`,marginBottom:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 100px 100px",gap:8,marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>
                {["Category","Budgeted","Spent"].map(h=><div key={h} style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:.6}}>{h}</div>)}
              </div>
              {allCats.map(c=>{
                const budget=effectiveBudget(c.id);
                const actual=byCat[c.id]||0;
                const over=actual>budget&&budget>0;
                return <div key={c.id} style={{display:"grid",gridTemplateColumns:"1fr 100px 100px",gap:8,marginBottom:14,alignItems:"center"}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                      <span style={{fontSize:14}}>{c.icon}</span>
                      <span style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif"}}>{c.label}</span>
                    </div>
                    <div style={{background:C.surface2,borderRadius:99,height:5,overflow:"hidden"}}>
                      <div style={{width:`${budget>0?Math.min(100,Math.round((actual/budget)*100)):0}%`,height:"100%",background:over?C.red:c.color,borderRadius:99}}/>
                    </div>
                  </div>
                  <input type="number" value={budget} onChange={e=>{const v=parseFloat(e.target.value)||0;const nb={...monthBudgets,[c.id]:v};setMonthBudgets(nb);autoSaveBudgets(nb);}}
                    style={{background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:8,color:C.text,padding:"7px 10px",fontSize:13,width:"100%",boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif"}}/>
                  <div style={{fontSize:13,fontWeight:600,color:over?C.red:actual>0?c.color:C.text3,fontFamily:"'DM Sans',sans-serif",textAlign:"right"}}>{actual>0?fmt(actual):"—"}</div>
                </div>;
              })}
            </div>

            {/* Custom Categories */}
            <div style={{background:C.surface,borderRadius:16,padding:mobile?"16px":"20px 24px",boxShadow:C.shadow,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:14,fontWeight:700,fontFamily:"'Sora',sans-serif",color:C.text,marginBottom:4}}>Custom Categories</div>
              <div style={{fontSize:12,color:C.text3,marginBottom:16}}>Add your own spending categories</div>
              {customCategories.map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{width:32,height:32,borderRadius:8,background:c.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{c.icon}</div>
                  <div style={{flex:1,fontSize:13,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif"}}>{c.label}</div>
                  <button onClick={async()=>{
                    await apiFetch(`/api/categories/${c.id}`,{method:'DELETE'});
                    setCustomCategories(p=>p.filter(x=>x.id!==c.id));
                  }} style={{background:"none",border:"none",color:C.text3,cursor:"pointer",fontSize:16,padding:4}}>🗑</button>
                </div>
              ))}
              {(()=>{
                const [newCat,setNewCat] = [window._nc||(window._nc={}),v=>{window._nc=v;window.dispatchEvent(new Event('_nc'));}];
                // Use local state via a small inner component
                function AddCatForm() {
                  const [form,setForm] = useState({label:'',icon:'📌',color:'#6B6560',bg:'#F0EDE8'});
                  const ICONS=['📌','🏋️','🎵','🎮','💅','🍺','🚬','📚','🎨','🌿','🎪','🛒','💊','🐕','🏖️','🎯','🧘','🍕','☕','🚀'];
                  const COLORS=[
                    {color:'#C4603A',bg:'#F5E6DF'},{color:'#3D8B6E',bg:'#EAF4EF'},{color:'#2C3E6B',bg:'#E8EBF5'},
                    {color:'#7B5EA7',bg:'#F0EBF8'},{color:'#B8860B',bg:'#FBF4E0'},{color:'#C43A3A',bg:'#F5E6E6'},
                    {color:'#5A6E7A',bg:'#EDF1F4'},{color:'#8A2C6B',bg:'#F7E0EF'},{color:'#4A7A3D',bg:'#E8F4E5'},
                  ];
                  return <div style={{marginTop:16,padding:"14px",background:C.surface2,borderRadius:12,border:`1px solid ${C.border2}`}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:10,fontFamily:"'DM Sans',sans-serif"}}>New Category</div>
                    <input value={form.label} onChange={e=>setForm(p=>({...p,label:e.target.value}))} placeholder="Category name"
                      style={{width:"100%",boxSizing:"border-box",background:C.surface,border:`1px solid ${C.border2}`,borderRadius:8,color:C.text,padding:"8px 12px",fontSize:13,fontFamily:"'DM Sans',sans-serif",marginBottom:10}}/>
                    <div style={{fontSize:11,color:C.text3,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Icon</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                      {ICONS.map(i=><button key={i} onClick={()=>setForm(p=>({...p,icon:i}))}
                        style={{width:32,height:32,borderRadius:8,border:`2px solid ${form.icon===i?C.terra:C.border}`,background:form.icon===i?C.terra3:C.surface,fontSize:16,cursor:"pointer"}}>{i}</button>)}
                    </div>
                    <div style={{fontSize:11,color:C.text3,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Color</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                      {COLORS.map(cl=><button key={cl.color} onClick={()=>setForm(p=>({...p,color:cl.color,bg:cl.bg}))}
                        style={{width:24,height:24,borderRadius:"50%",background:cl.color,border:`2px solid ${form.color===cl.color?"#000":"transparent"}`,cursor:"pointer"}}/>)}
                    </div>
                    <button onClick={async()=>{
                      if(!form.label.trim())return;
                      const res=await apiFetch('/api/categories',{method:'POST',body:JSON.stringify(form)});
                      if(res?.ok){
                        const newId=res.id;
                        setCustomCategories(p=>[...p,{...form,id:newId}]);
                        setForm({label:'',icon:'📌',color:'#6B6560',bg:'#F0EDE8'});
                      }
                    }} style={{width:"100%",background:C.terra,color:"#fff",border:"none",borderRadius:10,padding:"10px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
                      Add Category
                    </button>
                  </div>;
                }
                return <AddCatForm/>;
              })()}
            </div>
          </div>;
        })()}

        {/* DEBTS */}
        {tab==="debts"&&<div>
          <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"repeat(3,1fr)",gap:mobile?10:16,marginBottom:mobile?16:24}}>
            <StatCard mobile={mobile} label="Total Debt" value={fmt(totalDebt)} sub={`${pct(totalPaid,totalOrig)}% paid`} color={C.terra}/>
            <StatCard mobile={mobile} label="Monthly Capacity" value={fmt(availableForDebt)} sub="After expenses & giving"/>
            {!mobile&&<StatCard label="Extra After Minimums" value={fmt(availableForDebt-totalMin)} sub={`Min: ${fmt(totalMin)}/mo`} color={C.green} bg={C.green2}/>}
          </div>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{fontSize:mobile?16:20,fontWeight:700,fontFamily:"'Sora',sans-serif",color:C.text}}>Your Debts</div>
              <div style={{fontSize:12,color:C.text3,marginTop:2}}>Drag to reorder priority</div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={async()=>{
                const updated = await applyDebtPayments(debts);
                alert(`Re-scan complete. Updated ${updated} debt balance(s).`);
              }} style={{background:C.surface,border:`1px solid ${C.border2}`,color:C.text2,borderRadius:12,padding:mobile?"10px 12px":"11px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
                🔄 Re-scan
              </button>
              <button onClick={()=>setShowAddDebt(true)} style={{background:C.terra,color:"#fff",border:"none",borderRadius:12,padding:mobile?"10px 16px":"11px 20px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif",boxShadow:`0 4px 12px ${C.terra}44`}}>
                + Add Debt
              </button>
            </div>
          </div>

          {debts.length===0
            ?<div style={{background:C.surface,borderRadius:16,padding:"40px 24px",textAlign:"center",boxShadow:C.shadow,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:32,marginBottom:12}}>💳</div>
              <div style={{fontSize:16,fontWeight:600,fontFamily:"'Sora',sans-serif",color:C.text,marginBottom:8}}>No debts added yet</div>
              <div style={{fontSize:13,color:C.text3,marginBottom:20}}>Add your loans, credit cards, and other debts to track and prioritize payoff</div>
              <button onClick={()=>setShowAddDebt(true)} style={{background:C.terra,color:"#fff",border:"none",borderRadius:12,padding:"12px 24px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Add Your First Debt</button>
            </div>
            :<div style={{display:"flex",flexDirection:"column",gap:12}}>
              {debts.map(d=>{
                // Only match against CC payment transactions to avoid false positives from expenses
                const monthPayments = txs.filter(t => {
                  if (t.amount <= 0) return false;
                  if (t.category !== 'cc_payment' && !isCreditCardPayment(t.merchant||'') && t.type !== 'expense') return false;
                  const desc = t.merchant.toUpperCase();
                  if (d.account_pattern && d.account_pattern.trim()) return desc.includes(d.account_pattern.trim().toUpperCase());
                  for (const [key, pattern] of Object.entries(DEBT_MATCH_PATTERNS)) {
                    if (d.name.toUpperCase().includes(key) && pattern.test(desc)) return true;
                  }
                  return false;
                });
                return <DebtCard key={d.id} debt={d}
                  onUpdate={updateDebt} onDelete={deleteDebt}
                  onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}
                  isDragging={dragId===d.id} monthPayments={monthPayments}/>;
              })}
              <div style={{background:C.surface2,borderRadius:12,padding:"12px 16px",border:`1px dashed ${C.border2}`,textAlign:"center",fontSize:12,color:C.text3}}>
                Drag cards above to reorder your debt payoff priority ⠿
              </div>
            </div>}
        </div>}

        {/* INSIGHTS */}
        {tab==="insights"&&(()=>{
          // Detect subscriptions (small recurring monthly amounts)
          const subscriptions = expenses.filter(t => 
            /APPLE\.COM|SPOTIFY|NETFLIX|HULU|DISNEY|MICROSOFT|AT&T|T-MOBILE|VERIZON|VIVINT|BREEZELINE|YOUTUBE|AMAZON PRIME|ICLOUD|DROPBOX|ADOBE|CANVA/i.test(t.merchant)
          ).sort((a,b)=>b.amount-a.amount);
          const subTotal = subscriptions.reduce((s,t)=>s+t.amount,0);

          // Recurring transactions (same merchant 2+ times)
          const merchantCount = {};
          expenses.forEach(t => { merchantCount[t.merchant] = (merchantCount[t.merchant]||0) + 1; });
          const recurring = Object.entries(merchantCount).filter(([m,c]) => c >= 2 && !subscriptions.find(s=>s.merchant===m)).map(([m,c])=>{
            const txs = expenses.filter(t => t.merchant === m);
            const total = txs.reduce((s,t)=>s+t.amount,0);
            return { merchant: m, count: c, total, avg: total/c };
          }).sort((a,b)=>b.total-a.total).slice(0,10);

          // Debt-free date calculation
          const totalMin = debts.reduce((s,d)=>s+d.payment,0);
          const totalBalance = debts.reduce((s,d)=>s+d.balance,0);
          const monthsToPayoff = totalMin > 0 ? Math.ceil(totalBalance / totalMin) : 0;
          const payoffDate = new Date();
          payoffDate.setMonth(payoffDate.getMonth() + monthsToPayoff);

          return (
            <div>
              <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:14,marginBottom:14}}>
                {/* Subscriptions Card */}
                <div style={{background:C.surface,borderRadius:16,padding:"18px 20px",boxShadow:C.shadow,border:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"'Sora',sans-serif"}}>📱 Subscriptions</div>
                      <div style={{fontSize:11,color:C.text3,marginTop:2}}>{subscriptions.length} active · {fmt(subTotal)}/mo total</div>
                    </div>
                  </div>
                  {subscriptions.length===0 ? <div style={{fontSize:12,color:C.text3,padding:"12px 0"}}>No subscriptions detected this month</div>
                    : <>
                      {subscriptions.map(s=>(
                        <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:600,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.merchant}</div>
                            <div style={{fontSize:10,color:C.text3}}>{s.date}</div>
                          </div>
                          <div style={{fontWeight:700,color:C.text}}>{fmt(s.amount)}</div>
                        </div>
                      ))}
                      {subTotal > 100 && (
                        <div style={{marginTop:12,padding:"10px 12px",background:C.terra3,borderRadius:10,fontSize:11,color:C.terra,fontWeight:600}}>
                          💡 Consider auditing — you could save {fmt(subTotal * 0.3)}/mo by canceling unused ones
                        </div>
                      )}
                    </>}
                </div>

                {/* Debt-free Projection */}
                <div style={{background:C.surface,borderRadius:16,padding:"18px 20px",boxShadow:C.shadow,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"'Sora',sans-serif",marginBottom:14}}>🎯 Debt-Free Projection</div>
                  {debts.length === 0 ? <div style={{fontSize:12,color:C.text3}}>Add debts to see projection</div>
                    : <>
                      <div style={{fontSize:11,color:C.text3,marginBottom:4}}>At current minimum payments</div>
                      <div style={{fontSize:24,fontWeight:700,color:C.green,fontFamily:"'Sora',sans-serif",letterSpacing:"-0.5px"}}>
                        {payoffDate.toLocaleDateString('en-US',{month:'long',year:'numeric'})}
                      </div>
                      <div style={{fontSize:12,color:C.text3,marginTop:4,marginBottom:14}}>{monthsToPayoff} months from now</div>
                      <div style={{padding:"10px 12px",background:C.green2,borderRadius:10,fontSize:11,color:C.green,fontWeight:600,lineHeight:1.5}}>
                        💪 Paying {fmt(totalMin)}/mo total minimum<br/>
                        Total to pay off: {fmt(totalBalance)}
                      </div>
                    </>}
                </div>
              </div>

              {/* Recurring Transactions */}
              <div style={{background:C.surface,borderRadius:16,padding:"18px 20px",boxShadow:C.shadow,border:`1px solid ${C.border}`,marginBottom:14}}>
                <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"'Sora',sans-serif",marginBottom:4}}>🔁 Recurring Transactions</div>
                <div style={{fontSize:11,color:C.text3,marginBottom:14}}>Merchants you've spent at multiple times this month</div>
                {recurring.length===0 ? <div style={{fontSize:12,color:C.text3,padding:"12px 0"}}>No recurring patterns yet</div>
                  : <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:10}}>
                    {recurring.map(r=>(
                      <div key={r.merchant} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:C.surface2,borderRadius:10}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.merchant}</div>
                          <div style={{fontSize:10,color:C.text3}}>{r.count}× · avg {fmt(r.avg)}</div>
                        </div>
                        <div style={{fontSize:14,fontWeight:700,color:C.text}}>{fmt(r.total)}</div>
                      </div>
                    ))}
                  </div>}
              </div>
            </div>
          );
        })()}

        {/* SAVINGS */}
        {tab==="savings"&&(<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <div style={{fontSize:mobile?16:20,fontWeight:700,fontFamily:"'Sora',sans-serif",color:C.text}}>Savings Goals</div>
              <div style={{fontSize:12,color:C.text3,marginTop:2}}>{savings.length} goal{savings.length!==1?"s":""} · {fmt(savings.reduce((s,g)=>s+(g.current_amount||0),0))} saved</div>
            </div>
            <button onClick={()=>setShowAddGoal(true)} style={{background:C.green,color:"#fff",border:"none",borderRadius:12,padding:mobile?"10px 16px":"11px 20px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif",boxShadow:`0 4px 12px ${C.green}44`}}>
              + Add Goal
            </button>
          </div>
          {showAddGoal && <AddGoalModal onAdd={addGoal} onClose={()=>setShowAddGoal(false)}/>}
          {savings.length===0
            ? <div style={{background:C.surface,borderRadius:16,padding:"40px 24px",textAlign:"center",boxShadow:C.shadow,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:32,marginBottom:12}}>🎯</div>
                <div style={{fontSize:16,fontWeight:600,fontFamily:"'Sora',sans-serif",color:C.text,marginBottom:8}}>No savings goals yet</div>
                <div style={{fontSize:13,color:C.text3,marginBottom:20}}>Create goals for emergency fund, vacation, down payment, or anything you're saving for</div>
                <button onClick={()=>setShowAddGoal(true)} style={{background:C.green,color:"#fff",border:"none",borderRadius:12,padding:"12px 24px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>Create Your First Goal</button>
              </div>
            : <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:14}}>
                {savings.map(g=>{
                  const p = pct(g.current_amount||0, g.target_amount||1);
                  const remaining = (g.target_amount||0) - (g.current_amount||0);
                  return (
                    <div key={g.id} style={{background:C.surface,borderRadius:16,padding:"18px 20px",boxShadow:C.shadow,border:`1px solid ${C.border}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                        <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
                          <span style={{fontSize:24}}>{g.icon||"💰"}</span>
                          <div>
                            <div style={{fontSize:15,fontWeight:700,color:C.text,fontFamily:"'Sora',sans-serif"}}>{g.name}</div>
                            {g.target_date && <div style={{fontSize:11,color:C.text3}}>Target: {new Date(g.target_date).toLocaleDateString('en-US',{month:'short',year:'numeric'})}</div>}
                          </div>
                        </div>
                        <button onClick={()=>deleteGoal(g.id)} style={{background:"none",border:"none",color:C.text3,cursor:"pointer",fontSize:14}}>🗑</button>
                      </div>
                      <div style={{marginBottom:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <span style={{fontSize:13,fontWeight:700,color:C.text}}>{fmt(g.current_amount||0)}</span>
                          <span style={{fontSize:13,color:C.text3}}>of {fmt(g.target_amount||0)}</span>
                        </div>
                        <Bar value={g.current_amount||0} max={g.target_amount||1} color={g.color||C.green} h={8}/>
                        <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                          <span style={{fontSize:11,color:C.green,fontWeight:700}}>{p}% complete</span>
                          <span style={{fontSize:11,color:C.text3}}>{fmt(remaining)} to go</span>
                        </div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:12}}>
                        <div style={{display:"flex",gap:6}}>
                          <input type="number" placeholder="Add amount..." id={`add-${g.id}`}
                            style={{flex:1,background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:8,padding:"7px 10px",fontSize:12,fontFamily:"'DM Sans',sans-serif",color:C.text}}/>
                          <button onClick={async()=>{const el=document.getElementById(`add-${g.id}`);const amt=parseFloat(el?.value);if(!isNaN(amt)&&amt>0){await updateGoal(g.id,{current_amount:(g.current_amount||0)+amt});if(el)el.value='';}}}
                            style={{background:C.green,color:"#fff",border:"none",borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>+ Add</button>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          <input type="number" placeholder="Set total to..." id={`set-${g.id}`}
                            style={{flex:1,background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:8,padding:"7px 10px",fontSize:12,fontFamily:"'DM Sans',sans-serif",color:C.text}}/>
                          <button onClick={async()=>{const el=document.getElementById(`set-${g.id}`);const amt=parseFloat(el?.value);if(!isNaN(amt)&&amt>=0){await updateGoal(g.id,{current_amount:amt});if(el)el.value='';}}}
                            style={{background:C.surface2,color:C.text2,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>Set</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>}
        </div>)}

        {/* TRANSACTIONS */}
        {tab==="transactions"&&<div>
          <div style={{marginBottom:10}}>
            <input value={txSearch} onChange={e=>setTxSearch(e.target.value)} placeholder="🔍 Search transactions..."
              style={{width:"100%",boxSizing:"border-box",background:C.surface,border:`1px solid ${C.border2}`,borderRadius:10,padding:"10px 14px",fontSize:13,color:C.text,fontFamily:"'DM Sans',sans-serif"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{fontSize:mobile?18:20,fontWeight:700,fontFamily:"'Sora',sans-serif",color:C.text}}>{MONTHS[selectedMonth]} Transactions</div>
              {expenses.length > 0 && <div style={{fontSize:12,color:C.text3,marginTop:2}}>{expenses.length} expenses · {fmt(totalSpend)}</div>}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={()=>setSortTx(s=>s==='amount'?'date':'amount')}
                style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:99,color:C.text2,fontSize:12,padding:"7px 14px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                Sort: {sortTx==='amount'?'💰 Amount':'📅 Date'}
              </button>
              <button onClick={exportCSV}
                style={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:99,color:C.text2,fontSize:12,padding:"7px 14px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                ⬇ Export CSV
              </button>
              <button onClick={async()=>{if(!window.confirm(`Clear all ${expenses.length} transactions for ${MONTHS[selectedMonth]}? This cannot be undone.`))return;await apiFetch(`/api/transactions?month=${monthKey}`,{method:'DELETE'});setTxs([]);}}
                style={{background:"none",border:`1px solid ${C.border2}`,borderRadius:99,color:C.red,fontSize:12,padding:"7px 14px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Clear All</button>
            </div>
          </div>
          <input ref={receiptRef} type="file" accept="image/*,.pdf" style={{display:"none"}}
            onChange={async e=>{
              const file=e.target.files[0];
              const txId=receiptRef.current.dataset.txid;
              if(file&&txId) await uploadReceipt(txId,file);
              e.target.value='';
            }}/>
          {/* ── Credit Card Payments section ── */}
          {ccPaymentTxs.length > 0 && (
            <div style={{background:C.surface,borderRadius:16,boxShadow:C.shadow,border:`1px solid #C43A3A44`,overflow:"hidden",marginBottom:16}}>
              <div style={{padding:"12px 20px",background:"#F5E6E611",borderBottom:`1px solid #C43A3A22`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#C43A3A",fontFamily:"'Sora',sans-serif"}}>💳 Credit Card Payments</div>
                  <div style={{fontSize:11,color:C.text3,marginTop:1}}>Transfers to pay off your cards — not counted as expenses</div>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:"#C43A3A"}}>{fmt(ccPaymentTxs.reduce((s,t)=>s+t.amount,0))}</div>
              </div>
              {ccPaymentTxs.sort((a,b)=>b.date.localeCompare(a.date)).map((tx,i)=>(
                <div key={tx.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 20px",borderBottom:i<ccPaymentTxs.length-1?`1px solid ${C.border}`:"none",background:i%2===0?C.surface:"#FDF9F9"}}>
                  <div style={{width:32,height:32,borderRadius:8,background:"#F5E6E6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>💳</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tx.merchant}</div>
                    <div style={{fontSize:10,color:C.text3,marginTop:1}}>{tx.date} · {tx.source}</div>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:"#C43A3A"}}>{fmt(tx.amount)}</div>
                </div>
              ))}
            </div>
          )}
          {expenses.length===0
            ?<div style={{background:C.surface,borderRadius:16,padding:40,textAlign:"center",color:C.text3,fontSize:14,fontFamily:"'DM Sans',sans-serif"}}>No transactions for this month.</div>
            :<div style={{background:C.surface,borderRadius:16,boxShadow:C.shadow,border:`1px solid ${C.border}`,overflow:"hidden"}}>
              {[...expenses].filter(t=>!txSearch||t.merchant.toLowerCase().includes(txSearch.toLowerCase())||t.category.toLowerCase().includes(txSearch.toLowerCase())).sort(sortTx==='amount'?(a,b)=>b.amount-a.amount:(a,b)=>b.date.localeCompare(a.date)).map((tx,i)=>{
                const cat=allCats.find(c=>c.id===tx.category)||allCats[allCats.length-1];
                return <div key={tx.id}><div style={{display:"flex",alignItems:"center",gap:mobile?10:16,padding:mobile?"12px 14px":"14px 20px",borderBottom:(i<expenses.length-1&&expandedTx!==tx.id)?`1px solid ${C.border}`:"none",background:i%2===0?C.surface:"#FDFAF7"}}>
                  <div style={{width:mobile?32:38,height:mobile?32:38,borderRadius:10,background:cat.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:mobile?15:18,flexShrink:0}}>{cat.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:mobile?12:13,fontWeight:600,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tx.merchant}</div>
                    <div style={{fontSize:10,color:C.text3,marginTop:1}}>{tx.date} · {tx.source}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:mobile?13:14,fontWeight:700,color:C.text}}>{fmt(tx.amount)}</div>
                    {editTx===tx.id
                      ?<select style={{background:C.surface2,color:C.text,border:`1px solid ${C.border2}`,borderRadius:6,fontSize:10,padding:"2px 4px",marginTop:2}}
                        defaultValue={tx.category}
                        onChange={async e=>{
                          const cat=e.target.value;
                          await apiFetch(`/api/transactions/${tx.id}`,{method:'PUT',body:JSON.stringify({category:cat})});
                          setTxs(p=>p.map(t=>t.id===tx.id?{...t,category:cat}:t));
                          setEditTx(null);
                        }}
                        onBlur={()=>setEditTx(null)} autoFocus>
                        {allCats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                      </select>
                      :<div style={{display:"flex",gap:6,marginTop:2,justifyContent:"flex-end",alignItems:"center"}}>
                        <button onClick={()=>{receiptRef.current.dataset.txid=tx.id;receiptRef.current.click();}}
                          title="Add receipt" style={{fontSize:10,color:C.terra,background:"none",border:"none",cursor:"pointer",padding:0}}>
                          {uploadingReceipt===tx.id?"⏳":"🧾+"}
                        </button>
                        {!!(receiptItems[tx.id]?.length>0||tx.has_receipt)&&<button onClick={async()=>{
                            if (expandedTx===tx.id){setExpandedTx(null);return;}
                            if (!receiptItems[tx.id]?.length) {
                              const items=await apiFetch(`/api/receipt-items?tx_id=${tx.id}`);
                              if(Array.isArray(items)&&items.length) setReceiptItems(prev=>({...prev,[tx.id]:items}));
                            }
                            setExpandedTx(tx.id);
                          }}
                            style={{fontSize:10,color:C.green,background:C.green2,border:`1px solid ${C.green}44`,borderRadius:6,cursor:"pointer",padding:"1px 5px",fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>
                            {receiptItems[tx.id]?.length?`${receiptItems[tx.id].length} items`:'🧾'} {expandedTx===tx.id?"▲":"▼"}
                          </button>}
                        <button onClick={()=>setEditTx(tx.id)} style={{fontSize:10,color:C.text3,background:"none",border:"none",cursor:"pointer",padding:0}}>✏️</button>
                        <button onClick={()=>{
                          setTxs(p=>p.filter(t=>t.id!==tx.id));
                          const rollback = setTimeout(()=>apiFetch(`/api/transactions?id=${tx.id}`,{method:'DELETE'}),10000);
                          showUndo(`Deleted "${tx.merchant}"`, ()=>{clearTimeout(rollback);setTxs(p=>[...p,tx]);});
                        }} style={{fontSize:10,color:C.red,background:"none",border:"none",cursor:"pointer",padding:0}}>✕</button>
                      </div>}
                  </div>
                </div>
                {expandedTx===tx.id&&receiptItems[tx.id]?.length>0&&(
                  <div style={{padding:"12px 16px",background:"#FDFAF7",borderTop:`1px solid ${C.border}`}}>
                    <div style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:.6,marginBottom:10}}>Receipt Items — {receiptItems[tx.id].length} items</div>
                    {receiptItems[tx.id].map((item,idx)=>{
                      const icat=allCats.find(c=>c.id===item.category)||allCats[allCats.length-1];
                      return <div key={idx} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:idx<receiptItems[tx.id].length-1?`1px solid ${C.border}`:"none"}}>
                        <div style={{width:28,height:28,borderRadius:7,background:icat.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{icat.icon}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:600,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</div>
                          <select value={item.category||'other'}
                            onChange={async e=>{
                              const newCat = e.target.value;
                              const updated = receiptItems[tx.id].map((it,i)=>i===idx?{...it,category:newCat}:it);
                              setReceiptItems(prev=>({...prev,[tx.id]:updated}));
                              // Persist: save all items with updated category
                              await apiFetch('/api/receipt-items',{method:'POST',body:JSON.stringify({tx_id:tx.id,items:updated})});
                            }}
                            style={{fontSize:10,color:C.text3,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"'DM Sans',sans-serif",maxWidth:120}}>
                            {allCats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                          </select>
                        </div>
                        <div style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:"'DM Sans',sans-serif",flexShrink:0}}>{fmt(item.amount)}</div>
                      </div>;
                    })}
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`}}>
                      <span style={{fontSize:11,color:C.text3,fontFamily:"'DM Sans',sans-serif"}}>Receipt total</span>
                      <span style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:"'DM Sans',sans-serif"}}>{fmt(receiptItems[tx.id].reduce((s,it)=>s+it.amount,0))}</span>
                    </div>
                  </div>
                )}
              </div>;
              })}
            </div>}
        </div>}

        {/* UPLOAD */}
        {tab==="upload"&&<div style={{maxWidth:mobile?"100%":700}}>
          <div style={{fontSize:mobile?18:20,fontWeight:700,fontFamily:"'Sora',sans-serif",color:C.text,marginBottom:4}}>Upload Statements</div>
          <div style={{fontSize:13,color:C.text3,marginBottom:20}}>CSV files parse instantly. PDFs and photos use AI. Bank payments matching your debts will be detected automatically.</div>

          <div style={{background:C.surface,borderRadius:16,padding:mobile?"16px":"20px 24px",boxShadow:C.shadow,border:`1px solid ${C.border}`,marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"'Sora',sans-serif"}}>Income for {MONTHS[selectedMonth]} {selectedYear}</div>
                <div style={{fontSize:11,color:C.text3,marginTop:2}}>Total: <strong style={{color:C.green}}>{fmt(totalComputedIncome)}</strong></div>
              </div>
              <button onClick={async()=>{
                const newSrc={description:"",amount:0,frequency:"monthly"};
                const res=await apiFetch('/api/income-sources',{method:'POST',body:JSON.stringify(newSrc)});
                if(res?.ok) setIncomeSources(p=>[...p,{...newSrc,id:res.id}]);
              }}
                style={{background:C.terra,color:"#fff",border:"none",borderRadius:10,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
                + Add Manual
              </button>
            </div>
            {/* Detected income transactions */}
            {detectedIncomeTxs.length > 0 && (
              <div style={{marginBottom:14,padding:"10px 12px",background:C.green2,borderRadius:10,border:`1px solid ${C.green}33`}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.green,textTransform:"uppercase",letterSpacing:.6,marginBottom:8}}>Auto-detected from statements</div>
                  {detectedIncomeTxs.sort((a,b)=>b.amount-a.amount).map(t=>(
                    <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",fontSize:12}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.merchant}</div>
                        <div style={{fontSize:10,color:C.text3}}>{t.date} · {t.source}</div>
                      </div>
                      <div style={{fontWeight:700,color:C.green,fontFamily:"'Sora',sans-serif"}}>+{fmt(t.amount)}</div>
                      <button onClick={async()=>{
                        await apiFetch(`/api/transactions/${t.id}`,{method:'DELETE'});
                        setTxs(p=>p.filter(x=>x.id!==t.id));
                      }} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:14,padding:"0 0 0 10px",flexShrink:0}}>✕</button>
                    </div>
                  ))}
                </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 110px 90px 28px",gap:8,marginBottom:6}}>
              {["Description","Amount","Frequency",""].map(h=><div key={h} style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:.6}}>{h}</div>)}
            </div>
            {incomeSources.map((src,i)=>(
              <div key={src.id} style={{display:"grid",gridTemplateColumns:"1fr 110px 90px 28px",gap:8,marginBottom:8,alignItems:"center"}}>
                <input value={src.description}
                  onChange={e=>setIncomeSources(p=>p.map((s,j)=>j===i?{...s,description:e.target.value}:s))}
                  onBlur={e=>apiFetch(`/api/income-sources/${src.id}`,{method:'PUT',body:JSON.stringify({description:e.target.value})})}
                  placeholder="e.g. Ed - RenaissanceTech"
                  style={{background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:8,color:C.text,padding:"7px 10px",fontSize:12,width:"100%",boxSizing:"border-box"}}/>
                <input type="number" value={src.amount}
                  onChange={e=>setIncomeSources(p=>p.map((s,j)=>j===i?{...s,amount:parseFloat(e.target.value)||0}:s))}
                  onBlur={e=>{
                    const amt=parseFloat(e.target.value)||0;
                    apiFetch(`/api/income-sources/${src.id}`,{method:'PUT',body:JSON.stringify({amount:amt})});
                    // Use functional update to get latest state (avoids stale closure)
                    setIncomeSources(prev=>{
                      const updated=prev.map((s,j)=>j===i?{...s,amount:amt}:s);
                      const total=updated.reduce((s,x)=>{if(x.frequency==='biweekly')return s+(x.amount*26/12);if(x.frequency==='weekly')return s+(x.amount*52/12);return s+x.amount;},0);
                      updateIncome(total);
                      return updated;
                    });
                  }}
                  placeholder="Amount"
                  style={{background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:8,color:C.text,padding:"7px 10px",fontSize:12,width:"100%",boxSizing:"border-box"}}/>
                <select value={src.frequency}
                  onChange={async e=>{
                    const freq=e.target.value;
                    await apiFetch(`/api/income-sources/${src.id}`,{method:'PUT',body:JSON.stringify({frequency:freq})});
                    setIncomeSources(prev=>{
                      const updated=prev.map((s,j)=>j===i?{...s,frequency:freq}:s);
                      const total=updated.reduce((s,x)=>{if(x.frequency==='biweekly')return s+(x.amount*26/12);if(x.frequency==='weekly')return s+(x.amount*52/12);return s+x.amount;},0);
                      updateIncome(total);
                      return updated;
                    });
                  }}
                  style={{background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:8,color:C.text,padding:"7px 6px",fontSize:11,width:"100%",boxSizing:"border-box"}}>
                  <option value="monthly">Monthly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="weekly">Weekly</option>
                </select>
                <button onClick={async()=>{
                  await apiFetch(`/api/income-sources/${src.id}`,{method:'DELETE'});
                  setIncomeSources(p=>p.filter((_,j)=>j!==i));
                  updateIncome(incomeSources.filter((_,j)=>j!==i).reduce((s,x)=>{
                    if(x.frequency==='biweekly') return s+(x.amount*26/12);
                    if(x.frequency==='weekly') return s+(x.amount*52/12);
                    return s+x.amount;
                  },0));
                }} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:16,padding:0}}>✕</button>
              </div>
            ))}
            <div style={{fontSize:11,color:C.text3,marginBottom:8,fontStyle:"italic"}}>
              💡 Upload a bank statement — income deposits are detected automatically
            </div>
            <button onClick={async()=>updateIncome(totalComputedIncome)}
              style={{width:"100%",marginTop:6,background:C.green,color:"#fff",border:"none",borderRadius:10,padding:"10px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
              Save — {fmt(totalComputedIncome)}/mo
            </button>
          </div>

          {/* ── STEP 1: Upload Receipts First ─────────────────────────── */}
          <div style={{background:C.surface,borderRadius:16,padding:mobile?"16px":"20px 24px",boxShadow:C.shadow,border:`2px solid ${C.green}`,marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:C.green,color:"#fff",fontSize:12,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>1</div>
              <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"'Sora',sans-serif"}}>Upload Receipts (Optional — do this first)</div>
            </div>
            <div style={{fontSize:12,color:C.text3,marginBottom:14,marginLeft:34,lineHeight:1.6}}>
              Take a photo of a receipt. AI will create a transaction with all line items. Later when you import your bank CSV, it will automatically recognize the match and link it — no duplicate.
            </div>
            <input ref={receiptFirstRef} type="file" accept="image/*,.pdf" style={{display:"none"}} onChange={e=>{if(e.target.files[0])uploadReceiptFirst(e.target.files[0]);e.target.value='';}}/>
            <input ref={receiptFirstCamRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>{if(e.target.files[0])uploadReceiptFirst(e.target.files[0]);e.target.value='';}}/>
            {receiptFirstLoading
              ? <div style={{textAlign:"center",padding:16,color:C.green,fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>🧾 Reading receipt with AI...</div>
              : receiptFirstResult
                ? <div style={{background:C.green2,borderRadius:12,padding:"14px 16px",border:`1px solid ${C.green}33`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,color:C.text}}>{receiptFirstResult.merchant}</div>
                        <div style={{fontSize:11,color:C.text3}}>{receiptFirstResult.date} · {receiptFirstResult.items?.length||0} items · Transaction saved ✓</div>
                      </div>
                      <div style={{fontSize:16,fontWeight:700,color:C.green}}>{fmt(receiptFirstResult.total||0)}</div>
                    </div>
                    {receiptFirstResult.items?.map((item,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0",borderTop:i===0?`1px solid ${C.green}33`:"none"}}>
                        <span style={{color:C.text2}}>{item.name}</span>
                        <span style={{color:C.text,fontWeight:600}}>{fmt(item.amount)}</span>
                      </div>
                    ))}
                    <button onClick={()=>setReceiptFirstResult(null)} style={{marginTop:10,background:"none",border:`1px solid ${C.green}`,borderRadius:8,color:C.green,fontSize:12,cursor:"pointer",padding:"4px 12px",fontFamily:"'DM Sans',sans-serif"}}>
                      + Add another receipt
                    </button>
                  </div>
                : <div style={{display:"flex",gap:10}}>
                    <button onClick={()=>receiptFirstCamRef.current.click()}
                      style={{flex:1,background:C.green,color:"#fff",border:"none",borderRadius:12,padding:"12px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                      📷 Take Receipt Photo
                    </button>
                    <button onClick={()=>receiptFirstRef.current.click()}
                      style={{flex:1,background:C.surface2,color:C.text,border:`1px solid ${C.border2}`,borderRadius:12,padding:"12px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                      🖼 Choose from Gallery
                    </button>
                  </div>
            }
          </div>

          {/* ── STEP 2: Upload Bank Statement ─────────────────────────── */}
          <div style={{background:C.surface,borderRadius:16,padding:mobile?"16px":"24px",boxShadow:C.shadow,border:`2px solid ${C.terra}`,marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:C.terra,color:"#fff",fontSize:12,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>2</div>
              <div style={{fontSize:14,fontWeight:600,color:C.text}}>Upload Bank Statement</div>
            </div>
            <div style={{fontSize:12,color:C.text3,marginBottom:16,marginLeft:34,lineHeight:1.6}}>CSV, PDF, PNG, JPG, HEIC. Any Chase or PNC statement. Receipts uploaded above will be matched automatically.</div>
            <input ref={inputRef} type="file" multiple accept=".csv,.pdf,.png,.jpg,.jpeg,.heic,image/*" style={{display:"none"}} onChange={e=>processFiles(Array.from(e.target.files))}/>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>processFiles(Array.from(e.target.files))}/>
            {loading
              ? <div style={{textAlign:"center",padding:"20px",color:C.text3,fontFamily:"'DM Sans',sans-serif",fontSize:13}}>⏳ Parsing your files...</div>
              : <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <button onClick={()=>inputRef.current.click()} style={{width:"100%",background:C.terra,color:"#fff",border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                    📁 Choose Files (CSV, PDF, PNG, JPG)
                  </button>
                  <button onClick={()=>cameraRef.current.click()} style={{width:"100%",background:C.surface2,color:C.text,border:`1px solid ${C.border2}`,borderRadius:12,padding:"14px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                    📷 Take Photo
                  </button>
                  <PasteZone onFiles={processFiles}/>
                </div>
            }
          </div>

          {log.length>0&&<div style={{background:C.surface,borderRadius:16,padding:mobile?"14px":"16px 20px",boxShadow:C.shadow,border:`1px solid ${C.border}`,marginBottom:16}}>
            <div style={{fontSize:11,color:C.text3,textTransform:"uppercase",letterSpacing:.8,marginBottom:8}}>Upload Log</div>
            {log.map((l,i)=><div key={i} style={{fontSize:12,color:l.startsWith("✓")?C.green:l.startsWith("✗")?C.red:C.text2,marginBottom:4}}>{l}</div>)}
          </div>}

          <div style={{background:C.surface,borderRadius:16,padding:mobile?"16px":"20px 24px",boxShadow:C.shadow,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:14}}>How to export CSV</div>
            {[{bank:"Chase",color:C.navy,steps:["chase.com → your account → Download","Select date range → CSV format"]},{bank:"PNC",color:C.green,steps:["pnc.com → your account → Download Activity","Set date range → CSV → Download"]}].map(b=>(
              <div key={b.bank} style={{marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:700,color:b.color,marginBottom:6}}>{b.bank}</div>
                {b.steps.map((s,i)=>(
                  <div key={i} style={{display:"flex",gap:8,marginBottom:5,alignItems:"flex-start"}}>
                    <div style={{width:16,height:16,borderRadius:"50%",background:b.color,color:"#fff",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
                    <span style={{fontSize:12,color:C.text2,lineHeight:1.5}}>{s}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>}
      </div>
    </div>
  );
}
