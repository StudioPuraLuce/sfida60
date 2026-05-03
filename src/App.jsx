import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "./index.css";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const SCHEDULE = [
  { id:"sveglia",    label:"Sveglia",      time:"06:00", emoji:"⏰", block:"mattina"    },
  { id:"flessioni",  label:"Flessioni",    time:"",      emoji:"💪", block:"mattina"    },
  { id:"preghiere",  label:"Preghiere",    time:"",      emoji:"🙏", block:"mattina"    },
  { id:"caffe",      label:"Caffè",        time:"",      emoji:"☕", block:"mattina"    },
  { id:"corda",      label:"Corda",        time:"",      emoji:"🪢", block:"mattina"    },
  { id:"addominali", label:"Addominali",   time:"",      emoji:"🔥", block:"mattina"    },
  { id:"ballo",      label:"Ballo",        time:"",      emoji:"🕺", block:"mattina"    },
  { id:"autobus",    label:"Autobus",      time:"07:00", emoji:"🚌", block:"logistica"  },
  { id:"messa",      label:"Messa",        time:"07:30", emoji:"⛪", block:"logistica"  },
  { id:"colazione",  label:"Colazione",    time:"08:00", emoji:"🥐", block:"logistica"  },
  { id:"lavoro",     label:"Lavoro",       time:"09–14", emoji:"📚", block:"logistica"  },
  { id:"pranzo",     label:"Pranzo",       time:"15:00", emoji:"🥗", block:"pomeriggio" },
  { id:"attivita",   label:"Attività",     time:"",      emoji:"🌊", block:"pomeriggio" },
  { id:"cena",       label:"Cena",         time:"20:30", emoji:"🍎", block:"sera"       },
  { id:"noscreen",   label:"No Screen",    time:"",      emoji:"🚫", block:"sera"       },
  { id:"compieta",   label:"Compieta",     time:"",      emoji:"🙏", block:"sera"       },
  { id:"letto",      label:"Letto",        time:"21:30", emoji:"😴", block:"sera"       },
];

const BLOCKS = {
  mattina:    { label:"Boot",       short:"B", color:"#F0A500", items: SCHEDULE.filter(s=>s.block==="mattina")    },
  logistica:  { label:"Logistica",  short:"L", color:"#3DD68C", items: SCHEDULE.filter(s=>s.block==="logistica")  },
  pomeriggio: { label:"Pomeriggio", short:"P", color:"#5B9CF6", items: SCHEDULE.filter(s=>s.block==="pomeriggio") },
  sera:       { label:"Sera",       short:"S", color:"#C084FC", items: SCHEDULE.filter(s=>s.block==="sera")       },
};

const ACTIVITIES = [
  { id:"palestra", label:"Palestra",  emoji:"🏋️" },
  { id:"mare",     label:"Mare",      emoji:"🌊" },
  { id:"chiese",   label:"Chiese",    emoji:"⛪" },
  { id:"flair",    label:"Flair",     emoji:"🎸" },
  { id:"riposo",   label:"Riposo",    emoji:"🛌" },
];

const START = new Date("2026-05-04T00:00:00");
const TOTAL = 60;
const WORKER = "https://sfida60-motivatore.soliwkr.workers.dev";
const TG_URL = "https://t.me/sfida60_bot";
const DOC_URL = "https://docs.google.com/document/d/1l66Wo8w18QTg7avNky8rb5iE1FKkcJZz8lyCuGiIkiU/edit";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const dayIdx  = (d=new Date()) => { const a=new Date(d); a.setHours(0,0,0,0); const b=new Date(START); b.setHours(0,0,0,0); return Math.floor((a-b)/86400000); };
const dayDate = i => { const d=new Date(START); d.setDate(d.getDate()+i); return d; };
const fmt     = i => dayDate(i).toLocaleDateString("it-IT",{weekday:"short",day:"numeric",month:"short"});
const fmtLong = i => dayDate(i).toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"});
const iso     = i => dayDate(i).toISOString().split("T")[0];
const pctOf   = dd => { if(!dd?.items) return 0; return Math.round(SCHEDULE.filter(s=>dd.items[s.id]).length/SCHEDULE.length*100); };
const load    = (k,fb) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):fb; } catch { return fb; } };
const save    = (k,v)  => { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} };

// ═══════════════════════════════════════════════════════════════════
// RING COMPONENT
// ═══════════════════════════════════════════════════════════════════

