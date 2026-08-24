import { useState, useEffect, useRef } from "react";

const I = {
  'chest-press':     ['https://upload.wikimedia.org/wikipedia/commons/0/01/Bench_press_dumbbell_1.svg','https://upload.wikimedia.org/wikipedia/commons/b/b3/Bench_press_dumbbell_2.svg'],
  'dumbbell-row':    ['https://upload.wikimedia.org/wikipedia/commons/5/5e/Dumbbell_bent-over_row_1.svg','https://upload.wikimedia.org/wikipedia/commons/7/76/Dumbbell_bent-over_row_2.svg'],
  'lat-pulldown':    ['https://upload.wikimedia.org/wikipedia/commons/f/fc/Front_lat_pulldown_1.svg','https://upload.wikimedia.org/wikipedia/commons/e/e7/Front_lat_pulldown_2.svg'],
  'shoulder-press':  ['https://upload.wikimedia.org/wikipedia/commons/4/4d/Dumbbell_shoulder_press_1.svg','https://upload.wikimedia.org/wikipedia/commons/e/e5/Dumbbell_shoulder_press_2.svg'],
  'bicep-curl':      ['https://upload.wikimedia.org/wikipedia/commons/a/aa/Biceps_curl_with_dumbbell_1.svg','https://upload.wikimedia.org/wikipedia/commons/b/b0/Biceps_curl_with_dumbbell_2.svg'],
  'tricep-pushdown': ['https://upload.wikimedia.org/wikipedia/commons/9/98/Pushdown_1.svg','https://upload.wikimedia.org/wikipedia/commons/2/2f/Pushdown_2.svg'],
  'goblet-squat':    ['https://upload.wikimedia.org/wikipedia/commons/1/11/Goblet_squat_1.svg','https://upload.wikimedia.org/wikipedia/commons/8/83/Goblet_squat_2.svg'],
  'rdl':             ['https://upload.wikimedia.org/wikipedia/commons/e/e2/Dumbbell_romanian_deadlift_1.svg','https://upload.wikimedia.org/wikipedia/commons/1/10/Dumbbell_romanian_deadlift_2.svg'],
  'reverse-lunge':   ['https://upload.wikimedia.org/wikipedia/commons/2/24/Dumbbell_reverse_lunge_1.svg','https://upload.wikimedia.org/wikipedia/commons/6/65/Dumbbell_reverse_lunge_2.svg'],
  'step-up':         ['https://upload.wikimedia.org/wikipedia/commons/7/78/Dumbbell_step_up_1.svg','https://upload.wikimedia.org/wikipedia/commons/4/4f/Dumbbell_step_up_2.svg'],
  'calf-raises':     ['https://upload.wikimedia.org/wikipedia/commons/5/58/Standing_dumbbell_calf_raise_1.svg','https://upload.wikimedia.org/wikipedia/commons/b/be/Standing_dumbbell_calf_raise_2.svg'],
  'rowing':          ['https://upload.wikimedia.org/wikipedia/commons/5/5e/Dumbbell_bent-over_row_1.svg',null],
  'bike':            [null,null],
  'punching-bag':    [null,null],
  'plank':           ['https://upload.wikimedia.org/wikipedia/commons/8/8a/Front_plank.svg',null],
  'leg-raises':      ['https://upload.wikimedia.org/wikipedia/commons/5/5e/Bent_knee_hip_raise_1.svg','https://upload.wikimedia.org/wikipedia/commons/5/54/Bent_knee_hip_raise_2.svg'],
  'crunches':        ['https://upload.wikimedia.org/wikipedia/commons/7/79/Crunch_1.svg','https://upload.wikimedia.org/wikipedia/commons/e/e3/Crunch_2.svg'],
  'cable-row':       [null,null],
  'leg-extension':   [null,null],
};

