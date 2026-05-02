import { useState, useEffect, useRef, useCallback } from "react";
import "./index.css";

const SCHEDULE = [
  { id: "sveglia",    label: "Sveglia 06:00",      emoji: "⏰", block: "mattina" },
  { id: "flessioni",  label: "Flessioni",           emoji: "💪", block: "mattina" },
  { id: "preghiere",  label: "Preghiere",           emoji: "🙏", block: "mattina" },
  { id: "caffe",      label: "Caffè",               emoji: "☕", block: "mattina" },
  { id: "corda",      label: "Corda",               emoji: "🪢", block: "mattina" },
  { id: "addominali", label: "Addominali",          emoji: "🔥", block: "mattina" },
  { id: "ballo",      label: "Ballo, Pronto!",      emoji: "🕺", block: "mattina" },
  { id: "autobus",    label: "Autobus 07:00",       emoji: "🚌", block: "logistica" },
  { id: "messa",      label: "Messa 07:30",         emoji: "⛪", block: "logistica" },
  { id: "colazione",  label: "Colazione 08:00",     emoji: "🥐", block: "logistica" },
  { id: "lavoro",     label: "Biblioteca / Lavoro", emoji: "📚", block: "logistica" },
  { id: "pranzo",     label: "Pranzo 15:00",        emoji: "🥗", block: "pomeriggio" },
  { id: "attivita",   label: "Attività",            emoji: "🌊", block: "pomeriggio" },
  { id: "cena",       label: "Cena 20:30",          emoji: "🍎", block: "sera" },
  { id: "noscreen",   label: "No Screen",           emoji: "🚫", block: "sera" },
  { id: "compieta",   label: "Compieta",            emoji: "🙏", block: "sera" },
  { id: "letto",      label: "Letto 21:30",         emoji: "😴", block: "sera" },
];

const BLOCKS = {
  mattina:    { label: "Mattina",    subtitle: "Il Boot",     accent: "var(--gold)" },
  logistica:  { label: "Logistica",  subtitle: "& Lavoro",   accent: "var(--green)" },
  pomeriggio: { label: "Pomeriggio", subtitle: "Rigenero",   accent: "var(--blue)" },
  sera:       { label: "Sera",       subtitle: "Il Distacco",accent: "var(--purple)" },
};

const ACTIVITIES = ["Palestra 🏋️", "Mare 🌊", "Chiese ⛪", "Flair & Musica 🎸", "Riposo 🛌"];

const START = new Date("2025-05-02T00:00:00");
const TOTAL = 60;

const SYSTEM_PROMPT = `Sei il Coach della Sfida 60 Giorni: Decompressione Cervello di Chris.

Sfida: 2 Maggio – 30 Giugno. Schema:
MATTINA: Sveglia 06:00, Flessioni, Preghiere, Caffè, Corda, Addominali, Ballo
LOGISTICA: Autobus 07:00, Messa 07:30, Colazione 08:00, Biblioteca/Lavoro 09-14
POMERIGGIO: Pranzo 15:00, Attività (Palestra/Mare/Chiese/Flair+Musica)
SERA: Cena 20:30, No Screen, Compieta, Letto 21:30

Tag di vita: PALESTRA • MOGLIE • VITA • RIPOSO • PRATICA

Ruolo: coach diretto, asciutto, radicato nella tradizione monastica e nella Via.
Zero banalità. Italiano. Concreto. A volte duro. Sempre onesto.
Conosci il contesto Fourth Way e cattolico di Chris. Usalo quando pertinente.`;

function dayIndex(date = new Date()) {
  const d = new Date(date); d.setHours(0,0,0,0);
  const s = new Date(START); s.setHours(0,0,0,0);
  return Math.floor((d - s) / 86400000);
}

function dayDate(idx) {
  const d = new Date(START);
  d.setDate(d.getDate() + idx);
  return d;
}

function formatDay(idx) {
  return dayDate(idx).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
}

function dateISO(idx) {
  return dayDate(idx).toISOString().split("T")[0];
}

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function RingProgress({ pct, size = 72 }) {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg4)" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={pct > 0 ? "var(--gold-light)" : "transparent"}
        strokeWidth="5" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
        style={{ transition: "stroke-dashoffset 0.5s ease" }} />
    </svg>
  );
}

