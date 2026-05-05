import { useState, useRef, useEffect } from "react";

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
  {id:"utilities",    label:"Utilities",     color:"#5A6E7A",bg:"#EDF1F4",icon:"💡"},
  {id:"mortgage",     label:"Mortgage",      color:"#C43A3A",bg:"#F5E6E6",icon:"🏠"},
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
  {id:"other",        label:"Other",         color:"#6B6560",bg:"#F0EDE8",icon:"📌"},
];

const BUDGET = {
  groceries:1311,restaurants:250,gas:300,clothing:100,subscriptions:230,
  utilities:168,mortgage:3024,insurance:208,auto:150,health:189,kids:80,
  pet:50,giving:1500,amazon:200,home:64,personal:55,medical:100,other:100,
};

const INITIAL_DEBTS = [
  {id:1,name:"Best Buy Promo 1",  balance:372.62,  original:372.62,  payment:53.23,  rate:0,   deadline:"Dec 2026",deadlineDate:"2026-12-04",priority:1,color:C.red,   bg:C.red2,    note:"Pay off this month — retroactive interest if any balance remains Dec 4"},
  {id:2,name:"Car Loan (Pacifica)",balance:4878.34,original:4878.34,payment:267.66,rate:7.37,deadline:"May 2028",deadlineDate:"2028-05-12",priority:2,color:C.terra, bg:C.terra3,  note:"Target: pay off by Jul 2026 with $1,500+/mo. Frees $267/mo permanently."},
  {id:3,name:"Best Buy Promo 2",  balance:1960.16, original:1960.16, payment:103.17, rate:0,   deadline:"Dec 2027",deadlineDate:"2027-12-06",priority:3,color:C.gold,  bg:"#FBF4E0", note:"Pay $103/mo minimum. Deferred interest deadline Dec 2027."},
  {id:4,name:"US Bank ...3987",   balance:12035.21,original:12035.21,payment:700.00, rate:0,   deadline:"Mar 2028",deadlineDate:"2028-03-01",priority:4,color:C.navy,  bg:"#E8EBF5", note:"0% until Mar 2028. After car payoff redirect $267 here → done Mar 2027."},
  {id:5,name:"Roof (Watercress)", balance:22582.62,original:22582.62,payment:263.63, rate:7.0, deadline:"ongoing", deadlineDate:null,         priority:5,color:"#5A6E7A",bg:"#EDF1F4",note:"After US Bank paid (~Mar 2027) redirect $967+/mo → done by late 2028."},
];

const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const fmt=(n)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
const pct=(a,b)=>Math.min(100,Math.round((a/b)*100));
function monthsUntil(ds){if(!ds)return null;const t=new Date(ds),n=new Date();return(t.getFullYear()-n.getFullYear())*12+(t.getMonth()-n.getMonth());}

function useIsMobile(){
  const [mobile,setMobile]=useState(window.innerWidth<768);
  useEffect(()=>{const h=()=>setMobile(window.innerWidth<768);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h);},[]);
  return mobile;
}