const EX = {
  'chest-press':    {name:'Dumbbell Chest Press',pills:['3 sets','10 reps','10–15 lb'],hi:'10–15 lb',muscles:['Chest','Front Shoulders','Triceps'],tips:['Lie flat on bench, feet flat on the floor for stability.','Hold dumbbells at chest level, elbows at 45° — not flared out wide.','Press straight up, lower slowly (3 seconds down).','Keep your back flat — don\'t arch off the bench. Core stays tight.'],emoji:'🏋️'},
  'dumbbell-row':   {name:'Dumbbell Row',pills:['3 sets','10 reps each','15 lb'],hi:'15 lb',muscles:['Lats','Rhomboids','Rear Delts','Biceps'],tips:['Place one knee and same-side hand on bench for support.','Keep your back perfectly flat — parallel to the floor.','Pull dumbbell up toward your hip, not your shoulder.','Lower slowly and feel the full stretch. Only your arm moves.'],emoji:'💪'},
  'lat-pulldown':   {name:'Lat Pulldown',pills:['3 sets','12 reps','Cable machine'],hi:'Cable',muscles:['Lats','Biceps','Rear Delts'],tips:['Sit upright, lean back about 15°.','Grip bar wider than shoulder-width.','Pull bar to your upper chest — never behind the neck.','Control bar back up slowly.'],emoji:'⬇️'},
  'shoulder-press': {name:'Dumbbell Shoulder Press',pills:['3 sets','10 reps','10 lb'],hi:'10 lb',muscles:['Front Delts','Side Delts','Triceps'],tips:['Sit upright on bench with back supported.','Start with dumbbells at ear level, elbows at 90°.','Press straight up — don\'t lock elbows at the top.','Core tight — don\'t arch your lower back.'],emoji:'🙌'},
  'bicep-curl':     {name:'Bicep Curl',pills:['3 sets','12 reps','10–15 lb'],hi:'10–15 lb',muscles:['Biceps','Brachialis'],tips:['Stand tall, feet shoulder-width apart.','Elbows GLUED to your sides — this is critical!','Curl up 2 seconds, lower 3 seconds.','No swinging. If you\'re swinging, drop the weight.'],emoji:'💪'},
  'tricep-pushdown':{name:'Tricep Pushdown',pills:['3 sets','12 reps','Cable'],hi:'Cable',muscles:['Triceps (all 3 heads)'],tips:['Stand close to cable, slight forward lean.','Elbows pinned to sides — they don\'t move.','Push down until arms fully straight.','Return slowly — feel the stretch at the top.'],emoji:'👇'},
  'goblet-squat':   {name:'Goblet Squat',pills:['3 sets','12 reps','15–20 lb'],hi:'15–20 lb',muscles:['Quads','Glutes','Core','Inner Thighs'],tips:['Hold one dumbbell vertically at your chest.','Feet shoulder-width, toes slightly out.','Squat down keeping chest up, knees over toes.','Don\'t let heels rise. Go as deep as comfortable.'],emoji:'🦵'},
  'rdl':            {name:'Romanian Deadlift',pills:['3 sets','10 reps','15–20 lb'],hi:'15–20 lb',muscles:['Hamstrings','Glutes','Lower Back'],tips:['Stand holding dumbbells, soft bend in knees.','Hinge at the hips — push them back, not down.','Lower dumbbells along your legs, keep them close.','Feel hamstring stretch. Back stays FLAT always.','Drive hips forward to stand back up.'],emoji:'🏋️'},
  'reverse-lunge':  {name:'Reverse Lunge',pills:['3 sets','10 reps each','10–15 lb'],hi:'10–15 lb',muscles:['Quads','Glutes','Hamstrings','Core'],tips:['Stand tall, dumbbells at sides.','Step ONE foot back, lower back knee toward floor.','Front knee stays over your ankle — not past toes.','Push through front heel to return to standing.'],emoji:'🦵'},
  'step-up':        {name:'Dumbbell Step-Up',pills:['3 sets','10 reps each','10 lb'],hi:'10 lb',muscles:['Quads','Glutes','Hamstrings','Balance'],tips:['Place one foot fully on the bench.','Drive through front heel to lift yourself up.','Don\'t push off with the back foot.','Step down controlled, then switch legs.'],emoji:'⬆️'},
  'calf-raises':    {name:'Calf Raises',pills:['3 sets','15 reps','Hold dumbbells'],hi:'Dumbbells',muscles:['Gastrocnemius','Soleus'],tips:['Stand holding dumbbells at sides.','Rise on balls of feet as high as possible.','Hold at the top 1 second.','Lower slowly — full range of motion.'],emoji:'🦶'},
  'rowing':         {name:'Rowing Machine',pills:['10 minutes','Easy pace','Warm-up'],hi:'Easy pace',muscles:['Full Body','Legs','Back','Core'],tips:['Feet strapped in, sit tall.','Drive LEGS first, then lean back, then pull arms.','Easy conversational pace — this is your warm-up.','Target 20–24 strokes per minute.'],emoji:'🚣'},
  'bike':           {name:'Exercise Bike (Schwinn)',pills:['15 minutes','Moderate pace'],hi:'Moderate',muscles:['Cardio','Quads','Glutes'],tips:['Adjust seat: slight bend at bottom of pedal stroke.','Moderate — talking should be slightly hard.','Cadence 70–90 RPM.','Sit upright, don\'t hunch.'],emoji:'🚴'},
  'punching-bag':   {name:'Punching Bag (RDX)',pills:['6 rounds','30s on / 30s off'],hi:'6 rounds',muscles:['Full Body','Cardio','Core','Shoulders'],tips:['Hands up near face at ALL times.','Stay light on your feet.','Basic combo: jab-jab-cross (1-1-2).','30s FULL effort, 30s COMPLETE rest.','Breathe OUT with each punch.'],emoji:'🥊'},
  'plank':          {name:'Plank',pills:['3 sets','30 seconds'],hi:'30 sec',muscles:['Core','Shoulders','Glutes','Back'],tips:['Forearms on floor, elbows under shoulders.','Body in straight line — head to heels.','Don\'t let hips sag OR shoot up.','Squeeze glutes and core. Keep breathing!'],emoji:'🧘'},
  'leg-raises':     {name:'Leg Raises',pills:['3 sets','12 reps'],hi:'12 reps',muscles:['Lower Abs','Hip Flexors','Core'],tips:['Lie flat, hands under lower back for support.','Keep legs straight (slight knee bend is fine).','Raise legs to 90° using your core.','Lower SLOWLY — that\'s where the work happens.'],emoji:'🦵'},
  'crunches':       {name:'Crunches',pills:['3 sets','15 reps'],hi:'15 reps',muscles:['Upper Abs','Core'],tips:['Back flat, knees bent, feet on floor.','Hands lightly behind head — don\'t pull neck!','Lift shoulders with ABS — small controlled movement.','Hold 1 second at top, lower slowly.'],emoji:'💪'},
  'cable-row':      {name:'Seated Cable Row (Mikolo Home Gym)',pills:['3 sets','12 reps','40–50 lb'],hi:'40–50 lb',muscles:['Lats','Rhomboids','Rear Delts','Biceps'],tips:['Sit on the low-pulley bench, feet braced on the footplate, knees slightly bent.','Grab the handle, sit tall with a slight forward lean to start.','Pull the handle to your stomach, driving elbows straight back — squeeze shoulder blades together.','Return slowly, letting your shoulders stretch forward. Back stays straight — no swinging.'],emoji:'🪢'},
  'leg-extension':  {name:'Leg Extension (Mikolo Home Gym)',pills:['3 sets','12 reps','30–40 lb'],hi:'30–40 lb',muscles:['Quads'],tips:['Sit on the leg station, back against the pad, ankles behind the roller pad.','Grip the side handles for stability.','Extend both legs up until straight — squeeze quads at the top for 1 second.','Lower slowly and controlled — don\'t let the stack slam down.'],emoji:'🦿'},
};