function BlockSection({ block, items, dayItems, onToggle, theme }) {
  const meta = BLOCKS[block];
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10,
        paddingBottom: 7, borderBottom: `1px solid ${meta.accent.replace("var(--", "").replace(")", "")}` }}>
        <span className="t-display" style={{ fontSize: "0.72rem", color: meta.accent }}>
          {meta.label}
        </span>
        <span className="t-subheading" style={{ fontSize: "0.8rem", color: "var(--text3)" }}>
          {meta.subtitle}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
        {items.map(item => {
          const done = !!dayItems[item.id];
          return (
            <button key={item.id} className="btn" onClick={() => onToggle(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "8px 10px", borderRadius: 5, textAlign: "left",
                background: done ? "var(--item-done-bg, var(--bg3))" : "var(--bg2)",
                border: `1px solid ${done ? "var(--gold)" : "var(--border)"}`,
                opacity: done ? 1 : 0.85,
                transition: "all 0.15s",
              }}>
              <div style={{
                width: 17, height: 17, borderRadius: 3, flexShrink: 0,
                border: `1.5px solid ${done ? "var(--gold)" : "var(--border2)"}`,
                background: done ? "var(--gold)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}>
                {done && <span style={{ fontSize: 9, color: theme === "dark" ? "#080807" : "#fff", fontWeight: 900 }}>✓</span>}
              </div>
              <span style={{ fontSize: "0.85rem" }}>{item.emoji}</span>
              <span className="t-body" style={{
                fontSize: "0.82rem", lineHeight: 1.3,
                color: done ? "var(--text)" : "var(--text3)",
              }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const todayIdx = Math.max(0, Math.min(dayIndex(), TOTAL - 1));
  const [theme, setTheme] = useState(() => load("sfida_theme", "dark"));
  const [data, setData]   = useState(() => load("sfida60_data", {}));
  const [selDay, setSelDay] = useState(todayIdx);
  const [tab, setTab]     = useState("oggi");
  const [msgs, setMsgs]   = useState([{ role: "assistant", content: "Sono qui. Cosa stai portando oggi?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [gcalSt, setGcalSt]   = useState(null);
  const [gmailSt, setGmailSt] = useState(null);
  const [note, setNote]       = useState("");
  const [activity, setActivity] = useState("");
  const chatRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    save("sfida_theme", theme);
  }, [theme]);

  useEffect(() => { save("sfida60_data", data); }, [data]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [msgs]);

  useEffect(() => {
    const k = `day_${selDay}`;
    setNote(data[k]?.note || "");
    setActivity(data[k]?.activity || "");
  }, [selDay]);

  const dayKey = `day_${selDay}`;
  const dayItems = data[dayKey]?.items || {};

  const pctOf = useCallback((idx) => {
    const items = data[`day_${idx}`]?.items || {};
    return Math.round(SCHEDULE.filter(s => items[s.id]).length / SCHEDULE.length * 100);
  }, [data]);

  const dayPct = pctOf(selDay);
  const totalDone = Array.from({ length: TOTAL }, (_, i) => pctOf(i) === 100 ? 1 : 0).reduce((a, b) => a + b, 0);

  const toggle = (id) => {
    setData(prev => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], items: { ...(prev[dayKey]?.items || {}), [id]: !prev[dayKey]?.items?.[id] } }
    }));
  };

  const saveDay = () => {
    setData(prev => ({ ...prev, [dayKey]: { ...prev[dayKey], note, activity } }));
  };

  const sendMsg = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMsgs(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    const done = SCHEDULE.filter(s => dayItems[s.id]).map(s => s.label);
    const miss = SCHEDULE.filter(s => !dayItems[s.id]).map(s => s.label);
    const ctx = `[Giorno ${selDay+1}/60 · ${formatDay(selDay)}]\nCompletati: ${done.join(", ")||"—"}\nMancanti: ${miss.join(", ")||"—"}\nAttività: ${activity||"—"}\nNote: ${note||"—"}\nGiorni completi: ${totalDone}/${selDay+1}`;
    const history = [
      { role: "user", content: ctx },
      { role: "assistant", content: "Capito." },
      ...msgs.slice(1),
      { role: "user", content: userMsg },
    ];
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: SYSTEM_PROMPT, messages: history }),
      });
      const d = await res.json();
      setMsgs(prev => [...prev, { role: "assistant", content: d.content?.[0]?.text || "…" }]);
    } catch {
      setMsgs(prev => [...prev, { role: "assistant", content: "Errore connessione." }]);
    }
    setLoading(false);
  };

  const syncCalendar = async () => {
    setGcalSt("loading");
    const ds = dateISO(selDay);
    const events = [
      { t: "⏰ Boot — Routine Mattina", h: 6, m: 0, dur: 45 },
      { t: "🚌 Autobus", h: 7, m: 0, dur: 25 },
      { t: "⛪ Messa", h: 7, m: 30, dur: 30 },
      { t: "🥐 Colazione", h: 8, m: 0, dur: 45 },
      { t: "📚 Biblioteca / Lavoro", h: 9, m: 0, dur: 300 },
      { t: "🥗 Pranzo", h: 15, m: 0, dur: 45 },
      { t: activity ? `🌊 ${activity}` : "🌊 Attività Pomeriggio", h: 16, m: 0, dur: 120 },
      { t: "🍎 Cena", h: 20, m: 30, dur: 45 },
      { t: "🙏 Compieta", h: 21, m: 0, dur: 20 },
      { t: `😴 Letto — Fine Giorno ${selDay+1}`, h: 21, m: 30, dur: 30 },
    ];
    const evList = events.map(e => {
      const end = new Date(`${ds}T${String(e.h).padStart(2,"0")}:${String(e.m).padStart(2,"0")}:00`);
      end.setMinutes(end.getMinutes() + e.dur);
      return `"${e.t}" ${String(e.h).padStart(2,"0")}:${String(e.m).padStart(2,"0")} → ${String(end.getHours()).padStart(2,"0")}:${String(end.getMinutes()).padStart(2,"0")}`;
    }).join("\n");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 4000,
          system: `Crea gli eventi su Google Calendar per la Sfida 60 Giorni di Chris. Data: ${ds} (${formatDay(selDay)}), Giorno ${selDay+1}/60. Timezone: Europe/Rome. Crea tutti gli eventi elencati. Rispondi in italiano.`,
          messages: [{ role: "user", content: `Crea questi eventi su Google Calendar (${ds}, timezone Europe/Rome):\n\n${evList}\n\nCrea tutti e confermami.` }],
          mcp_servers: [{ type: "url", url: "https://calendarmcp.googleapis.com/mcp/v1", name: "google-calendar" }],
        }),
      });
      const d = await res.json();
      const text = (d.content||[]).filter(b => b.type==="text").map(b => b.text).join("\n");
      setMsgs(prev => [...prev, { role: "assistant", content: `📅 Google Calendar — Giorno ${selDay+1}\n\n${text}` }]);
      setTab("coach");
      setGcalSt("ok");
    } catch { setGcalSt("err"); }
    setTimeout(() => setGcalSt(null), 4000);
  };

  const sendReport = async () => {
    setGmailSt("loading");
    const done = SCHEDULE.filter(s => dayItems[s.id]).map(s => s.label);
    const miss = SCHEDULE.filter(s => !dayItems[s.id]).map(s => s.label);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 2000,
          system: `Scrivi e salva come draft Gmail il report giornaliero della Sfida 60 Giorni di Chris. Tono: asciutto, monastico, onesto. Italiano. Max 150 parole. Oggetto: "Sfida 60gg · Giorno ${selDay+1} · ${dayPct}%"`,
          messages: [{ role: "user", content: `Report Giorno ${selDay+1}/60 — ${formatDay(selDay)}\nCompletamento: ${dayPct}%\nCompletati: ${done.join(", ")||"—"}\nMancanti: ${miss.join(", ")||"—"}\nAttività: ${activity||"—"}\nNote: ${note||"—"}\nProgressione: ${totalDone}/${selDay+1}\n\nSalva come draft Gmail e confermami.` }],
          mcp_servers: [{ type: "url", url: "https://gmailmcp.googleapis.com/mcp/v1", name: "gmail" }],
        }),
      });
      const d = await res.json();
      const text = (d.content||[]).filter(b => b.type==="text").map(b => b.text).join("\n");
      setMsgs(prev => [...prev, { role: "assistant", content: `📧 Draft Gmail — Giorno ${selDay+1}\n\n${text}` }]);
      setTab("coach");
      setGmailSt("ok");
    } catch { setGmailSt("err"); }
    setTimeout(() => setGmailSt(null), 4000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", maxWidth: 520, margin: "0 auto" }}>

      {/* HEADER */}
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "var(--bg)", borderBottom: "1px solid var(--border)",
        padding: "14px 18px 0", boxShadow: "0 4px 24px var(--shadow)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 className="t-display" style={{ fontSize: "1.25rem", color: "var(--gold)", letterSpacing: "0.1em" }}>
              Sfida 60 Giorni
            </h1>
            <p className="t-subheading" style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: 1 }}>
              Decompressione Cervello · 2 Maggio — 30 Giugno
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div className="t-display" style={{ fontSize: "1.9rem", color: "var(--gold)", lineHeight: 1 }}>
                {totalDone}<span style={{ fontSize: "0.9rem", color: "var(--text4)", fontWeight: 400 }}>/60</span>
              </div>
              <div className="t-label" style={{ color: "var(--text4)", marginTop: 1 }}>completi</div>
            </div>
            <button className="btn" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
              style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "var(--bg3)", border: "1px solid var(--border2)",
                fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
        <div style={{ height: 2, background: "var(--bg4)", margin: "10px 0 0", borderRadius: 1, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(totalDone/TOTAL)*100}%`, background: "linear-gradient(90deg, #8B6010, var(--gold))", transition: "width 0.6s ease" }} />
        </div>
        <nav style={{ display: "flex", gap: 0, marginTop: 2 }}>
          {[["oggi","📅 Oggi"],["griglia","▦ Griglia"],["coach","✦ Coach"]].map(([id, lbl]) => (
            <button key={id} className="btn" onClick={() => setTab(id)} style={{
              padding: "10px 16px 9px", fontSize: "0.67rem", letterSpacing: "0.12em",
              fontFamily: "'Lato', sans-serif", fontWeight: 700, textTransform: "uppercase",
              color: tab === id ? "var(--gold)" : "var(--text4)",
              borderBottom: `2px solid ${tab === id ? "var(--gold)" : "transparent"}`,
              transition: "color 0.2s, border-color 0.2s",
            }}>{lbl}</button>
          ))}
        </nav>
      </header>

      <main style={{ padding: "20px 16px 40px" }}>

        {/* TAB OGGI */}
        {tab === "oggi" && (
          <div className="fade-in">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <button className="btn" onClick={() => setSelDay(d => Math.max(0, d-1))} style={{
                width: 32, height: 32, borderRadius: 5, background: "var(--bg3)",
                border: "1px solid var(--border2)", color: "var(--gold)", fontSize: "1.1rem"
              }}>‹</button>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span className="t-heading" style={{ fontSize: "1.1rem" }}>Giorno {selDay + 1}</span>
                  {selDay === todayIdx && (
                    <span className="t-label" style={{ background: "var(--gold-dim)", color: "var(--gold)", padding: "2px 8px", borderRadius: 10, fontSize: "0.6rem" }}>Oggi</span>
                  )}
                </div>
                <div className="t-subheading" style={{ fontSize: "0.82rem", color: "var(--text3)", marginTop: 1 }}>{formatDay(selDay)}</div>
              </div>
              <button className="btn" onClick={() => setSelDay(d => Math.min(TOTAL-1, d+1))} style={{
                width: 32, height: 32, borderRadius: 5, background: "var(--bg3)",
                border: "1px solid var(--border2)", color: "var(--gold)", fontSize: "1.1rem"
              }}>›</button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22, position: "relative", width: 78, margin: "0 auto 22px" }}>
              <RingProgress pct={dayPct} size={78} />
              <div style={{ position: "absolute", textAlign: "center" }}>
                <div className="t-display" style={{ fontSize: "1.1rem", color: dayPct === 100 ? "var(--gold)" : "var(--text)", lineHeight: 1 }}>
                  {dayPct}%
                </div>
              </div>
            </div>

            {Object.keys(BLOCKS).map(block => (
              <BlockSection key={block} block={block} theme={theme}
                items={SCHEDULE.filter(s => s.block === block)}
                dayItems={dayItems} onToggle={toggle} />
            ))}

            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 7, padding: 14, marginTop: 4 }}>
              <div className="t-label" style={{ color: "var(--gold)", marginBottom: 10 }}>Attività & Note</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                {ACTIVITIES.map(tag => (
                  <button key={tag} className="btn" onClick={() => setActivity(a => a === tag ? "" : tag)} style={{
                    padding: "4px 10px", borderRadius: 12, fontSize: "0.72rem",
                    background: activity === tag ? "var(--gold)" : "var(--bg3)",
                    color: activity === tag ? (theme === "dark" ? "#080807" : "#fff") : "var(--text3)",
                    border: `1px solid ${activity === tag ? "var(--gold)" : "var(--border2)"}`,
                    fontFamily: "'Lato', sans-serif",
                  }}>{tag}</button>
                ))}
              </div>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note del giorno…" rows={2}
                style={{
                  width: "100%", background: "var(--bg)", border: "1px solid var(--border2)",
                  borderRadius: 5, color: "var(--text)", padding: "8px 10px",
                  fontFamily: "'Cormorant Garamond', serif", fontSize: "0.95rem",
                  lineHeight: 1.6, resize: "vertical", outline: "none",
                }} />
              <button className="btn" onClick={saveDay} style={{
                marginTop: 8, padding: "6px 18px", background: "var(--gold)",
                color: theme === "dark" ? "#080807" : "#fff",
                borderRadius: 5, fontFamily: "'Lato', sans-serif",
                fontWeight: 700, fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase"
              }}>Salva</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
              <button className="btn" onClick={syncCalendar} style={{
                padding: "10px 8px", background: "var(--bg2)", border: "1px solid var(--border)",
                borderRadius: 5, color: gcalSt === "ok" ? "var(--green)" : gcalSt === "err" ? "#C0392B" : "var(--blue)",
                fontFamily: "'Lato', sans-serif", fontSize: "0.7rem", letterSpacing: "0.04em",
              }}>
                {gcalSt === "loading" ? "⟳ Sync…" : gcalSt === "ok" ? "✓ Creati" : gcalSt === "err" ? "✗ Errore" : "📅 Sync Calendar"}
              </button>
              <button className="btn" onClick={sendReport} style={{
                padding: "10px 8px", background: "var(--bg2)", border: "1px solid var(--border)",
                borderRadius: 5, color: gmailSt === "ok" ? "var(--green)" : gmailSt === "err" ? "#C0392B" : "var(--gold)",
                fontFamily: "'Lato', sans-serif", fontSize: "0.7rem", letterSpacing: "0.04em",
              }}>
                {gmailSt === "loading" ? "⟳ Invio…" : gmailSt === "ok" ? "✓ Salvato" : gmailSt === "err" ? "✗ Errore" : "📧 Draft Gmail"}
              </button>
            </div>
          </div>
        )}

        {/* TAB GRIGLIA */}
        {tab === "griglia" && (
          <div className="fade-in">
            <p className="t-subheading" style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--text3)", marginBottom: 16 }}>
              Ogni quadrato è un giorno · oro = completo
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 4 }}>
              {Array.from({ length: TOTAL }, (_, i) => {
                const pct = pctOf(i);
                const isToday = i === todayIdx;
                const isSel = i === selDay;
                const future = i > todayIdx;
                return (
                  <div key={i} title={`Giorno ${i+1} · ${formatDay(i)} · ${pct}%`}
                    onClick={() => { setSelDay(i); setTab("oggi"); }}
                    style={{
                      aspectRatio: "1", borderRadius: 3, cursor: "pointer",
                      background: future ? "var(--bg2)" : pct === 100 ? "var(--gold)" : pct > 0 ? `rgba(201,149,42,${0.1 + pct/100*0.55})` : "var(--bg3)",
                      border: isSel ? "2px solid var(--gold)" : isToday ? "2px solid var(--blue)" : "1px solid var(--border)",
                      transition: "transform 0.1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.25)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                  />
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 14, justifyContent: "center", flexWrap: "wrap" }}>
              {[["var(--gold)", "Completo"], ["rgba(201,149,42,0.4)", "Parziale"], ["var(--bg3)", "Vuoto"]].map(([color, label]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 9, height: 9, borderRadius: 2, background: color }} />
                  <span className="t-label" style={{ color: "var(--text3)" }}>{label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 20 }}>
              {[["Completi", totalDone],["Trascorsi", Math.min(todayIdx+1, 60)],["Rimasti", Math.max(0, 59-todayIdx)]].map(([label, value]) => (
                <div key={label} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, padding: "14px 8px", textAlign: "center" }}>
                  <div className="t-display" style={{ fontSize: "1.7rem", color: "var(--gold)" }}>{value}</div>
                  <div className="t-label" style={{ color: "var(--text4)", marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18 }}>
              <div className="t-label" style={{ color: "var(--text3)", marginBottom: 10 }}>Completamento per Blocco</div>
              {Object.keys(BLOCKS).map(block => {
                const blockItems = SCHEDULE.filter(s => s.block === block);
                const total = Array.from({ length: todayIdx+1 }, (_, i) => {
                  const items = data[`day_${i}`]?.items || {};
                  return blockItems.filter(s => items[s.id]).length;
                }).reduce((a,b) => a+b, 0);
                const max = (todayIdx+1) * blockItems.length;
                const pct = max > 0 ? Math.round(total / max * 100) : 0;
                const meta = BLOCKS[block];
                return (
                  <div key={block} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span className="t-subheading" style={{ fontSize: "0.8rem", color: "var(--text2)" }}>{meta.label}</span>
                      <span className="t-mono" style={{ fontSize: "0.75rem", color: meta.accent }}>{pct}%</span>
                    </div>
                    <div style={{ height: 3, background: "var(--bg4)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: meta.accent, borderRadius: 2, transition: "width 0.5s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB COACH */}
        {tab === "coach" && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 190px)", minHeight: 420 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span className="t-subheading" style={{ fontSize: "0.8rem", color: "var(--text3)" }}>
                Giorno {selDay+1}/60 · {formatDay(selDay)}
              </span>
              <button className="btn" onClick={() => setMsgs([{ role: "assistant", content: "Sono qui. Cosa stai portando oggi?" }])}
                style={{ fontSize: "0.65rem", color: "var(--text4)", fontFamily: "'Lato', sans-serif", letterSpacing: "0.08em" }}>
                ↺ Nuova chat
              </button>
            </div>
            <div ref={chatRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 8 }}>
              {msgs.map((msg, i) => (
                <div key={i} className="fade-in" style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  background: msg.role === "user" ? "var(--gold-dim)" : "var(--bg2)",
                  border: `1px solid ${msg.role === "user" ? "var(--gold)" : "var(--border)"}`,
                  borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  padding: "10px 14px",
                }}>
                  {msg.role === "assistant" && (
                    <div className="t-label" style={{ color: "var(--gold)", marginBottom: 5, fontSize: "0.6rem" }}>✦ Coach</div>
                  )}
                  <p className="t-body" style={{ fontSize: "0.9rem", color: "var(--text)", whiteSpace: "pre-wrap", margin: 0 }}>
                    {msg.content}
                  </p>
                </div>
              ))}
              {loading && (
                <div style={{ alignSelf: "flex-start", padding: "10px 16px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "14px 14px 14px 4px" }}>
                  <span style={{ color: "var(--gold)", fontSize: "1.4rem", animation: "pulse 1.2s infinite" }}>···</span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {["Come va?", "Motivami", "Settimana", "Domani"].map(p => (
                <button key={p} className="btn" onClick={() => setInput(p)} style={{
                  padding: "4px 10px", borderRadius: 12, fontSize: "0.7rem",
                  background: "var(--bg3)", border: "1px solid var(--border2)",
                  color: "var(--text3)", fontFamily: "'Lato', sans-serif",
                }}>{p}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMsg()}
                placeholder="Scrivi al coach…"
                style={{
                  flex: 1, background: "var(--bg2)", border: "1px solid var(--border2)",
                  borderRadius: 7, color: "var(--text)", padding: "10px 14px",
                  fontFamily: "'Cormorant Garamond', serif", fontSize: "0.95rem", outline: "none",
                }}
                onFocus={e => e.target.style.borderColor = "var(--gold)"}
                onBlur={e => e.target.style.borderColor = "var(--border2)"}
              />
              <button className="btn" onClick={sendMsg} disabled={loading} style={{
                padding: "10px 18px", background: loading ? "var(--bg3)" : "var(--gold)",
                color: theme === "dark" ? "#080807" : "#fff",
                borderRadius: 7, fontFamily: "'Cormorant SC', serif",
                fontWeight: 600, fontSize: "1rem", opacity: loading ? 0.5 : 1,
              }}>→</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
