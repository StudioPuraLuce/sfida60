import { useState, useEffect, useRef, useCallback } from "react";
import "./index.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const SCHEDULE = [
  { id:"sveglia",    label:"Sveglia",        time:"06:00", emoji:"⏰", block:"mattina" },
  { id:"flessioni",  label:"Flessioni",       time:"",      emoji:"💪", block:"mattina" },
  { id:"preghiere",  label:"Preghiere",       time:"",      emoji:"🙏", block:"mattina" },
  { id:"caffe",      label:"Caffè",           time:"",      emoji:"☕", block:"mattina" },
  { id:"corda",      label:"Corda",           time:"",      emoji:"🪢", block:"mattina" },
  { id:"addominali", label:"Addominali",      time:"",      emoji:"🔥", block:"mattina" },
  { id:"ballo",      label:"Ballo",           time:"",      emoji:"🕺", block:"mattina" },
  { id:"autobus",    label:"Autobus",         time:"07:00", emoji:"🚌", block:"logistica" },
  { id:"messa",      label:"Messa",           time:"07:30", emoji:"⛪", block:"logistica" },
  { id:"colazione",  label:"Colazione",       time:"08:00", emoji:"🥐", block:"logistica" },
  { id:"lavoro",     label:"Lavoro",          time:"09–14", emoji:"📚", block:"logistica" },
  { id:"pranzo",     label:"Pranzo",          time:"15:00", emoji:"🥗", block:"pomeriggio" },
  { id:"attivita",   label:"Attività",        time:"",      emoji:"🌊", block:"pomeriggio" },
  { id:"cena",       label:"Cena",            time:"20:30", emoji:"🍎", block:"sera" },
  { id:"noscreen",   label:"No Screen",       time:"",      emoji:"🚫", block:"sera" },
  { id:"compieta",   label:"Compieta",        time:"",      emoji:"🙏", block:"sera" },
  { id:"letto",      label:"Letto",           time:"21:30", emoji:"😴", block:"sera" },
];

const BLOCKS = {
  mattina:    { label:"Boot",       color:"#E8A020" },
  logistica:  { label:"Logistica",  color:"#4CAF7A" },
  pomeriggio: { label:"Pomeriggio", color:"#4A90D9" },
  sera:       { label:"Sera",       color:"#9B7FD4" },
};

const ACTIVITIES = ["Palestra 🏋️","Mare 🌊","Chiese ⛪","Flair 🎸","Riposo 🛌"];

const START = new Date("2026-05-04T00:00:00");
const TOTAL = 60;
const WORKER = "https://sfida60-motivatore.soliwkr.workers.dev";

const MARCO_SYSTEM = `Sei Marco, coach PM di Chris — Sfida 60 Giorni.
Ex McKinsey. Diretto, dati, zero banalità. Italiano. Max 100 parole.
Schema: Boot 06:00, Messa 07:30, Lavoro 09-14, Cena 20:30, Compieta, Letto 21:30.`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dayIdx(date = new Date()) {
  const d = new Date(date); d.setHours(0,0,0,0);
  const s = new Date(START); s.setHours(0,0,0,0);
  return Math.floor((d - s) / 86400000);
}
function dayDate(i) { const d = new Date(START); d.setDate(d.getDate()+i); return d; }
function fmt(i) { return dayDate(i).toLocaleDateString("it-IT",{weekday:"short",day:"numeric",month:"short"}); }
function fmtLong(i) { return dayDate(i).toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"}); }
function iso(i) { return dayDate(i).toISOString().split("T")[0]; }
function pctOf(dayData) {
  if(!dayData?.items) return 0;
  return Math.round(SCHEDULE.filter(s=>dayData.items[s.id]).length/SCHEDULE.length*100);
}
function load(k,fb) { try { const v=localStorage.getItem(k); return v?JSON.parse(v):fb; } catch { return fb; } }
function save(k,v) { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} }

// ─── Sub-components ──────────────────────────────────────────────────────────