const DAYS = [
  {id:'day1',label:'TUE',full:'UPPER BODY',sub:'Tuesday · 7:30–8:30 AM',dow:2,pills:['7 Exercises','~65 min','Upper focus'],
   items:[{t:'label',text:'7:30 AM · WARM UP',sub:'Arm circles, shoulder rolls — 3 min'},{t:'ex',id:'chest-press',time:'7:33'},{t:'rest',dur:90,label:'Rest between sets'},{t:'ex',id:'dumbbell-row',time:'7:40'},{t:'rest',dur:90,label:'Rest between sets'},{t:'ex',id:'lat-pulldown',time:'7:47'},{t:'rest',dur:90,label:'Rest between sets'},{t:'ex',id:'shoulder-press',time:'7:54'},{t:'rest',dur:90,label:'Rest between sets'},{t:'ex',id:'bicep-curl',time:'8:01'},{t:'rest',dur:90,label:'Rest between sets'},{t:'ex',id:'tricep-pushdown',time:'8:08'},{t:'rest',dur:90,label:'Rest between sets'},{t:'ex',id:'cable-row',time:'8:13'},{t:'label',text:'8:18 AM · COOL DOWN',sub:'Stretch arms & chest — 10 min'}]},
  {id:'day2',label:'THU',full:'LOWER BODY',sub:'Thursday · 7:30–8:30 AM',dow:4,pills:['6 Exercises','~65 min','Leg focus'],
   items:[{t:'label',text:'7:30 AM · WARM UP',sub:'Leg swings, hip circles — 3 min'},{t:'ex',id:'goblet-squat',time:'7:33'},{t:'rest',dur:90,label:'Rest between sets'},{t:'ex',id:'rdl',time:'7:41'},{t:'rest',dur:90,label:'Rest between sets'},{t:'ex',id:'reverse-lunge',time:'7:49'},{t:'rest',dur:90,label:'Rest between sets'},{t:'ex',id:'step-up',time:'7:57'},{t:'rest',dur:90,label:'Rest between sets'},{t:'ex',id:'calf-raises',time:'8:05'},{t:'rest',dur:90,label:'Rest between sets'},{t:'ex',id:'leg-extension',time:'8:10'},{t:'label',text:'8:15 AM · COOL DOWN',sub:'Hamstring & quad stretch — 10 min'}]},
  {id:'day3',label:'FRI',full:'CARDIO + CORE',sub:'Friday · 7:30–8:30 AM',dow:5,pills:['6 Exercises','~60 min','Cardio day'],
   items:[{t:'ex',id:'rowing',time:'7:30'},{t:'rest',dur:60,label:'Quick rest'},{t:'ex',id:'bike',time:'7:41'},{t:'rest',dur:60,label:'Quick rest'},{t:'ex',id:'punching-bag',time:'7:57'},{t:'rest',dur:60,label:'Rest'},{t:'ex',id:'plank',time:'8:05'},{t:'rest',dur:60,label:'Rest'},{t:'ex',id:'leg-raises',time:'8:10'},{t:'rest',dur:60,label:'Rest'},{t:'ex',id:'crunches',time:'8:15'},{t:'label',text:'8:22 AM · COOL DOWN',sub:'Full body stretch — 8 min'}]},
  {id:'day4',label:'SUN',full:'FULL BODY CIRCUIT',sub:'Sunday · 7:30–8:30 AM',dow:0,pills:['6 Exercises','3 Rounds','60s rest between rounds'],
   items:[{t:'label',text:'7:30 AM · WARM UP',sub:'5 min light cardio'},{t:'label',text:'7:35 AM · ROUND 1 OF 3',sub:''},{t:'ex',id:'goblet-squat',time:'7:35'},{t:'ex',id:'dumbbell-row',time:'7:38'},{t:'ex',id:'chest-press',time:'7:41'},{t:'ex',id:'lat-pulldown',time:'7:44'},{t:'ex',id:'reverse-lunge',time:'7:47'},{t:'ex',id:'plank',time:'7:50'},{t:'rest',dur:60,label:'Rest between rounds'},{t:'label',text:'7:52 AM · ROUND 2 OF 3',sub:''},{t:'ex',id:'goblet-squat',time:'7:52'},{t:'ex',id:'dumbbell-row',time:'7:55'},{t:'ex',id:'chest-press',time:'7:58'},{t:'ex',id:'lat-pulldown',time:'8:01'},{t:'ex',id:'reverse-lunge',time:'8:04'},{t:'ex',id:'plank',time:'8:07'},{t:'rest',dur:60,label:'Rest between rounds'},{t:'label',text:'8:09 AM · ROUND 3 OF 3',sub:''},{t:'ex',id:'goblet-squat',time:'8:09'},{t:'ex',id:'dumbbell-row',time:'8:12'},{t:'ex',id:'chest-press',time:'8:15'},{t:'ex',id:'lat-pulldown',time:'8:18'},{t:'ex',id:'reverse-lunge',time:'8:21'},{t:'ex',id:'plank',time:'8:24'},{t:'label',text:'8:27 AM · COOL DOWN',sub:'Full body stretch — 8 min'}]},
];

