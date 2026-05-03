import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "./index.css";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const SCHEDULE = [
  { id:"sveglia",    label:"Sveglia",      time:"VI",   emoji:"⏰", block:"mattina"    },
  { id:"flessioni",  label:"Flessioni",    time:"",     emoji:"💪", block:"mattina"    },
  { id:"preghiere",  label:"Preghiere",    time:"",     emoji:"🙏", block:"mattina"    },
  { id:"caffe",      label:"Caffè",        time:"",     emoji:"☕", block:"mattina"    },
  { id:"corda",      label:"Corda",        time:"",     emoji:"🪢", block:"mattina"    },
  { id:"addominali", label:"Addominali",   time:"",     emoji:"🔥", block:"mattina"    },
  { id:"ballo",      label:"Ballo",        time:"",     emoji:"🕺", block:"mattina"    },
  { id:"autobus",    label:"Autobus",      time:"VII",  emoji:"🚌", block:"logistica"  },
  { id:"messa",      label:"Messa",        time:"VII½", emoji:"⛪", block:"logistica"  },
  { id:"colazione",  label:"Colazione",    time:"VIII", emoji:"🥐", block:"logistica"  },
  { id:"lavoro",     label:"Lavoro",       time:"IX–XIV",emoji:"📚",block:"logistica"  },
  { id:"pranzo",     label:"Pranzo",       time:"XV",   emoji:"🥗", block:"pomeriggio" },
  { id:"attivita",   label:"Rito",         time:"",     emoji:"🌊", block:"pomeriggio" },
  { id:"cena",       label:"Cena",         time:"XX½",  emoji:"🍎", block:"sera"       },
  { id:"noscreen",   label:"No Screen",    time:"",     emoji:"🚫", block:"sera"       },
  { id:"compieta",   label:"Compieta",     time:"",     emoji:"🙏", block:"sera"       },
  { id:"letto",      label:"Riposo",       time:"XXI½", emoji:"😴", block:"sera"       },
];

const BLOCKS = {
  mattina:    { label:"Il Boot",      rune:"ᚠ", color:"#C8922A", items: SCHEDULE.filter(s=>s.block==="mattina")    },
  logistica:  { label:"Il Cammino",   rune:"ᚱ", color:"#5C8448", items: SCHEDULE.filter(s=>s.block==="logistica")  },
  pomeriggio: { label:"Il Rito",      rune:"ᛏ", color:"#7A9FBF", items: SCHEDULE.filter(s=>s.block==="pomeriggio") },
  sera:       { label:"Il Vespro",    rune:"ᛉ", color:"#8B6FBF", items: SCHEDULE.filter(s=>s.block==="sera")       },
};

const ACTIVITIES = [
  { id:"palestra", label:"Palestra",  emoji:"🏋️" },
  { id:"mare",     label:"Mare",      emoji:"🌊" },
  { id:"chiese",   label:"Chiese",    emoji:"⛪" },
  { id:"flair",    label:"Flair",     emoji:"🎸" },
  { id:"riposo",   label:"Riposo",    emoji:"🛌" },
];

const START     = new Date("2026-05-04T00:00:00");
const TOTAL     = 60;
const WORKER    = "https://sfida60-motivatore.soliwkr.workers.dev";
const TG_URL    = "https://t.me/sfida60_bot";
const DOC_URL   = "https://docs.google.com/document/d/1l66Wo8w18QTg7avNky8rb5iE1FKkcJZz8lyCuGiIkiU/edit";

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const dayIdx  = (d=new Date()) => { const a=new Date(d); a.setHours(0,0,0,0); const b=new Date(START); b.setHours(0,0,0,0); return Math.floor((a-b)/86400000); };
const dayDate = i => { const d=new Date(START); d.setDate(d.getDate()+i); return d; };
const fmt     = i => dayDate(i).toLocaleDateString("it-IT",{weekday:"short",day:"numeric",month:"short"});
const fmtLong = i => dayDate(i).toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"});
const pctOf   = dd => { if(!dd?.items) return 0; return Math.round(SCHEDULE.filter(s=>dd.items[s.id]).length/SCHEDULE.length*100); };
const load    = (k,fb) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):fb; } catch { return fb; } };
const save    = (k,v)  => { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} };