function categorize(desc){
  const d=desc.toUpperCase();
  if(/ROCKET MORTGAGE|WATERCRESS|MORTGAGE/.test(d))return"mortgage";
  if(/ADVENTIST|TITHE|OFFERING|CHURCH|GIVING/.test(d))return"giving";
  if(/KROGER|MEIJER|COSTCO WHSE|TRADER JOE|ALDI|WHOLE FOODS|GIANT EAGLE/.test(d))return"groceries";
  if(/COSTCO GAS|MARATHON|SHELL|BP#|SHEETZ|SUNOCO|EXXON|CHEVRON|SPEEDWAY|HAHN QUICK/.test(d))return"gas";
  if(/MCDONALD|BURGER KING|WENDY|CHIPOTLE|PANDA EXPRESS|STARBUCKS|SUBWAY|TACO BELL|PIZZA|RESTAURANT|CAFE|SUSHI|ESTILO BRAZIL|QAMARIA|WHITS/.test(d))return"restaurants";
  if(/AMAZON MKTPL|AMAZON\.COM|AMZN\.COM/.test(d))return"amazon";
  if(/APPLE\.COM|SPOTIFY|NETFLIX|HULU|DISNEY|MICROSOFT|TMOBILE|T-MOBILE|VIVINT|BREEZELINE|AT&T|VERIZON/.test(d))return"subscriptions";
  if(/AEP|EVERBRIGHT|SUBURBAN NATURAL|DOMINION|DUKE ENERGY/.test(d))return"utilities";
  if(/GEICO|PROGRESSIVE|ALLSTATE|KANGURO|NORTHWESTERN MUTUAL|INSURANCE/.test(d))return"insurance";
  if(/VALVOLINE|AUTOZONE|VIOC|JIFFY LUBE|O'REILLY|NAPA|TOMMY|CAR WASH|IRON PONY|MOTOR VEHIC|BMV/.test(d))return"auto";
  if(/OHIO HEALTH|OHIOHEALTH|NATIONWIDE CHILDREN|CVS\/PHARMACY|WALGREEN|MEDICAL|DENTAL|DOCTOR|HOSPITAL|ANESTHESIA|PERIODONT/.test(d))return"medical";
  if(/JIU JITS|GYM|FITNESS|PLANET FITNESS|ORANGE THEORY|YMCA|RELSON/.test(d))return"health";
  if(/HOME DEPOT|LOWE'S|EXPERIGREEN|LAWN|DUST BUSTER|CLEANING/.test(d))return"home";
  if(/PETLAND|PETSMART|PETCO|GREENIES|CHUCKIT/.test(d))return"pet";
  if(/GREAT CLIPS|SALON|BARBER|BEAUTY|PURLISSE/.test(d))return"personal";
  if(/OLENTANGY|SCHOOL|DAYCARE/.test(d))return"kids";
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
    if(isNaN(amount)||amount>=0)continue;
    const[m,d]=date.split('/');if(!m||!d)continue;
    txs.push({id:Date.now()+Math.random(),date:`${m.padStart(2,'0')}/${d.padStart(2,'0')}`,merchant:desc,amount:Math.abs(amount),category:categorize(desc),source:"Chase"});
  }
  return txs;
}

function parsePNCCSV(text){
  const lines=text.trim().split('\n');const txs=[];
  for(let i=1;i<lines.length;i++){
    const cols=lines[i].match(/(".*?"|[^,]+)(?=,|$)/g);
    if(!cols||cols.length<4)continue;
    const date=cols[0].replace(/"/g,'').trim();
    const desc=cols[1].replace(/"/g,'').trim();
    const amount=parseFloat(cols[2].replace(/["$,]/g,'').trim());
    if(isNaN(amount)||amount<=0)continue;
    const parts=date.split('/');if(parts.length<2)continue;
    txs.push({id:Date.now()+Math.random(),date:`${parts[0].padStart(2,'0')}/${parts[1].padStart(2,'0')}`,merchant:desc,amount,category:categorize(desc),source:"PNC"});
  }
  return txs;
}

function parseGenericCSV(text){
  const header=text.split('\n')[0].toLowerCase();
  if(header.includes('transaction date')||header.includes('post date'))return parseChaseCSV(text);
  if(header.includes('withdrawals')||header.includes('deposits'))return parsePNCCSV(text);
  return parseChaseCSV(text);
}

async function parseWithClaude(fileData,fileType){
  const cats=CATEGORIES.map(c=>c.id).join(", ");
  const sys=`Parse financial transactions. Return ONLY a JSON array. Each: {"date":"MM/DD","merchant":"name","amount":number,"category":"one of [${cats}]","source":"Chase or PNC"}. Expenses only, positive amounts only.`;
  const content=fileType.startsWith("image/")?[{type:"image",source:{type:"base64",media_type:fileType,data:fileData}},{type:"text",text:"Parse all expense transactions."}]:[{type:"document",source:{type:"base64",media_type:"application/pdf",data:fileData}},{type:"text",text:"Parse all expense transactions."}];
  const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4000,system:sys,messages:[{role:"user",content}]})});
  const data=await res.json();
  const text=data.content?.find(b=>b.type==="text")?.text||"[]";
  return JSON.parse(text.replace(/```json|```/g,"").trim());
}

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

function DebtCard({debt,onUpdate,mobile}){
  const[editing,setEditing]=useState(false);
  const[val,setVal]=useState(debt.balance);
  const months=monthsUntil(debt.deadlineDate);
  const paid=debt.original-debt.balance;
  const urgent=months!==null&&months<=8;
  return <div style={{background:C.surface,borderRadius:16,padding:mobile?"16px":"20px 22px",boxShadow:C.shadow,border:`1px solid ${urgent?debt.color:C.border}`}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
      <div style={{flex:1,minWidth:0,marginRight:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:debt.color,flexShrink:0}}/>
          <span style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"'DM Sans',sans-serif"}}>{debt.name}</span>
          {urgent&&<span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,background:debt.bg,color:debt.color,fontFamily:"'DM Sans',sans-serif"}}>URGENT</span>}
        </div>
        <div style={{fontSize:11,color:C.text3,marginLeft:16,fontFamily:"'DM Sans',sans-serif"}}>Priority #{debt.priority} · {debt.deadline}{months!==null?` · ${months} months`:""}</div>
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        {editing?<div style={{display:"flex",gap:6,alignItems:"center"}}>
          <input type="number" value={val} onChange={e=>setVal(parseFloat(e.target.value))}
            style={{background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:8,color:C.text,padding:"4px 8px",fontSize:14,fontWeight:700,width:100,textAlign:"right",fontFamily:"'DM Sans',sans-serif"}}/>
          <button onClick={()=>{onUpdate(debt.id,val);setEditing(false);}} style={{background:C.green,color:"#fff",border:"none",borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:700,cursor:"pointer"}}>✓</button>
          <button onClick={()=>setEditing(false)} style={{background:"none",color:C.text3,border:"none",cursor:"pointer",fontSize:13}}>✕</button>
        </div>:<div>
          <div style={{fontSize:mobile?18:22,fontWeight:700,color:debt.color,letterSpacing:"-0.5px",fontFamily:"'DM Sans',sans-serif"}}>{fmt(debt.balance)}</div>
          <button onClick={()=>setEditing(true)} style={{fontSize:11,color:C.text3,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"'DM Sans',sans-serif"}}>tap to update</button>
        </div>}
      </div>
    </div>
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
        <span style={{fontSize:11,color:C.text3,fontFamily:"'DM Sans',sans-serif"}}>{pct(paid,debt.original)}% paid · {fmt(debt.payment)}/mo</span>
        <span style={{fontSize:11,color:C.text3,fontFamily:"'DM Sans',sans-serif"}}>{fmt(paid)} of {fmt(debt.original)}</span>
      </div>
      <Bar value={paid} max={debt.original} color={debt.color} h={6}/>
    </div>
    <div style={{fontSize:12,color:C.text2,background:debt.bg,borderRadius:10,padding:"10px 12px",lineHeight:1.6,fontFamily:"'DM Sans',sans-serif"}}>{debt.note}</div>
  </div>;
}