const V = {
  bg:'#0d0d0d', card:'#161616', card2:'#1e1e1e', border:'#2a2a2a',
  accent:'#f0ff3d', accent2:'#3df0c8', accent3:'#ff5c3d', blue:'#3d8eff',
  text:'#f5f5f5', muted:'#666', muted2:'#3a3a3a'
};

export default function Workout({ onBack }) {
  const now = new Date();
  const dow = now.getDay();
  const [activeDay, setActiveDay] = useState(() => { const i = DAYS.findIndex(d=>d.dow===dow); return i>=0?i:0; });
  const [checked, setChecked] = useState({});
  const [modal, setModal] = useState(null);
  const [timer, setTimer] = useState(null);
  const [timerSecs, setTimerSecs] = useState(0);
  const [timerTotal, setTimerTotal] = useState(0);
  const timerRef = useRef(null);

  const day = DAYS[activeDay];
  const exItems = day.items.filter(i=>i.t==='ex');
  const doneCount = exItems.filter((it,ii) => checked[day.id+it.id+day.items.indexOf(it)]).length;

  useEffect(() => {
    if (timer) {
      setTimerSecs(timer.dur);
      setTimerTotal(timer.dur);
      timerRef.current = setInterval(() => {
        setTimerSecs(s => { if(s<=1){clearInterval(timerRef.current);return 0;} return s-1; });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timer]);

  const toggleCheck = (ck) => setChecked(prev => ({...prev,[ck]:!prev[ck]}));
  const startRest = (dur, label) => setTimer({dur, label});
  const closeTimer = () => { clearInterval(timerRef.current); setTimer(null); };
  const skipTimer = () => { clearInterval(timerRef.current); setTimerSecs(0); };

  const pct = timerTotal > 0 ? (timerSecs/timerTotal)*100 : 0;
  const dashOffset = 565 - (pct/100)*565;
  const mm = Math.floor(timerSecs/60), ss = timerSecs%60;

  const MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateStr = MO[now.getMonth()]+' '+now.getDate()+', '+now.getFullYear();

  return (
    <div style={{minHeight:'100vh',background:V.bg,color:V.text,fontFamily:"'Barlow',sans-serif",display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <div style={{background:V.card,borderBottom:`1px solid ${V.border}`,padding:'11px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div>
          <button onClick={onBack} style={{background:'none',border:'none',color:V.muted,cursor:'pointer',fontSize:12,padding:0,marginBottom:4,display:'block'}}>← Home</button>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:25,fontWeight:900,letterSpacing:2,color:V.accent}}>ED'S TRAINER</div>
          <div style={{fontSize:10,color:V.muted,letterSpacing:1,textTransform:'uppercase'}}>Workout App</div>
        </div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:600,color:V.muted,border:`1px solid ${V.border}`,borderRadius:6,padding:'4px 9px',letterSpacing:1}}>{dateStr}</div>
      </div>

      {/* Day selector */}
      <div style={{display:'flex',gap:6,padding:'11px 14px 9px',overflowX:'auto',background:V.card,borderBottom:`1px solid ${V.border}`,scrollbarWidth:'none'}}>
        {DAYS.map((d,i)=>(
          <div key={d.id} onClick={()=>setActiveDay(i)} style={{flexShrink:0,padding:'6px 13px',borderRadius:8,border:`1px solid ${i===activeDay?V.accent:V.border}`,background:i===activeDay?V.accent:V.card2,fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1,color:i===activeDay?'#000':(d.dow===dow?V.accent2:V.muted),cursor:'pointer'}}>
            {d.label}{d.dow===dow?' ★':''}
          </div>
        ))}
        {['MON','WED','SAT'].map(r=>(
          <div key={r} style={{flexShrink:0,padding:'6px 13px',borderRadius:8,border:`1px solid ${V.border}`,background:V.card2,fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1,color:V.muted,opacity:.4}}>
            {r} REST
          </div>
        ))}
      </div>

      {/* Workout header */}
      <div style={{padding:'14px 16px 11px',borderBottom:`1px solid ${V.border}`,background:'linear-gradient(180deg,#1a1a1a 0%,#0d0d0d 100%)'}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:32,fontWeight:900,letterSpacing:2,lineHeight:1,marginBottom:3}}>{day.full}</div>
        <div style={{fontSize:12,color:V.muted,marginBottom:7}}>{day.sub}</div>
        <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
          {day.pills.map(p=><span key={p} style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:5,background:V.card2,border:`1px solid ${V.border}`,color:V.muted,letterSpacing:.5}}>{p}</span>)}
        </div>
      </div>

      {/* Progress */}
      <div style={{background:V.bg,padding:'9px 16px 0',borderBottom:`1px solid ${V.border}`}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:V.muted,marginBottom:5}}>
          <span>Session Progress</span><span>{doneCount} / {exItems.length}</span>
        </div>
        <div style={{height:4,background:V.border,borderRadius:2,overflow:'hidden',marginBottom:9}}>
          <div style={{height:'100%',background:V.accent2,borderRadius:2,width:`${exItems.length?doneCount/exItems.length*100:0}%`,transition:'width .4s ease'}}/>
        </div>
      </div>

      {/* Timeline */}
      <div style={{flex:1,overflowY:'auto',padding:'0 14px 80px'}}>
        {day.items.map((item,idx)=>{
          const ck = day.id+(item.id||'L'+idx)+idx;
          const isDone = checked[ck];
          const ex = item.t==='ex' ? EX[item.id] : null;
          const imgs = item.t==='ex' ? (I[item.id]||[null,null]) : [null,null];

          return (
            <div key={idx} style={{display:'flex',position:'relative'}}>
              <div style={{width:24,flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center'}}>
                <div style={{width:10,height:10,borderRadius:'50%',border:`2px solid ${isDone&&item.t==='ex'?V.accent2:V.muted2}`,background:isDone&&item.t==='ex'?V.accent2:V.bg,flexShrink:0,marginTop:19,position:'relative',zIndex:1,transition:'all .3s'}}/>
                {idx<day.items.length-1&&<div style={{width:2,flex:1,background:V.muted2,minHeight:12}}/>}
              </div>
              <div style={{flex:1,marginBottom:10}}>
                {item.t==='label'&&(
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 2px'}}>
                    <div style={{flex:1,height:1,background:V.muted2}}/>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:V.muted,whiteSpace:'nowrap'}}>{item.text}{item.sub?' — '+item.sub:''}</div>
                    <div style={{flex:1,height:1,background:V.muted2}}/>
                  </div>
                )}
                {item.t==='rest'&&(
                  <div style={{background:V.card2,border:`1px solid ${V.muted2}`,borderRadius:10,marginBottom:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px'}}>
                      <span style={{fontSize:17}}>⏸</span>
                      <div>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:700,letterSpacing:1,color:V.muted}}>{item.label}</div>
                        <div style={{fontSize:11,color:V.muted2}}>{Math.floor(item.dur/60)>0?Math.floor(item.dur/60)+'m ':''}{item.dur%60?item.dur%60+'s':''} rest</div>
                      </div>
                      <button onClick={()=>startRest(item.dur,item.label)} style={{marginLeft:'auto',padding:'7px 13px',borderRadius:8,background:V.accent3,border:'none',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1,cursor:'pointer'}}>▶ START</button>
                    </div>
                  </div>
                )}
                {item.t==='ex'&&ex&&(
                  <div onClick={()=>setModal(item.id)} style={{background:V.card,border:`1px solid ${isDone?V.accent2:V.border}`,borderRadius:14,overflow:'hidden',cursor:'pointer',opacity:isDone?.7:1,transition:'border-color .2s'}}>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:V.muted,padding:'7px 12px 0',fontFamily:"'Barlow Condensed',sans-serif"}}>{item.time} AM</div>
                    <div style={{display:'flex'}}>
                      <div style={{width:100,flexShrink:0,minHeight:100,position:'relative',overflow:'hidden',background:'#1a1a1a',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {imgs[0]
                          ? <img src={imgs[0]} alt={ex.name} loading="lazy" style={{width:'100%',height:'100%',objectFit:'contain',padding:8}} onError={e=>e.target.outerHTML=`<div style="font-size:40px">${ex.emoji}</div>`}/>
                          : <div style={{fontSize:40}}>{ex.emoji}</div>}
                        <div style={{position:'absolute',inset:0,background:'linear-gradient(90deg,transparent 50%,#161616 100%)',pointerEvents:'none'}}/>
                      </div>
                      <div style={{flex:1,padding:'9px 12px 11px'}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:19,fontWeight:900,letterSpacing:.5,lineHeight:1.1,marginBottom:6}}>{ex.name}</div>
                        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                          {ex.pills.map(p=><span key={p} style={{fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:4,background:V.card2,border:`1px solid ${p===ex.hi?'rgba(240,255,61,.3)':V.border}`,color:p===ex.hi?V.accent:V.muted}}>{p}</span>)}
                        </div>
                      </div>
                      <div onClick={e=>{e.stopPropagation();toggleCheck(ck);}} style={{width:32,height:32,borderRadius:9,border:`2px solid ${isDone?V.accent2:V.border}`,background:isDone?V.accent2:V.card2,display:'flex',alignItems:'center',justifyContent:'center',alignSelf:'center',marginRight:10,flexShrink:0,fontSize:15,cursor:'pointer',color:isDone?'#000':'transparent',transition:'all .2s'}}>✓</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Exercise Modal */}
      {modal&&(
        <div onClick={e=>{if(e.target===e.currentTarget)setModal(null);}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.88)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div style={{background:V.card,borderRadius:'22px 22px 0 0',width:'100%',maxWidth:600,maxHeight:'90vh',overflowY:'auto',position:'relative'}}>
            <div style={{width:36,height:4,background:V.border,borderRadius:2,margin:'14px auto 0'}}/>
            <div onClick={()=>setModal(null)} style={{position:'absolute',top:14,right:14,background:V.card2,border:`1px solid ${V.border}`,color:V.muted,width:28,height:28,borderRadius:'50%',fontSize:17,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',zIndex:10}}>×</div>
            {(()=>{
              const ex=EX[modal]; const imgs=I[modal]||[null,null];
              return <>
                <div style={{display:'flex',gap:12,background:'#111',borderBottom:`1px solid ${V.border}`,justifyContent:'center',alignItems:'center',minHeight:170,padding:14}}>
                  {imgs[0]&&imgs[1]
                    ? <>{['START','END'].map((lbl,i)=><div key={lbl} style={{display:'flex',flexDirection:'column',alignItems:'center',flex:1}}><img src={imgs[i]} alt={lbl} style={{maxHeight:165,maxWidth:'47%',objectFit:'contain'}} onError={e=>e.target.style.display='none'}/><div style={{fontSize:9,textAlign:'center',color:V.muted,letterSpacing:1,textTransform:'uppercase',marginTop:4}}>{lbl}</div></div>)}</>
                    : imgs[0]
                      ? <img src={imgs[0]} alt={ex.name} style={{maxHeight:170,maxWidth:'85%',objectFit:'contain'}} onError={e=>e.target.outerHTML=`<div style="font-size:80px">${ex.emoji}</div>`}/>
                      : <div style={{fontSize:80}}>{ex.emoji}</div>}
                </div>
                <div style={{padding:'16px 18px 40px'}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:26,fontWeight:900,letterSpacing:.5,marginBottom:8}}>{ex.name}</div>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:16}}>
                    {ex.pills.map(p=><span key={p} style={{fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:4,background:V.card2,border:`1px solid ${p===ex.hi?'rgba(240,255,61,.3)':V.border}`,color:p===ex.hi?V.accent:V.muted}}>{p}</span>)}
                  </div>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:V.muted,marginBottom:10}}>FORM TIPS</div>
                  {ex.tips.map((tip,i)=><div key={i} style={{display:'flex',gap:10,marginBottom:8,alignItems:'flex-start'}}>
                    <div style={{width:20,height:20,borderRadius:'50%',background:V.accent3,color:'#fff',fontSize:11,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{i+1}</div>
                    <div style={{fontSize:13,color:V.text,lineHeight:1.5}}>{tip}</div>
                  </div>)}
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:V.muted,margin:'16px 0 10px'}}>MUSCLES WORKED</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {ex.muscles.map(m=><span key={m} style={{fontSize:12,fontWeight:600,padding:'4px 10px',borderRadius:6,background:V.card2,border:`1px solid ${V.accent2}44`,color:V.accent2}}>{m}</span>)}
                  </div>
                </div>
              </>;
            })()}
          </div>
        </div>
      )}

      {/* Rest Timer */}
      {timer&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.94)',zIndex:300,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:700,letterSpacing:3,color:V.muted}}>{timer.label.toUpperCase()}</div>
          <div style={{position:'relative',width:200,height:200}}>
            <svg width="200" height="200" style={{transform:'rotate(-90deg)'}}>
              <circle cx="100" cy="100" r="90" fill="none" stroke="#222" strokeWidth="8"/>
              <circle cx="100" cy="100" r="90" fill="none" stroke={V.accent3} strokeWidth="8" strokeLinecap="round" strokeDasharray="565" strokeDashoffset={dashOffset} style={{transition:'stroke-dashoffset .1s linear'}}/>
            </svg>
            <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:"'Barlow Condensed',sans-serif",fontSize:68,fontWeight:900,letterSpacing:2,lineHeight:1}}>
              {mm>0?mm+':':''}{String(ss).padStart(2,'0')}
              <span style={{fontSize:12,color:V.muted,letterSpacing:2,marginTop:4}}>{timerSecs===0?'DONE!':timer.label.toUpperCase()}</span>
            </div>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button onClick={skipTimer} style={{padding:'12px 26px',borderRadius:12,border:`1px solid ${V.border}`,background:V.card2,color:V.muted,fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:700,letterSpacing:1,cursor:'pointer'}}>SKIP</button>
            <button onClick={closeTimer} style={{padding:'12px 26px',borderRadius:12,border:'none',background:V.accent3,color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:700,letterSpacing:1,cursor:'pointer'}}>DONE ✓</button>
          </div>
          <div style={{fontSize:12,color:V.muted,textAlign:'center',maxWidth:240,lineHeight:1.5}}>{timerSecs===0?'✅ Rest complete! Tap DONE to continue.':'Tap DONE when ready to continue'}</div>
        </div>
      )}
    </div>
  );
}