function Ring({ pct, size=120, stroke=7, children }) {
  const r = size/2 - stroke;
  const circ = 2*Math.PI*r;
  const off = circ*(1-pct/100);
  const color = pct===100?"#F0A500":pct>=70?"#3DD68C":pct>=40?"#5B9CF6":"#3A3838";
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{transform:"rotate(-90deg)",position:"absolute",inset:0}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg4)" strokeWidth={stroke}/>
        {pct>0 && (
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
            strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={off}
            style={{transition:"stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1), stroke 0.4s"}}/>
        )}
      </svg>
      <div style={{
        position:"absolute",inset:0,
        display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",
      }}>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// RADAR CHART
// ═══════════════════════════════════════════════════════════════════

function RadarChart({ data, size=180 }) {
  const blocks = Object.entries(BLOCKS);
  const n = blocks.length; // 4
  const cx = size/2, cy = size/2;
  const maxR = size/2 - 24;

  const angles = blocks.map((_, i) => ((i/n)*2*Math.PI) - Math.PI/2);

  const point = (r, angle) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid */}
      {gridLevels.map(level => {
        const pts = angles.map(a => point(maxR*level, a));
        const d = pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")+"Z";
        return <path key={level} d={d} fill="none" stroke="var(--border)" strokeWidth="1"/>;
      })}
      {/* Axes */}
      {angles.map((a,i)=>{
        const p = point(maxR, a);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth="1"/>;
      })}
      {/* Data polygon */}
      {(() => {
        const pts = blocks.map(([block,meta], i) => {
          const v = data[block] || 0;
          return point(maxR*(v/100), angles[i]);
        });
        const d = pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")+"Z";
        return (
          <>
            <path d={d} fill="rgba(240,165,0,0.15)" stroke="#F0A500" strokeWidth="1.5" strokeLinejoin="round"/>
            {pts.map((p,i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill={blocks[i][1].color}/>
            ))}
          </>
        );
      })()}
      {/* Labels */}
      {blocks.map(([block,meta],i) => {
        const a = angles[i];
        const lp = point(maxR + 16, a);
        return (
          <text key={block} x={lp.x} y={lp.y}
            textAnchor="middle" dominantBaseline="middle"
            fill={meta.color} fontSize="10" fontFamily="'Outfit',sans-serif" fontWeight="600">
            {meta.short}
          </text>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════

export default function App() {
  const todayI = Math.max(0, Math.min(dayIdx(), TOTAL-1));

  const [theme, setTheme]   = useState(()=>load("sfida_theme","dark"));
  const [data, setData]     = useState(()=>load("sfida60_data",{}));
  const [selDay, setSelDay] = useState(todayI);
  const [tab, setTab]       = useState("oggi");
  const [note, setNote]     = useState("");
  const [activity, setActivity] = useState("");
  const [syncing, setSyncing]   = useState(false);
  const [syncOk, setSyncOk]     = useState(false);

  useEffect(()=>{ document.documentElement.setAttribute("data-theme",theme); save("sfida_theme",theme); },[theme]);
  useEffect(()=>{ save("sfida60_data",data); },[data]);
  useEffect(()=>{
    const k=`day_${selDay}`;
    setNote(data[k]?.note||"");
    setActivity(data[k]?.activity||"");
  },[selDay, data]);

  // Load from worker
  useEffect(()=>{
    fetch(`${WORKER}/data`).then(r=>r.json()).then(d=>{
      if(d&&Object.keys(d).length>0){ setData(d); save("sfida60_data",d); }
    }).catch(()=>{});
  },[]);

  // Computed
  const dayKey   = `day_${selDay}`;
  const dayItems = data[dayKey]?.items || {};

  const pct2 = useCallback(i=>{
    const it=data[`day_${i}`]?.items||{};
    return Math.round(SCHEDULE.filter(s=>it[s.id]).length/SCHEDULE.length*100);
  },[data]);

  const dayPct    = pct2(selDay);
  const todayPct  = pct2(todayI);
  const totalDone = useMemo(()=>Array.from({length:TOTAL},(_,i)=>pct2(i)===100?1:0).reduce((a,b)=>a+b,0),[data]);

  // Streak
  const streak = useMemo(()=>{
    let s=0;
    for(let i=todayI;i>=0;i--){
      if(pct2(i)===100) s++; else break;
    }
    return s;
  },[data, todayI]);

  // Best streak
  const bestStreak = useMemo(()=>{
    let best=0, cur=0;
    for(let i=0;i<=todayI;i++){
      if(pct2(i)===100){ cur++; best=Math.max(best,cur); } else cur=0;
    }
    return best;
  },[data, todayI]);

  // Week avg
  const weekAvg = useMemo(()=>{
    const days=Math.min(7,todayI+1);
    if(!days) return 0;
    return Math.round(Array.from({length:days},(_,i)=>pct2(todayI-i)).reduce((a,b)=>a+b,0)/days);
  },[data, todayI]);

  // Block performance for radar
  const blockPerf = useMemo(()=>{
    const out={};
    for(const [block,meta] of Object.entries(BLOCKS)){
      const total=Array.from({length:todayI+1},(_,i)=>{
        const it=data[`day_${i}`]?.items||{};
        return meta.items.filter(s=>it[s.id]).length;
      }).reduce((a,b)=>a+b,0);
      const max=(todayI+1)*meta.items.length;
      out[block]=max>0?Math.round(total/max*100):0;
    }
    return out;
  },[data, todayI]);

  // Best/worst day
  const bestDay = useMemo(()=>{
    let best={i:-1,pct:0};
    for(let i=0;i<=todayI;i++){ const p=pct2(i); if(p>best.pct) best={i,pct:p}; }
    return best;
  },[data, todayI]);

  // Toggle item
  const toggle = useCallback(id=>{
    setData(prev=>{
      const next={...prev};
      if(!next[dayKey]) next[dayKey]={items:{}};
      if(!next[dayKey].items) next[dayKey].items={};
      next[dayKey]={...next[dayKey],items:{...next[dayKey].items,[id]:!next[dayKey].items[id]}};
      return next;
    });
  },[dayKey]);

  const saveDay = ()=>{
    setData(prev=>({...prev,[dayKey]:{...prev[dayKey],note,activity}}));
  };

  const sync = async()=>{
    setSyncing(true);
    try {
      await fetch(`${WORKER}/sync`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
      setSyncOk(true); setTimeout(()=>setSyncOk(false),2000);
    } catch{}
    setSyncing(false);
  };

  const isBeforeStart = dayIdx() < 0;

  // ─── RENDER ───────────────────────────────────────────────────────

  return (
    <div style={{
      display:"flex",flexDirection:"column",height:"100dvh",
      maxWidth:430,margin:"0 auto",
      background:"var(--bg)",color:"var(--text)",
      overflow:"hidden",position:"relative",
    }}>

      {/* ══ HEADER ══ */}
      <header style={{
        padding:`calc(var(--safe-top) + 12px) 18px 12px`,
        borderBottom:"1px solid var(--border)",
        flexShrink:0,
        background:"var(--bg)",
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          {/* Left: branding */}
          <div>
            <div style={{
              fontFamily:"var(--font-display)",
              fontSize:28, letterSpacing:"0.04em",
              lineHeight:1, color:"var(--text)",
            }}>
              SFIDA<span style={{color:"var(--gold)"}}>60</span>
            </div>
            <div style={{
              fontSize:11,fontWeight:500,color:"var(--text3)",
              letterSpacing:"0.08em",marginTop:1,
            }}>
              {isBeforeStart
                ? "INIZIA LUN 4 MAGGIO"
                : `GIORNO ${Math.max(0,dayIdx())+1} · ${fmt(Math.max(0,dayIdx())).toUpperCase()}`}
            </div>
          </div>

          {/* Right: controls */}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={sync} style={{
              width:32,height:32,borderRadius:8,
              background:"var(--bg3)",border:"1px solid var(--border2)",
              fontSize:13,color:syncOk?"var(--green)":syncing?"var(--text3)":"var(--text2)",
              display:"flex",alignItems:"center",justifyContent:"center",
              transition:"color 0.2s",
            }}>
              {syncOk?"✓":syncing?"⟳":"⇅"}
            </button>
            <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} style={{
              width:32,height:32,borderRadius:8,
              background:"var(--bg3)",border:"1px solid var(--border2)",
              fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",
            }}>
              {theme==="dark"?"◐":"◑"}
            </button>
          </div>
        </div>

        {/* Global progress bar */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10}}>
          <div style={{
            flex:1,height:2,background:"var(--bg4)",
            borderRadius:1,overflow:"hidden",
          }}>
            <div style={{
              height:"100%",
              width:`${(totalDone/TOTAL)*100}%`,
              background:"var(--gold)",
              transition:"width 0.8s cubic-bezier(.4,0,.2,1)",
            }}/>
          </div>
          <span style={{
            fontFamily:"var(--font-display)",
            fontSize:13,color:"var(--gold)",letterSpacing:"0.05em",flexShrink:0,
          }}>
            {totalDone}/{TOTAL}
          </span>
        </div>
      </header>

      {/* ══ CONTENT ══ */}
      <main style={{flex:1,overflowY:"auto",overscrollBehavior:"contain"}}>

        {/* ════ TAB: OGGI ════ */}
        {tab==="oggi" && (
          <div style={{padding:"16px 18px 100px"}}>

            {/* Day nav */}
            <div style={{
              display:"flex",alignItems:"center",gap:0,
              marginBottom:20,
            }}>
              <button onClick={()=>setSelDay(d=>Math.max(0,d-1))} style={{
                width:36,height:36,borderRadius:"8px 0 0 8px",
                background:"var(--bg3)",border:"1px solid var(--border2)",
                color:"var(--text2)",fontSize:18,
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>‹</button>
              <div style={{
                flex:1,textAlign:"center",
                padding:"8px 12px",
                background:"var(--bg2)",
                borderTop:"1px solid var(--border2)",
                borderBottom:"1px solid var(--border2)",
              }}>
                <span style={{fontSize:12,fontWeight:600,color:"var(--text2)",letterSpacing:"0.06em"}}>
                  {fmtLong(selDay).toUpperCase()}
                </span>
                {selDay===todayI && (
                  <span style={{
                    marginLeft:8,fontSize:9,fontWeight:700,
                    background:"var(--gold)",color:"#0A0A0A",
                    padding:"2px 5px",borderRadius:3,letterSpacing:"0.1em",
                  }}>OGGI</span>
                )}
              </div>
              <button onClick={()=>setSelDay(d=>Math.min(TOTAL-1,d+1))} style={{
                width:36,height:36,borderRadius:"0 8px 8px 0",
                background:"var(--bg3)",border:"1px solid var(--border2)",
                color:"var(--text2)",fontSize:18,
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>›</button>
            </div>

            {/* Hero ring + stats */}
            <div style={{
              display:"flex",alignItems:"center",gap:20,
              padding:"20px",borderRadius:14,
              background:"var(--bg2)",border:"1px solid var(--border)",
              marginBottom:20,
            }}>
              <Ring pct={dayPct} size={100} stroke={7}>
                <div style={{
                  fontFamily:"var(--font-display)",
                  fontSize:30,color:dayPct===100?"var(--gold)":dayPct>=60?"var(--green)":"var(--text)",
                  lineHeight:1,letterSpacing:"0.02em",
                }}>
                  {dayPct}
                </div>
                <div style={{fontSize:10,fontWeight:500,color:"var(--text3)"}}>%</div>
              </Ring>
              <div style={{flex:1}}>
                {[
                  {label:"COMPLETATI",  val:`${SCHEDULE.filter(s=>dayItems[s.id]).length}/${SCHEDULE.length}`,  color:"var(--text)"},
                  {label:"SETTIMANA",   val:`${weekAvg}%`,   color:"var(--blue)"},
                  {label:"STREAK",      val:`${streak}gg`,   color:streak>0?"var(--green)":"var(--text3)"},
                ].map(({label,val,color},i)=>(
                  <div key={label} style={{
                    display:"flex",justifyContent:"space-between",alignItems:"baseline",
                    padding:"4px 0",
                    borderBottom:i<2?"1px solid var(--border)":"none",
                  }}>
                    <span style={{fontSize:9,fontWeight:600,color:"var(--text3)",letterSpacing:"0.1em"}}>{label}</span>
                    <span style={{fontFamily:"var(--font-display)",fontSize:20,color,letterSpacing:"0.04em"}}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist */}
            {Object.entries(BLOCKS).map(([block,meta],bi)=>{
              const items = meta.items;
              const doneCnt = items.filter(s=>dayItems[s.id]).length;
              const allDone = doneCnt===items.length;
              return (
                <div key={block} style={{marginBottom:16}} className={`fade-up stagger-${bi+1}`}>
                  {/* Block header */}
                  <div style={{
                    display:"flex",alignItems:"center",justifyContent:"space-between",
                    marginBottom:6,
                  }}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{
                        width:3,height:14,borderRadius:2,background:meta.color,flexShrink:0,
                      }}/>
                      <span style={{
                        fontFamily:"var(--font-display)",
                        fontSize:15,letterSpacing:"0.06em",color:meta.color,
                      }}>{meta.label.toUpperCase()}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{
                        width:40,height:2,background:"var(--bg4)",borderRadius:1,overflow:"hidden",
                      }}>
                        <div style={{height:"100%",width:`${doneCnt/items.length*100}%`,background:meta.color,transition:"width 0.4s"}}/>
                      </div>
                      <span style={{fontSize:10,fontWeight:600,color:"var(--text3)"}}>
                        {doneCnt}/{items.length}
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  <div style={{display:"flex",flexDirection:"column",gap:3}}>
                    {items.map(item=>{
                      const done=!!dayItems[item.id];
                      return (
                        <button key={item.id} onClick={()=>toggle(item.id)} style={{
                          display:"flex",alignItems:"center",gap:11,
                          padding:"10px 12px",borderRadius:8,textAlign:"left",
                          background:done?`${meta.color}0D`:"var(--bg2)",
                          border:`1px solid ${done?meta.color+"30":"var(--border)"}`,
                          transition:"all 0.15s ease",
                          width:"100%",
                        }}>
                          {/* Checkbox */}
                          <div style={{
                            width:20,height:20,borderRadius:5,flexShrink:0,
                            border:`1.5px solid ${done?meta.color:"var(--border2)"}`,
                            background:done?meta.color:"transparent",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            transition:"all 0.15s",
                          }}>
                            {done && (
                              <svg width="11" height="9" viewBox="0 0 11 9" fill="none"
                                style={{animation:"checkIn 0.2s ease both"}}>
                                <path d="M1.5 4.5L4 7L9.5 1.5" stroke="#0A0A0A"
                                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <span style={{fontSize:16,flexShrink:0}}>{item.emoji}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <span style={{
                              fontSize:13,fontWeight:500,
                              color:done?"var(--text)":"var(--text2)",
                              transition:"color 0.15s",
                            }}>{item.label}</span>
                            {item.time && (
                              <span style={{
                                marginLeft:6,fontSize:11,
                                fontFamily:"'Outfit',monospace",fontWeight:300,
                                color:"var(--text3)",
                              }}>{item.time}</span>
                            )}
                          </div>
                          {done && (
                            <div style={{
                              width:5,height:5,borderRadius:"50%",
                              background:meta.color,flexShrink:0,
                              animation:"fadeIn 0.2s ease",
                            }}/>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Activity */}
            <div style={{marginTop:4,marginBottom:14}}>
              <div style={{
                fontSize:9,fontWeight:700,letterSpacing:"0.12em",
                color:"var(--text3)",marginBottom:8,
              }}>ATTIVITÀ POMERIGGIO</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {ACTIVITIES.map(a=>{
                  const sel=activity===`${a.emoji} ${a.label}`;
                  return (
                    <button key={a.id}
                      onClick={()=>setActivity(x=>x===`${a.emoji} ${a.label}`?"":`${a.emoji} ${a.label}`)}
                      style={{
                        padding:"7px 12px",borderRadius:20,
                        fontSize:12,fontWeight:500,
                        background:sel?"var(--gold)":"var(--bg2)",
                        color:sel?"#0A0A0A":"var(--text2)",
                        border:`1px solid ${sel?"var(--gold)":"var(--border2)"}`,
                        transition:"all 0.15s",
                      }}>
                      {a.emoji} {a.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Note */}
            <div style={{marginBottom:8}}>
              <div style={{
                fontSize:9,fontWeight:700,letterSpacing:"0.12em",
                color:"var(--text3)",marginBottom:6,
              }}>NOTE</div>
              <textarea value={note} onChange={e=>setNote(e.target.value)}
                placeholder="Annotazione del giorno…" rows={2}
                style={{
                  width:"100%",background:"var(--bg2)",
                  border:"1px solid var(--border)",borderRadius:8,
                  color:"var(--text)",padding:"10px 12px",
                  fontSize:13,lineHeight:1.5,
                  resize:"none",outline:"none",
                  transition:"border-color 0.15s",
                }}
                onFocus={e=>e.target.style.borderColor="var(--gold)"}
                onBlur={e=>e.target.style.borderColor="var(--border)"}
              />
            </div>
            <button onClick={()=>{saveDay();sync();}} style={{
              padding:"9px 20px",
              background:"var(--gold)",color:"#0A0A0A",
              borderRadius:8,fontSize:12,fontWeight:700,
              letterSpacing:"0.06em",
            }}>SALVA</button>
          </div>
        )}

        {/* ════ TAB: MAPPA ════ */}
        {tab==="mappa" && (
          <div style={{padding:"16px 18px 100px"}} className="fade-up">

            {/* 3 stat cards */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
              {[
                {label:"COMPLETI",  val:totalDone,               color:"var(--gold)"},
                {label:"STREAK",    val:`${streak}`,             color:streak>0?"var(--green)":"var(--text3)", suffix:"gg"},
                {label:"RIMASTI",   val:Math.max(0,59-todayI),   color:"var(--text2)"},
              ].map(({label,val,color,suffix})=>(
                <div key={label} style={{
                  background:"var(--bg2)",border:"1px solid var(--border)",
                  borderRadius:10,padding:"12px 10px",textAlign:"center",
                }}>
                  <div style={{
                    fontFamily:"var(--font-display)",
                    fontSize:26,color,letterSpacing:"0.04em",lineHeight:1,
                  }}>
                    {val}{suffix&&<span style={{fontSize:14}}>{suffix}</span>}
                  </div>
                  <div style={{
                    fontSize:9,fontWeight:700,letterSpacing:"0.1em",
                    color:"var(--text3)",marginTop:4,
                  }}>{label}</div>
                </div>
              ))}
            </div>

            {/* 60-day grid */}
            <div style={{
              background:"var(--bg2)",border:"1px solid var(--border)",
              borderRadius:12,padding:14,marginBottom:12,
            }}>
              <div style={{
                fontSize:9,fontWeight:700,letterSpacing:"0.12em",
                color:"var(--text3)",marginBottom:10,
              }}>60 GIORNI</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:3}}>
                {Array.from({length:TOTAL},(_,i)=>{
                  const p=pct2(i);
                  const isToday=i===todayI, isSel=i===selDay, future=i>todayI;
                  return (
                    <div key={i}
                      title={`G${i+1} · ${fmt(i)} · ${p}%`}
                      onClick={()=>{setSelDay(i);setTab("oggi");}}
                      style={{
                        aspectRatio:"1",borderRadius:3,cursor:"pointer",
                        background:future?"var(--bg3)":p===100?"var(--gold)":p>0?`rgba(240,165,0,${0.07+p/100*0.45})`:"var(--bg4)",
                        border:isSel?`2px solid var(--gold)`:isToday?`1.5px solid var(--blue)`:`1px solid transparent`,
                        transition:"transform 0.08s,opacity 0.1s",
                        opacity:future?0.3:1,
                      }}
                      onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.3)";e.currentTarget.style.zIndex=10;}}
                      onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.zIndex=0;}}
                    />
                  );
                })}
              </div>
              {/* Legend */}
              <div style={{display:"flex",gap:10,marginTop:10}}>
                {[
                  ["var(--gold)","100%"],
                  ["rgba(240,165,0,0.3)","parz."],
                  ["var(--bg4)","0%"],
                ].map(([c,l])=>(
                  <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:7,height:7,borderRadius:1,background:c}}/>
                    <span style={{fontSize:9,fontWeight:600,color:"var(--text3)",letterSpacing:"0.06em"}}>{l.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Week bars */}
            <div style={{
              background:"var(--bg2)",border:"1px solid var(--border)",
              borderRadius:12,padding:14,marginBottom:12,
            }}>
              <div style={{
                fontSize:9,fontWeight:700,letterSpacing:"0.12em",
                color:"var(--text3)",marginBottom:12,
              }}>ULTIMI 7 GIORNI</div>
              <div style={{display:"flex",gap:4,alignItems:"flex-end",height:60}}>
                {Array.from({length:7},(_,i)=>{
                  const di=todayI-6+i;
                  if(di<0) return <div key={i} style={{flex:1}}/>;
                  const p=pct2(di);
                  const isT=di===todayI;
                  return (
                    <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                      <div style={{
                        width:"100%",borderRadius:3,
                        height:`${Math.max(p*0.54,2)}px`,
                        background:isT?"var(--gold)":p===100?"var(--green)":"var(--bg4)",
                        minHeight:2,
                        transition:"height 0.5s cubic-bezier(.4,0,.2,1)",
                        opacity:p===0?0.3:1,
                      }}/>
                      <span style={{
                        fontSize:9,fontWeight:600,
                        color:isT?"var(--gold)":"var(--text3)",
                      }}>
                        {dayDate(di).toLocaleDateString("it-IT",{weekday:"narrow"})}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Block performance */}
            <div style={{
              background:"var(--bg2)",border:"1px solid var(--border)",
              borderRadius:12,padding:14,
            }}>
              <div style={{
                fontSize:9,fontWeight:700,letterSpacing:"0.12em",
                color:"var(--text3)",marginBottom:12,
              }}>PERFORMANCE PER BLOCCO</div>
              {Object.entries(BLOCKS).map(([block,meta])=>{
                const p=blockPerf[block]||0;
                return (
                  <div key={block} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{width:6,height:6,borderRadius:1,background:meta.color}}/>
                        <span style={{fontSize:11,fontWeight:600,color:"var(--text2)"}}>{meta.label}</span>
                      </div>
                      <span style={{
                        fontFamily:"var(--font-display)",
                        fontSize:16,color:meta.color,letterSpacing:"0.04em",
                      }}>{p}%</span>
                    </div>
                    <div style={{height:3,background:"var(--bg4)",borderRadius:2,overflow:"hidden"}}>
                      <div style={{
                        height:"100%",width:`${p}%`,background:meta.color,
                        borderRadius:2,transition:"width 0.6s cubic-bezier(.4,0,.2,1)",
                      }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════ TAB: STATS ════ */}
        {tab==="stats" && (
          <div style={{padding:"16px 18px 100px"}} className="fade-up">

            {/* Big numbers row */}
            <div style={{
              display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12,
            }}>
              {[
                {label:"GIORNI COMPLETI",   val:totalDone,   sub:`su ${todayI+1} trascorsi`,  color:"var(--gold)"},
                {label:"STREAK CORRENTE",   val:streak,      sub:"giorni consecutivi",         color:streak>0?"var(--green)":"var(--text3)"},
                {label:"MIGLIOR STREAK",    val:bestStreak,  sub:"giorni di fila",             color:"var(--blue)"},
                {label:"MEDIA SETTIMANA",   val:`${weekAvg}%`, sub:"ultimi 7 giorni",          color:"var(--text)"},
              ].map(({label,val,sub,color})=>(
                <div key={label} style={{
                  background:"var(--bg2)",border:"1px solid var(--border)",
                  borderRadius:12,padding:"14px 14px",
                }}>
                  <div style={{
                    fontSize:9,fontWeight:700,letterSpacing:"0.1em",
                    color:"var(--text3)",marginBottom:6,
                  }}>{label}</div>
                  <div style={{
                    fontFamily:"var(--font-display)",
                    fontSize:36,color,letterSpacing:"0.03em",lineHeight:1,
                  }}>{val}</div>
                  <div style={{fontSize:10,color:"var(--text3)",marginTop:4}}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Radar */}
            <div style={{
              background:"var(--bg2)",border:"1px solid var(--border)",
              borderRadius:12,padding:14,marginBottom:12,
              display:"flex",flexDirection:"column",alignItems:"center",
            }}>
              <div style={{
                fontSize:9,fontWeight:700,letterSpacing:"0.12em",
                color:"var(--text3)",marginBottom:12,alignSelf:"flex-start",
              }}>RADAR BLOCCHI</div>
              <RadarChart data={blockPerf} size={180}/>
              <div style={{display:"flex",gap:12,marginTop:8,flexWrap:"wrap",justifyContent:"center"}}>
                {Object.entries(BLOCKS).map(([block,meta])=>(
                  <div key={block} style={{display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:6,height:6,borderRadius:1,background:meta.color}}/>
                    <span style={{fontSize:10,fontWeight:600,color:meta.color}}>{meta.short}</span>
                    <span style={{fontSize:10,color:"var(--text3)"}}>{blockPerf[block]||0}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Miglior giorno */}
            {bestDay.i>=0 && (
              <div style={{
                background:"var(--bg2)",border:"1px solid var(--border)",
                borderRadius:12,padding:14,marginBottom:12,
                display:"flex",alignItems:"center",gap:14,
              }}>
                <div style={{
                  fontFamily:"var(--font-display)",
                  fontSize:42,color:"var(--gold)",letterSpacing:"0.03em",flexShrink:0,
                }}>G{bestDay.i+1}</div>
                <div>
                  <div style={{
                    fontSize:9,fontWeight:700,letterSpacing:"0.1em",
                    color:"var(--text3)",marginBottom:4,
                  }}>MIGLIOR GIORNO</div>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>
                    {fmtLong(bestDay.i)}
                  </div>
                  <div style={{fontSize:11,color:"var(--gold)",fontWeight:600,marginTop:2}}>
                    {bestDay.pct}% completato
                  </div>
                </div>
              </div>
            )}

            {/* Links */}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{
                fontSize:9,fontWeight:700,letterSpacing:"0.12em",
                color:"var(--text3)",marginBottom:2,
              }}>COLLEGAMENTI</div>
              {[
                {label:"Dossier su Google Docs",  icon:"📄",  url:DOC_URL,  color:"var(--blue)"},
                {label:"Marco su Telegram",       icon:"✈️",  url:TG_URL,   color:"var(--green)"},
              ].map(({label,icon,url,color})=>(
                <a key={label} href={url} target="_blank" rel="noopener noreferrer" style={{
                  display:"flex",alignItems:"center",gap:12,
                  padding:"12px 14px",borderRadius:10,
                  background:"var(--bg2)",border:"1px solid var(--border)",
                  textDecoration:"none",
                  transition:"border-color 0.15s",
                }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=color}
                onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}
                >
                  <span style={{fontSize:20}}>{icon}</span>
                  <span style={{fontSize:13,fontWeight:500,color:"var(--text)"}}>{label}</span>
                  <span style={{marginLeft:"auto",fontSize:11,color:"var(--text3)"}}>→</span>
                </a>
              ))}
            </div>

            {/* Sfida completa progress */}
            <div style={{
              marginTop:12,
              background:"var(--bg2)",border:"1px solid var(--border)",
              borderRadius:12,padding:14,
            }}>
              <div style={{
                display:"flex",justifyContent:"space-between",
                alignItems:"baseline",marginBottom:10,
              }}>
                <div style={{
                  fontSize:9,fontWeight:700,letterSpacing:"0.12em",color:"var(--text3)",
                }}>AVANZAMENTO SFIDA</div>
                <div style={{
                  fontFamily:"var(--font-display)",
                  fontSize:20,color:"var(--gold)",
                }}>
                  {Math.round((totalDone/TOTAL)*100)}%
                </div>
              </div>
              <div style={{height:6,background:"var(--bg4)",borderRadius:3,overflow:"hidden",marginBottom:8}}>
                <div style={{
                  height:"100%",
                  width:`${(totalDone/TOTAL)*100}%`,
                  background:"linear-gradient(90deg, #8B5E00, var(--gold))",
                  borderRadius:3,
                  transition:"width 0.8s cubic-bezier(.4,0,.2,1)",
                }}/>
              </div>
              <div style={{
                fontSize:10,color:"var(--text3)",
                display:"flex",justifyContent:"space-between",
              }}>
                <span>G1 · 4 MAG</span>
                <span>G60 · 2 LUG</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ══ TAB BAR ══ */}
      <nav style={{
        display:"flex",
        borderTop:"1px solid var(--border)",
        background:"var(--bg)",
        paddingBottom:"var(--safe-bottom)",
        flexShrink:0,
        position:"relative",
        zIndex:10,
      }}>
        {[
          {id:"oggi",  icon:"○", label:"OGGI"},
          {id:"mappa", icon:"⬛", label:"MAPPA"},
          {id:"stats", icon:"◈", label:"STATS"},
        ].map(({id,icon,label})=>{
          const active=tab===id;
          return (
            <button key={id} onClick={()=>setTab(id)} style={{
              flex:1,
              padding:"12px 0 10px",
              display:"flex",flexDirection:"column",alignItems:"center",gap:2,
              color:active?"var(--gold)":"var(--text3)",
              transition:"color 0.15s",
              position:"relative",
            }}>
              {active && (
                <div style={{
                  position:"absolute",top:0,left:"20%",right:"20%",
                  height:1.5,background:"var(--gold)",borderRadius:1,
                }}/>
              )}
              <span style={{
                fontFamily:"var(--font-display)",
                fontSize:16,letterSpacing:"0.04em",lineHeight:1,
              }}>{label}</span>
              <span style={{fontSize:8,fontWeight:600,letterSpacing:"0.08em",opacity:0.7}}>
                {id==="oggi"?`G${selDay+1}`
                 :id==="mappa"?`${totalDone}/60`
                 :`${weekAvg}%`}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
