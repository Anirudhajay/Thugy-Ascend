import { useState, useEffect, useRef, useCallback } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

// ─── CONSTANTS (Updated for Black Theme) ──────────────────
const ACCENT = "#4F46E5"; 
const BG = "#000000";     // Pure Black Background
const CARD = "#121212";   // Dark Grey Cards

const CLASSES = {
  Warrior: { icon: "⚔️", bonus: "str", desc: "Gym-focused · +2 STR" },
  Scholar: { icon: "📖", bonus: "int", desc: "Career-focused · +2 INT" },
  Sage:    { icon: "🔮", bonus: "foc", desc: "Balanced · +2 FOC" },
  Phantom: { icon: "🎭", bonus: "chm", desc: "Social-focused · +2 CHM" },
};

const RANKS = [
  { name: "Iron",     min: 1,  color: "#9ca3af" },
  { name: "Bronze",   min: 10, color: "#b45309" },
  { name: "Silver",   min: 20, color: "#64748b" },
  { name: "Gold",     min: 30, color: "#d97706" },
  { name: "Platinum", min: 40, color: "#06b6d4" },
  { name: "Diamond",  min: 50, color: "#4F46E5" },
  { name: "Legend",   min: 75, color: "#7c3aed" },
];

const DAYS_S = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const DAYS_F = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const PILLARS = ["Fitness","Career","Relationships","Mindset"];
const P_STAT  = { Fitness:"str", Career:"int", Relationships:"chm", Mindset:"foc" };
const P_COLOR = { Fitness:"#ef4444", Career:"#4F46E5", Relationships:"#ec4899", Mindset:"#8b5cf6" };
const S_LABEL = { str:"STR", int:"INT", chm:"CHM", foc:"FOC" };
const S_FULL  = { str:"Strength", int:"Intelligence", chm:"Charisma", foc:"Focus" };
const S_PILAR = { str:"Fitness", int:"Career", chm:"Relationships", foc:"Mindset" };
const REL_TYPES = ["Partner","Friend","Family","Mentor"];
const EMOJIS = ["⚡","🎯","📚","💪","🧘","🎨","🎵","💻","🌿","🚀","❤️","🔥","⭐","🏃","🍎","✍️","🎤","🌙","🏆","💡"];
const QUOTES = [
  "The journey of a thousand miles begins with a single step.",
  "You are the hero of your own story.",
  "Every level reveals new challenges and new strengths.",
  "Progress, not perfection.",
  "The grind never lies.",
  "Champions are made in the moments they want to quit.",
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const xpForLevel = (l) => l * 500 + 1500;
const xpForStat  = (l) => l * 200 + 200;
const uid = () => Math.random().toString(36).slice(2, 9);
const todayStr = () => new Date().toDateString();
const yesterdayStr = () => new Date(Date.now() - 86400000).toDateString();
const todayDayIdx = () => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; };
const getRank = (level) => { let r = RANKS[0]; for (const rk of RANKS) { if (level >= rk.min) r = rk; } return r; };
const getMult = (streak) => { if (streak >= 14) return 2.0; if (streak >= 7) return 1.5; if (streak >= 3) return 1.2; return 1.0; };
const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const KEY = "ascend_v3";
const loadData = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const saveData = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} };

