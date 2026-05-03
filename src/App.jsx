import { useState, useEffect, useCallback, useMemo } from "react";
import "./index.css";

// ═══════════════════════════════════════════════════════════════════
// DATA
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
  mattina:    { label:"Boot",       color:"#F5A623", items:SCHEDULE.filter(s=>s.block==="mattina")    },
  logistica:  { label:"Logistica",  color:"#2ECC71", items:SCHEDULE.filter(s=>s.block==="logistica")  },
  pomeriggio: { label:"Pomeriggio", color:"#5DADE2", items:SCHEDULE.filter(s=>s.block==="pomeriggio") },
  sera:       { label:"Sera",       color:"#BB8FEF", items:SCHEDULE.filter(s=>s.block==="sera")       },
};

const ACTIVITIES = [
  { id:"palestra", label:"Palestra", emoji:"🏋️" },
  { id:"mare",     label:"Mare",     emoji:"🌊" },
  { id:"chiese",   label:"Chiese",   emoji:"⛪" },
  { id:"flair",    label:"Flair",    emoji:"🎸" },
  { id:"riposo",   label:"Riposo",   emoji:"🛌" },
];

const START   = new Date("2026-05-04T00:00:00");
const TOTAL   = 60;
const WORKER  = "https://sfida60-motivatore.soliwkr.workers.dev";
const TG_URL  = "https://t.me/sfida60_bot";
const DOC_URL = "https://docs.google.com/document/d/1l66Wo8w18QTg7avNky8rb5iE1FKkcJZz8lyCuGiIkiU/edit";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const dayIdx  = (d=new Date()) => { const a=new Date(d); a.setHours(0,0,0,0); const b=new Date(START); b.setHours(0,0,0,0); return Math.floor((a-b)/86400000); };
const dayDate = i => { const d=new Date(START); d.setDate(d.getDate()+i); return d; };
const fmt     = i => dayDate(i).toLocaleDateString("it-IT",{weekday:"short",day:"numeric",month:"short"});
const fmtLong = i => dayDate(i).toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"});
const pctOf   = dd => !dd?.items?0:Math.round(SCHEDULE.filter(s=>dd.items[s.id]).length/SCHEDULE.length*100);
const load    = (k,fb) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):fb; } catch { return fb; } };
const save    = (k,v)  => { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} };

// ═══════════════════════════════════════════════════════════════════
// ARC RING
// ═══════════════════════════════════════════════════════════════════