export default function Finance({onBack}){
  const mobile=useIsMobile();
  const now=new Date();
  const[tab,setTab]=useState("dashboard");
  const[income,setIncome]=useState(12926.88);
  const[debts,setDebts]=useState(INITIAL_DEBTS);
  const[editTx,setEditTx]=useState(null);
  const[loading,setLoading]=useState(false);
  const[log,setLog]=useState([]);
  const[selectedYear,setSelectedYear]=useState(now.getFullYear());
  const[selectedMonth,setSelectedMonth]=useState(now.getMonth());
  const[allTxs,setAllTxs]=useState({});
  const inputRef=useRef();

  const monthKey=`${selectedYear}-${String(selectedMonth+1).padStart(2,'0')}`;
  const txs=allTxs[monthKey]||[];
  const expenses=txs.filter(t=>t.amount>0);
  const totalSpend=expenses.reduce((s,t)=>s+t.amount,0);
  const net=income-totalSpend;
  const byCat={};CATEGORIES.forEach(c=>{byCat[c.id]=0;});expenses.forEach(t=>{byCat[t.category]=(byCat[t.category]||0)+t.amount;});
  const totalDebt=debts.reduce((s,d)=>s+d.balance,0);
  const totalPaid=debts.reduce((s,d)=>s+(d.original-d.balance),0);
  const totalOrig=debts.reduce((s,d)=>s+d.original,0);
  const totalMin=debts.reduce((s,d)=>s+d.payment,0);
  const availableForDebt=income-3313-3796-1500;

  const addTxs=(newTxs)=>setAllTxs(prev=>({...prev,[monthKey]:[...(prev[monthKey]||[]),...newTxs]}));

  const processFiles=async(files)=>{
    setLoading(true);const l=[];
    for(const file of files){
      try{
        l.push(`Reading ${file.name}...`);setLog([...l]);
        if(file.name.toLowerCase().endsWith('.csv')){
          const text=await file.text();const parsed=parseGenericCSV(text);addTxs(parsed);
          l.push(`✓ ${file.name}: ${parsed.length} transactions`);setLog([...l]);
        }else{
          const base64=await new Promise(res=>{const r=new FileReader();r.onload=e=>res(e.target.result.split(',')[1]);r.readAsDataURL(file);});
          const parsed=await parseWithClaude(base64,file.type);
          const withIds=parsed.map((t,i)=>({...t,id:Date.now()+i+Math.random(),amount:Math.abs(t.amount)})).filter(t=>t.amount>0);
          addTxs(withIds);l.push(`✓ ${file.name}: ${withIds.length} transactions (AI)`);setLog([...l]);
        }
      }catch(err){l.push(`✗ ${file.name}: ${err.message}`);setLog([...l]);}
    }
    setLoading(false);
  };

  const pad=mobile?"14px 16px":"32px 40px";
  const T=(t)=>({
    padding:mobile?"8px 14px":"9px 18px",borderRadius:99,border:"none",cursor:"pointer",
    fontSize:mobile?12:13,fontWeight:600,fontFamily:"'DM Sans',sans-serif",
    background:tab===t?C.terra:C.surface,color:tab===t?"#fff":C.text2,
    boxShadow:tab===t?`0 2px 8px ${C.terra}44`:C.shadow,transition:"all .2s",whiteSpace:"nowrap",
  });

  const ATTACK=[
    {month:"May 2026",     action:"Pay off Best Buy Promo 1 ($373) in full",urgent:true},
    {month:"Jun–Jul 2026", action:"Hammer Car Loan with $1,500+/mo → gone by July",urgent:false},
    {month:"Aug 2026",     action:"Redirect $267 to US Bank → $967/mo total",urgent:false},
    {month:"Mar 2027",     action:"US Bank paid off 1 year early",urgent:false},
    {month:"Dec 2027",     action:"Best Buy Promo 2 cleared on schedule",urgent:false},
    {month:"Late 2028",    action:"Roof loan eliminated with redirected payments",urgent:false},
  ];

  return <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>

    {/* HEADER */}
    <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:mobile?"14px 16px":"20px 40px",boxShadow:C.shadow}}>
      {mobile ? (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <button onClick={onBack} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:99,color:C.text2,cursor:"pointer",fontSize:11,padding:"5px 12px",fontFamily:"'DM Sans',sans-serif"}}>← Home</button>
              <div>
                <h1 style={{margin:0,fontSize:18,fontWeight:700,fontFamily:"'Playfair Display',serif",color:C.text}}>Family Finances</h1>
                <div style={{fontSize:11,color:C.text3,fontFamily:"'DM Sans',sans-serif"}}>{MONTHS[selectedMonth]} {selectedYear}</div>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:C.text3,fontFamily:"'DM Sans',sans-serif"}}>Income</div>
              <div style={{fontSize:16,fontWeight:700,color:C.green,fontFamily:"'DM Sans',sans-serif"}}>{fmt(income)}</div>
            </div>
          </div>
          {/* Mobile month nav */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.surface2,borderRadius:12,padding:"8px 14px",border:`1px solid ${C.border}`}}>
            <button onClick={()=>{if(selectedMonth===0){setSelectedMonth(11);setSelectedYear(y=>y-1);}else setSelectedMonth(m=>m-1);}} style={{background:"none",border:"none",color:C.text2,cursor:"pointer",fontSize:20,padding:"0 4px",lineHeight:1}}>‹</button>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif"}}>{MONTHS[selectedMonth]} {selectedYear}</div>
              <div style={{fontSize:10,color:C.text3,fontFamily:"'DM Sans',sans-serif"}}>{new Date(selectedYear,selectedMonth,1).toLocaleDateString('en-US',{month:'short',day:'numeric'})} – {new Date(selectedYear,selectedMonth+1,0).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
            </div>
            <button onClick={()=>{if(selectedMonth===11){setSelectedMonth(0);setSelectedYear(y=>y+1);}else setSelectedMonth(m=>m+1);}} style={{background:"none",border:"none",color:C.text2,cursor:"pointer",fontSize:20,padding:"0 4px",lineHeight:1}}>›</button>
          </div>
        </div>
      ) : (
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <button onClick={onBack} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:99,color:C.text2,cursor:"pointer",fontSize:12,padding:"6px 14px",fontFamily:"'DM Sans',sans-serif"}}>← Home</button>
            <div>
              <h1 style={{margin:0,fontSize:24,fontWeight:700,fontFamily:"'Playfair Display',serif",color:C.text}}>Family Finances</h1>
              <div style={{fontSize:12,color:C.text3,fontFamily:"'DM Sans',sans-serif",marginTop:2}}>Werlich Household · {MONTHS[selectedMonth]} {selectedYear}</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,background:C.surface2,borderRadius:12,padding:"8px 14px",border:`1px solid ${C.border}`}}>
            <button onClick={()=>{if(selectedMonth===0){setSelectedMonth(11);setSelectedYear(y=>y-1);}else setSelectedMonth(m=>m-1);}} style={{background:"none",border:"none",color:C.text2,cursor:"pointer",fontSize:18,padding:"0 4px",lineHeight:1}}>‹</button>
            <div style={{textAlign:"center",minWidth:140}}>
              <div style={{fontSize:14,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif"}}>{MONTHS[selectedMonth]} {selectedYear}</div>
              <div style={{fontSize:11,color:C.text3,fontFamily:"'DM Sans',sans-serif"}}>{new Date(selectedYear,selectedMonth,1).toLocaleDateString('en-US',{month:'short',day:'numeric'})} – {new Date(selectedYear,selectedMonth+1,0).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
            </div>
            <button onClick={()=>{if(selectedMonth===11){setSelectedMonth(0);setSelectedYear(y=>y+1);}else setSelectedMonth(m=>m+1);}} style={{background:"none",border:"none",color:C.text2,cursor:"pointer",fontSize:18,padding:"0 4px",lineHeight:1}}>›</button>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:C.text3,fontFamily:"'DM Sans',sans-serif",textTransform:"uppercase",letterSpacing:.8}}>Monthly Income</div>
            <div style={{fontSize:24,fontWeight:700,color:C.green,fontFamily:"'DM Sans',sans-serif"}}>{fmt(income)}</div>
          </div>
        </div>
      )}
    </div>

    {/* TABS */}
    <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:mobile?"10px 14px":"12px 40px",display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none"}}>
      {[["dashboard","Overview"],["debts","Debts"],["transactions","Transactions"],["upload","Upload"]].map(([t,l])=>
        <button key={t} style={T(t)} onClick={()=>setTab(t)}>{l}</button>)}
    </div>

    <div style={{padding:mobile?"16px":"32px 40px",maxWidth:1200,margin:"0 auto"}}>

      {/* DASHBOARD */}
      {tab==="dashboard"&&<div>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"repeat(4,1fr)",gap:mobile?10:16,marginBottom:mobile?16:28}}>
          <StatCard mobile={mobile} label="Total Spent" value={fmt(totalSpend)} sub={`${pct(totalSpend,income)}% of income`} color={totalSpend>income?C.red:C.text}/>
          <StatCard mobile={mobile} label="Remaining" value={fmt(net)} sub={net>=0?"On track":"Over budget"} color={net>=0?C.green:C.red} bg={net>=0?C.green2:C.red2}/>
          {!mobile&&<StatCard label="Transactions" value={expenses.length} sub={`${MONTHS[selectedMonth]}`}/>}
          {!mobile&&<StatCard label="Total Debt" value={fmt(totalDebt)} sub={`${pct(totalPaid,totalOrig)}% paid off`} color={C.terra}/>}
        </div>

        {expenses.length===0
          ?<div style={{background:C.surface,borderRadius:20,padding:mobile?"40px 24px":"60px 40px",textAlign:"center",boxShadow:C.shadow,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:36,marginBottom:14}}>📂</div>
            <div style={{fontSize:mobile?16:18,fontWeight:600,fontFamily:"'Playfair Display',serif",color:C.text,marginBottom:8}}>No transactions yet</div>
            <div style={{fontSize:13,color:C.text3,fontFamily:"'DM Sans',sans-serif",marginBottom:20}}>Upload your Chase or PNC statements to get started</div>
            <button onClick={()=>setTab("upload")} style={{background:C.terra,color:"#fff",border:"none",borderRadius:12,padding:"12px 24px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Upload Statements →</button>
          </div>
          :<div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:mobile?14:20}}>
            <div style={{background:C.surface,borderRadius:16,padding:mobile?"16px":"20px 24px",boxShadow:C.shadow,border:`1px solid ${C.border}`,gridColumn:mobile?"1":"1/-1"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif"}}>Monthly Budget</span>
                <span style={{fontSize:12,color:C.text3,fontFamily:"'DM Sans',sans-serif"}}>{fmt(totalSpend)} of {fmt(income)}</span>
              </div>
              <Bar value={totalSpend} max={income} color={C.terra} h={mobile?8:10}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                <span style={{fontSize:11,color:C.text3,fontFamily:"'DM Sans',sans-serif"}}>{pct(totalSpend,income)}% used</span>
                <span style={{fontSize:11,color:net>=0?C.green:C.red,fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>{net>=0?`${fmt(net)} remaining`:`${fmt(Math.abs(net))} over budget`}</span>
              </div>
            </div>
            <div style={{background:C.surface,borderRadius:16,padding:mobile?"16px":"20px 24px",boxShadow:C.shadow,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:14,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif",marginBottom:3}}>By Category</div>
              <div style={{fontSize:12,color:C.text3,fontFamily:"'DM Sans',sans-serif",marginBottom:12}}>Top spending areas</div>
              {CATEGORIES.filter(c=>byCat[c.id]>0).sort((a,b)=>byCat[b.id]-byCat[a.id]).slice(0,mobile?6:8).map(c=><CatRow key={c.id} cat={c} actual={byCat[c.id]} budget={BUDGET[c.id]||100}/>)}
            </div>
            <div style={{background:C.surface,borderRadius:16,padding:mobile?"16px":"20px 24px",boxShadow:C.shadow,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:14,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif",marginBottom:3}}>All Categories</div>
              <div style={{fontSize:12,color:C.text3,fontFamily:"'DM Sans',sans-serif",marginBottom:12}}>Complete breakdown</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {CATEGORIES.filter(c=>byCat[c.id]>0).sort((a,b)=>byCat[b.id]-byCat[a.id]).map(c=>(
                  <div key={c.id} style={{background:c.bg,borderRadius:12,padding:"10px 12px"}}>
                    <div style={{fontSize:11,color:C.text2,fontFamily:"'DM Sans',sans-serif",marginBottom:4}}>{c.icon} {c.label}</div>
                    <div style={{fontSize:mobile?15:17,fontWeight:700,color:byCat[c.id]>BUDGET[c.id]?C.red:c.color,fontFamily:"'DM Sans',sans-serif"}}>{fmt(byCat[c.id])}</div>
                    <Bar value={byCat[c.id]} max={BUDGET[c.id]||100} color={c.color} h={3}/>
                  </div>
                ))}
              </div>
            </div>
          </div>}
      </div>}

      {/* DEBTS */}
      {tab==="debts"&&<div>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"repeat(3,1fr)",gap:mobile?10:16,marginBottom:mobile?16:24}}>
          <StatCard mobile={mobile} label="Total Debt" value={fmt(totalDebt)} sub={`${pct(totalPaid,totalOrig)}% paid`} color={C.terra}/>
          <StatCard mobile={mobile} label="Monthly Capacity" value={fmt(availableForDebt)} sub="After expenses & giving"/>
          {!mobile&&<StatCard label="Extra After Minimums" value={fmt(availableForDebt-totalMin)} sub={`Min: ${fmt(totalMin)}/mo`} color={C.green} bg={C.green2}/>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"2fr 1fr",gap:mobile?14:20}}>
          <div style={{display:"flex",flexDirection:"column",gap:mobile?12:16}}>
            {debts.map(d=><DebtCard key={d.id} mobile={mobile} debt={d} onUpdate={(id,v)=>setDebts(p=>p.map(d=>d.id===id?{...d,balance:v}:d))}/>)}
          </div>
          {!mobile&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{background:C.surface,borderRadius:16,padding:"20px 22px",boxShadow:C.shadow,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:14,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif",marginBottom:12}}>Overall Progress</div>
              <Bar value={totalPaid} max={totalOrig} color={C.green} h={8}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:10}}>
                <div><div style={{fontSize:11,color:C.text3,fontFamily:"'DM Sans',sans-serif"}}>Paid off</div><div style={{fontSize:16,fontWeight:700,color:C.green,fontFamily:"'DM Sans',sans-serif"}}>{fmt(totalPaid)}</div></div>
                <div style={{textAlign:"right"}}><div style={{fontSize:11,color:C.text3,fontFamily:"'DM Sans',sans-serif"}}>Remaining</div><div style={{fontSize:16,fontWeight:700,color:C.terra,fontFamily:"'DM Sans',sans-serif"}}>{fmt(totalDebt)}</div></div>
              </div>
            </div>
            <div style={{background:C.surface,borderRadius:16,padding:"20px 22px",boxShadow:C.shadow,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:14,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif",marginBottom:14}}>Attack Plan</div>
              {ATTACK.map((s,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:14,alignItems:"flex-start"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:s.urgent?C.red:C.terra3,border:`2px solid ${s.urgent?C.red:C.terra}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:s.urgent?"#fff":C.terra}}>{i+1}</div>
                  {i<ATTACK.length-1&&<div style={{width:1,height:14,background:C.border,margin:"3px 0"}}/>}
                </div>
                <div style={{flex:1,paddingTop:1}}>
                  <div style={{fontSize:10,fontWeight:700,color:s.urgent?C.red:C.text3,fontFamily:"'DM Sans',sans-serif",textTransform:"uppercase",letterSpacing:.6,marginBottom:2}}>{s.month}</div>
                  <div style={{fontSize:12,color:C.text2,fontFamily:"'DM Sans',sans-serif",lineHeight:1.5}}>{s.action}</div>
                </div>
              </div>)}
            </div>
          </div>}
          {mobile&&<div style={{background:C.surface,borderRadius:16,padding:"16px",boxShadow:C.shadow,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:14,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif",marginBottom:12}}>Attack Plan</div>
            {ATTACK.map((s,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:12,alignItems:"flex-start"}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:s.urgent?C.red:C.terra3,border:`2px solid ${s.urgent?C.red:C.terra}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:s.urgent?"#fff":C.terra,flexShrink:0}}>{i+1}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:10,fontWeight:700,color:s.urgent?C.red:C.text3,fontFamily:"'DM Sans',sans-serif",textTransform:"uppercase",letterSpacing:.5,marginBottom:1}}>{s.month}</div>
                <div style={{fontSize:12,color:C.text2,fontFamily:"'DM Sans',sans-serif",lineHeight:1.4}}>{s.action}</div>
              </div>
            </div>)}
          </div>}
        </div>
      </div>}

      {/* TRANSACTIONS */}
      {tab==="transactions"&&<div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontSize:mobile?18:20,fontWeight:700,fontFamily:"'Playfair Display',serif",color:C.text}}>{MONTHS[selectedMonth]} Transactions</div>
            <div style={{fontSize:12,color:C.text3,fontFamily:"'DM Sans',sans-serif",marginTop:2}}>{expenses.length} expenses · {fmt(totalSpend)}</div>
          </div>
          <button onClick={()=>setAllTxs(p=>({...p,[monthKey]:[]}))} style={{background:"none",border:`1px solid ${C.border2}`,borderRadius:99,color:C.red,fontSize:12,padding:"7px 14px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Clear</button>
        </div>
        {expenses.length===0
          ?<div style={{background:C.surface,borderRadius:16,padding:40,textAlign:"center",color:C.text3,fontSize:14,fontFamily:"'DM Sans',sans-serif"}}>No transactions for this month.</div>
          :<div style={{background:C.surface,borderRadius:16,boxShadow:C.shadow,border:`1px solid ${C.border}`,overflow:"hidden"}}>
            {expenses.sort((a,b)=>b.amount-a.amount).map((tx,i)=>{
              const cat=CATEGORIES.find(c=>c.id===tx.category)||CATEGORIES[CATEGORIES.length-1];
              return <div key={tx.id} style={{display:"flex",alignItems:"center",gap:mobile?10:16,padding:mobile?"12px 14px":"14px 20px",borderBottom:i<expenses.length-1?`1px solid ${C.border}`:"none",background:i%2===0?C.surface:"#FDFAF7"}}>
                <div style={{width:mobile?32:38,height:mobile?32:38,borderRadius:10,background:cat.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:mobile?15:18,flexShrink:0}}>{cat.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:mobile?12:13,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tx.merchant}</div>
                  <div style={{fontSize:10,color:C.text3,fontFamily:"'DM Sans',sans-serif",marginTop:1}}>{tx.date} · {tx.source}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:mobile?13:14,fontWeight:700,color:C.text,fontFamily:"'DM Sans',sans-serif"}}>{fmt(tx.amount)}</div>
                  {editTx===tx.id
                    ?<select style={{background:C.surface2,color:C.text,border:`1px solid ${C.border2}`,borderRadius:6,fontSize:10,padding:"2px 4px",marginTop:2,fontFamily:"'DM Sans',sans-serif"}}
                      defaultValue={tx.category}
                      onChange={e=>{setAllTxs(p=>({...p,[monthKey]:p[monthKey].map(t=>t.id===tx.id?{...t,category:e.target.value}:t)}));setEditTx(null);}}
                      onBlur={()=>setEditTx(null)} autoFocus>
                      {CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                    </select>
                    :<div style={{display:"flex",gap:6,marginTop:2,justifyContent:"flex-end"}}>
                      <button onClick={()=>setEditTx(tx.id)} style={{fontSize:10,color:C.text3,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"'DM Sans',sans-serif"}}>✏️</button>
                      <button onClick={()=>setAllTxs(p=>({...p,[monthKey]:p[monthKey].filter(t=>t.id!==tx.id)}))} style={{fontSize:10,color:C.red,background:"none",border:"none",cursor:"pointer",padding:0}}>✕</button>
                    </div>}
                </div>
              </div>;
            })}
          </div>}
      </div>}

      {/* UPLOAD */}
      {tab==="upload"&&<div style={{maxWidth:mobile?"100%":700}}>
        <div style={{fontSize:mobile?18:20,fontWeight:700,fontFamily:"'Playfair Display',serif",color:C.text,marginBottom:4}}>Upload Statements</div>
        <div style={{fontSize:13,color:C.text3,fontFamily:"'DM Sans',sans-serif",marginBottom:20}}>CSV files parse instantly. PDFs and photos use AI.</div>
        <div style={{background:C.surface,borderRadius:16,padding:mobile?"16px":"20px 24px",boxShadow:C.shadow,border:`1px solid ${C.border}`,marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif",marginBottom:8}}>Monthly Income</div>
          <input type="number" value={income} onChange={e=>setIncome(parseFloat(e.target.value))}
            style={{background:C.surface2,border:`1px solid ${C.border2}`,borderRadius:10,color:C.text,padding:"10px 14px",fontSize:15,fontWeight:600,width:"100%",boxSizing:"border-box",fontFamily:"'DM Sans',sans-serif"}}/>
        </div>
        <div style={{background:C.surface,borderRadius:16,padding:mobile?"16px":"24px",boxShadow:C.shadow,border:`2px solid ${C.terra}`,marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif",marginBottom:4}}>Upload Files</div>
          <div style={{fontSize:12,color:C.text3,fontFamily:"'DM Sans',sans-serif",marginBottom:16,lineHeight:1.6}}>Chase CSV, PNC CSV, PDF statements, or receipt photos. CSV is recommended — instant and 100% accurate.</div>
          <input ref={inputRef} type="file" multiple accept=".csv,.pdf,image/*" style={{display:"none"}} onChange={e=>processFiles(Array.from(e.target.files))}/>
          <button onClick={()=>inputRef.current.click()} disabled={loading}
            style={{width:"100%",background:loading?C.surface2:C.terra,color:loading?C.text3:"#fff",border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:600,cursor:loading?"wait":"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all .2s"}}>
            {loading?"Parsing your files...":"Choose Files to Upload"}
          </button>
        </div>
        {log.length>0&&<div style={{background:C.surface,borderRadius:16,padding:mobile?"14px":"16px 20px",boxShadow:C.shadow,border:`1px solid ${C.border}`,marginBottom:16}}>
          <div style={{fontSize:11,color:C.text3,textTransform:"uppercase",letterSpacing:.8,fontFamily:"'DM Sans',sans-serif",marginBottom:8}}>Upload Log</div>
          {log.map((l,i)=><div key={i} style={{fontSize:12,color:l.startsWith("✓")?C.green:l.startsWith("✗")?C.red:C.text2,fontFamily:"'DM Sans',sans-serif",marginBottom:4}}>{l}</div>)}
        </div>}
        <div style={{background:C.surface,borderRadius:16,padding:mobile?"16px":"20px 24px",boxShadow:C.shadow,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:14,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif",marginBottom:14}}>How to export CSV</div>
          {[{bank:"Chase",color:C.navy,steps:["chase.com → your account → Download","Select date range → CSV format"]},{bank:"PNC",color:C.green,steps:["pnc.com → your account → Download Activity","Set date range → CSV → Download"]}].map(b=>(
            <div key={b.bank} style={{marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:700,color:b.color,fontFamily:"'DM Sans',sans-serif",marginBottom:6}}>{b.bank}</div>
              {b.steps.map((s,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:5,alignItems:"flex-start"}}>
                <div style={{width:16,height:16,borderRadius:"50%",background:b.color,color:"#fff",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
                <span style={{fontSize:12,color:C.text2,fontFamily:"'DM Sans',sans-serif",lineHeight:1.5}}>{s}</span>
              </div>)}
            </div>
          ))}
        </div>
      </div>}
    </div>
  </div>;
}