const mkChar = (name, cls) => ({
  name, class: cls, level: 1, xp: 0,
  stats: { str: cls==="Warrior"?2:1, int: cls==="Scholar"?2:1, chm: cls==="Phantom"?2:1, foc: cls==="Sage"?2:1 },
  statXp: { str:0, int:0, chm:0, foc:0 },
  totalXpEarned: 0, xpLog: [], lastReset: todayStr(),
});

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
body{background:#e8e8f4;font-family:'Outfit',sans-serif;}
::-webkit-scrollbar{width:0;}
@keyframes floatXP{0%{transform:translateX(-50%) translateY(0);opacity:1}100%{transform:translateX(-50%) translateY(-64px);opacity:0}}
@keyframes pop{0%{transform:scale(0.7);opacity:0}60%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
@keyframes slideUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes checkBounce{0%{transform:scale(0)}60%{transform:scale(1.3)}100%{transform:scale(1)}}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.card{background:#fff;border-radius:18px;box-shadow:0 2px 16px rgba(79,70,229,0.07);}
.slide-up{animation:slideUp 0.3s ease both;}
.pop{animation:pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both;}
.btn{border:none;border-radius:14px;padding:13px 20px;font-family:'Outfit',sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:all 0.18s;letter-spacing:0.2px;}
.btn-p{background:#4F46E5;color:white;width:100%;}
.btn-p:hover{background:#4338ca;}
.btn-p:active{transform:scale(0.97);}
.btn-p:disabled{background:#a5b4fc;cursor:default;}
.btn-g{background:transparent;border:1.5px solid #e5e7eb;color:#374151;}
.btn-g:hover{background:#f9fafb;}
.inp{width:100%;border:1.5px solid #e5e7eb;border-radius:12px;padding:11px 14px;font-family:'Outfit',sans-serif;font-size:14px;outline:none;transition:border 0.2s;color:#111;background:white;}
.inp:focus{border-color:#4F46E5;box-shadow:0 0 0 3px rgba(79,70,229,0.1);}
select.inp{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;}
`;

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
function XPBar({ xp, max, color=ACCENT, h=8 }) {
  const pct = Math.min(100, max > 0 ? (xp / max) * 100 : 0);
  return (
    <div style={{ background:"#e5e7eb", borderRadius:99, height:h, overflow:"hidden" }}>
      <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:99, transition:"width 0.7s cubic-bezier(0.4,0,0.2,1)" }} />
    </div>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);
  return (
    <div onClick={e => e.target===e.currentTarget && onClose()} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:300, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div className="slide-up" style={{ background:CARD, borderRadius:"24px 24px 0 0", width:"100%", maxWidth:430, maxHeight:"88vh", overflowY:"auto", padding:"24px 20px 32px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ fontSize:18, fontWeight:800 }}>{title}</h3>
          <button onClick={onClose} style={{ background:"#f3f4f6", border:"none", borderRadius:"50%", width:32, height:32, fontSize:18, cursor:"pointer", color:"#6b7280", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LevelUpModal({ data, onClose }) {
  const rank = getRank(data.level);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div className="pop card" style={{ padding:36, textAlign:"center", maxWidth:300, width:"100%" }}>
        <div style={{ fontSize:64, lineHeight:1 }}>🏆</div>
        <h2 style={{ fontSize:15, fontWeight:700, color:"#9ca3af", marginTop:12, letterSpacing:2, textTransform:"uppercase" }}>Level Up!</h2>
        <div style={{ fontSize:72, fontWeight:900, color:ACCENT, lineHeight:1, margin:"8px 0" }}>{data.level}</div>
        <div style={{ fontSize:20, fontWeight:700, color:rank.color, marginBottom:8 }}>{rank.name} Rank</div>
        {data.quote && <p style={{ color:"#6b7280", fontStyle:"italic", fontSize:13, lineHeight:1.5, margin:"16px 0" }}>"{data.quote}"</p>}
        <button className="btn btn-p" style={{ marginTop:8 }} onClick={onClose}>Keep Grinding →</button>
      </div>
    </div>
  );
}

// ─── CHARACTER CREATION ───────────────────────────────────────────────────────
function CharacterCreation({ onCreate }) {
  const [name, setName] = useState("");
  const [cls, setCls] = useState("Sage");

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#f0f0ff 0%,#fafafa 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px 20px", fontFamily:"'Outfit',sans-serif" }}>
      <div style={{ marginBottom:12, fontSize:56 }}>⚔️</div>
      <h1 style={{ fontSize:38, fontWeight:900, color:"#111", letterSpacing:-1.5, marginBottom:4 }}>ASCEND</h1>
      <p style={{ color:"#9ca3af", marginBottom:36, fontSize:15, textAlign:"center" }}>Your life. Your quest. Level up for real.</p>

      <div style={{ width:"100%", maxWidth:390 }}>
        <label style={{ fontSize:12, fontWeight:700, color:"#6b7280", letterSpacing:1, display:"block", marginBottom:8 }}>YOUR NAME, HERO</label>
        <input className="inp" placeholder="Enter your name..." value={name} onChange={e=>setName(e.target.value)} style={{ marginBottom:28, fontSize:16 }} />

        <label style={{ fontSize:12, fontWeight:700, color:"#6b7280", letterSpacing:1, display:"block", marginBottom:12 }}>CHOOSE YOUR CLASS</label>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:36 }}>
          {Object.entries(CLASSES).map(([key, c]) => {
            const active = cls === key;
            return (
              <div key={key} onClick={() => setCls(key)} style={{ background: active ? ACCENT : CARD, border:`2px solid ${active?ACCENT:"#e5e7eb"}`, borderRadius:18, padding:"18px 14px", cursor:"pointer", textAlign:"center", transition:"all 0.2s", boxShadow: active?"0 6px 24px rgba(79,70,229,0.25)":"none" }}>
                <div style={{ fontSize:30 }}>{c.icon}</div>
                <div style={{ fontWeight:800, fontSize:14, color:active?"white":"#111", marginTop:8 }}>{key}</div>
                <div style={{ fontSize:11, color:active?"rgba(255,255,255,0.75)":"#9ca3af", marginTop:4, lineHeight:1.4 }}>{c.desc}</div>
              </div>
            );
          })}
        </div>

        <button className="btn btn-p" disabled={!name.trim()} onClick={() => onCreate(mkChar(name.trim(), cls))} style={{ fontSize:16, padding:"15px 20px", letterSpacing:0.5 }}>
          Begin Your Journey →
        </button>
      </div>
    </div>
  );
}

// ─── HOME TAB ─────────────────────────────────────────────────────────────────
function HomeTab({ appData, setAppData, awardXP }) {
  const { character, habits=[] } = appData;
  const [showAdd, setShowAdd] = useState(false);
  const [editH, setEditH] = useState(null);
  const todayIdx = todayDayIdx();
  const rank = getRank(character.level);

  const todayHabits = habits.filter(h =>
    h.frequency === "daily" || (h.days||[]).includes(todayIdx)
  );
  const doneCount = todayHabits.filter(h => h.lastCompleted === todayStr()).length;
  const allDone = todayHabits.length > 0 && doneCount === todayHabits.length;

  const checkHabit = (habit) => {
    if (habit.lastCompleted === todayStr()) return;
    const prevStreak = habit.streak || 0;
    const newStreak = habit.lastCompleted === yesterdayStr() ? prevStreak + 1 : 1;

    setAppData(prev => ({
      ...prev,
      habits: prev.habits.map(h => h.id === habit.id ? {
        ...h, lastCompleted: todayStr(), streak: newStreak,
        bestStreak: Math.max(h.bestStreak||0, newStreak)
      } : h)
    }));
    awardXP(habit.xpValue || 20, habit.pillar || "Mindset", newStreak);

    // Perfect day bonus
    const remaining = todayHabits.filter(h => h.id!==habit.id && h.lastCompleted!==todayStr()).length;
    if (remaining === 0 && todayHabits.length > 1) {
      setTimeout(() => awardXP(100, "Mindset", 0), 800);
    }
  };

  const saveHabit = (h) => {
    setAppData(prev => ({
      ...prev,
      habits: h.id && prev.habits.find(x=>x.id===h.id)
        ? prev.habits.map(x=>x.id===h.id?h:x)
        : [...prev.habits, { ...h, id:uid(), streak:0, bestStreak:0 }]
    }));
  };

  const deleteHabit = (id) => setAppData(prev => ({ ...prev, habits: prev.habits.filter(h=>h.id!==id) }));

  return (
    <div style={{ padding:16 }}>
      {/* Character Card */}
      <div className="card" style={{ padding:20, marginBottom:16, background:`linear-gradient(135deg, white 0%, #fafaff 100%)` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:48, height:48, borderRadius:14, background:"#ede9fe", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>
              {CLASSES[character.class].icon}
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:18, color:"#111" }}>{character.name}</div>
              <div style={{ fontSize:12, color:"#9ca3af" }}>{character.class} · <span style={{ color:rank.color, fontWeight:700 }}>{rank.name}</span></div>
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:32, fontWeight:900, color:ACCENT, lineHeight:1 }}>Lv.{character.level}</div>
          </div>
        </div>

        <div style={{ marginBottom:6 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
            <span style={{ fontSize:11, color:"#9ca3af", fontWeight:600, letterSpacing:0.5 }}>XP PROGRESS</span>
            <span style={{ fontSize:11, fontWeight:700, color:ACCENT }}>{character.xp} / {xpForLevel(character.level)}</span>
          </div>
          <XPBar xp={character.xp} max={xpForLevel(character.level)} h={10} />
        </div>

        <div style={{ display:"flex", gap:0, marginTop:16, background:"#f8f9ff", borderRadius:14, overflow:"hidden" }}>
          {Object.entries(S_LABEL).map(([key, label]) => (
            <div key={key} style={{ flex:1, textAlign:"center", padding:"10px 4px", borderRight:"1px solid #eff0ff" }}>
              <div style={{ fontSize:10, fontWeight:800, color:P_COLOR[S_PILAR[key]], letterSpacing:0.5 }}>{label}</div>
              <div style={{ fontSize:18, fontWeight:800, color:"#111", marginTop:2 }}>{character.stats[key]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Habits */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <h2 style={{ fontSize:16, fontWeight:800 }}>Today's Quests</h2>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {allDone && (
            <span style={{ fontSize:11, background:"#fef9c3", color:"#713f12", borderRadius:8, padding:"3px 8px", fontWeight:700 }}>⭐ Perfect Day!</span>
          )}
          <span style={{ fontSize:13, color:"#9ca3af", fontWeight:600 }}>{doneCount}/{todayHabits.length}</span>
        </div>
      </div>

      {todayHabits.length === 0 ? (
        <div className="card" style={{ padding:36, textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>⚔️</div>
          <p style={{ color:"#9ca3af", fontSize:14, lineHeight:1.6 }}>No quests yet, hero.<br/>Add a habit to begin your journey.</p>
        </div>
      ) : (
        todayHabits.map(habit => {
          const done = habit.lastCompleted === todayStr();
          return (
            <div key={habit.id} className="card" style={{ padding:"14px 16px", marginBottom:10, display:"flex", alignItems:"center", gap:12, transition:"opacity 0.3s", opacity:done?0.65:1 }}>
              <button onClick={() => checkHabit(habit)} style={{ width:30, height:30, borderRadius:9, border:`2.5px solid ${done?ACCENT:"#d1d5db"}`, background:done?ACCENT:"transparent", display:"flex", alignItems:"center", justifyContent:"center", cursor:done?"default":"pointer", flexShrink:0, transition:"all 0.25s" }}>
                {done && <span style={{ color:"white", fontSize:14, animation:"checkBounce 0.3s ease" }}>✓</span>}
              </button>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:15, color:done?"#9ca3af":"#111", display:"flex", alignItems:"center", gap:6 }}>
                  <span>{habit.emoji}</span>
                  <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{habit.name}</span>
                </div>
                <div style={{ fontSize:11, color:"#9ca3af", marginTop:3, display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ color:P_COLOR[habit.pillar], fontWeight:600 }}>●</span>
                  <span>{habit.pillar} · +{habit.xpValue}XP</span>
                  {(habit.streak||0) > 0 && <span style={{ color:"#f97316", fontWeight:600 }}>🔥 {habit.streak}d</span>}
                </div>
              </div>
              <div style={{ display:"flex", gap:4 }}>
                <button onClick={()=>setEditH(habit)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:15, opacity:0.5 }}>✏️</button>
                <button onClick={()=>deleteHabit(habit.id)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:15, opacity:0.5 }}>🗑️</button>
              </div>
            </div>
          );
        })
      )}

      <button className="btn btn-p" style={{ marginTop:12 }} onClick={()=>setShowAdd(true)}>+ Add Habit</button>

      {(showAdd || editH) && (
        <HabitModal habit={editH} onClose={()=>{setShowAdd(false);setEditH(null)}} onSave={h=>{saveHabit(h);setShowAdd(false);setEditH(null)}} />
      )}
    </div>
  );
}

function HabitModal({ habit, onClose, onSave }) {
  const [f, setF] = useState(habit || { name:"", emoji:"⚡", pillar:"Mindset", xpValue:20, frequency:"daily", days:[] });
  const s = (k,v) => setF(x=>({...x,[k]:v}));

  return (
    <Modal title={habit?"Edit Habit":"New Habit"} onClose={onClose}>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:16, background:"#f8f9ff", borderRadius:12, padding:10 }}>
        {EMOJIS.map(e => (
          <button key={e} onClick={()=>s("emoji",e)} style={{ fontSize:20, background:f.emoji===e?"#ede9fe":"transparent", border:"none", borderRadius:8, padding:"5px 8px", cursor:"pointer", transition:"background 0.15s" }}>{e}</button>
        ))}
      </div>
      <input className="inp" placeholder="Habit name..." value={f.name} onChange={e=>s("name",e.target.value)} style={{ marginBottom:12 }} />
      <select className="inp" value={f.pillar} onChange={e=>s("pillar",e.target.value)} style={{ marginBottom:12 }}>
        {PILLARS.map(p=><option key={p}>{p}</option>)}
      </select>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        <div>
          <label style={{ fontSize:12, color:"#6b7280", fontWeight:600, display:"block", marginBottom:5 }}>XP Value</label>
          <input className="inp" type="number" min={10} max={50} step={5} value={f.xpValue} onChange={e=>s("xpValue",+e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize:12, color:"#6b7280", fontWeight:600, display:"block", marginBottom:5 }}>Frequency</label>
          <select className="inp" value={f.frequency} onChange={e=>s("frequency",e.target.value)}>
            <option value="daily">Every day</option>
            <option value="specific">Specific days</option>
          </select>
        </div>
      </div>
      {f.frequency==="specific" && (
        <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
          {DAYS_S.map((d,i) => {
            const on = (f.days||[]).includes(i);
            return (
              <button key={i} onClick={()=>s("days",on?(f.days||[]).filter(x=>x!==i):[...(f.days||[]),i])} style={{ padding:"7px 11px", borderRadius:10, border:`2px solid ${on?ACCENT:"#e5e7eb"}`, background:on?"#ede9fe":"white", fontWeight:700, fontSize:12, cursor:"pointer", transition:"all 0.15s" }}>{d}</button>
            );
          })}
        </div>
      )}
      <button className="btn btn-p" disabled={!f.name.trim()} onClick={()=>onSave(f)}>{habit?"Save Changes":"Add Habit"}</button>
    </Modal>
  );
}

// ─── FITNESS TAB ──────────────────────────────────────────────────────────────
function FitnessTab({ appData, setAppData, awardXP }) {
  const { workoutDays=[] } = appData;
  const [showAdd, setShowAdd] = useState(false);
  const [editD, setEditD] = useState(null);
  const [expandId, setExpandId] = useState(null);
  const todayIdx = todayDayIdx();

  const markComplete = (day) => {
    const t = todayStr();
    if ((day.completedDates||[]).includes(t)) return;
    const newStreak = day.lastCompleted === yesterdayStr() ? (day.streak||0)+1 : 1;
    setAppData(prev => ({
      ...prev,
      workoutDays: prev.workoutDays.map(d => d.id===day.id ? { ...d, lastCompleted:t, streak:newStreak, completedDates:[...(d.completedDates||[]),t] } : d)
    }));
    awardXP(60, "Fitness", newStreak);
  };

  const saveDay = (day) => {
    setAppData(prev => ({
      ...prev,
      workoutDays: day.id && prev.workoutDays.find(d=>d.id===day.id)
        ? prev.workoutDays.map(d=>d.id===day.id?day:d)
        : [...prev.workoutDays, { ...day, id:uid(), streak:0, completedDates:[] }]
    }));
  };

  const deleteDay = (id) => setAppData(prev=>({...prev,workoutDays:prev.workoutDays.filter(d=>d.id!==id)}));

  const weekCells = DAYS_S.map((label, i) => {
    const day = workoutDays.find(w=>(w.days||[]).includes(i));
    const done = day && (day.completedDates||[]).includes(todayStr());
    return { label, i, day, done, isToday: i===todayIdx };
  });

  const weekDone = workoutDays.filter(d=>(d.completedDates||[]).includes(todayStr())).length;
  const weekTotal = workoutDays.length;

  return (
    <div style={{ padding:16 }}>
      {/* Week Summary */}
      <div className="card" style={{ padding:16, marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <h2 style={{ fontSize:15, fontWeight:800 }}>This Week</h2>
          <span style={{ fontSize:12, color:ACCENT, fontWeight:700 }}>{weekDone}/{weekTotal} done</span>
        </div>
        <div style={{ display:"flex", gap:5 }}>
          {weekCells.map(({label,i,day,done,isToday}) => (
            <div key={i} style={{ flex:1, textAlign:"center" }}>
              <div style={{ fontSize:10, fontWeight:700, color:isToday?ACCENT:"#9ca3af", marginBottom:5 }}>{label}</div>
              <div style={{ height:36, borderRadius:10, background:done?"#4ade80":day?"#fbbf24":isToday?"#ede9fe":"#f3f4f6", border:`2px solid ${isToday?ACCENT:"transparent"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, transition:"all 0.2s" }}>
                {done?"✓":day?"○":"–"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <h2 style={{ fontSize:16, fontWeight:800 }}>Workout Schedule</h2>
        <button className="btn btn-g" style={{ fontSize:12, padding:"8px 14px", borderRadius:10 }} onClick={()=>setShowAdd(true)}>+ Add Day</button>
      </div>

      {workoutDays.length === 0 ? (
        <div className="card" style={{ padding:36, textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>💪</div>
          <p style={{ color:"#9ca3af", fontSize:14 }}>No workouts planned.<br/>Build your schedule, warrior.</p>
        </div>
      ) : (
        DAYS_F.map((dayName, dayIdx) => {
          const day = workoutDays.find(w=>(w.days||[]).includes(dayIdx));
          if (!day) return null;
          const done = (day.completedDates||[]).includes(todayStr());
          const isToday = dayIdx===todayIdx;
          const expanded = expandId===day.id;

          return (
            <div key={dayIdx} className="card" style={{ padding:16, marginBottom:10, borderLeft:`4px solid ${isToday?ACCENT:done?"#4ade80":"#e5e7eb"}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ cursor:"pointer", flex:1 }} onClick={()=>setExpandId(expanded?null:day.id)}>
                  <div style={{ fontSize:12, color:"#9ca3af", fontWeight:600, marginBottom:2 }}>{dayName.toUpperCase()}</div>
                  <div style={{ fontWeight:800, fontSize:16, color:"#111" }}>{day.name}</div>
                  {(day.streak||0)>0 && <div style={{ fontSize:11, color:"#f97316", fontWeight:600, marginTop:2 }}>🔥 {day.streak} week streak</div>}
                  <div style={{ fontSize:12, color:"#9ca3af", marginTop:2 }}>{(day.exercises||[]).length} exercises · {expanded?"▴ hide":"▾ view"}</div>
                </div>
                <div style={{ display:"flex", gap:5 }}>
                  <button onClick={()=>setEditD(day)} style={{ background:"#f3f4f6", border:"none", borderRadius:8, padding:"6px 8px", cursor:"pointer", fontSize:14 }}>✏️</button>
                  <button onClick={()=>deleteDay(day.id)} style={{ background:"#fff1f2", border:"none", borderRadius:8, padding:"6px 8px", cursor:"pointer", fontSize:14 }}>🗑️</button>
                </div>
              </div>

              {expanded && (day.exercises||[]).length>0 && (
                <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:5 }}>
                  {day.exercises.map((ex,i)=>(
                    <div key={i} style={{ fontSize:13, color:"#374151", background:"#f8f9ff", borderRadius:10, padding:"8px 12px", display:"flex", justifyContent:"space-between" }}>
                      <span>{ex.name}</span>
                      <span style={{ fontWeight:700, color:ACCENT }}>{ex.sets}×{ex.reps}</span>
                    </div>
                  ))}
                </div>
              )}

              {isToday && (
                <button onClick={()=>markComplete(day)} disabled={done} className="btn btn-p" style={{ marginTop:12, background:done?"#4ade80":ACCENT, cursor:done?"default":"pointer" }}>
                  {done ? "✓ Completed! +60 XP" : "Mark Complete →"}
                </button>
              )}
            </div>
          );
        })
      )}

      {(showAdd||editD) && <WorkoutModal day={editD} onClose={()=>{setShowAdd(false);setEditD(null)}} onSave={d=>{saveDay(d);setShowAdd(false);setEditD(null)}} />}
    </div>
  );
}

function WorkoutModal({ day, onClose, onSave }) {
  const [f, setF] = useState(day || { name:"", days:[], exercises:[] });
  const [ex, setEx] = useState({ name:"", sets:"3", reps:"10" });
  const s = (k,v) => setF(x=>({...x,[k]:v}));

  const addEx = () => {
    if (!ex.name.trim()) return;
    s("exercises",[...f.exercises,{name:ex.name,sets:ex.sets,reps:ex.reps}]);
    setEx({name:"",sets:"3",reps:"10"});
  };

  return (
    <Modal title={day?"Edit Workout":"Add Workout Day"} onClose={onClose}>
      <input className="inp" placeholder="Workout name (e.g. Push Day)..." value={f.name} onChange={e=>s("name",e.target.value)} style={{ marginBottom:12 }} />

      <label style={{ fontSize:12, fontWeight:700, color:"#6b7280", display:"block", marginBottom:8 }}>Training Days</label>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
        {DAYS_S.map((d,i)=>{
          const on=(f.days||[]).includes(i);
          return <button key={i} onClick={()=>s("days",on?(f.days).filter(x=>x!==i):[...(f.days||[]),i])} style={{ padding:"7px 11px",borderRadius:10,border:`2px solid ${on?ACCENT:"#e5e7eb"}`,background:on?"#ede9fe":"white",fontWeight:700,fontSize:12,cursor:"pointer",transition:"all 0.15s" }}>{d}</button>;
        })}
      </div>

      <label style={{ fontSize:12, fontWeight:700, color:"#6b7280", display:"block", marginBottom:8 }}>Exercises</label>
      {f.exercises.map((e,i)=>(
        <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8f9ff",borderRadius:10,padding:"8px 12px",marginBottom:6 }}>
          <span style={{ fontSize:13 }}>{e.name} <span style={{ color:ACCENT,fontWeight:700 }}>{e.sets}×{e.reps}</span></span>
          <button onClick={()=>s("exercises",f.exercises.filter((_,j)=>j!==i))} style={{ background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:16,fontWeight:700 }}>×</button>
        </div>
      ))}

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:8, marginBottom:10 }}>
        <input className="inp" placeholder="Exercise" value={ex.name} onChange={e=>setEx(v=>({...v,name:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addEx()} />
        <input className="inp" placeholder="Sets" type="number" min={1} value={ex.sets} onChange={e=>setEx(v=>({...v,sets:e.target.value}))} />
        <input className="inp" placeholder="Reps" type="number" min={1} value={ex.reps} onChange={e=>setEx(v=>({...v,reps:e.target.value}))} />
      </div>
      <button onClick={addEx} style={{ width:"100%",background:"none",border:`1.5px dashed ${ACCENT}`,color:ACCENT,borderRadius:12,padding:"10px",cursor:"pointer",fontWeight:700,fontSize:14,marginBottom:16,fontFamily:"Outfit,sans-serif" }}>
        + Add Exercise
      </button>

      <button className="btn btn-p" disabled={!f.name.trim()||(f.days||[]).length===0} onClick={()=>onSave(f)}>Save Workout</button>
    </Modal>
  );
}

// ─── CAREER TAB ───────────────────────────────────────────────────────────────
function CareerTab({ appData, setAppData, awardXP }) {
  const { skills=[], goals=[] } = appData;
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [activeTimer, setActiveTimer] = useState(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const iRef = useRef(null);

  const startTimer = (skill) => { setActiveTimer(skill); setElapsed(0); setRunning(true); };
  const stopTimer = () => {
    setRunning(false);
    clearInterval(iRef.current);
    const mins = Math.floor(elapsed / 60);
    if (activeTimer && mins > 0) {
      setAppData(prev => ({
        ...prev,
        skills: prev.skills.map(s => s.id===activeTimer.id ? {
          ...s, totalMinutes:(s.totalMinutes||0)+mins, lastStudied:todayStr(),
          sessionsLog:[...(s.sessionsLog||[]),{date:todayStr(),mins}],
          streak: s.lastStudied===yesterdayStr()?(s.streak||0)+1:1,
        } : s)
      }));
      awardXP(Math.min(120, mins*2), "Career", activeTimer.streak||0);
    }
    setActiveTimer(null); setElapsed(0);
  };

  useEffect(() => {
    if (running) iRef.current = setInterval(()=>setElapsed(e=>e+1),1000);
    else clearInterval(iRef.current);
    return () => clearInterval(iRef.current);
  }, [running]);

  const saveSkill = (skill) => {
    setAppData(prev => ({
      ...prev,
      skills: skill.id&&prev.skills.find(s=>s.id===skill.id)
        ? prev.skills.map(s=>s.id===skill.id?skill:s)
        : [...prev.skills,{...skill,id:uid(),totalMinutes:0,sessionsLog:[],streak:0}]
    }));
  };

  const deleteSkill = (id) => setAppData(prev=>({...prev,skills:prev.skills.filter(s=>s.id!==id)}));

  const saveGoal = (goal) => {
    setAppData(prev => ({
      ...prev,
      goals: goal.id&&prev.goals.find(g=>g.id===goal.id)
        ? prev.goals.map(g=>g.id===goal.id?goal:g)
        : [...prev.goals,{...goal,id:uid()}]
    }));
  };

  const deleteGoal = (id) => setAppData(prev=>({...prev,goals:prev.goals.filter(g=>g.id!==id)}));

  const toggleMilestone = (goalId, mId) => {
    const goal = goals.find(g=>g.id===goalId);
    const m = (goal?.milestones||[]).find(x=>x.id===mId);
    if (m && !m.done) awardXP(40,"Career",0);
    setAppData(prev=>({
      ...prev,
      goals: prev.goals.map(g=>g.id===goalId?{...g,milestones:g.milestones.map(m=>m.id===mId?{...m,done:!m.done}:m)}:g)
    }));
  };

  return (
    <div style={{ padding:16 }}>
      {/* Active Timer */}
      {activeTimer && (
        <div className="card" style={{ padding:20, marginBottom:16, textAlign:"center", background:"#ede9fe" }}>
          <div style={{ fontSize:12, fontWeight:700, color:ACCENT, letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>Studying</div>
          <div style={{ fontSize:16, fontWeight:800, color:"#111", marginBottom:4 }}>{activeTimer.name}</div>
          <div style={{ fontSize:52, fontWeight:900, color:ACCENT, fontVariantNumeric:"tabular-nums", letterSpacing:-2 }}>{fmtTime(elapsed)}</div>
          <button onClick={stopTimer} className="btn" style={{ background:"#ef4444", color:"white", width:"auto", marginTop:12, padding:"11px 32px" }}>Stop & Save XP</button>
        </div>
      )}

      {/* Skills */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <h2 style={{ fontSize:16, fontWeight:800 }}>Skills</h2>
        <button className="btn btn-g" style={{ fontSize:12, padding:"8px 14px", borderRadius:10 }} onClick={()=>setShowAddSkill(true)}>+ Add Skill</button>
      </div>

      {skills.length===0 ? (
        <div className="card" style={{ padding:32, textAlign:"center", marginBottom:16 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📚</div>
          <p style={{ color:"#9ca3af", fontSize:14 }}>No skills tracked yet.<br/>Add a skill and start logging sessions.</p>
        </div>
      ) : (
        skills.map(skill => {
          const todayMins = (skill.sessionsLog||[]).filter(s=>s.date===todayStr()).reduce((a,b)=>a+b.mins,0);
          const goal = skill.dailyGoalMinutes||30;
          const prog = Math.min(100,(todayMins/goal)*100);
          const totalH = ((skill.totalMinutes||0)/60).toFixed(1);
          const isActive = activeTimer?.id===skill.id;
          return (
            <div key={skill.id} className="card" style={{ padding:16, marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:15 }}>{skill.name}</div>
                  <div style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>{totalH}h total · {goal}min/day goal</div>
                  {(skill.streak||0)>0 && <div style={{ fontSize:11, color:"#f97316", fontWeight:600, marginTop:2 }}>🔥 {skill.streak}d streak</div>}
                </div>
                <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                  <span style={{ fontSize:13, fontWeight:700, color:prog>=100?"#10b981":ACCENT }}>{todayMins}/{goal}m</span>
                  <button onClick={()=>deleteSkill(skill.id)} style={{ background:"#fff1f2",border:"none",borderRadius:8,padding:"5px 7px",cursor:"pointer",fontSize:13 }}>🗑️</button>
                </div>
              </div>
              <XPBar xp={prog} max={100} color={prog>=100?"#10b981":ACCENT} h={7} />
              {!activeTimer && (
                <button className="btn btn-p" style={{ marginTop:10, fontSize:13, padding:"9px", borderRadius:10 }} onClick={()=>startTimer(skill)}>
                  ▶ Start Timer
                </button>
              )}
              {isActive && <div style={{ fontSize:12, color:ACCENT, fontWeight:700, textAlign:"center", marginTop:8 }}>Timer running... ⏱️</div>}
            </div>
          );
        })
      )}

      {/* Goals */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, marginTop:8 }}>
        <h2 style={{ fontSize:16, fontWeight:800 }}>Long-term Goals</h2>
        <button className="btn btn-g" style={{ fontSize:12, padding:"8px 14px", borderRadius:10 }} onClick={()=>setShowAddGoal(true)}>+ Add Goal</button>
      </div>

      {goals.length===0 ? (
        <div className="card" style={{ padding:32, textAlign:"center" }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🎯</div>
          <p style={{ color:"#9ca3af", fontSize:14 }}>Set a big goal and break it into milestones.</p>
        </div>
      ) : (
        goals.map(goal => {
          const done = (goal.milestones||[]).filter(m=>m.done).length;
          const total = (goal.milestones||[]).length;
          const prog = total>0?(done/total)*100:0;
          return (
            <div key={goal.id} className="card" style={{ padding:16, marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:15 }}>{goal.title}</div>
                  {goal.deadline && <div style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>📅 {goal.deadline}</div>}
                </div>
                <button onClick={()=>deleteGoal(goal.id)} style={{ background:"#fff1f2",border:"none",borderRadius:8,padding:"5px 7px",cursor:"pointer",fontSize:13 }}>🗑️</button>
              </div>
              <div style={{ margin:"10px 0 6px" }}><XPBar xp={prog} max={100} color="#10b981" h={7} /></div>
              <div style={{ fontSize:11, color:"#9ca3af", marginBottom:8, fontWeight:600 }}>{done}/{total} milestones · +40XP each</div>
              {(goal.milestones||[]).map(m=>(
                <div key={m.id} onClick={()=>toggleMilestone(goal.id,m.id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderTop:"1px solid #f3f4f6", cursor:"pointer" }}>
                  <div style={{ width:22, height:22, borderRadius:7, border:`2px solid ${m.done?"#10b981":"#d1d5db"}`, background:m.done?"#10b981":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s" }}>
                    {m.done && <span style={{ color:"white", fontSize:12 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:13, color:m.done?"#9ca3af":"#374151", textDecoration:m.done?"line-through":"none" }}>{m.text}</span>
                </div>
              ))}
            </div>
          );
        })
      )}

      {showAddSkill && <SkillModal onClose={()=>setShowAddSkill(false)} onSave={s=>{saveSkill(s);setShowAddSkill(false)}} />}
      {showAddGoal && <GoalModal onClose={()=>setShowAddGoal(false)} onSave={g=>{saveGoal(g);setShowAddGoal(false)}} />}
    </div>
  );
}

function SkillModal({ onClose, onSave }) {
  const [f, setF] = useState({ name:"", dailyGoalMinutes:30 });
  return (
    <Modal title="Add Skill" onClose={onClose}>
      <input className="inp" placeholder="Skill name (e.g. React, DSA, Piano)..." value={f.name} onChange={e=>setF(x=>({...x,name:e.target.value}))} style={{ marginBottom:12 }} />
      <label style={{ fontSize:12, color:"#6b7280", fontWeight:700, display:"block", marginBottom:6 }}>Daily goal (minutes)</label>
      <input className="inp" type="number" min={5} max={480} step={5} value={f.dailyGoalMinutes} onChange={e=>setF(x=>({...x,dailyGoalMinutes:+e.target.value}))} style={{ marginBottom:16 }} />
      <button className="btn btn-p" disabled={!f.name.trim()} onClick={()=>onSave(f)}>Add Skill</button>
    </Modal>
  );
}

function GoalModal({ onClose, onSave }) {
  const [f, setF] = useState({ title:"", deadline:"", milestones:[] });
  const [mText, setMText] = useState("");
  const addM = () => { if(!mText.trim()) return; setF(x=>({...x,milestones:[...x.milestones,{id:uid(),text:mText,done:false}]})); setMText(""); };

  return (
    <Modal title="Add Goal" onClose={onClose}>
      <input className="inp" placeholder="Goal title..." value={f.title} onChange={e=>setF(x=>({...x,title:e.target.value}))} style={{ marginBottom:12 }} />
      <input className="inp" placeholder="Deadline (e.g. Dec 2025)..." value={f.deadline} onChange={e=>setF(x=>({...x,deadline:e.target.value}))} style={{ marginBottom:12 }} />
      <label style={{ fontSize:12, color:"#6b7280", fontWeight:700, display:"block", marginBottom:8 }}>Milestones (+40XP each)</label>
      {f.milestones.map((m,i)=>(
        <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#f8f9ff", borderRadius:10, padding:"8px 12px", marginBottom:6, fontSize:13 }}>
          {m.text} <button onClick={()=>setF(x=>({...x,milestones:x.milestones.filter((_,j)=>j!==i)}))} style={{ background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontWeight:700 }}>×</button>
        </div>
      ))}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <input className="inp" placeholder="Add milestone..." value={mText} onChange={e=>setMText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addM()} style={{ flex:1 }} />
        <button onClick={addM} className="btn btn-g" style={{ padding:"10px 16px", borderRadius:12, whiteSpace:"nowrap" }}>+ Add</button>
      </div>
      <button className="btn btn-p" disabled={!f.title.trim()} onClick={()=>onSave(f)}>Add Goal</button>
    </Modal>
  );
}

// ─── PEOPLE TAB ───────────────────────────────────────────────────────────────
function PeopleTab({ appData, setAppData, awardXP }) {
  const { people=[] } = appData;
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [logNote, setLogNote] = useState("");

  const nudge = people.find(p => {
    const freq = p.frequency || 7;
    const last = p.lastContacted ? new Date(p.lastContacted).getTime() : 0;
    return Math.floor((Date.now()-last)/86400000) >= freq;
  });

  const logTime = (person) => {
    if (!logNote.trim()) return;
    const t = todayStr();
    const newStreak = person.lastContacted===yesterdayStr()?(person.streak||0)+1:1;
    setAppData(prev=>({
      ...prev,
      people: prev.people.map(p=>p.id===person.id?{
        ...p, lastContacted:t, streak:newStreak,
        qualityLog:[...(p.qualityLog||[]),{date:t,note:logNote}],
      }:p)
    }));
    awardXP(30,"Relationships",newStreak);
    setLogNote(""); setSelectedId(null);
  };

  const savePerson = (person) => {
    setAppData(prev=>({
      ...prev,
      people: person.id&&prev.people.find(p=>p.id===person.id)
        ? prev.people.map(p=>p.id===person.id?person:p)
        : [...prev.people,{...person,id:uid(),streak:0,qualityLog:[]}]
    }));
  };

  const deletePerson = (id) => setAppData(prev=>({...prev,people:prev.people.filter(p=>p.id!==id)}));

  const AVATAR_COLORS = [
    ["#ede9fe","#7c3aed"],["#fce7f3","#be185d"],["#dbeafe","#1d4ed8"],
    ["#dcfce7","#15803d"],["#fef9c3","#854d0e"],["#fce8d5","#9a3412"]
  ];

  return (
    <div style={{ padding:16 }}>
      {nudge && (
        <div className="card" style={{ padding:16, marginBottom:16, background:"#fffbeb", border:"1.5px solid #fde68a" }}>
          <div style={{ fontSize:11, fontWeight:800, color:"#92400e", letterSpacing:1, textTransform:"uppercase", marginBottom:4 }}>Today's Nudge 💌</div>
          <div style={{ fontWeight:800, fontSize:16, color:"#78350f" }}>{nudge.name}</div>
          <div style={{ fontSize:12, color:"#92400e", marginTop:2 }}>Time to reach out — earn CHM XP!</div>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <h2 style={{ fontSize:16, fontWeight:800 }}>Your People</h2>
        <button className="btn btn-g" style={{ fontSize:12, padding:"8px 14px", borderRadius:10 }} onClick={()=>setShowAdd(true)}>+ Add Person</button>
      </div>

      {people.length===0 ? (
        <div className="card" style={{ padding:36, textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>❤️</div>
          <p style={{ color:"#9ca3af", fontSize:14 }}>Add people who matter most.<br/>Stay connected, earn XP.</p>
        </div>
      ) : (
        people.map(person => {
          const daysSince = person.lastContacted ? Math.floor((Date.now()-new Date(person.lastContacted).getTime())/86400000) : null;
          const lastTxt = daysSince===null?"Never":daysSince===0?"Today":daysSince===1?"Yesterday":`${daysSince}d ago`;
          const ci = person.name.charCodeAt(0)%AVATAR_COLORS.length;
          const [bg, fg] = AVATAR_COLORS[ci];
          const initials = person.name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
          const open = selectedId===person.id;

          return (
            <div key={person.id} className="card" style={{ padding:16, marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:46, height:46, borderRadius:"50%", background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:16, color:fg, flexShrink:0 }}>{initials}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:15 }}>{person.name}</div>
                  <div style={{ fontSize:12, color:"#9ca3af" }}>{person.type} · {lastTxt}</div>
                  {(person.streak||0)>0 && <div style={{ fontSize:11, color:"#ec4899", fontWeight:600, marginTop:1 }}>🔥 {person.streak} check-ins</div>}
                </div>
                <button onClick={()=>deletePerson(person.id)} style={{ background:"#fff1f2",border:"none",borderRadius:8,padding:"5px 8px",cursor:"pointer",fontSize:13 }}>🗑️</button>
              </div>

              {open ? (
                <div style={{ marginTop:12 }}>
                  <input className="inp" placeholder="What did you do together?..." value={logNote} onChange={e=>setLogNote(e.target.value)} style={{ marginBottom:8 }} autoFocus />
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={()=>logTime(person)} className="btn btn-p" style={{ flex:1, borderRadius:12, fontSize:13, padding:"10px" }}>Log +30 XP</button>
                    <button onClick={()=>setSelectedId(null)} className="btn btn-g" style={{ flex:1, borderRadius:12, fontSize:13, padding:"10px" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={()=>setSelectedId(person.id)} style={{ width:"100%", marginTop:10, background:"#fce7f3", color:"#be185d", border:"none", borderRadius:12, padding:"9px", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"Outfit,sans-serif" }}>
                  + Log Quality Time
                </button>
              )}

              {(person.qualityLog||[]).length>0 && (
                <div style={{ marginTop:10, borderTop:"1px solid #f3f4f6", paddingTop:8 }}>
                  {(person.qualityLog||[]).slice(-2).reverse().map((log,i)=>(
                    <div key={i} style={{ fontSize:12, color:"#6b7280", padding:"3px 0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {log.date} — {log.note}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      {showAdd && <PersonModal onClose={()=>setShowAdd(false)} onSave={p=>{savePerson(p);setShowAdd(false)}} />}
    </div>
  );
}

function PersonModal({ onClose, onSave }) {
  const [f, setF] = useState({ name:"", type:"Friend", frequency:7 });
  return (
    <Modal title="Add Person" onClose={onClose}>
      <input className="inp" placeholder="Name..." value={f.name} onChange={e=>setF(x=>({...x,name:e.target.value}))} style={{ marginBottom:12 }} />
      <select className="inp" value={f.type} onChange={e=>setF(x=>({...x,type:e.target.value}))} style={{ marginBottom:12 }}>
        {REL_TYPES.map(t=><option key={t}>{t}</option>)}
      </select>
      <label style={{ fontSize:12, color:"#6b7280", fontWeight:700, display:"block", marginBottom:6 }}>Contact frequency</label>
      <select className="inp" value={f.frequency} onChange={e=>setF(x=>({...x,frequency:+e.target.value}))} style={{ marginBottom:16 }}>
        <option value={1}>Daily</option>
        <option value={2}>Every 2 days</option>
        <option value={7}>Weekly</option>
      </select>
      <button className="btn btn-p" disabled={!f.name.trim()} onClick={()=>onSave(f)}>Add Person</button>
    </Modal>
  );
}

// ─── STATS TAB ────────────────────────────────────────────────────────────────
function StatsTab({ appData }) {
  const { character, habits=[] } = appData;
  const { stats, xpLog=[], totalXpEarned=0 } = character;
  const rank = getRank(character.level);

  const radarData = [
    { stat:"STR", val:stats.str, full:50 },
    { stat:"INT", val:stats.int, full:50 },
    { stat:"CHM", val:stats.chm, full:50 },
    { stat:"FOC", val:stats.foc, full:50 },
  ];

  const last7 = Array.from({length:7},(_,i)=>{
    const dt = new Date(Date.now()-i*86400000).toDateString();
    const entry = { day: DAYS_S[new Date(Date.now()-i*86400000).getDay()===0?6:new Date(Date.now()-i*86400000).getDay()-1] };
    PILLARS.forEach(p => { entry[p] = (xpLog||[]).filter(l=>l.date===dt&&l.pillar===p).reduce((a,b)=>a+b.amount,0); });
    return entry;
  }).reverse();

  const topHabits = [...habits].sort((a,b)=>(b.bestStreak||0)-(a.bestStreak||0)).slice(0,4);

  return (
    <div style={{ padding:16 }}>
      {/* Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        {[
          { label:"Total XP Earned", val: (totalXpEarned||0).toLocaleString(), color:ACCENT },
          { label:"Current Level",   val: character.level, color:"#7c3aed" },
          { label:"Current Rank",    val: rank.name, color:rank.color },
          { label:"Habits Tracked",  val: habits.length, color:"#10b981" },
        ].map(({ label, val, color }) => (
          <div key={label} className="card" style={{ padding:"14px 16px" }}>
            <div style={{ fontSize:10, color:"#9ca3af", fontWeight:700, letterSpacing:0.7, textTransform:"uppercase", marginBottom:5 }}>{label}</div>
            <div style={{ fontSize:24, fontWeight:900, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Radar */}
      <div className="card" style={{ padding:16, marginBottom:14 }}>
        <h3 style={{ fontSize:14, fontWeight:800, marginBottom:4 }}>Stat Radar</h3>
        <div style={{ fontSize:11, color:"#9ca3af", marginBottom:8 }}>Current stat levels (max 50)</div>
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={radarData} margin={{ top:10,right:20,bottom:10,left:20 }}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="stat" tick={{ fontSize:12, fontWeight:700, fill:ACCENT, fontFamily:"Outfit" }} />
            <Radar dataKey="val" stroke={ACCENT} fill={ACCENT} fillOpacity={0.25} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly XP Chart */}
      <div className="card" style={{ padding:16, marginBottom:14 }}>
        <h3 style={{ fontSize:14, fontWeight:800, marginBottom:4 }}>XP This Week</h3>
        <div style={{ fontSize:11, color:"#9ca3af", marginBottom:8 }}>By life pillar</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={last7} barSize={7} margin={{ top:0,right:0,bottom:0,left:-20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize:10, fontFamily:"Outfit" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize:10, fontFamily:"Outfit" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius:12, fontSize:12, fontFamily:"Outfit", border:"none", boxShadow:"0 4px 20px rgba(0,0,0,0.1)" }} />
            {PILLARS.map(p=>(
              <Bar key={p} dataKey={p} stackId="x" fill={P_COLOR[p]} radius={p==="Mindset"?[3,3,0,0]:[0,0,0,0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stat Progress Bars */}
      <div className="card" style={{ padding:16, marginBottom:14 }}>
        <h3 style={{ fontSize:14, fontWeight:800, marginBottom:12 }}>Stat Levels</h3>
        {Object.entries(S_LABEL).map(([key, label]) => {
          const color = P_COLOR[S_PILAR[key]];
          const lvl = character.stats[key];
          const sxp = character.statXp[key]||0;
          return (
            <div key={key} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ fontSize:13, fontWeight:700, color }}>{label} — {S_FULL[key]}</span>
                <span style={{ fontSize:12, color:"#9ca3af" }}>Lv.{lvl}</span>
              </div>
              <XPBar xp={sxp} max={xpForStat(lvl)} color={color} h={6} />
            </div>
          );
        })}
      </div>

      {/* Streak Records */}
      {topHabits.length>0 && (
        <div className="card" style={{ padding:16 }}>
          <h3 style={{ fontSize:14, fontWeight:800, marginBottom:12 }}>🏆 Streak Records</h3>
          {topHabits.map(h=>(
            <div key={h.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f3f4f6" }}>
              <span style={{ fontSize:14 }}>{h.emoji} {h.name}</span>
              <span style={{ fontWeight:800, color:"#f97316" }}>🔥 {h.bestStreak||0}d</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ height:16 }} />
    </div>
  );
}

// ─── SETTINGS MODAL ───────────────────────────────────────────────────────────
function SettingsModal({ appData, setAppData, onClose }) {
  const [name, setName] = useState(appData.character.name);
  const [cls, setCls] = useState(appData.character.class);
  const [confirm, setConfirm] = useState(false);

  const save = () => {
    setAppData(prev=>({...prev,character:{...prev.character,name,class:cls}}));
    onClose();
  };

  const reset = () => {
    localStorage.removeItem(KEY);
    window.location.reload();
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(appData,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download="ascend_backup.json"; a.click();
  };

  return (
    <Modal title="Settings" onClose={onClose}>
      <label style={{ fontSize:12, fontWeight:700, color:"#6b7280", display:"block", marginBottom:6 }}>Character Name</label>
      <input className="inp" value={name} onChange={e=>setName(e.target.value)} style={{ marginBottom:12 }} />
      <label style={{ fontSize:12, fontWeight:700, color:"#6b7280", display:"block", marginBottom:6 }}>Class</label>
      <select className="inp" value={cls} onChange={e=>setCls(e.target.value)} style={{ marginBottom:20 }}>
        {Object.keys(CLASSES).map(c=><option key={c}>{c}</option>)}
      </select>
      <button className="btn btn-p" style={{ marginBottom:12 }} onClick={save}>Save Changes</button>
      <button onClick={exportData} style={{ width:"100%", background:"#f0fdf4", color:"#15803d", border:"1.5px solid #bbf7d0", borderRadius:14, padding:13, cursor:"pointer", fontWeight:700, fontSize:14, marginBottom:12, fontFamily:"Outfit,sans-serif" }}>
        📦 Export Data (JSON)
      </button>
      {!confirm ? (
        <button onClick={()=>setConfirm(true)} style={{ width:"100%", background:"#fff1f2", color:"#dc2626", border:"1.5px solid #fecaca", borderRadius:14, padding:13, cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:"Outfit,sans-serif" }}>
          🔄 Reset All Data
        </button>
      ) : (
        <div>
          <p style={{ fontSize:13, color:"#dc2626", textAlign:"center", marginBottom:10 }}>Are you sure? This cannot be undone!</p>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={reset} className="btn" style={{ flex:1, background:"#dc2626", color:"white" }}>Yes, Reset</button>
            <button onClick={()=>setConfirm(false)} className="btn btn-g" style={{ flex:1 }}>Cancel</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [appData, setAppData] = useState(() => loadData());
  const [tab, setTab] = useState("home");
  const [levelUp, setLevelUp] = useState(null);
  const [xpFloat, setXpFloat] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const updateAppData = useCallback((updater) => {
    setAppData(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveData(next);
      return next;
    });
  }, []);

  const awardXP = useCallback((baseAmount, pillar, streak = 0) => {
    const mult = getMult(streak);
    const amount = Math.round(baseAmount * mult);
    setXpFloat(`+${amount} XP`);
    setTimeout(() => setXpFloat(null), 2200);

    setAppData(prev => {
      if (!prev?.character) return prev;
      let char = { ...prev.character };
      const sk = P_STAT[pillar] || "foc";

      let statXp = { ...char.statXp };
      statXp[sk] = (statXp[sk]||0) + amount;
      let stats = { ...char.stats };
      if (statXp[sk] >= xpForStat(stats[sk]) && stats[sk] < 50) {
        stats[sk]++;
        statXp[sk] = 0;
      }

      let xp = char.xp + amount;
      let level = char.level;
      let leveled = false;
      while (xp >= xpForLevel(level)) {
        xp -= xpForLevel(level);
        level++;
        leveled = true;
      }
      if (leveled) {
        const q = QUOTES[Math.floor(Math.random()*QUOTES.length)];
        setTimeout(() => setLevelUp({ level, rank:getRank(level), quote:q }), 500);
      }

      const xpLog = [...(char.xpLog||[]), { date:todayStr(), amount, pillar }].slice(-300);
      const next = { ...prev, character:{ ...char, xp, level, stats, statXp, totalXpEarned:(char.totalXpEarned||0)+amount, xpLog } };
      saveData(next);
      return next;
    });
  }, []);

  // Daily reset
  useEffect(() => {
    if (!appData?.character) return;
    if (appData.character.lastReset === todayStr()) return;
    let penalty = 0;
    (appData.habits||[]).forEach(h => {
      const wasScheduled = h.frequency==="daily"||(h.days||[]).includes(
        new Date(Date.now()-86400000).getDay()===0?6:new Date(Date.now()-86400000).getDay()-1
      );
      if (wasScheduled && h.lastCompleted !== yesterdayStr()) {
        penalty += Math.round((h.xpValue||20)/2);
      }
    });
    updateAppData(prev => ({
      ...prev,
      character: { ...prev.character, xp: Math.max(0,(prev.character.xp||0)-penalty), lastReset:todayStr() }
    }));
  }, [appData?.character?.lastReset]);

  if (!appData) {
    return (
      <>
        <style>{GS}</style>
        <CharacterCreation onCreate={char => {
          const d = { character:char, habits:[], workoutDays:[], skills:[], goals:[], people:[] };
          saveData(d);
          setAppData(d);
        }} />
      </>
    );
  }

  const TABS = [
    { id:"home",    icon:"🏠", label:"Home" },
    { id:"fitness", icon:"💪", label:"Fitness" },
    { id:"career",  icon:"📚", label:"Career" },
    { id:"people",  icon:"❤️", label:"People" },
    { id:"stats",   icon:"📊", label:"Stats" },
  ];

  return (
    <>
      <style>{GS}</style>
      <div style={{ maxWidth:430, margin:"0 auto", minHeight:"100vh", background:BG, fontFamily:"'Outfit',sans-serif", position:"relative", paddingBottom:88 }}>

        {/* XP Float */}
        {xpFloat && (
          <div style={{ position:"fixed", top:"14%", left:"50%", zIndex:500, pointerEvents:"none", animation:"floatXP 2.2s ease forwards", background:ACCENT, color:"white", fontWeight:800, fontSize:17, padding:"8px 22px", borderRadius:30 }}>
            {xpFloat}
          </div>
        )}

        {/* Level Up Modal */}
        {levelUp && <LevelUpModal data={levelUp} onClose={()=>setLevelUp(null)} />}

        {/* Settings Modal */}
        {showSettings && <SettingsModal appData={appData} setAppData={updateAppData} onClose={()=>setShowSettings(false)} />}

        {/* Header */}
        <div style={{ padding:"16px 20px 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontWeight:900, fontSize:22, color:ACCENT, letterSpacing:-0.5 }}>ASCEND</div>
          <button onClick={()=>setShowSettings(true)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", opacity:0.5 }}>⚙️</button>
        </div>

        {/* Tab Content */}
        {tab==="home"    && <HomeTab    appData={appData} setAppData={updateAppData} awardXP={awardXP} />}
        {tab==="fitness" && <FitnessTab appData={appData} setAppData={updateAppData} awardXP={awardXP} />}
        {tab==="career"  && <CareerTab  appData={appData} setAppData={updateAppData} awardXP={awardXP} />}
        {tab==="people"  && <PeopleTab  appData={appData} setAppData={updateAppData} awardXP={awardXP} />}
        {tab==="stats"   && <StatsTab   appData={appData} />}

        {/* Bottom Nav */}
        <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:"rgba(255,255,255,0.96)", backdropFilter:"blur(12px)", borderTop:"1px solid #ededf8", display:"flex", zIndex:100, paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
          {TABS.map(t => {
            const active = tab===t.id;
            return (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, background:"none", border:"none", padding:"10px 0 8px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2, transition:"transform 0.15s" }}>
                <span style={{ fontSize:active?20:18, transition:"font-size 0.2s" }}>{t.icon}</span>
                <span style={{ fontSize:10, fontFamily:"Outfit,sans-serif", fontWeight:active?800:400, color:active?ACCENT:"#9ca3af", transition:"color 0.2s", letterSpacing:0.2 }}>{t.label}</span>
                <div style={{ width:active?20:0, height:3, borderRadius:99, background:ACCENT, transition:"width 0.25s cubic-bezier(0.34,1.56,0.64,1)" }} />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