function Arc({ pct, size=96 }) {
  const stroke=6, r=size/2-stroke-1, circ=2*Math.PI*r, off=circ*(1-pct/100);
  const color = pct===100?"var(--gold)":pct>=65?"var(--green)":pct>=35?"var(--blue)":"var(--border2)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{transform:"rotate(-90deg)",position:"absolute",inset:0,flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg4)" strokeWidth={stroke}/>
      {pct>0&&<circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={off}
        style={{transition:"stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1),stroke 0.4s"}}/>}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
// RADAR SVG
// ═══════════════════════════════════════════════════════════════════

function Radar({ data, size=180 }) {
  const blocks=Object.entries(BLOCKS), n=blocks.length, cx=size/2, cy=size/2, maxR=size/2-26;
  const angles=blocks.map((_,i)=>((i/n)*2*Math.PI)-Math.PI/2);
  const pt=(r,a)=>({x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)});
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[.25,.5,.75,1].map(l=>{
        const pts=angles.map(a=>pt(maxR*l,a));
        return <path key={l} d={pts.map((p,i)=>`${i?"L":"M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")+"Z"}
          fill="none" stroke={l===1?"var(--border2)":"var(--border)"} strokeWidth={l===1?1:0.5}/>;
      })}
      {angles.map((a,i)=>{ const p=pt(maxR,a); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth="0.5"/>; })}
      {(()=>{
        const pts=blocks.map(([block,meta],i)=>pt(maxR*(data[block]||0)/100,angles[i]));
        const d=pts.map((p,i)=>`${i?"L":"M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")+"Z";
        return <>
          <path d={d} fill="rgba(245,166,35,0.12)" stroke="var(--gold)" strokeWidth="1.5" strokeLinejoin="round"/>
          {pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="3.5" fill={blocks[i][1].color} stroke="var(--bg)" strokeWidth="1.5"/>)}
        </>;
      })()}
      {blocks.map(([block,meta],i)=>{
        const a=angles[i], lp=pt(maxR+17,a);
        return <text key={block} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
          fill={meta.color} fontSize="10" fontFamily="'IBM Plex Sans',sans-serif" fontWeight="600" letterSpacing="0.06em">
          {meta.label.slice(0,3).toUpperCase()}
        </text>;
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

export default function App() {
  const todayI = Math.max(0, Math.min(dayIdx(), TOTAL-1));

  const [theme, setTheme]       = useState(()=>load("sfida_theme","dark"));
  const [data, setData]         = useState(()=>load("sfida60_data",{}));
  const [selDay, setSelDay]     = useState(todayI);
  const [tab, setTab]           = useState("oggi");
  const [note, setNote]         = useState("");
  const [activity, setActivity] = useState("");
  const [syncing, setSyncing]   = useState(false);
  const [syncOk, setSyncOk]     = useState(false);

  useEffect(()=>{ document.documentElement.setAttribute("data-theme",theme); save("sfida_theme",theme); },[theme]);
  useEffect(()=>{ save("sfida60_data",data); },[data]);
  useEffect(()=>{
    const k=`day_${selDay}`;
    setNote(data[k]?.note||"");
    setActivity(data[k]?.activity||"");
  },[selDay,data]);
  useEffect(()=>{
    fetch(`${WORKER}/data`).then(r=>r.json()).then(d=>{
      if(d&&Object.keys(d).length>0){ setData(d); save("sfida60_data",d); }
    }).catch(()=>{});
  },[]);

  const dayKey   = `day_${selDay}`;
  const dayItems = data[dayKey]?.items||{};

  const pct2 = useCallback(i=>{
    const it=data[`day_${i}`]?.items||{};
    return Math.round(SCHEDULE.filter(s=>it[s.id]).length/SCHEDULE.length*100);
  },[data]);

  const dayPct    = pct2(selDay);
  const totalDone = useMemo(()=>Array.from({length:TOTAL},(_,i)=>pct2(i)===100?1:0).reduce((a,b)=>a+b,0),[data]);
  const streak    = useMemo(()=>{ let s=0; for(let i=todayI;i>=0;i--){ if(pct2(i)===100)s++; else break; } return s; },[data,todayI]);
  const bestStreak= useMemo(()=>{ let b=0,c=0; for(let i=0;i<=todayI;i++){ if(pct2(i)===100){c++;b=Math.max(b,c);}else c=0;} return b; },[data,todayI]);
  const weekAvg   = useMemo(()=>{ const n=Math.min(7,todayI+1); if(!n) return 0; return Math.round(Array.from({length:n},(_,i)=>pct2(todayI-i)).reduce((a,b)=>a+b,0)/n); },[data,todayI]);

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
  },[data,todayI]);

  const bestDay = useMemo(()=>{
    let best={i:-1,pct:0};
    for(let i=0;i<=todayI;i++){ const p=pct2(i); if(p>best.pct) best={i,pct:p}; }
    return best;
  },[data,todayI]);

  const toggle = useCallback(id=>{
    setData(prev=>{
      const next={...prev,[dayKey]:{...prev[dayKey],items:{...(prev[dayKey]?.items||{}),[id]:!prev[dayKey]?.items?.[id]}}};
      return next;
    });
  },[dayKey]);

  const saveDay = ()=>{ setData(prev=>({...prev,[dayKey]:{...prev[dayKey],note,activity}})); };

  const sync = async()=>{
    setSyncing(true);
    try {
      await fetch(`${WORKER}/sync`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
      setSyncOk(true); setTimeout(()=>setSyncOk(false),2000);
    } catch{}
    setSyncing(false);
  };

  const isBeforeStart = dayIdx()<0;

  // ─── TOKEN COLORS ─────────────────────────────────────────────────
  const pctColor = p => p===100?"var(--gold)":p>=65?"var(--green)":p>=35?"var(--blue)":"var(--text2)";

  return (
    <div style={{
      display:"flex", flexDirection:"column",
      height:"100dvh", maxWidth:430, margin:"0 auto",
      background:"var(--bg)", color:"var(--text)",
      overflow:"hidden",
    }}>

      {/* ══ HEADER ══ */}
      <header style={{
        padding:`calc(var(--safe-top) + 14px) 20px 12px`,
        borderBottom:"1px solid var(--border)",
        flexShrink:0,
        background:"var(--bg)",
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            {/* Eyebrow */}
            <div style={{
              fontFamily:"var(--ff-body)",fontSize:10,fontWeight:600,
              letterSpacing:"0.1em",color:"var(--text3)",
              textTransform:"uppercase",marginBottom:3,
            }}>Sfida 60 Giorni</div>
            {/* Title */}
            <div style={{
              fontFamily:"var(--ff-display)",
              fontSize:30,letterSpacing:"0.04em",
              color:"var(--text)",lineHeight:1,
            }}>
              {isBeforeStart
                ? <span>Inizia <span style={{color:"var(--gold)"}}>Lunedì</span></span>
                : <>
                    <span style={{color:"var(--gold)"}}>G{Math.max(0,dayIdx())+1}</span>
                    <span style={{fontSize:16,color:"var(--text3)",marginLeft:4}}>/ {TOTAL}</span>
                  </>
              }
            </div>
            {!isBeforeStart && (
              <div style={{
                fontSize:12,color:"var(--text3)",marginTop:3,
                fontStyle:"italic",
              }}>
                {fmtLong(Math.max(0,dayIdx()))}
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{display:"flex",gap:6}}>
            <button onClick={sync} style={{
              width:36,height:36,minHeight:"auto",
              border:"1px solid var(--border2)",
              borderRadius:6,background:"var(--bg2)",
              fontSize:13,color:syncOk?"var(--green)":syncing?"var(--text3)":"var(--text2)",
              display:"flex",alignItems:"center",justifyContent:"center",
            }}>
              {syncOk?"✓":syncing?"·":"⇅"}
            </button>
            <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} style={{
              width:36,height:36,minHeight:"auto",
              border:"1px solid var(--border2)",
              borderRadius:6,background:"var(--bg2)",
              fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",
              color:"var(--text2)",
            }}>
              {theme==="dark"?"☀":"●"}
            </button>
          </div>
        </div>

        {/* Global bar */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginTop:12}}>
          <div style={{
            flex:1,height:3,background:"var(--bg4)",
            borderRadius:2,overflow:"hidden",
          }}>
            <div style={{
              height:"100%",
              width:`${(totalDone/TOTAL)*100}%`,
              background:"var(--gold)",
              borderRadius:2,
              transition:"width 0.8s cubic-bezier(.4,0,.2,1)",
            }}/>
          </div>
          <span style={{
            fontFamily:"var(--ff-mono)",
            fontSize:11,color:"var(--gold)",flexShrink:0,
          }}>{totalDone}/{TOTAL}</span>
        </div>
      </header>

      {/* ══ CONTENT ══ */}
      <main style={{flex:1,overflowY:"auto",overscrollBehavior:"contain"}}>

        {/* ════ OGGI ════ */}
        {tab==="oggi" && (
          <div style={{padding:"16px 20px 120px"}} className="fade-up">

            {/* Day nav */}
            <div style={{display:"flex",gap:0,marginBottom:18}}>
              <button onClick={()=>setSelDay(d=>Math.max(0,d-1))} style={{
                width:44,height:40,minHeight:"auto",
                border:"1px solid var(--border2)",borderRight:"none",
                borderRadius:"6px 0 0 6px",background:"var(--bg2)",
                color:"var(--text2)",fontSize:18,
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>‹</button>
              <div style={{
                flex:1,textAlign:"center",padding:"0 12px",
                border:"1px solid var(--border2)",
                background:"var(--bg2)",
                display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                height:40,
              }}>
                <span style={{
                  fontFamily:"var(--ff-body)",fontSize:13,fontWeight:500,
                  color:"var(--text2)",letterSpacing:"0.04em",
                }}>
                  {fmt(selDay).toUpperCase()}
                </span>
                {selDay===todayI && (
                  <span style={{
                    fontSize:9,fontWeight:700,fontFamily:"var(--ff-body)",
                    letterSpacing:"0.1em",
                    background:"var(--gold)",color:"#0D0D0D",
                    padding:"2px 6px",borderRadius:3,
                  }}>OGGI</span>
                )}
              </div>
              <button onClick={()=>setSelDay(d=>Math.min(TOTAL-1,d+1))} style={{
                width:44,height:40,minHeight:"auto",
                border:"1px solid var(--border2)",borderLeft:"none",
                borderRadius:"0 6px 6px 0",background:"var(--bg2)",
                color:"var(--text2)",fontSize:18,
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>›</button>
            </div>

            {/* Hero card */}
            <div style={{
              display:"flex",alignItems:"center",gap:16,
              padding:"18px 16px",
              background:"var(--bg2)",
              border:"1px solid var(--border)",
              borderRadius:10,
              marginBottom:20,
            }}>
              {/* Ring */}
              <div style={{position:"relative",width:96,height:96,flexShrink:0}}>
                <Arc pct={dayPct} size={96}/>
                <div style={{
                  position:"absolute",inset:0,
                  display:"flex",flexDirection:"column",
                  alignItems:"center",justifyContent:"center",
                }}>
                  <div style={{
                    fontFamily:"var(--ff-display)",
                    fontSize:28,letterSpacing:"0.04em",lineHeight:1,
                    color:pctColor(dayPct),
                  }}>{dayPct}</div>
                  <div style={{
                    fontFamily:"var(--ff-mono)",
                    fontSize:9,color:"var(--text3)",marginTop:1,
                  }}>%</div>
                </div>
              </div>

              {/* Stats */}
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:0}}>
                {[
                  {label:"Completati", val:`${SCHEDULE.filter(s=>dayItems[s.id]).length}/${SCHEDULE.length}`, color:"var(--text)"},
                  {label:"Settimana",  val:`${weekAvg}%`,  color:"var(--blue)"},
                  {label:"Streak",     val:`${streak} gg`, color:streak>0?"var(--green)":"var(--text3)"},
                ].map(({label,val,color},i)=>(
                  <div key={label} style={{
                    display:"flex",justifyContent:"space-between",alignItems:"center",
                    padding:"7px 0",
                    borderBottom:i<2?"1px solid var(--border)":"none",
                  }}>
                    <span style={{
                      fontFamily:"var(--ff-body)",
                      fontSize:11,fontWeight:500,letterSpacing:"0.05em",
                      color:"var(--text3)",
                    }}>{label}</span>
                    <span style={{
                      fontFamily:"var(--ff-display)",
                      fontSize:20,color,letterSpacing:"0.05em",
                    }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Blocks */}
            {Object.entries(BLOCKS).map(([block,meta],bi)=>{
              const items=meta.items;
              const doneCnt=items.filter(s=>dayItems[s.id]).length;
              return (
                <div key={block} style={{marginBottom:16}} className={`stagger-${bi+1}`}>
                  {/* Block label */}
                  <div style={{
                    display:"flex",alignItems:"center",justifyContent:"space-between",
                    marginBottom:6,paddingLeft:2,
                  }}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <div style={{width:2,height:12,background:meta.color,borderRadius:1,flexShrink:0}}/>
                      <span style={{
                        fontFamily:"var(--ff-body)",
                        fontSize:11,fontWeight:700,
                        letterSpacing:"0.09em",
                        color:meta.color,
                        textTransform:"uppercase",
                      }}>{meta.label}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      {/* Inline mini bar */}
                      <div style={{width:44,height:2,background:"var(--bg4)",borderRadius:1,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${doneCnt/items.length*100}%`,background:meta.color,transition:"width 0.4s"}}/>
                      </div>
                      <span style={{
                        fontFamily:"var(--ff-mono)",
                        fontSize:10,color:"var(--text3)",
                      }}>{doneCnt}/{items.length}</span>
                    </div>
                  </div>

                  {/* Items — piena larghezza, touch-friendly */}
                  <div style={{
                    border:"1px solid var(--border)",
                    borderRadius:8,overflow:"hidden",
                  }}>
                    {items.map((item,ii)=>{
                      const done=!!dayItems[item.id];
                      return (
                        <button key={item.id} onClick={()=>toggle(item.id)} style={{
                          display:"flex",alignItems:"center",gap:12,
                          padding:"11px 14px",
                          width:"100%",textAlign:"left",
                          minHeight:48, // touch target
                          background:done?`${meta.color}0F`:"var(--bg2)",
                          borderBottom:ii<items.length-1?"1px solid var(--border)":"none",
                          transition:"background 0.15s",
                        }}>
                          {/* Checkbox */}
                          <div style={{
                            width:22,height:22,flexShrink:0,
                            borderRadius:6,
                            border:`1.5px solid ${done?meta.color:"var(--border-hi)"}`,
                            background:done?meta.color:"transparent",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            transition:"all 0.15s",
                          }}>
                            {done&&(
                              <svg width="11" height="9" viewBox="0 0 11 9" fill="none"
                                style={{animation:"checkIn 0.2s ease both"}}>
                                <path d="M1.5 4.5L4 7L9.5 1.5" stroke="#0D0D0D"
                                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>

                          {/* Emoji */}
                          <span style={{fontSize:18,flexShrink:0,lineHeight:1}}>{item.emoji}</span>

                          {/* Label + time */}
                          <div style={{flex:1,minWidth:0}}>
                            <span style={{
                              fontFamily:"var(--ff-body)",
                              fontSize:15,fontWeight:done?500:400,
                              color:done?"var(--text)":"var(--text2)",
                              lineHeight:1.3,
                            }}>{item.label}</span>
                            {item.time&&(
                              <span style={{
                                fontFamily:"var(--ff-mono)",
                                fontSize:10,color:"var(--text4)",marginLeft:7,
                              }}>{item.time}</span>
                            )}
                          </div>

                          {done&&<span style={{color:meta.color,fontSize:12,flexShrink:0,animation:"fadeIn 0.2s ease"}}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Divider */}
            <div style={{
              display:"flex",alignItems:"center",gap:10,
              margin:"20px 0 16px",color:"var(--text4)",
            }}>
              <div style={{flex:1,height:1,background:"var(--border)"}}/>
              <span style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",color:"var(--text3)"}}>POMERIGGIO</span>
              <div style={{flex:1,height:1,background:"var(--border)"}}/>
            </div>

            {/* Activity */}
            <div style={{marginBottom:16}}>
              <div className="label" style={{marginBottom:8}}>Attività</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {ACTIVITIES.map(a=>{
                  const sel=activity===`${a.emoji} ${a.label}`;
                  return (
                    <button key={a.id}
                      onClick={()=>setActivity(x=>x===`${a.emoji} ${a.label}`?"":`${a.emoji} ${a.label}`)}
                      style={{
                        padding:"8px 14px",
                        borderRadius:20,minHeight:36,
                        fontFamily:"var(--ff-body)",
                        fontSize:13,fontWeight:500,
                        background:sel?"var(--gold)":"var(--bg2)",
                        color:sel?"#0D0D0D":"var(--text2)",
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
            <div style={{marginBottom:14}}>
              <div className="label" style={{marginBottom:6}}>Note</div>
              <textarea value={note} onChange={e=>setNote(e.target.value)}
                placeholder="Annota…" rows={2}
                style={{
                  width:"100%",background:"var(--bg2)",
                  border:"1px solid var(--border2)",borderRadius:8,
                  color:"var(--text)",padding:"11px 13px",
                  fontSize:14,lineHeight:1.55,
                  resize:"none",outline:"none",
                  transition:"border-color 0.15s",
                }}
                onFocus={e=>e.target.style.borderColor="var(--gold)"}
                onBlur={e=>e.target.style.borderColor="var(--border2)"}
              />
            </div>

            <button onClick={()=>{saveDay();sync();}} style={{
              padding:"11px 24px",minHeight:"auto",
              background:"var(--gold)",color:"#0D0D0D",
              borderRadius:8,
              fontFamily:"var(--ff-body)",fontSize:13,fontWeight:700,
              letterSpacing:"0.05em",
            }}>Salva</button>
          </div>
        )}

        {/* ════ MAPPA ════ */}
        {tab==="mappa" && (
          <div style={{padding:"16px 20px 120px"}} className="fade-up">

            {/* Stat cards */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
              {[
                {label:"Completi",  val:totalDone,                 color:"var(--gold)"},
                {label:"Streak",    val:streak,    suffix:" gg",   color:streak>0?"var(--green)":"var(--text3)"},
                {label:"Rimasti",   val:Math.max(0,59-todayI),     color:"var(--text2)"},
              ].map(({label,val,suffix,color})=>(
                <div key={label} style={{
                  background:"var(--bg2)",border:"1px solid var(--border)",
                  borderRadius:10,padding:"14px 10px",textAlign:"center",
                }}>
                  <div style={{
                    fontFamily:"var(--ff-display)",
                    fontSize:30,color,letterSpacing:"0.04em",lineHeight:1,
                  }}>
                    {val}{suffix&&<span style={{fontSize:16}}>{suffix}</span>}
                  </div>
                  <div className="label" style={{marginTop:4}}>{label}</div>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div style={{
              background:"var(--bg2)",border:"1px solid var(--border)",
              borderRadius:10,padding:14,marginBottom:12,
            }}>
              <div className="label" style={{marginBottom:10}}>60 Giorni</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:3}}>
                {Array.from({length:TOTAL},(_,i)=>{
                  const p=pct2(i);
                  const isToday=i===todayI,isSel=i===selDay,future=i>todayI;
                  return (
                    <div key={i} title={`G${i+1} · ${fmt(i)} · ${p}%`}
                      onClick={()=>{setSelDay(i);setTab("oggi");}}
                      style={{
                        aspectRatio:"1",cursor:"pointer",borderRadius:3,
                        background:future?"var(--bg4)":p===100?"var(--gold)":p>0?`rgba(245,166,35,${0.08+p/100*0.44})`:"var(--bg3)",
                        border:isSel?"2px solid var(--gold)":isToday?"2px solid var(--blue)":"1px solid transparent",
                        opacity:future?0.3:1,
                        transition:"transform 0.08s",
                        boxShadow:p===100?"0 0 5px rgba(245,166,35,0.3)":"none",
                      }}
                      onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.3)";e.currentTarget.style.zIndex=5;}}
                      onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.zIndex=0;}}
                    />
                  );
                })}
              </div>
              {/* Legend */}
              <div style={{display:"flex",gap:10,marginTop:10,flexWrap:"wrap"}}>
                {[["var(--gold)","Completo"],["rgba(245,166,35,0.3)","Parziale"],["var(--bg3)","0%"]].map(([c,l])=>(
                  <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:7,height:7,borderRadius:1,background:c}}/>
                    <span className="label">{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Week bars */}
            <div style={{
              background:"var(--bg2)",border:"1px solid var(--border)",
              borderRadius:10,padding:14,marginBottom:12,
            }}>
              <div className="label" style={{marginBottom:12}}>Ultimi 7 giorni</div>
              <div style={{display:"flex",gap:4,alignItems:"flex-end",height:60}}>
                {Array.from({length:7},(_,i)=>{
                  const di=todayI-6+i;
                  if(di<0) return <div key={i} style={{flex:1}}/>;
                  const p=pct2(di),isT=di===todayI;
                  return (
                    <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                      <div style={{
                        width:"100%",
                        height:`${Math.max(p*0.54,2)}px`,
                        background:isT?"var(--gold)":p===100?"var(--green)":"var(--bg4)",
                        borderRadius:2,minHeight:2,
                        transition:"height 0.5s cubic-bezier(.4,0,.2,1)",
                        opacity:p===0?0.3:1,
                      }}/>
                      <span style={{
                        fontFamily:"var(--ff-mono)",
                        fontSize:9,color:isT?"var(--gold)":"var(--text3)",
                      }}>
                        {dayDate(di).toLocaleDateString("it-IT",{weekday:"narrow"})}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Block bars */}
            <div style={{
              background:"var(--bg2)",border:"1px solid var(--border)",
              borderRadius:10,padding:14,
            }}>
              <div className="label" style={{marginBottom:12}}>Per blocco</div>
              {Object.entries(BLOCKS).map(([block,meta])=>{
                const p=blockPerf[block]||0;
                return (
                  <div key={block} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{width:2,height:10,background:meta.color,borderRadius:1,flexShrink:0}}/>
                        <span style={{
                          fontFamily:"var(--ff-body)",
                          fontSize:12,fontWeight:500,color:"var(--text2)",
                        }}>{meta.label}</span>
                      </div>
                      <span style={{
                        fontFamily:"var(--ff-display)",
                        fontSize:18,color:meta.color,letterSpacing:"0.04em",
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

        {/* ════ STATS ════ */}
        {tab==="stats" && (
          <div style={{padding:"16px 20px 120px"}} className="fade-up">

            {/* 4 big numbers */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {[
                {label:"Giorni completi", val:totalDone,    sub:`su ${todayI+1} trascorsi`,  color:"var(--gold)"},
                {label:"Streak corrente", val:streak,       sub:"giorni consecutivi",          color:streak>0?"var(--green)":"var(--text3)"},
                {label:"Miglior streak",  val:bestStreak,   sub:"record assoluto",             color:"var(--blue)"},
                {label:"Media settimana", val:`${weekAvg}%`,sub:"ultimi 7 giorni",             color:"var(--text2)"},
              ].map(({label,val,sub,color})=>(
                <div key={label} style={{
                  background:"var(--bg2)",border:"1px solid var(--border)",
                  borderRadius:10,padding:"16px 14px",
                }}>
                  <div style={{
                    fontFamily:"var(--ff-display)",
                    fontSize:38,color,letterSpacing:"0.03em",lineHeight:1,
                  }}>{val}</div>
                  <div style={{
                    fontFamily:"var(--ff-body)",
                    fontSize:11,fontWeight:600,color:"var(--text3)",
                    letterSpacing:"0.06em",marginTop:6,textTransform:"uppercase",
                  }}>{label}</div>
                  <div style={{
                    fontFamily:"var(--ff-body)",fontStyle:"italic",
                    fontSize:11,color:"var(--text4)",marginTop:3,
                  }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Radar */}
            <div style={{
              background:"var(--bg2)",border:"1px solid var(--border)",
              borderRadius:10,padding:14,marginBottom:12,
              display:"flex",flexDirection:"column",alignItems:"center",
            }}>
              <div className="label" style={{marginBottom:12,alignSelf:"flex-start"}}>Radar blocchi</div>
              <Radar data={blockPerf} size={188}/>
              <div style={{display:"flex",gap:12,marginTop:10,flexWrap:"wrap",justifyContent:"center"}}>
                {Object.entries(BLOCKS).map(([block,meta])=>(
                  <div key={block} style={{display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:6,height:6,borderRadius:1,background:meta.color}}/>
                    <span style={{
                      fontFamily:"var(--ff-body)",
                      fontSize:11,fontWeight:600,color:meta.color,
                    }}>{meta.label}</span>
                    <span className="mono" style={{color:"var(--text3)"}}>{blockPerf[block]||0}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Best day */}
            {bestDay.i>=0&&(
              <div style={{
                background:"var(--bg2)",border:"1px solid var(--border)",
                borderRadius:10,padding:16,marginBottom:12,
                display:"flex",alignItems:"center",gap:16,
              }}>
                <div style={{
                  fontFamily:"var(--ff-display)",
                  fontSize:52,color:"var(--gold)",letterSpacing:"0.03em",
                  lineHeight:1,flexShrink:0,
                }}>G{bestDay.i+1}</div>
                <div>
                  <div className="label" style={{marginBottom:4}}>Miglior giorno</div>
                  <div style={{fontSize:14,fontWeight:500,color:"var(--text)"}}>
                    {fmtLong(bestDay.i)}
                  </div>
                  <div style={{
                    fontFamily:"var(--ff-display)",
                    fontSize:18,color:"var(--gold)",marginTop:4,letterSpacing:"0.04em",
                  }}>{bestDay.pct}%</div>
                </div>
              </div>
            )}

            {/* Campaign progress */}
            <div style={{
              background:"var(--bg2)",border:"1px solid var(--border)",
              borderRadius:10,padding:14,marginBottom:12,
            }}>
              <div style={{
                display:"flex",justifyContent:"space-between",
                alignItems:"baseline",marginBottom:10,
              }}>
                <div className="label">Avanzamento sfida</div>
                <span style={{
                  fontFamily:"var(--ff-display)",
                  fontSize:20,color:"var(--gold)",letterSpacing:"0.04em",
                }}>{Math.round((totalDone/TOTAL)*100)}%</span>
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
                display:"flex",justifyContent:"space-between",
                fontFamily:"var(--ff-mono)",fontSize:9,color:"var(--text4)",
              }}>
                <span>4 MAG</span>
                <span>2 LUG</span>
              </div>
            </div>

            {/* Links */}
            <div className="label" style={{marginBottom:8}}>Link rapidi</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {[
                {label:"Dossier Google Docs", sub:"Cronache di Marco",    icon:"📄", url:DOC_URL, color:"var(--blue)"},
                {label:"Marco su Telegram",   sub:"Coach e motivatore",   icon:"✈️", url:TG_URL,  color:"var(--green)"},
              ].map(({label,sub,icon,url,color})=>(
                <a key={label} href={url} target="_blank" rel="noopener noreferrer" style={{
                  display:"flex",alignItems:"center",gap:12,
                  padding:"13px 14px",
                  background:"var(--bg2)",border:"1px solid var(--border)",
                  borderRadius:10,textDecoration:"none",
                  minHeight:56,transition:"border-color 0.15s",
                }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=color}
                onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}
                >
                  <span style={{fontSize:22,flexShrink:0}}>{icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:500,color:"var(--text)"}}>{label}</div>
                    <div style={{fontSize:11,color:"var(--text3)",fontStyle:"italic",marginTop:1}}>{sub}</div>
                  </div>
                  <span style={{fontSize:14,color:"var(--text3)"}}>→</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ══ TAB BAR ══ */}
      <nav style={{
        display:"flex",
        borderTop:"1px solid var(--border)",
        background:"var(--bg)",
        paddingBottom:"calc(var(--safe-bottom) + 4px)",
        flexShrink:0,position:"relative",zIndex:10,
      }}>
        {[
          {id:"oggi",  label:"Oggi",  sub:selDay===todayI?"oggi":`G${selDay+1}`},
          {id:"mappa", label:"Mappa", sub:`${totalDone}/60`},
          {id:"stats", label:"Stats", sub:`${weekAvg}%`},
        ].map(({id,label,sub})=>{
          const active=tab===id;
          return (
            <button key={id} onClick={()=>setTab(id)} style={{
              flex:1,minHeight:"auto",
              padding:"10px 0 8px",
              display:"flex",flexDirection:"column",alignItems:"center",gap:2,
              color:active?"var(--gold)":"var(--text3)",
              transition:"color 0.15s",position:"relative",
            }}>
              {active&&(
                <div style={{
                  position:"absolute",top:0,left:"20%",right:"20%",
                  height:2,background:"var(--gold)",borderRadius:"0 0 2px 2px",
                }}/>
              )}
              <span style={{
                fontFamily:"var(--ff-display)",
                fontSize:16,letterSpacing:"0.05em",lineHeight:1,
              }}>{label}</span>
              <span style={{
                fontFamily:"var(--ff-mono)",
                fontSize:9,opacity:0.7,
              }}>{sub}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