function Arc({ pct, size=80, stroke=5 }) {
  const r = size/2 - stroke;
  const circ = 2*Math.PI*r;
  const off = circ*(1-pct/100);
  const color = pct===100?"#E8A020":pct>=60?"#4CAF7A":pct>=30?"#4A90D9":"#6B6762";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{transform:"rotate(-90deg)",flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg4)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={pct>0?color:"transparent"}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={off}
        style={{transition:"stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1),stroke 0.4s"}}/>
    </svg>
  );
}

function CheckItem({ item, done, onToggle }) {
  const blockColor = BLOCKS[item.block]?.color || "var(--gold)";
  return (
    <button onClick={() => onToggle(item.id)} style={{
      display:"flex", alignItems:"center", gap:10,
      padding:"10px 12px", borderRadius:8, textAlign:"left", width:"100%",
      background: done ? `${blockColor}10` : "var(--bg2)",
      border:`1px solid ${done ? blockColor+"40" : "var(--border)"}`,
      transition:"all 0.15s",
    }}>
      {/* Checkbox */}
      <div style={{
        width:18, height:18, borderRadius:5, flexShrink:0,
        border:`1.5px solid ${done?blockColor:"var(--border2)"}`,
        background:done?blockColor:"transparent",
        display:"flex", alignItems:"center", justifyContent:"center",
        transition:"all 0.15s",
      }}>
        {done && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none"
            style={{animation:"checkPop 0.2s ease"}}>
            <path d="M1 4L3.5 6.5L9 1" stroke="#0C0C0C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span style={{fontSize:15}}>{item.emoji}</span>
      <div style={{flex:1, minWidth:0}}>
        <div style={{
          fontSize:13, fontWeight:500, lineHeight:1.2,
          color:done?"var(--text)":"var(--text2)",
          transition:"color 0.15s",
        }}>{item.label}</div>
        {item.time && <div className="mono" style={{marginTop:1,opacity:0.6}}>{item.time}</div>}
      </div>
    </button>
  );
}

function TabBar({ active, onChange }) {
  const tabs = [
    {id:"oggi",    label:"Oggi"},
    {id:"griglia", label:"Mappa"},
    {id:"marco",   label:"Marco"},
  ];
  return (
    <div style={{display:"flex", borderTop:"1px solid var(--border)", background:"var(--bg)"}}>
      {tabs.map(t => (
        <button key={t.id} onClick={()=>onChange(t.id)} style={{
          flex:1, padding:"12px 0 10px",
          fontSize:11, fontWeight:600, letterSpacing:"0.06em",
          textTransform:"uppercase",
          color:active===t.id?"var(--gold)":"var(--text3)",
          borderTop:`2px solid ${active===t.id?"var(--gold)":"transparent"}`,
          transition:"color 0.15s, border-color 0.15s",
        }}>{t.label}</button>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const todayI = Math.max(0, Math.min(dayIdx(), TOTAL-1));

  const [theme, setTheme]     = useState(()=>load("sfida_theme","dark"));
  const [data, setData]       = useState(()=>load("sfida60_data",{}));
  const [selDay, setSelDay]   = useState(todayI);
  const [tab, setTab]         = useState("oggi");
  const [note, setNote]       = useState("");
  const [activity, setActivity] = useState("");
  const [msgs, setMsgs]       = useState([{role:"assistant",content:"Sono qui."}]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const chatRef = useRef(null);

  // Theme
  useEffect(()=>{ document.documentElement.setAttribute("data-theme",theme); save("sfida_theme",theme); },[theme]);

  // Persist data + sync to worker
  useEffect(()=>{ save("sfida60_data",data); },[data]);

  // Load note/activity when day changes
  useEffect(()=>{
    const k=`day_${selDay}`;
    setNote(data[k]?.note||"");
    setActivity(data[k]?.activity||"");
  },[selDay]);

  // Scroll chat
  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight; },[msgs]);

  // Try to load from worker on mount
  useEffect(()=>{
    fetch(`${WORKER}/data`).then(r=>r.json()).then(d=>{
      if(d&&Object.keys(d).length>0){
        setData(d); save("sfida60_data",d);
      }
    }).catch(()=>{});
  },[]);

  // Computed
  const dayKey  = `day_${selDay}`;
  const dayItems = data[dayKey]?.items||{};

  const pctOf2 = useCallback((i)=>{
    const items=data[`day_${i}`]?.items||{};
    return Math.round(SCHEDULE.filter(s=>items[s.id]).length/SCHEDULE.length*100);
  },[data]);

  const dayPct   = pctOf2(selDay);
  const totalDone = Array.from({length:TOTAL},(_,i)=>pctOf2(i)===100?1:0).reduce((a,b)=>a+b,0);
  const weekAvg  = Math.round(
    Array.from({length:Math.min(7,todayI+1)},(_,i)=>pctOf2(todayI-i)).reduce((a,b)=>a+b,0) /
    Math.min(7,todayI+1)
  );

  // Actions
  const toggle = (id) => {
    setData(prev=>{
      const next={...prev};
      if(!next[dayKey]) next[dayKey]={items:{}};
      if(!next[dayKey].items) next[dayKey].items={};
      next[dayKey]={...next[dayKey],items:{...next[dayKey].items,[id]:!next[dayKey].items[id]}};
      return next;
    });
  };

  const saveDay = () => {
    setData(prev=>({...prev,[dayKey]:{...prev[dayKey],note,activity}}));
  };

  const syncWorker = async() => {
    setSyncing(true);
    try {
      await fetch(`${WORKER}/sync`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
      setSyncDone(true);
      setTimeout(()=>setSyncDone(false),2000);
    } catch{}
    setSyncing(false);
  };

  const sendMsg = async() => {
    if(!input.trim()||loading) return;
    const userMsg=input.trim(); setInput("");
    setMsgs(prev=>[...prev,{role:"user",content:userMsg}]);
    setLoading(true);
    const done=SCHEDULE.filter(s=>dayItems[s.id]).map(s=>s.label);
    const ctx=`G${selDay+1}/60 · ${dayPct}% · Fatti: ${done.join(", ")||"—"} · Attività: ${activity||"—"}`;
    const history=[
      {role:"user",content:ctx},{role:"assistant",content:"Capito."},
      ...msgs.slice(1),{role:"user",content:userMsg}
    ];
    try {
      const r=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:MARCO_SYSTEM,messages:history})
      });
      const d=await r.json();
      setMsgs(prev=>[...prev,{role:"assistant",content:d.content?.[0]?.text||"…"}]);
    } catch { setMsgs(prev=>[...prev,{role:"assistant",content:"Errore connessione."}]); }
    setLoading(false);
  };

  // Render
  const isBeforeStart = dayIdx() < 0;

  return (
    <div style={{
      display:"flex", flexDirection:"column",
      height:"100dvh", maxWidth:430, margin:"0 auto",
      background:"var(--bg)", color:"var(--text)",
      position:"relative", overflow:"hidden",
    }}>

      {/* ── HEADER ── */}
      <header style={{
        padding:"16px 16px 12px",
        borderBottom:"1px solid var(--border)",
        flexShrink:0,
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",color:"var(--text3)",textTransform:"uppercase",marginBottom:3}}>
              Sfida 60 Giorni
            </div>
            <div style={{fontSize:20,fontWeight:700,color:"var(--text)",lineHeight:1.1}}>
              {isBeforeStart ? "Inizia lunedì" : `Giorno ${Math.max(0,dayIdx())+1}`}
              <span style={{fontSize:13,fontWeight:400,color:"var(--text3)",marginLeft:4}}>/{TOTAL}</span>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {/* Sync button */}
            <button onClick={syncWorker} style={{
              padding:"6px 10px", borderRadius:6,
              background:"var(--bg2)", border:"1px solid var(--border)",
              fontSize:11, color:syncDone?"var(--green)":syncing?"var(--text3)":"var(--text2)",
              fontWeight:500,
            }}>
              {syncDone?"✓":syncing?"⟳":"↑"}
            </button>
            {/* Theme */}
            <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} style={{
              width:32,height:32,borderRadius:8,
              background:"var(--bg2)",border:"1px solid var(--border)",
              fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",
            }}>
              {theme==="dark"?"☀️":"🌙"}
            </button>
          </div>
        </div>

        {/* Progress strip */}
        <div style={{marginTop:12,display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,height:3,background:"var(--bg4)",borderRadius:2,overflow:"hidden"}}>
            <div style={{
              height:"100%",
              width:`${(totalDone/TOTAL)*100}%`,
              background:"var(--gold)",
              borderRadius:2,
              transition:"width 0.6s cubic-bezier(.4,0,.2,1)",
            }}/>
          </div>
          <span className="mono" style={{flexShrink:0,color:"var(--gold)",fontSize:11}}>
            {totalDone}/{TOTAL}
          </span>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <main style={{flex:1,overflowY:"auto",paddingBottom:4}}>

        {/* ══ OGGI ══ */}
        {tab==="oggi" && (
          <div className="fade-up" style={{padding:"16px 16px 0"}}>

            {/* Day selector */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
              <button onClick={()=>setSelDay(d=>Math.max(0,d-1))} style={{
                width:32,height:32,borderRadius:8,
                background:"var(--bg2)",border:"1px solid var(--border)",
                fontSize:16,color:"var(--text2)",flexShrink:0,
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>‹</button>
              <div style={{flex:1,textAlign:"center"}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text)",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  {fmtLong(selDay)}
                  {selDay===todayI && (
                    <span style={{fontSize:10,fontWeight:600,background:"var(--gold)",color:"#0C0C0C",padding:"1px 6px",borderRadius:4,letterSpacing:"0.06em"}}>
                      OGGI
                    </span>
                  )}
                </div>
              </div>
              <button onClick={()=>setSelDay(d=>Math.min(TOTAL-1,d+1))} style={{
                width:32,height:32,borderRadius:8,
                background:"var(--bg2)",border:"1px solid var(--border)",
                fontSize:16,color:"var(--text2)",flexShrink:0,
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>›</button>
            </div>

            {/* Ring + stats */}
            <div style={{
              display:"flex",alignItems:"center",gap:16,
              padding:"16px",borderRadius:12,
              background:"var(--bg2)",border:"1px solid var(--border)",
              marginBottom:16,
            }}>
              <div style={{position:"relative",flexShrink:0}}>
                <Arc pct={dayPct} size={72} stroke={5}/>
                <div style={{
                  position:"absolute",inset:0,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:15,fontWeight:700,
                  color:dayPct===100?"var(--gold)":"var(--text)",
                }}>
                  {dayPct}%
                </div>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                  {[
                    {label:"Settimana",value:`${weekAvg}%`},
                    {label:"Completati",value:`${SCHEDULE.filter(s=>dayItems[s.id]).length}/${SCHEDULE.length}`},
                    {label:"Sfida",value:`${totalDone}gg`},
                  ].map(({label,value})=>(
                    <div key={label}>
                      <div className="label" style={{marginBottom:2}}>{label}</div>
                      <div style={{fontSize:16,fontWeight:700,color:"var(--text)"}}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Checklist by block */}
            {Object.entries(BLOCKS).map(([block,meta])=>{
              const items=SCHEDULE.filter(s=>s.block===block);
              const doneCnt=items.filter(s=>dayItems[s.id]).length;
              return (
                <div key={block} style={{marginBottom:12}}>
                  <div style={{
                    display:"flex",justifyContent:"space-between",alignItems:"center",
                    marginBottom:6,
                  }}>
                    <span style={{
                      fontSize:11,fontWeight:600,letterSpacing:"0.08em",
                      textTransform:"uppercase",color:meta.color,
                    }}>{meta.label}</span>
                    <span className="mono" style={{color:"var(--text3)"}}>
                      {doneCnt}/{items.length}
                    </span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {items.map(item=>(
                      <CheckItem key={item.id} item={item} done={!!dayItems[item.id]} onToggle={toggle}/>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Activity pills */}
            <div style={{marginTop:4,marginBottom:8}}>
              <div className="label" style={{marginBottom:8}}>Attività pomeriggio</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {ACTIVITIES.map(a=>(
                  <button key={a} onClick={()=>setActivity(x=>x===a?"":a)} style={{
                    padding:"6px 12px",borderRadius:20,fontSize:12,fontWeight:500,
                    background:activity===a?"var(--gold)":"var(--bg2)",
                    color:activity===a?"#0C0C0C":"var(--text2)",
                    border:`1px solid ${activity===a?"var(--gold)":"var(--border)"}`,
                    transition:"all 0.15s",
                  }}>{a}</button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div style={{marginBottom:16}}>
              <div className="label" style={{marginBottom:6}}>Note</div>
              <textarea value={note} onChange={e=>setNote(e.target.value)}
                placeholder="Annotazione del giorno…" rows={2}
                style={{
                  width:"100%",background:"var(--bg2)",border:"1px solid var(--border)",
                  borderRadius:8,color:"var(--text)",padding:"10px 12px",
                  fontSize:13,lineHeight:1.5,resize:"none",outline:"none",
                  transition:"border-color 0.15s",
                }}
                onFocus={e=>e.target.style.borderColor="var(--gold)"}
                onBlur={e=>e.target.style.borderColor="var(--border)"}
              />
              <button onClick={()=>{saveDay();syncWorker();}} style={{
                marginTop:6,padding:"7px 16px",
                background:"var(--gold)",color:"#0C0C0C",
                borderRadius:6,fontSize:12,fontWeight:600,
              }}>Salva</button>
            </div>
          </div>
        )}

        {/* ══ GRIGLIA ══ */}
        {tab==="griglia" && (
          <div className="fade-up" style={{padding:16}}>

            {/* Stats row */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
              {[
                {label:"Completi",  val:totalDone,   color:"var(--gold)"},
                {label:"Trascorsi", val:Math.min(todayI+1,60), color:"var(--text)"},
                {label:"Rimasti",   val:Math.max(0,59-todayI), color:"var(--text3)"},
              ].map(({label,val,color})=>(
                <div key={label} style={{
                  background:"var(--bg2)",border:"1px solid var(--border)",
                  borderRadius:10,padding:"12px 10px",textAlign:"center",
                }}>
                  <div style={{fontSize:22,fontWeight:700,color}}>{val}</div>
                  <div className="label" style={{marginTop:2}}>{label}</div>
                </div>
              ))}
            </div>

            {/* 60-day grid */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:3,marginBottom:12}}>
              {Array.from({length:TOTAL},(_,i)=>{
                const pct=pctOf2(i);
                const isToday=i===todayI, isSel=i===selDay, future=i>todayI;
                return (
                  <div key={i}
                    title={`G${i+1} · ${fmt(i)} · ${pct}%`}
                    onClick={()=>{setSelDay(i);setTab("oggi");}}
                    style={{
                      aspectRatio:"1",borderRadius:4,cursor:"pointer",
                      background:future?"var(--bg2)":pct===100?"var(--gold)":pct>0?`rgba(232,160,32,${0.08+pct/100*0.5})`:"var(--bg3)",
                      border:isSel?`2px solid var(--gold)`:isToday?`2px solid var(--blue)`:`1px solid var(--border)`,
                      transition:"transform 0.1s",
                    }}
                    onMouseEnter={e=>e.currentTarget.style.transform="scale(1.2)"}
                    onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:20}}>
              {[["var(--gold)","Completo"],["rgba(232,160,32,0.35)","Parziale"],["var(--bg3)","Vuoto"],["var(--blue)","Oggi",true]].map(([c,l,border])=>(
                <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
                  <div style={{width:8,height:8,borderRadius:2,background:c,border:border?"2px solid var(--blue)":"none"}}/>
                  <span className="label">{l}</span>
                </div>
              ))}
            </div>

            {/* Block performance bars */}
            <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:10,padding:14}}>
              <div className="label" style={{marginBottom:12}}>Performance per blocco</div>
              {Object.entries(BLOCKS).map(([block,meta])=>{
                const blockItems=SCHEDULE.filter(s=>s.block===block);
                const total=Array.from({length:todayI+1},(_,i)=>{
                  const items=data[`day_${i}`]?.items||{};
                  return blockItems.filter(s=>items[s.id]).length;
                }).reduce((a,b)=>a+b,0);
                const max=(todayI+1)*blockItems.length;
                const pct=max>0?Math.round(total/max*100):0;
                return (
                  <div key={block} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:12,fontWeight:500,color:"var(--text2)"}}>{meta.label}</span>
                      <span className="mono" style={{color:meta.color}}>{pct}%</span>
                    </div>
                    <div style={{height:3,background:"var(--bg4)",borderRadius:2,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:meta.color,borderRadius:2,transition:"width 0.5s"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ MARCO ══ */}
        {tab==="marco" && (
          <div className="fade-up" style={{
            display:"flex",flexDirection:"column",
            height:"calc(100dvh - 120px)",
            padding:"12px 16px 0",
          }}>
            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div>
                <div style={{fontSize:13,fontWeight:600}}>Marco</div>
                <div className="label">G{selDay+1}/60 · {fmt(selDay)}</div>
              </div>
              <button onClick={()=>setMsgs([{role:"assistant",content:"Sono qui."}])} style={{
                fontSize:11,fontWeight:500,color:"var(--text3)",
                padding:"4px 8px",borderRadius:6,
                background:"var(--bg2)",border:"1px solid var(--border)",
              }}>Nuova</button>
            </div>

            {/* Messages */}
            <div ref={chatRef} style={{
              flex:1,overflowY:"auto",
              display:"flex",flexDirection:"column",gap:8,paddingBottom:8,
            }}>
              {msgs.map((msg,i)=>(
                <div key={i} style={{
                  alignSelf:msg.role==="user"?"flex-end":"flex-start",
                  maxWidth:"85%",
                  animation:"fadeUp 0.2s ease",
                }}>
                  {msg.role==="assistant" && (
                    <div className="label" style={{color:"var(--gold)",marginBottom:3,paddingLeft:2}}>Marco</div>
                  )}
                  <div style={{
                    padding:"10px 13px",
                    background:msg.role==="user"?"var(--gold-dim)":"var(--bg2)",
                    border:`1px solid ${msg.role==="user"?"var(--gold-muted)":"var(--border)"}`,
                    borderRadius:msg.role==="user"?"12px 12px 3px 12px":"12px 12px 12px 3px",
                    fontSize:13,lineHeight:1.55,color:"var(--text)",
                    whiteSpace:"pre-wrap",
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{alignSelf:"flex-start",padding:"12px 14px",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:"12px 12px 12px 3px"}}>
                  <span style={{letterSpacing:2,color:"var(--gold)",animation:"pulse 1.2s infinite"}}>···</span>
                </div>
              )}
            </div>

            {/* Quick prompts */}
            <div style={{display:"flex",gap:6,paddingBottom:6,flexWrap:"wrap"}}>
              {["Come va?","Motivami","Settimana","Domani"].map(p=>(
                <button key={p} onClick={()=>setInput(p)} style={{
                  padding:"5px 10px",borderRadius:16,fontSize:11,fontWeight:500,
                  background:"var(--bg2)",border:"1px solid var(--border)",color:"var(--text3)",
                }}>{p}</button>
              ))}
            </div>

            {/* Input */}
            <div style={{display:"flex",gap:8,paddingBottom:12}}>
              <input value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendMsg()}
                placeholder="Scrivi a Marco…"
                style={{
                  flex:1,background:"var(--bg2)",border:"1px solid var(--border)",
                  borderRadius:10,color:"var(--text)",padding:"10px 13px",
                  fontSize:13,outline:"none",transition:"border-color 0.15s",
                }}
                onFocus={e=>e.target.style.borderColor="var(--gold)"}
                onBlur={e=>e.target.style.borderColor="var(--border)"}
              />
              <button onClick={sendMsg} disabled={loading} style={{
                padding:"10px 16px",
                background:loading?"var(--bg3)":"var(--gold)",
                color:"#0C0C0C",borderRadius:10,
                fontSize:16,fontWeight:600,
                opacity:loading?0.5:1,flexShrink:0,
              }}>→</button>
            </div>
          </div>
        )}
      </main>

      {/* ── TAB BAR ── */}
      <TabBar active={tab} onChange={setTab}/>
    </div>
  );
}