function toRoman(n) {
  const vals=[1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms=["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"];
  let r=""; vals.forEach((v,i)=>{ while(n>=v){r+=syms[i];n-=v;} }); return r;
}

// ═══════════════════════════════════════════════════════════════════
// SHIELD RING — Progress component
// ═══════════════════════════════════════════════════════════════════

function ShieldRing({ pct, size=120, children }) {
  const stroke = 6;
  const r = size/2 - stroke - 2;
  const circ = 2*Math.PI*r;
  const off = circ*(1-pct/100);
  const color = pct===100?"#C8922A":pct>=70?"#5C8448":pct>=40?"#7A9FBF":"#3A3020";
  const glow  = pct===100?"0 0 20px rgba(200,146,42,0.5)":pct>=70?"0 0 16px rgba(92,132,72,0.4)":"none";

  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      {/* Outer decorative ring */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{position:"absolute",inset:0,transform:"rotate(-90deg)"}}>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="var(--bg4)" strokeWidth={stroke}/>
        {/* Tick marks */}
        {Array.from({length:12},(_,i)=>{
          const angle=(i/12)*2*Math.PI - Math.PI/2;
          const inner=r-4, outer=r+2;
          return (
            <line key={i}
              x1={size/2+Math.cos(angle)*inner} y1={size/2+Math.sin(angle)*inner}
              x2={size/2+Math.cos(angle)*outer} y2={size/2+Math.sin(angle)*outer}
              stroke="var(--border-gold)" strokeWidth={i%3===0?1.5:0.5}/>
          );
        })}
        {/* Progress arc */}
        {pct>0 && (
          <circle cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={circ} strokeDashoffset={off}
            style={{
              transition:"stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1), stroke 0.4s",
              filter:glow!=="none"?`drop-shadow(${glow})`:"none",
            }}/>
        )}
      </svg>
      {/* Center content */}
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
// RADAR
// ═══════════════════════════════════════════════════════════════════

function RuneRadar({ data, size=180 }) {
  const blocks = Object.entries(BLOCKS);
  const n=blocks.length, cx=size/2, cy=size/2, maxR=size/2-28;
  const angles = blocks.map((_,i)=>((i/n)*2*Math.PI)-Math.PI/2);
  const pt = (r,a) => ({ x:cx+r*Math.cos(a), y:cy+r*Math.sin(a) });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid rings */}
      {[0.25,0.5,0.75,1].map(lvl=>{
        const pts=angles.map(a=>pt(maxR*lvl,a));
        const d=pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")+"Z";
        return <path key={lvl} d={d} fill="none"
          stroke={lvl===1?"var(--border-gold)":"var(--border)"}
          strokeWidth={lvl===1?1:0.5} strokeDasharray={lvl<1?"3,3":undefined}/>;
      })}
      {/* Axes */}
      {angles.map((a,i)=>{
        const p=pt(maxR,a);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y}
          stroke="var(--border-gold)" strokeWidth="0.5"/>;
      })}
      {/* Data */}
      {(()=>{
        const pts=blocks.map(([block,meta],i)=>{
          const v=data[block]||0;
          return pt(maxR*(v/100),angles[i]);
        });
        const d=pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")+"Z";
        return (<>
          <path d={d} fill="rgba(200,146,42,0.12)" stroke="var(--gold)"
            strokeWidth="1.5" strokeLinejoin="round"/>
          {pts.map((p,i)=>(
            <circle key={i} cx={p.x} cy={p.y} r="3.5"
              fill={blocks[i][1].color} stroke="var(--bg)" strokeWidth="1.5"/>
          ))}
        </>);
      })()}
      {/* Rune labels */}
      {blocks.map(([block,meta],i)=>{
        const a=angles[i], lp=pt(maxR+18,a);
        return (
          <text key={block} x={lp.x} y={lp.y}
            textAnchor="middle" dominantBaseline="middle"
            fill={meta.color} fontSize="16"
            fontFamily="'Cinzel', serif" fontWeight="600">
            {meta.rune}
          </text>
        );
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

  const streak = useMemo(()=>{
    let s=0; for(let i=todayI;i>=0;i--){ if(pct2(i)===100)s++; else break; } return s;
  },[data,todayI]);

  const bestStreak = useMemo(()=>{
    let best=0,cur=0;
    for(let i=0;i<=todayI;i++){ if(pct2(i)===100){cur++;best=Math.max(best,cur);}else cur=0; }
    return best;
  },[data,todayI]);

  const weekAvg = useMemo(()=>{
    const n=Math.min(7,todayI+1); if(!n) return 0;
    return Math.round(Array.from({length:n},(_,i)=>pct2(todayI-i)).reduce((a,b)=>a+b,0)/n);
  },[data,todayI]);

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
      const next={...prev};
      if(!next[dayKey]) next[dayKey]={items:{}};
      if(!next[dayKey].items) next[dayKey].items={};
      next[dayKey]={...next[dayKey],items:{...next[dayKey].items,[id]:!next[dayKey].items[id]}};
      return next;
    });
  },[dayKey]);

  const saveDay = ()=>setData(prev=>({...prev,[dayKey]:{...prev[dayKey],note,activity}}));

  const sync = async()=>{
    setSyncing(true);
    try {
      await fetch(`${WORKER}/sync`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
      setSyncOk(true); setTimeout(()=>setSyncOk(false),2000);
    } catch{}
    setSyncing(false);
  };

  const isBeforeStart = dayIdx()<0;

  // ─── SHARED STYLES ────────────────────────────────────────────────

  const card = {
    background:"var(--bg2)",
    border:"1px solid var(--border-gold)",
    borderRadius:2,
    position:"relative",
    overflow:"hidden",
  };

  const cornerAccent = (color="var(--gold)") => (
    <>
      <div style={{position:"absolute",top:0,left:0,width:10,height:10,
        borderTop:`1.5px solid ${color}`,borderLeft:`1.5px solid ${color}`}}/>
      <div style={{position:"absolute",top:0,right:0,width:10,height:10,
        borderTop:`1.5px solid ${color}`,borderRight:`1.5px solid ${color}`}}/>
      <div style={{position:"absolute",bottom:0,left:0,width:10,height:10,
        borderBottom:`1.5px solid ${color}`,borderLeft:`1.5px solid ${color}`}}/>
      <div style={{position:"absolute",bottom:0,right:0,width:10,height:10,
        borderBottom:`1.5px solid ${color}`,borderRight:`1.5px solid ${color}`}}/>
    </>
  );

  // ─── RENDER ───────────────────────────────────────────────────────

  return (
    <div style={{
      display:"flex",flexDirection:"column",height:"100dvh",
      maxWidth:430,margin:"0 auto",
      background:"var(--bg)",color:"var(--text)",
      overflow:"hidden",
    }}>

      {/* ══ HEADER ══ */}
      <header style={{
        padding:`calc(var(--safe-top) + 14px) 18px 12px`,
        borderBottom:"1px solid var(--border-gold)",
        flexShrink:0,
        background:"var(--bg)",
        position:"relative",
      }}>
        {/* Gold line top */}
        <div style={{
          position:"absolute",top:0,left:0,right:0,height:2,
          background:"linear-gradient(90deg, transparent, var(--gold), transparent)",
          opacity:0.6,
        }}/>

        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div>
            <div style={{
              fontFamily:"var(--ff-display)",
              fontSize:10,letterSpacing:"0.3em",
              color:"var(--gold)",opacity:0.8,marginBottom:3,
            }}>
              CRONACHE DELLA SFIDA
            </div>
            <div style={{
              fontFamily:"var(--ff-display)",
              fontSize:24,fontWeight:700,letterSpacing:"0.06em",
              color:"var(--text)",lineHeight:1,
            }}>
              {isBeforeStart
                ? "IV MAGGIO MMXXVI"
                : `GIORNO ${toRoman(Math.max(0,dayIdx())+1)}`}
            </div>
            {!isBeforeStart && (
              <div style={{
                fontFamily:"var(--ff-body)",fontStyle:"italic",
                fontSize:13,color:"var(--text3)",marginTop:2,
              }}>
                {fmtLong(Math.max(0,dayIdx()))}
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <button onClick={sync} style={{
              width:30,height:30,border:"1px solid var(--border-gold)",
              color:syncOk?"var(--green-done)":syncing?"var(--text3)":"var(--gold)",
              fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",
              background:"var(--bg2)",
            }}>
              {syncOk?"✦":syncing?"◌":"⇅"}
            </button>
            <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} style={{
              width:30,height:30,border:"1px solid var(--border-gold)",
              fontSize:12,color:"var(--gold)",
              display:"flex",alignItems:"center",justifyContent:"center",
              background:"var(--bg2)",
            }}>
              {theme==="dark"?"☽":"☀"}
            </button>
          </div>
        </div>

        {/* Progress */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginTop:12}}>
          <div style={{
            flex:1,height:3,background:"var(--bg4)",
            position:"relative",overflow:"hidden",
          }}>
            <div style={{
              position:"absolute",inset:0,
              background:"repeating-linear-gradient(90deg, var(--border-gold) 0, var(--border-gold) 1px, transparent 1px, transparent 8px)",
              opacity:0.3,
            }}/>
            <div style={{
              height:"100%",
              width:`${(totalDone/TOTAL)*100}%`,
              background:"linear-gradient(90deg, #7A5010, var(--gold))",
              transition:"width 0.8s cubic-bezier(.4,0,.2,1)",
              position:"relative",
            }}>
              <div style={{
                position:"absolute",right:0,top:0,bottom:0,width:2,
                background:"var(--gold-light)",
                boxShadow:"0 0 6px var(--gold)",
              }}/>
            </div>
          </div>
          <span style={{
            fontFamily:"var(--ff-display)",
            fontSize:12,color:"var(--gold)",letterSpacing:"0.08em",flexShrink:0,
          }}>
            {totalDone}/{TOTAL}
          </span>
        </div>
      </header>

      {/* ══ CONTENT ══ */}
      <main style={{flex:1,overflowY:"auto",overscrollBehavior:"contain"}}>

        {/* ════ OGGI ════ */}
        {tab==="oggi" && (
          <div style={{padding:"16px 16px 100px"}}>

            {/* Day nav */}
            <div style={{display:"flex",marginBottom:18,gap:0}}>
              <button onClick={()=>setSelDay(d=>Math.max(0,d-1))} style={{
                width:36,height:34,
                border:"1px solid var(--border-gold)",borderRight:"none",
                color:"var(--gold)",fontSize:16,background:"var(--bg2)",
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>‹</button>
              <div style={{
                flex:1,textAlign:"center",
                padding:"6px 10px",
                border:"1px solid var(--border-gold)",
                background:"var(--bg2)",
              }}>
                <span style={{
                  fontFamily:"var(--ff-display)",
                  fontSize:12,color:"var(--text2)",letterSpacing:"0.1em",
                }}>
                  {fmt(selDay).toUpperCase()}
                </span>
                {selDay===todayI && (
                  <span style={{
                    marginLeft:8,fontSize:8,fontWeight:600,fontFamily:"var(--ff-display)",
                    background:"var(--gold)",color:"var(--bg)",
                    padding:"2px 6px",letterSpacing:"0.15em",
                  }}>DIES</span>
                )}
              </div>
              <button onClick={()=>setSelDay(d=>Math.min(TOTAL-1,d+1))} style={{
                width:36,height:34,
                border:"1px solid var(--border-gold)",borderLeft:"none",
                color:"var(--gold)",fontSize:16,background:"var(--bg2)",
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>›</button>
            </div>

            {/* Hero ring */}
            <div style={{
              ...card,
              padding:"20px 16px",
              marginBottom:14,
              display:"flex",alignItems:"center",gap:18,
            }}>
              {cornerAccent()}
              <ShieldRing pct={dayPct} size={104}>
                <div style={{
                  fontFamily:"var(--ff-display)",
                  fontSize:28,fontWeight:700,
                  color:dayPct===100?"var(--gold)":dayPct>=70?"var(--green-done)":"var(--text)",
                  letterSpacing:"0.04em",lineHeight:1,
                  animation:dayPct===100?"runeGlow 2s ease infinite":undefined,
                }}>
                  {dayPct}
                </div>
                <div style={{
                  fontFamily:"var(--ff-display)",
                  fontSize:9,color:"var(--text3)",letterSpacing:"0.2em",marginTop:2,
                }}>HONOR</div>
              </ShieldRing>
              <div style={{flex:1}}>
                {[
                  {label:"COMPLETATI",  val:`${SCHEDULE.filter(s=>dayItems[s.id]).length}/${SCHEDULE.length}`, color:"var(--text)"},
                  {label:"SETTIMANA",   val:`${weekAvg}%`,  color:"var(--silver)"},
                  {label:"STREAK",      val:`${streak}`,    color:streak>0?"var(--green-done)":"var(--text3)", suffix:" gg"},
                ].map(({label,val,color,suffix},i)=>(
                  <div key={label} style={{
                    padding:`${i>0?"8px":"0"} 0 8px`,
                    borderBottom:i<2?"1px solid var(--border)":"none",
                    display:"flex",justifyContent:"space-between",alignItems:"baseline",
                  }}>
                    <span style={{
                      fontFamily:"var(--ff-display)",
                      fontSize:8,color:"var(--text4)",letterSpacing:"0.2em",
                    }}>{label}</span>
                    <span style={{
                      fontFamily:"var(--ff-display)",
                      fontSize:20,color,letterSpacing:"0.06em",
                    }}>{val}{suffix}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist blocks */}
            {Object.entries(BLOCKS).map(([block,meta],bi)=>{
              const items=meta.items;
              const doneCnt=items.filter(s=>dayItems[s.id]).length;
              return (
                <div key={block} style={{marginBottom:12}} className={`fade-up stagger-${bi+1}`}>
                  {/* Block header */}
                  <div style={{
                    display:"flex",alignItems:"center",justifyContent:"space-between",
                    padding:"6px 10px",
                    background:"var(--bg3)",
                    border:"1px solid var(--border-gold)",
                    borderBottom:"none",
                    marginBottom:0,
                  }}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{
                        fontFamily:"var(--ff-display)",
                        fontSize:18,color:meta.color,lineHeight:1,
                        filter:`drop-shadow(0 0 4px ${meta.color}50)`,
                      }}>{meta.rune}</span>
                      <span style={{
                        fontFamily:"var(--ff-display)",
                        fontSize:13,letterSpacing:"0.1em",color:"var(--text2)",
                      }}>{meta.label.toUpperCase()}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      {/* Mini progress */}
                      <div style={{width:36,height:2,background:"var(--bg4)"}}>
                        <div style={{
                          height:"100%",width:`${doneCnt/items.length*100}%`,
                          background:meta.color,transition:"width 0.4s",
                        }}/>
                      </div>
                      <span style={{
                        fontFamily:"var(--ff-display)",
                        fontSize:11,color:"var(--text3)",letterSpacing:"0.1em",
                      }}>{doneCnt}/{items.length}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div style={{border:"1px solid var(--border-gold)"}}>
                    {items.map((item,ii)=>{
                      const done=!!dayItems[item.id];
                      return (
                        <button key={item.id} onClick={()=>toggle(item.id)} style={{
                          display:"flex",alignItems:"center",gap:10,
                          padding:"9px 12px",textAlign:"left",width:"100%",
                          background:done?"rgba(92,132,72,0.08)":"transparent",
                          borderBottom:ii<items.length-1?"1px solid var(--border)":"none",
                          transition:"background 0.15s",
                        }}>
                          {/* Shield checkbox */}
                          <div style={{
                            width:18,height:18,flexShrink:0,
                            border:`1.5px solid ${done?meta.color:"var(--border2)"}`,
                            background:done?meta.color:"transparent",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            clipPath:"polygon(50% 0%, 100% 20%, 100% 80%, 50% 100%, 0% 80%, 0% 20%)",
                            transition:"all 0.15s",
                          }}>
                            {done && (
                              <svg width="9" height="7" viewBox="0 0 9 7" fill="none"
                                style={{animation:"checkIn 0.2s ease both"}}>
                                <path d="M1 3.5L3 5.5L8 1" stroke="var(--bg)"
                                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <span style={{fontSize:15,flexShrink:0}}>{item.emoji}</span>
                          <div style={{flex:1}}>
                            <span style={{
                              fontFamily:"var(--ff-body)",
                              fontSize:14,fontWeight:done?500:400,
                              color:done?"var(--text)":"var(--text2)",
                              fontStyle:done?"normal":"normal",
                              transition:"color 0.15s",
                            }}>{item.label}</span>
                            {item.time && (
                              <span style={{
                                marginLeft:8,
                                fontFamily:"var(--ff-display)",
                                fontSize:9,color:"var(--text4)",letterSpacing:"0.12em",
                              }}>{item.time}</span>
                            )}
                          </div>
                          {done && (
                            <span style={{
                              fontFamily:"var(--ff-display)",
                              fontSize:10,color:meta.color,
                              animation:"fadeIn 0.2s ease",letterSpacing:"0.1em",
                            }}>✦</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Divider */}
            <div className="rune-divider" style={{margin:"16px 0 14px",fontSize:10,letterSpacing:"0.2em",color:"var(--text4)"}}>
              ᚦ
            </div>

            {/* Activity */}
            <div style={{marginBottom:14}}>
              <div style={{
                fontFamily:"var(--ff-display)",
                fontSize:9,letterSpacing:"0.2em",color:"var(--text4)",marginBottom:8,
              }}>RITO DEL POMERIGGIO</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {ACTIVITIES.map(a=>{
                  const sel=activity===`${a.emoji} ${a.label}`;
                  return (
                    <button key={a.id}
                      onClick={()=>setActivity(x=>x===`${a.emoji} ${a.label}`?"":`${a.emoji} ${a.label}`)}
                      style={{
                        padding:"6px 12px",
                        fontFamily:"var(--ff-display)",
                        fontSize:10,letterSpacing:"0.12em",
                        background:sel?"var(--gold)":"var(--bg2)",
                        color:sel?"var(--bg)":"var(--text2)",
                        border:`1px solid ${sel?"var(--gold)":"var(--border-gold)"}`,
                        transition:"all 0.15s",
                      }}>
                      {a.emoji} {a.label.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Note */}
            <div style={{marginBottom:12}}>
              <div style={{
                fontFamily:"var(--ff-display)",
                fontSize:9,letterSpacing:"0.2em",color:"var(--text4)",marginBottom:6,
              }}>CRONACA DEL GIORNO</div>
              <textarea value={note} onChange={e=>setNote(e.target.value)}
                placeholder="Annota ciò che merita memoria…" rows={3}
                style={{
                  width:"100%",background:"var(--bg2)",
                  border:"1px solid var(--border-gold)",
                  color:"var(--text)",padding:"10px 12px",
                  fontFamily:"var(--ff-body)",fontStyle:"italic",
                  fontSize:14,lineHeight:1.6,
                  resize:"none",outline:"none",
                  transition:"border-color 0.15s",
                  borderRadius:0,
                }}
                onFocus={e=>e.target.style.borderColor="var(--gold)"}
                onBlur={e=>e.target.style.borderColor="var(--border-gold)"}
              />
            </div>
            <button onClick={()=>{saveDay();sync();}} style={{
              padding:"9px 24px",
              background:"transparent",
              border:"1px solid var(--gold)",
              color:"var(--gold)",
              fontFamily:"var(--ff-display)",
              fontSize:10,letterSpacing:"0.2em",
              transition:"background 0.2s, color 0.2s",
            }}
            onMouseEnter={e=>{e.currentTarget.style.background="var(--gold)";e.currentTarget.style.color="var(--bg)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="var(--gold)";}}>
              SIGILLA ✦
            </button>
          </div>
        )}

        {/* ════ MAPPA ════ */}
        {tab==="mappa" && (
          <div style={{padding:"16px 16px 100px"}} className="fade-up">

            {/* 3 stat cards */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {[
                {label:"COMPLETI",  val:totalDone,                           rune:"ᚠ", color:"var(--gold)"},
                {label:"STREAK",    val:streak,     suffix:"gg",             rune:"ᛏ", color:streak>0?"var(--green-done)":"var(--text3)"},
                {label:"RIMASTI",   val:Math.max(0,59-todayI),               rune:"ᚱ", color:"var(--text2)"},
              ].map(({label,val,suffix,rune,color})=>(
                <div key={label} style={{
                  ...card,padding:"12px 8px",textAlign:"center",
                }}>
                  {cornerAccent(color)}
                  <div style={{
                    fontFamily:"var(--ff-display)",
                    fontSize:9,color:"var(--text4)",letterSpacing:"0.2em",marginBottom:4,
                  }}>{rune}</div>
                  <div style={{
                    fontFamily:"var(--ff-display)",
                    fontSize:28,color,letterSpacing:"0.04em",lineHeight:1,
                  }}>
                    {val}{suffix&&<span style={{fontSize:14}}>{suffix}</span>}
                  </div>
                  <div style={{
                    fontFamily:"var(--ff-display)",
                    fontSize:8,color:"var(--text4)",letterSpacing:"0.15em",marginTop:4,
                  }}>{label}</div>
                </div>
              ))}
            </div>

            {/* 60-day grid */}
            <div style={{...card,padding:14,marginBottom:12}}>
              {cornerAccent()}
              <div style={{
                fontFamily:"var(--ff-display)",
                fontSize:9,letterSpacing:"0.2em",color:"var(--text4)",marginBottom:10,
              }}>LX GIORNI — BATTAGLIA</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:3}}>
                {Array.from({length:TOTAL},(_,i)=>{
                  const p=pct2(i);
                  const isToday=i===todayI, isSel=i===selDay, future=i>todayI;
                  return (
                    <div key={i}
                      title={`G${i+1} · ${fmt(i)} · ${p}%`}
                      onClick={()=>{setSelDay(i);setTab("oggi");}}
                      style={{
                        aspectRatio:"1",cursor:"pointer",
                        background:future?"var(--bg3)":p===100?"var(--gold)":p>0?`rgba(200,146,42,${0.08+p/100*0.42})`:"var(--bg4)",
                        border:isSel?`1.5px solid var(--gold)`:isToday?`1.5px solid var(--crimson)`:`1px solid var(--border)`,
                        transition:"transform 0.08s",
                        opacity:future?0.25:1,
                        boxShadow:p===100?"0 0 4px rgba(200,146,42,0.4)":"none",
                      }}
                      onMouseEnter={e=>{ e.currentTarget.style.transform="scale(1.35)"; e.currentTarget.style.zIndex=10; }}
                      onMouseLeave={e=>{ e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.zIndex=0; }}
                    />
                  );
                })}
              </div>
              <div style={{display:"flex",gap:10,marginTop:10}}>
                {[["var(--gold)","Completo"],["rgba(200,146,42,0.3)","Parziale"],["var(--bg4)","Vuoto"],["var(--crimson)","Oggi",true]].map(([c,l,border])=>(
                  <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:6,height:6,background:c,border:border?"1.5px solid var(--crimson)":"none"}}/>
                    <span style={{fontFamily:"var(--ff-display)",fontSize:8,color:"var(--text3)",letterSpacing:"0.1em"}}>{l.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Week chart */}
            <div style={{...card,padding:14,marginBottom:12}}>
              {cornerAccent()}
              <div style={{
                fontFamily:"var(--ff-display)",
                fontSize:9,letterSpacing:"0.2em",color:"var(--text4)",marginBottom:14,
              }}>ULTIMI VII GIORNI</div>
              <div style={{display:"flex",gap:4,alignItems:"flex-end",height:64}}>
                {Array.from({length:7},(_,i)=>{
                  const di=todayI-6+i; if(di<0) return <div key={i} style={{flex:1}}/>;
                  const p=pct2(di), isT=di===todayI;
                  return (
                    <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                      <div style={{
                        width:"100%",
                        height:`${Math.max(p*0.58,2)}px`,
                        background:isT?"var(--gold)":p===100?"var(--green-done)":"var(--bg4)",
                        minHeight:2,
                        transition:"height 0.5s cubic-bezier(.4,0,.2,1)",
                        opacity:p===0?0.3:1,
                        boxShadow:isT?"0 0 6px rgba(200,146,42,0.5)":"none",
                      }}/>
                      <span style={{
                        fontFamily:"var(--ff-display)",
                        fontSize:8,letterSpacing:"0.06em",
                        color:isT?"var(--gold)":"var(--text3)",
                      }}>
                        {dayDate(di).toLocaleDateString("it-IT",{weekday:"narrow"})}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Block bars */}
            <div style={{...card,padding:14}}>
              {cornerAccent()}
              <div style={{
                fontFamily:"var(--ff-display)",
                fontSize:9,letterSpacing:"0.2em",color:"var(--text4)",marginBottom:12,
              }}>FEDELTÀ PER BLOCCO</div>
              {Object.entries(BLOCKS).map(([block,meta])=>{
                const p=blockPerf[block]||0;
                return (
                  <div key={block} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:13,color:meta.color}}>{meta.rune}</span>
                        <span style={{
                          fontFamily:"var(--ff-display)",
                          fontSize:11,color:"var(--text2)",letterSpacing:"0.1em",
                        }}>{meta.label.toUpperCase()}</span>
                      </div>
                      <span style={{
                        fontFamily:"var(--ff-display)",
                        fontSize:16,color:meta.color,letterSpacing:"0.06em",
                      }}>{p}%</span>
                    </div>
                    <div style={{height:3,background:"var(--bg4)"}}>
                      <div style={{
                        height:"100%",width:`${p}%`,background:meta.color,
                        transition:"width 0.6s cubic-bezier(.4,0,.2,1)",
                        boxShadow:p>0?`0 0 4px ${meta.color}60`:"none",
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
          <div style={{padding:"16px 16px 100px"}} className="fade-up">

            {/* Big 4 */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {[
                {label:"GIORNI COMPLETI",  val:totalDone,   sub:`su ${todayI+1} giorni`,  color:"var(--gold)",   rune:"ᚠ"},
                {label:"STREAK ATTUALE",   val:streak,      sub:"giorni consecuti",         color:streak>0?"var(--green-done)":"var(--text3)", rune:"ᛏ"},
                {label:"MIGLIOR STREAK",   val:bestStreak,  sub:"record assoluto",          color:"var(--silver)", rune:"ᚹ"},
                {label:"MEDIA SETTIMANA",  val:`${weekAvg}%`,sub:"ultimi 7 giorni",         color:"var(--text2)",  rune:"ᚱ"},
              ].map(({label,val,sub,color,rune})=>(
                <div key={label} style={{...card,padding:"14px 12px"}}>
                  {cornerAccent(color)}
                  <div style={{
                    fontFamily:"var(--ff-display)",
                    fontSize:18,color,marginBottom:4,letterSpacing:"0.1em",
                    filter:`drop-shadow(0 0 6px ${color}40)`,
                  }}>{rune}</div>
                  <div style={{
                    fontFamily:"var(--ff-display)",
                    fontSize:34,color,letterSpacing:"0.04em",lineHeight:1,
                  }}>{val}</div>
                  <div style={{
                    fontFamily:"var(--ff-display)",
                    fontSize:8,color:"var(--text4)",letterSpacing:"0.15em",marginTop:6,
                  }}>{label}</div>
                  <div style={{
                    fontFamily:"var(--ff-body)",fontStyle:"italic",
                    fontSize:11,color:"var(--text3)",marginTop:2,
                  }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Radar */}
            <div style={{...card,padding:14,marginBottom:12,display:"flex",flexDirection:"column",alignItems:"center"}}>
              {cornerAccent()}
              <div style={{
                fontFamily:"var(--ff-display)",
                fontSize:9,letterSpacing:"0.2em",color:"var(--text4)",
                marginBottom:12,alignSelf:"flex-start",
              }}>MAPPA DELLE VIRTÙ</div>
              <RuneRadar data={blockPerf} size={190}/>
              <div style={{display:"flex",gap:12,marginTop:10,flexWrap:"wrap",justifyContent:"center"}}>
                {Object.entries(BLOCKS).map(([block,meta])=>(
                  <div key={block} style={{display:"flex",alignItems:"center",gap:4}}>
                    <span style={{fontSize:13,color:meta.color}}>{meta.rune}</span>
                    <span style={{
                      fontFamily:"var(--ff-display)",
                      fontSize:9,color:meta.color,letterSpacing:"0.1em",
                    }}>{meta.label.toUpperCase().split(" ")[1]||meta.label.toUpperCase()}</span>
                    <span style={{
                      fontFamily:"var(--ff-display)",
                      fontSize:11,color:"var(--text3)",
                    }}>{blockPerf[block]||0}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Best day */}
            {bestDay.i>=0 && (
              <div style={{...card,padding:16,marginBottom:12,display:"flex",alignItems:"center",gap:16}}>
                {cornerAccent("var(--gold)")}
                <div style={{
                  fontFamily:"var(--ff-display)",
                  fontSize:48,color:"var(--gold)",letterSpacing:"0.04em",
                  lineHeight:1,flexShrink:0,
                  filter:"drop-shadow(0 0 10px rgba(200,146,42,0.4))",
                }}>{toRoman(bestDay.i+1)}</div>
                <div>
                  <div style={{
                    fontFamily:"var(--ff-display)",
                    fontSize:8,color:"var(--text4)",letterSpacing:"0.2em",marginBottom:4,
                  }}>GIORNO DI GLORIA</div>
                  <div style={{
                    fontFamily:"var(--ff-body)",fontStyle:"italic",
                    fontSize:14,color:"var(--text)",
                  }}>{fmtLong(bestDay.i)}</div>
                  <div style={{
                    fontFamily:"var(--ff-display)",
                    fontSize:16,color:"var(--gold)",marginTop:4,letterSpacing:"0.06em",
                  }}>{bestDay.pct}% ✦</div>
                </div>
              </div>
            )}

            {/* Sfida progress */}
            <div style={{...card,padding:14,marginBottom:12}}>
              {cornerAccent()}
              <div style={{
                display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10,
              }}>
                <div style={{
                  fontFamily:"var(--ff-display)",
                  fontSize:9,letterSpacing:"0.2em",color:"var(--text4)",
                }}>AVANZAMENTO DELLA CAMPAGNA</div>
                <div style={{
                  fontFamily:"var(--ff-display)",
                  fontSize:18,color:"var(--gold)",letterSpacing:"0.06em",
                }}>{Math.round((totalDone/TOTAL)*100)}%</div>
              </div>
              <div style={{height:8,background:"var(--bg4)",position:"relative",marginBottom:6}}>
                <div style={{
                  position:"absolute",inset:0,
                  background:"repeating-linear-gradient(90deg,transparent 0,transparent 5px,var(--border) 5px,var(--border) 6px)",
                }}/>
                <div style={{
                  height:"100%",
                  width:`${(totalDone/TOTAL)*100}%`,
                  background:"linear-gradient(90deg, var(--crimson), var(--gold))",
                  transition:"width 0.8s cubic-bezier(.4,0,.2,1)",
                  position:"relative",zIndex:1,
                }}>
                  <div style={{
                    position:"absolute",right:0,top:0,bottom:0,width:2,
                    background:"var(--gold-light)",boxShadow:"0 0 8px var(--gold)",
                  }}/>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontFamily:"var(--ff-display)",fontSize:8,color:"var(--text4)",letterSpacing:"0.1em"}}>IV MAG MMXXVI</span>
                <span style={{fontFamily:"var(--ff-display)",fontSize:8,color:"var(--text4)",letterSpacing:"0.1em"}}>II LUG MMXXVI</span>
              </div>
            </div>

            {/* Links */}
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {[
                {label:"Dossier — Cronache di Marco", sub:"Google Docs", icon:"ᚦ", url:DOC_URL,  color:"var(--silver)"},
                {label:"Marco — Consigliere Reale",   sub:"Telegram",   icon:"ᚢ", url:TG_URL,   color:"var(--green-done)"},
              ].map(({label,sub,icon,url,color})=>(
                <a key={label} href={url} target="_blank" rel="noopener noreferrer" style={{
                  ...card,
                  display:"flex",alignItems:"center",gap:12,
                  padding:"12px 14px",textDecoration:"none",
                  transition:"border-color 0.15s",
                }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=color}
                onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border-gold)"}
                >
                  <span style={{
                    fontFamily:"var(--ff-display)",
                    fontSize:22,color,flexShrink:0,
                    filter:`drop-shadow(0 0 6px ${color}60)`,
                  }}>{icon}</span>
                  <div>
                    <div style={{
                      fontFamily:"var(--ff-display)",
                      fontSize:12,color:"var(--text)",letterSpacing:"0.06em",
                    }}>{label}</div>
                    <div style={{
                      fontFamily:"var(--ff-body)",fontStyle:"italic",
                      fontSize:11,color:"var(--text3)",marginTop:2,
                    }}>{sub}</div>
                  </div>
                  <span style={{marginLeft:"auto",color:"var(--text4)",fontSize:12}}>→</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ══ TAB BAR ══ */}
      <nav style={{
        display:"flex",
        borderTop:"1px solid var(--border-gold)",
        background:"var(--bg)",
        paddingBottom:"var(--safe-bottom)",
        flexShrink:0,
        position:"relative",
      }}>
        {/* Gold line top */}
        <div style={{
          position:"absolute",top:0,left:0,right:0,height:1,
          background:"linear-gradient(90deg, transparent, var(--gold), transparent)",
          opacity:0.4,
        }}/>
        {[
          {id:"oggi",  rune:"ᛟ", label:"DIES"},
          {id:"mappa", rune:"ᚲ", label:"CARTA"},
          {id:"stats", rune:"ᛊ", label:"GLORIA"},
        ].map(({id,rune,label})=>{
          const active=tab===id;
          return (
            <button key={id} onClick={()=>setTab(id)} style={{
              flex:1,padding:"12px 0 10px",
              display:"flex",flexDirection:"column",alignItems:"center",gap:2,
              color:active?"var(--gold)":"var(--text3)",
              transition:"color 0.15s",
              position:"relative",
            }}>
              {active && (
                <div style={{
                  position:"absolute",top:-1,left:"15%",right:"15%",
                  height:2,background:"var(--gold)",
                  boxShadow:"0 0 8px var(--gold)",
                }}/>
              )}
              <span style={{
                fontFamily:"var(--ff-display)",
                fontSize:20,lineHeight:1,
                filter:active?"drop-shadow(0 0 6px rgba(200,146,42,0.6))":"none",
                transition:"filter 0.3s",
              }}>{rune}</span>
              <span style={{
                fontFamily:"var(--ff-display)",
                fontSize:8,letterSpacing:"0.2em",
              }}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
