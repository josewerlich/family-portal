import { useState, useRef, useCallback } from "react";

const CATEGORIES = [
  { id: "groceries",     label: "Groceries",      color: "#4ade80", icon: "🛒" },
  { id: "restaurants",   label: "Restaurants",     color: "#fb923c", icon: "🍔" },
  { id: "gas",           label: "Gas",             color: "#facc15", icon: "⛽" },
  { id: "clothing",      label: "Clothing",        color: "#a78bfa", icon: "👗" },
  { id: "subscriptions", label: "Subscriptions",   color: "#38bdf8", icon: "📱" },
  { id: "utilities",     label: "Utilities",       color: "#94a3b8", icon: "💡" },
  { id: "mortgage",      label: "Mortgage",        color: "#f87171", icon: "🏠" },
  { id: "insurance",     label: "Insurance",       color: "#e879f9", icon: "🛡️" },
  { id: "auto",          label: "Auto",            color: "#2dd4bf", icon: "🚗" },
  { id: "health",        label: "Health/Fitness",  color: "#34d399", icon: "💪" },
  { id: "kids",          label: "Kids",            color: "#fbbf24", icon: "🧒" },
  { id: "pet",           label: "Pet",             color: "#a3e635", icon: "🐾" },
  { id: "giving",        label: "Giving/Tithe",    color: "#f472b6", icon: "🙏" },
  { id: "amazon",        label: "Amazon/Online",   color: "#ff8c42", icon: "📦" },
  { id: "home",          label: "Home/Lawn",       color: "#86efac", icon: "🏡" },
  { id: "personal",      label: "Personal Care",   color: "#c4b5fd", icon: "✂️" },
  { id: "medical",       label: "Medical",         color: "#f43f5e", icon: "🏥" },
  { id: "other",         label: "Other",           color: "#64748b", icon: "📌" },
];

const BUDGET = {
  groceries:1311,restaurants:250,gas:300,clothing:100,subscriptions:230,
  utilities:168,mortgage:3024,insurance:208,auto:150,health:189,kids:80,
  pet:50,giving:1500,amazon:200,home:64,personal:55,medical:100,other:100,
};

const INITIAL_DEBTS = [
  { id:1, name:"Best Buy Promo 1",   balance:372.62,  original:372.62,  payment:53.23,  rate:0,    deadline:"Dec 2026", deadlineDate:"2026-12-04", type:"deferred", priority:1, color:"#f87171", note:"🚨 PAY OFF THIS MONTH — retroactive interest if any balance remains Dec 4" },
  { id:2, name:"Car Loan (Pacifica)",balance:4878.34, original:4878.34, payment:267.66, rate:7.37, deadline:"May 2028", deadlineDate:"2028-05-12", type:"loan",     priority:2, color:"#fb923c", note:"Target: pay off by Jul 2026 with $1,500+/mo. Frees $267/mo permanently." },
  { id:3, name:"Best Buy Promo 2",   balance:1960.16, original:1960.16, payment:103.17, rate:0,    deadline:"Dec 2027", deadlineDate:"2027-12-06", type:"deferred", priority:3, color:"#facc15", note:"⚠ Pay $103/mo min. Deferred interest deadline Dec 2027." },
  { id:4, name:"US Bank ...3987",    balance:12035.21,original:12035.21,payment:700.00, rate:0,    deadline:"Mar 2028", deadlineDate:"2028-03-01", type:"promo",    priority:4, color:"#38bdf8", note:"0% until Mar 2028. After car payoff redirect $267 here → done Mar 2027 (1yr early)." },
  { id:5, name:"Roof (Watercress)",  balance:22582.62,original:22582.62,payment:263.63, rate:7.0,  deadline:"ongoing",  deadlineDate:null,         type:"loan",     priority:5, color:"#a78bfa", note:"After US Bank paid (~Mar 2027) redirect $967+/mo → done by late 2028." },
];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const fmt = (n) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
const pct = (a,b) => Math.min(100,Math.round((a/b)*100));

function monthsUntil(ds) {
  if (!ds) return null;
  const t=new Date(ds),n=new Date();
  return (t.getFullYear()-n.getFullYear())*12+(t.getMonth()-n.getMonth());
}

// ── CSV PARSERS ───────────────────────────────────────────────────────────────
function categorize(desc) {
  const d = desc.toUpperCase();
  if (/ROCKET MORTGAGE|WATERCRESS|MORTGAGE/.test(d)) return "mortgage";
  if (/ADVENTIST|TITHE|OFFERING|CHURCH|GIVING/.test(d)) return "giving";
  if (/KROGER|MEIJER|COSTCO WHSE|TRADER JOE|ALDI|WHOLE FOODS|GIANT EAGLE/.test(d)) return "groceries";
  if (/COSTCO GAS|MARATHON|SHELL|BP#|SHEETZ|SUNOCO|EXXON|CHEVRON|SPEEDWAY|CIRCLE K|HAHN QUICK/.test(d)) return "gas";
  if (/MCDONALD|BURGER KING|WENDY|CHIPOTLE|PANDA EXPRESS|STARBUCKS|SUBWAY|TACO BELL|PIZZA|RESTAURANT|CAFE|SUSHI|ESTILO BRAZIL|QAMARIA|WHITS/.test(d)) return "restaurants";
  if (/AMAZON MKTPL|AMAZON\.COM|AMZN\.COM/.test(d)) return "amazon";
  if (/APPLE\.COM|SPOTIFY|NETFLIX|HULU|DISNEY|MICROSOFT|TMOBILE|T-MOBILE|VIVINT|BREEZELINE|AT&T|VERIZON/.test(d)) return "subscriptions";
  if (/AEP|EVERBRIGHT|SUBURBAN NATURAL|DOMINION|DUKE ENERGY/.test(d)) return "utilities";
  if (/GEICO|PROGRESSIVE|ALLSTATE|KANGURO|NORTHWESTERN MUTUAL|INSURANCE/.test(d)) return "insurance";
  if (/VALVOLINE|AUTOZONE|VIOC|JIFFY LUBE|O'REILLY|NAPA|TOMMY|CAR WASH|IRON PONY|MOTOR VEHIC|BMV/.test(d)) return "auto";
  if (/OHIO HEALTH|OHIOHEALTH|NATIONWIDE CHILDREN|CVS\/PHARMACY|WALGREEN|MEDICAL|DENTAL|DOCTOR|HOSPITAL|ANESTHESIA|PERIODONT/.test(d)) return "medical";
  if (/JIU JITS|GYM|FITNESS|PLANET FITNESS|ORANGE THEORY|YMCA|RELSON/.test(d)) return "health";
  if (/HOME DEPOT|LOWE'S|EXPERIGREEN|LAWN|DUST BUSTER|CLEANING/.test(d)) return "home";
  if (/PETLAND|PETSMART|PETCO|GREENIES|CHUCKIT/.test(d)) return "pet";
  if (/DOLLAR TREE|DOLLAR GENERAL|TARGET|WALMART|MARSHALLS|BURLINGTON|ROSS|TJ MAXX/.test(d)) return "other";
  if (/GREAT CLIPS|SALON|BARBER|BEAUTY|PURLISSE/.test(d)) return "personal";
  if (/OLENTANGY|SCHOOL|DAYCARE/.test(d)) return "kids";
  return "other";
}

function parseChaseCSV(text) {
  const lines = text.trim().split('\n');
  const txs = [];
  // Chase format: Transaction Date,Post Date,Description,Category,Type,Amount,Memo
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].match(/(".*?"|[^,]+)(?=,|$)/g);
    if (!cols || cols.length < 6) continue;
    const date = cols[0].replace(/"/g,'').trim();
    const desc = cols[2].replace(/"/g,'').trim();
    const amount = parseFloat(cols[5].replace(/"/g,'').trim());
    if (isNaN(amount) || amount >= 0) continue; // skip credits/payments, keep expenses (negative in Chase)
    const [m,d,y] = date.split('/');
    txs.push({
      id: Date.now()+Math.random(),
      date: `${m.padStart(2,'0')}/${d.padStart(2,'0')}`,
      merchant: desc,
      amount: Math.abs(amount),
      category: categorize(desc),
      source: "Chase"
    });
  }
  return txs;
}

function parsePNCCSV(text) {
  const lines = text.trim().split('\n');
  const txs = [];
  // PNC format: Date,Description,Withdrawals,Deposits,Balance
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].match(/(".*?"|[^,]+)(?=,|$)/g);
    if (!cols || cols.length < 4) continue;
    const date = cols[0].replace(/"/g,'').trim();
    const desc = cols[1].replace(/"/g,'').trim();
    const withdrawal = cols[2].replace(/["$,]/g,'').trim();
    const amount = parseFloat(withdrawal);
    if (isNaN(amount) || amount <= 0) continue;
    const parts = date.split('/');
    if (parts.length < 3) continue;
    txs.push({
      id: Date.now()+Math.random(),
      date: `${parts[0].padStart(2,'0')}/${parts[1].padStart(2,'0')}`,
      merchant: desc,
      amount,
      category: categorize(desc),
      source: "PNC"
    });
  }
  return txs;
}

function parseGenericCSV(text) {
  // Try to detect format and parse
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase();
  if (header.includes('transaction date') || header.includes('post date')) return parseChaseCSV(text);
  if (header.includes('withdrawals') || header.includes('deposits')) return parsePNCCSV(text);
  return parseChaseCSV(text); // fallback
}

async function parseWithClaude(fileData, fileType) {
  const cats = CATEGORIES.map(c=>c.id).join(", ");
  const sys = `Parse financial transactions from this bank statement image or PDF. Return ONLY a JSON array. Each item: {"date":"MM/DD","merchant":"name","amount":number,"category":"one of [${cats}]","source":"Chase or PNC"}. Only include expenses (positive amounts). Skip payments, credits, transfers between accounts.`;
  const content = fileType.startsWith("image/")
    ? [{type:"image",source:{type:"base64",media_type:fileType,data:fileData}},{type:"text",text:"Parse all expense transactions."}]
    : [{type:"document",source:{type:"base64",media_type:"application/pdf",data:fileData}},{type:"text",text:"Parse all expense transactions from this statement."}];
  const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4000,system:sys,messages:[{role:"user",content}]})});
  const data = await res.json();
  const text = data.content?.find(b=>b.type==="text")?.text||"[]";
  return JSON.parse(text.replace(/```json|```/g,"").trim());
}

// ── COMPONENTS ────────────────────────────────────────────────────────────────
function Bar({value,max,color,h=6}) {
  return <div style={{background:"#1e293b",borderRadius:4,height:h,overflow:"hidden"}}>
    <div style={{width:`${pct(value,max)}%`,height:"100%",background:value>max?"#f87171":color,borderRadius:4,transition:"width .6s ease"}}/>
  </div>;
}

function CatCard({cat,actual,budget}) {
  const over=actual>budget;
  return <div style={{background:"#0f172a",border:`1px solid ${over?"#f87171":"#1e293b"}`,borderRadius:12,padding:"12px 14px",display:"flex",flexDirection:"column",gap:6}}>
    <div style={{display:"flex",justifyContent:"space-between"}}>
      <span style={{fontSize:12,color:"#94a3b8"}}>{cat.icon} {cat.label}</span>
      <span style={{fontSize:12,fontWeight:700,color:over?"#f87171":"#f1f5f9"}}>{fmt(actual)}</span>
    </div>
    <Bar value={actual} max={budget} color={cat.color}/>
    <div style={{display:"flex",justifyContent:"space-between"}}>
      <span style={{fontSize:10,color:"#475569"}}>Budget: {fmt(budget)}</span>
      <span style={{fontSize:10,color:over?"#f87171":"#64748b"}}>{over?`+${fmt(actual-budget)} over`:`${fmt(budget-actual)} left`}</span>
    </div>
  </div>;
}

function DebtCard({debt,onUpdate}) {
  const [editing,setEditing]=useState(false);
  const [val,setVal]=useState(debt.balance);
  const months=monthsUntil(debt.deadlineDate);
  const paid=debt.original-debt.balance;
  const urgent=months!==null&&months<=8;
  return <div style={{background:"#0f172a",borderRadius:16,padding:16,border:`1px solid ${urgent?debt.color:"#1e293b"}`,position:"relative"}}>
    <div style={{position:"absolute",top:12,right:12,background:debt.color+"22",color:debt.color,fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:20,border:`1px solid ${debt.color}44`}}>#{debt.priority}</div>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
      <div style={{width:8,height:8,borderRadius:"50%",background:debt.color,flexShrink:0}}/>
      <span style={{fontSize:14,fontWeight:700}}>{debt.name}</span>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
      <div>
        {editing
          ? <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <input type="number" value={val} onChange={e=>setVal(parseFloat(e.target.value))} style={{background:"#1e293b",border:"1px solid #334155",borderRadius:6,color:"#f1f5f9",padding:"4px 8px",fontSize:16,fontWeight:800,width:110}}/>
              <button onClick={()=>{onUpdate(debt.id,val);setEditing(false);}} style={{background:"#4ade80",color:"#0a0f1a",border:"none",borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:700,cursor:"pointer"}}>✓</button>
              <button onClick={()=>setEditing(false)} style={{background:"none",color:"#64748b",border:"none",cursor:"pointer",fontSize:12}}>✕</button>
            </div>
          : <div style={{display:"flex",alignItems:"baseline",gap:6}}>
              <span style={{fontSize:20,fontWeight:800,color:debt.color}}>{fmt(debt.balance)}</span>
              <button onClick={()=>setEditing(true)} style={{fontSize:10,color:"#475569",background:"none",border:"none",cursor:"pointer"}}>edit</button>
            </div>}
        <div style={{fontSize:10,color:"#475569"}}>of {fmt(debt.original)} original</div>
      </div>
      <div style={{textAlign:"right"}}>
        <div style={{fontSize:20,fontWeight:800,color:"#4ade80"}}>{pct(paid,debt.original)}%</div>
        <div style={{fontSize:10,color:"#475569"}}>paid off</div>
      </div>
    </div>
    <Bar value={paid} max={debt.original} color={debt.color} h={8}/>
    <div style={{display:"flex",justifyContent:"space-between",marginTop:10,marginBottom:10}}>
      <div><div style={{fontSize:10,color:"#475569"}}>Min/mo</div><div style={{fontSize:12,fontWeight:700}}>{fmt(debt.payment)}</div></div>
      <div><div style={{fontSize:10,color:"#475569"}}>Rate</div><div style={{fontSize:12,fontWeight:700}}>{debt.rate>0?`${debt.rate}%`:"0% promo"}</div></div>
      <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#475569"}}>Deadline</div><div style={{fontSize:12,fontWeight:700,color:urgent?"#f87171":"#f1f5f9"}}>{debt.deadline}{months!==null?` (${months}mo)`:""}</div></div>
    </div>
    <div style={{fontSize:11,color:"#64748b",background:"#0a0f1a",borderRadius:8,padding:"8px 10px",lineHeight:1.5}}>{debt.note}</div>
  </div>;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function Finance({ onBack }) {
  const now = new Date();
  const [tab, setTab] = useState("dashboard");
  const [income, setIncome] = useState(12926.88);
  const [debts, setDebts] = useState(INITIAL_DEBTS);
  const [editTx, setEditTx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);

  // Month state
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  // All transactions keyed by "YYYY-MM"
  const [allTxs, setAllTxs] = useState({});

  const monthKey = `${selectedYear}-${String(selectedMonth+1).padStart(2,'0')}`;
  const txs = allTxs[monthKey] || [];
  const expenses = txs.filter(t=>t.amount>0);
  const totalSpend = expenses.reduce((s,t)=>s+t.amount,0);
  const net = income - totalSpend;

  const byCat = {};
  CATEGORIES.forEach(c=>{byCat[c.id]=0;});
  expenses.forEach(t=>{byCat[t.category]=(byCat[t.category]||0)+t.amount;});

  const totalDebt = debts.reduce((s,d)=>s+d.balance,0);
  const totalPaid = debts.reduce((s,d)=>s+(d.original-d.balance),0);
  const totalOrig = debts.reduce((s,d)=>s+d.original,0);
  const totalMin = debts.reduce((s,d)=>s+d.payment,0);
  const availableForDebt = income - 3313 - 3796 - 1500;

  const addTxs = (newTxs) => {
    setAllTxs(prev => ({
      ...prev,
      [monthKey]: [...(prev[monthKey]||[]), ...newTxs]
    }));
  };

  const inputRef = useRef();

  const processFiles = async (files) => {
    setLoading(true);
    const l = [];
    for (const file of files) {
      try {
        l.push(`Reading ${file.name}...`); setLog([...l]);
        // CSV files — parse directly, no AI needed
        if (file.name.toLowerCase().endsWith('.csv')) {
          const text = await file.text();
          const parsed = parseGenericCSV(text);
          addTxs(parsed);
          l.push(`✓ ${file.name}: ${parsed.length} transactions (CSV)`); setLog([...l]);
        } else {
          // PDF or image — use Claude
          const base64 = await new Promise(res => {
            const r = new FileReader();
            r.onload = e => res(e.target.result.split(',')[1]);
            r.readAsDataURL(file);
          });
          const parsed = await parseWithClaude(base64, file.type);
          const withIds = parsed.map((t,i)=>({...t,id:Date.now()+i+Math.random(),amount:Math.abs(t.amount)})).filter(t=>t.amount>0);
          addTxs(withIds);
          l.push(`✓ ${file.name}: ${withIds.length} transactions (AI)`); setLog([...l]);
        }
      } catch(err) {
        l.push(`✗ ${file.name}: failed — ${err.message}`); setLog([...l]);
      }
    }
    setLoading(false);
  };

  const T = (t) => ({padding:"8px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",background:tab===t?"#4ade80":"transparent",color:tab===t?"#0a0f1a":"#64748b",transition:"all .2s",whiteSpace:"nowrap"});

  const ATTACK = [
    {month:"May 2026",     action:"Pay off Best Buy Promo 1 ($373) in full — eliminate retroactive interest risk",urgent:true},
    {month:"Jun–Jul 2026", action:"Pay $1,500+/mo on Car Loan → paid off by July. Frees $267/mo",urgent:false},
    {month:"Aug 2026",     action:"Redirect freed $267 to US Bank → now paying $967/mo",urgent:false},
    {month:"Mar 2027",     action:"US Bank paid off 1 year early. 30.49% retroactive APR avoided",urgent:false},
    {month:"Dec 2027",     action:"Best Buy Promo 2 cleared on schedule",urgent:false},
    {month:"Late 2028",    action:"Roof loan eliminated with redirected payments",urgent:false},
  ];

  return (
    <div style={{minHeight:"100vh",background:"#0a0f1a",color:"#f1f5f9",fontFamily:"'DM Sans','Segoe UI',sans-serif",paddingBottom:40}}>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#0f172a,#0a0f1a)",borderBottom:"1px solid #1e293b",padding:"18px 22px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <button onClick={onBack} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:12,padding:0,marginBottom:4,display:"block"}}>← Home</button>
            <h1 style={{margin:0,fontSize:20,fontWeight:800,letterSpacing:"-0.5px"}}><span style={{color:"#4ade80"}}>$</span> Family Finance</h1>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,color:"#475569"}}>Household Income</div>
            <div style={{fontSize:18,fontWeight:800,color:"#4ade80"}}>{fmt(income)}</div>
          </div>
        </div>

        {/* Month selector */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginTop:12,background:"#0f172a",borderRadius:12,padding:"10px 14px",border:"1px solid #1e293b"}}>
          <button onClick={()=>{if(selectedMonth===0){setSelectedMonth(11);setSelectedYear(y=>y-1);}else setSelectedMonth(m=>m-1);}} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:18,padding:0,lineHeight:1}}>‹</button>
          <div style={{flex:1,textAlign:"center"}}>
            <div style={{fontSize:14,fontWeight:700}}>{MONTHS[selectedMonth]} {selectedYear}</div>
            <div style={{fontSize:10,color:"#475569"}}>
              {new Date(selectedYear,selectedMonth,1).toLocaleDateString('en-US',{month:'short',day:'numeric'})} – {new Date(selectedYear,selectedMonth+1,0).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
            </div>
          </div>
          <button onClick={()=>{if(selectedMonth===11){setSelectedMonth(0);setSelectedYear(y=>y+1);}else setSelectedMonth(m=>m+1);}} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:18,padding:0,lineHeight:1}}>›</button>
        </div>

        {/* KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:12}}>
          {[
            {label:"Spent",value:fmt(totalSpend),color:"#f87171",sub:`${pct(totalSpend,income)}% of income`},
            {label:"Surplus",value:fmt(net),color:net>=0?"#4ade80":"#f87171",sub:net>=0?"✓ on track":"⚠ over"},
            {label:"Total Debt",value:fmt(totalDebt),color:"#a78bfa",sub:`${pct(totalPaid,totalOrig)}% paid`},
          ].map(k=><div key={k.label} style={{background:"#0f172a",borderRadius:12,padding:"12px 12px",border:"1px solid #1e293b"}}>
            <div style={{fontSize:10,color:"#475569",marginBottom:3}}>{k.label}</div>
            <div style={{fontSize:15,fontWeight:800,color:k.color}}>{k.value}</div>
            <div style={{fontSize:10,color:"#334155",marginTop:2}}>{k.sub}</div>
          </div>)}
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:4,marginTop:14,overflowX:"auto"}}>
          {[["dashboard","📊 Spending"],["debts","💳 Debts"],["transactions","📋 Transactions"],["upload","📂 Upload"]].map(([t,l])=>
            <button key={t} style={T(t)} onClick={()=>setTab(t)}>{l}</button>)}
        </div>
      </div>

      <div style={{padding:"18px 22px"}}>

        {/* DASHBOARD */}
        {tab==="dashboard"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
          {expenses.length===0
            ? <div style={{background:"#0f172a",borderRadius:16,padding:32,textAlign:"center",border:"1px solid #1e293b"}}>
                <div style={{fontSize:32,marginBottom:12}}>📂</div>
                <div style={{fontSize:14,color:"#64748b",marginBottom:8}}>No transactions for {MONTHS[selectedMonth]} {selectedYear}</div>
                <button onClick={()=>setTab("upload")} style={{background:"#4ade80",color:"#0a0f1a",border:"none",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Upload Statements</button>
              </div>
            : <>
              <div style={{background:"#0f172a",borderRadius:16,padding:"14px 16px",border:"1px solid #1e293b"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontSize:12,color:"#94a3b8"}}>Budget Used</span>
                  <span style={{fontSize:12,fontWeight:700}}>{fmt(totalSpend)} / {fmt(income)}</span>
                </div>
                <Bar value={totalSpend} max={income} color="#4ade80" h={8}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                  <span style={{fontSize:10,color:"#475569"}}>{pct(totalSpend,income)}% used</span>
                  <span style={{fontSize:10,color:net>=0?"#4ade80":"#f87171"}}>{net>=0?`${fmt(net)} remaining`:`${fmt(Math.abs(net))} over`}</span>
                </div>
              </div>
              <h3 style={{margin:"4px 0 -4px",fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:1}}>Top Categories</h3>
              {CATEGORIES.filter(c=>byCat[c.id]>0).sort((a,b)=>byCat[b.id]-byCat[a.id]).slice(0,5).map(c=><CatCard key={c.id} cat={c} actual={byCat[c.id]} budget={BUDGET[c.id]||100}/>)}
              <h3 style={{margin:"4px 0 -4px",fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:1}}>All Categories</h3>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {CATEGORIES.filter(c=>byCat[c.id]>0).sort((a,b)=>byCat[b.id]-byCat[a.id]).map(c=><CatCard key={c.id} cat={c} actual={byCat[c.id]} budget={BUDGET[c.id]||100}/>)}
              </div>
            </>}
        </div>}

        {/* DEBTS */}
        {tab==="debts"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:"#0f172a",borderRadius:16,padding:"14px 16px",border:"1px solid #1e293b"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <div><div style={{fontSize:10,color:"#475569"}}>Remaining</div><div style={{fontSize:22,fontWeight:800,color:"#a78bfa"}}>{fmt(totalDebt)}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#475569"}}>Paid Off</div><div style={{fontSize:22,fontWeight:800,color:"#4ade80"}}>{fmt(totalPaid)}</div></div>
            </div>
            <Bar value={totalPaid} max={totalOrig} color="#4ade80" h={10}/>
            <div style={{fontSize:10,color:"#475569",marginTop:6,textAlign:"center"}}>{pct(totalPaid,totalOrig)}% of {fmt(totalOrig)} paid off</div>
          </div>

          <div style={{background:"#0f172a",borderRadius:16,padding:"14px 16px",border:"1px solid #1e293b"}}>
            <h3 style={{margin:"0 0 10px",fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:1}}>Monthly Capacity</h3>
            {[
              {l:"Household income",v:income,c:"#4ade80",s:"+"},
              {l:"Day-to-day (SW card)",v:3313,c:"#f87171",s:"-"},
              {l:"Fixed PNC bills",v:3796,c:"#f87171",s:"-"},
              {l:"Giving/tithe",v:1500,c:"#f472b6",s:"-"},
            ].map(r=><div key={r.l} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:12,color:"#94a3b8"}}>{r.s} {r.l}</span>
              <span style={{fontSize:12,fontWeight:700,color:r.c}}>{fmt(r.v)}</span>
            </div>)}
            <div style={{borderTop:"1px solid #1e293b",paddingTop:8,marginTop:4}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:700}}>Available for debt</span>
                <span style={{fontSize:15,fontWeight:800,color:"#4ade80"}}>{fmt(availableForDebt)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:12,color:"#94a3b8"}}>- Min payments</span>
                <span style={{fontSize:12,fontWeight:700,color:"#f87171"}}>{fmt(totalMin)}</span>
              </div>
              <div style={{borderTop:"1px solid #1e293b",paddingTop:8,display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:12,fontWeight:700}}>Extra to attack</span>
                <span style={{fontSize:15,fontWeight:800,color:"#4ade80"}}>{fmt(availableForDebt-totalMin)}</span>
              </div>
            </div>
          </div>

          <div style={{background:"#0f172a",borderRadius:16,padding:"14px 16px",border:"1px solid #1e293b"}}>
            <h3 style={{margin:"0 0 14px",fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:1}}>🎯 Attack Plan</h3>
            {ATTACK.map((s,i)=><div key={i} style={{display:"flex",gap:12,marginBottom:i<ATTACK.length-1?14:0,alignItems:"flex-start"}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:s.urgent?"#f87171":"#1e293b",border:`2px solid ${s.urgent?"#f87171":"#334155"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:s.urgent?"#fff":"#64748b"}}>{i+1}</div>
                {i<ATTACK.length-1&&<div style={{width:2,height:18,background:"#1e293b",margin:"3px 0"}}/>}
              </div>
              <div style={{flex:1,paddingTop:3}}>
                <div style={{fontSize:10,color:s.urgent?"#f87171":"#64748b",fontWeight:700,marginBottom:2}}>{s.month}</div>
                <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.4}}>{s.action}</div>
              </div>
            </div>)}
          </div>

          <h3 style={{margin:"4px 0 -4px",fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:1}}>Individual Debts</h3>
          {debts.map(d=><DebtCard key={d.id} debt={d} onUpdate={(id,v)=>setDebts(p=>p.map(d=>d.id===id?{...d,balance:v}:d))}/>)}
        </div>}

        {/* TRANSACTIONS */}
        {tab==="transactions"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <span style={{fontSize:12,color:"#64748b"}}>{expenses.length} transactions · {MONTHS[selectedMonth]}</span>
            <button onClick={()=>setAllTxs(p=>({...p,[monthKey]:[]}))} style={{fontSize:11,color:"#f87171",background:"none",border:"1px solid #f87171",borderRadius:6,padding:"3px 10px",cursor:"pointer"}}>Clear Month</button>
          </div>
          {expenses.length===0&&<div style={{background:"#0f172a",borderRadius:12,padding:24,textAlign:"center",color:"#475569",fontSize:13}}>No transactions for this month yet.</div>}
          {expenses.sort((a,b)=>b.amount-a.amount).map(tx=>{
            const cat=CATEGORIES.find(c=>c.id===tx.category)||CATEGORIES[CATEGORIES.length-1];
            return <div key={tx.id} style={{background:"#0f172a",borderRadius:12,padding:"11px 13px",border:"1px solid #1e293b",display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:34,height:34,borderRadius:10,flexShrink:0,background:`${cat.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>{cat.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tx.merchant}</div>
                <div style={{fontSize:10,color:"#475569",marginTop:2}}>{tx.date} · {tx.source}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:13,fontWeight:700}}>{fmt(tx.amount)}</div>
                {editTx===tx.id
                  ? <select style={{background:"#1e293b",color:"#f1f5f9",border:"none",borderRadius:4,fontSize:10,padding:"2px 4px",marginTop:3}} defaultValue={tx.category}
                      onChange={e=>{setAllTxs(p=>({...p,[monthKey]:p[monthKey].map(t=>t.id===tx.id?{...t,category:e.target.value}:t)}));setEditTx(null);}}
                      onBlur={()=>setEditTx(null)} autoFocus>
                      {CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                    </select>
                  : <div style={{display:"flex",gap:4,marginTop:3,justifyContent:"flex-end"}}>
                      <button onClick={()=>setEditTx(tx.id)} style={{fontSize:10,color:"#64748b",background:"none",border:"none",cursor:"pointer",padding:0}}>{cat.label} ✏️</button>
                      <button onClick={()=>setAllTxs(p=>({...p,[monthKey]:p[monthKey].filter(t=>t.id!==tx.id)}))} style={{fontSize:10,color:"#f87171",background:"none",border:"none",cursor:"pointer",padding:0}}>✕</button>
                    </div>}
              </div>
            </div>;
          })}
        </div>}

        {/* UPLOAD */}
        {tab==="upload"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>

          {/* Income */}
          <div style={{background:"#0f172a",borderRadius:16,padding:14,border:"1px solid #1e293b"}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:6}}>Monthly Income</div>
            <input type="number" value={income} onChange={e=>setIncome(parseFloat(e.target.value))} style={{background:"#1e293b",border:"1px solid #334155",borderRadius:8,color:"#f1f5f9",padding:"7px 10px",fontSize:13,width:"100%",boxSizing:"border-box"}}/>
          </div>

          {/* CSV Upload */}
          <div style={{background:"#0f172a",borderRadius:16,padding:16,border:"2px solid #4ade80"}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>📊 CSV Upload <span style={{fontSize:11,color:"#4ade80",fontWeight:600}}>RECOMMENDED</span></div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:12,lineHeight:1.5}}>Export CSV from your bank and upload — instant, no AI needed, 100% accurate.</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
              {[
                {bank:"Chase",steps:"chase.com → Statements → Download → CSV"},
                {bank:"PNC",steps:"pnc.com → Activity → Download → CSV"},
              ].map(b=><div key={b.bank} style={{background:"#0a0f1a",borderRadius:8,padding:"10px 12px",border:"1px solid #1e293b"}}>
                <div style={{fontSize:12,fontWeight:700,marginBottom:2}}>{b.bank}</div>
                <div style={{fontSize:11,color:"#475569"}}>{b.steps}</div>
              </div>)}
            </div>
            <input ref={inputRef} type="file" multiple accept=".csv,.pdf,image/*" style={{display:"none"}} onChange={e=>processFiles(Array.from(e.target.files))}/>
            <button onClick={()=>inputRef.current.click()} disabled={loading} style={{width:"100%",background:loading?"#1e293b":"#4ade80",color:loading?"#64748b":"#0a0f1a",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,cursor:loading?"wait":"pointer"}}>
              {loading?"Parsing...":"📂 Upload Files (CSV, PDF, or Photo)"}
            </button>
          </div>

          {log.length>0&&<div style={{background:"#0f172a",borderRadius:12,padding:14,border:"1px solid #1e293b"}}>
            <div style={{fontSize:11,color:"#64748b",textTransform:"uppercase",marginBottom:8}}>Parse Log</div>
            {log.map((l,i)=><div key={i} style={{fontSize:12,color:l.startsWith("✓")?"#4ade80":l.startsWith("✗")?"#f87171":"#94a3b8",marginBottom:3}}>{l}</div>)}
          </div>}

          {/* How to export */}
          <div style={{background:"#0f172a",borderRadius:16,padding:14,border:"1px solid #1e293b"}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>How to export CSV</div>
            <div style={{fontSize:12,fontWeight:700,color:"#38bdf8",marginBottom:6}}>Chase</div>
            {["Go to chase.com and log in","Click on your account","Click 'Download' near the transaction list","Select date range (first to last of month)","Choose CSV format and download"].map((s,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6}}>
              <div style={{width:16,height:16,borderRadius:"50%",background:"#38bdf8",color:"#0a0f1a",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
              <span style={{fontSize:12,color:"#94a3b8"}}>{s}</span>
            </div>)}
            <div style={{fontSize:12,fontWeight:700,color:"#4ade80",marginTop:12,marginBottom:6}}>PNC</div>
            {["Go to pnc.com and log in","Click on your account","Click 'Download Activity'","Set date range and choose CSV","Download and upload here"].map((s,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6}}>
              <div style={{width:16,height:16,borderRadius:"50%",background:"#4ade80",color:"#0a0f1a",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
              <span style={{fontSize:12,color:"#94a3b8"}}>{s}</span>
            </div>)}
          </div>
        </div>}
      </div>
    </div>
  );
}
