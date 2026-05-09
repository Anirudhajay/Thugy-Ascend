import { useState, useEffect, useRef, useCallback } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ACCENT = "#4F46E5";
const BG = "#F5F5FF";
const CARD = "#FFFFFF";

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
const loadData = () => { try { const d = localStorage.getItem(KEY); return d ? JSON.parse(d) : null; } catch { return null; } };
const saveData = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} };

const mkChar = (name, cls) => ({
  name, class: cls, level: 1, xp: 0,
  stats: { str: cls==="Warrior"?2:1, int: cls==="Scholar"?2:1, chm: cls==="Phantom"?2:1, foc: cls==="Sage"?2:1 },
  statXp: { str:0, int:0, chm:0, foc:0 },
  totalXpEarned: 0, xpLog: [], lastReset: todayStr(),
});

// ─── GLOBAL STYLES (Moved inside effect for reliability) ──────────────────────
const GS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
body{background:#e8e8f4;font-family:'Outfit',sans-serif; min-height: 100vh;}
::-webkit-scrollbar{width:0;}
@keyframes floatXP{0%{transform:translateX(-50%) translateY(0);opacity:1}100%{transform:translateX(-50%) translateY(-64px);opacity:0}}
@keyframes pop{0%{transform:scale(0.7);opacity:0}60%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
@keyframes slideUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes checkBounce{0%{transform:scale(0)}60%{transform:scale(1.3)}100%{transform:scale(1)}}
.card{background:#fff;border-radius:18px;box-shadow:0 2px 16px rgba(79,70,229,0.07);}
.slide-up{animation:slideUp 0.3s ease both;}
.pop{animation:pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both;}
.btn{border:none;border-radius:14px;padding:13px 20px;font-family:'Outfit',sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:all 0.18s;}
.btn-p{background:#4F46E5;color:white;width:100%;}
.btn-p:disabled{background:#a5b4fc;}
.btn-g{background:transparent;border:1.5px solid #e5e7eb;color:#374151;}
.inp{width:100%;border:1.5px solid #e5e7eb;border-radius:12px;padding:11px 14px;font-family:'Outfit',sans-serif;font-size:14px;outline:none;background:white;}
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
  useEffect(() => { 
    document.body.style.overflow = "hidden"; 
    return () => { document.body.style.overflow = ""; }; 
  }, []);
  return (
    <div onClick={e => e.target===e.currentTarget && onClose()} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:300, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div className="slide-up" style={{ background:CARD, borderRadius:"24px 24px 0 0", width:"100%", maxWidth:430, maxHeight:"88vh", overflowY:"auto", padding:"24px 20px 32px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ fontSize:18, fontWeight:800 }}>{title}</h3>
          <button onClick={onClose} style={{ background:"#f3f4f6", border:"none", borderRadius:"50%", width:32, height:32, fontSize:18, cursor:"pointer", color:"#6b7280" }}>×</button>
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
        <div style={{ fontSize:64 }}>🏆</div>
        <h2 style={{ fontSize:15, fontWeight:700, color:"#9ca3af", marginTop:12 }}>Level Up!</h2>
        <div style={{ fontSize:72, fontWeight:900, color:ACCENT, lineHeight:1 }}>{data.level}</div>
        <div style={{ fontSize:20, fontWeight:700, color:rank.color }}>{rank.name} Rank</div>
        <button className="btn btn-p" style={{ marginTop:16 }} onClick={onClose}>Continue</button>
      </div>
    </div>
  );
}

// ─── CHARACTER CREATION ───────────────────────────────────────────────────────
function CharacterCreation({ onCreate }) {
  const [name, setName] = useState("");
  const [cls, setCls] = useState("Sage");

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#f0f0ff 0%,#fafafa 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ marginBottom:12, fontSize:56 }}>⚔️</div>
      <h1 style={{ fontSize:38, fontWeight:900, marginBottom:4 }}>ASCEND</h1>
      <p style={{ color:"#9ca3af", marginBottom:36 }}>Your life. Your quest. Level up.</p>
      <div style={{ width:"100%", maxWidth:390 }}>
        <input className="inp" placeholder="Your name..." value={name} onChange={e=>setName(e.target.value)} style={{ marginBottom:20 }} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
          {Object.entries(CLASSES).map(([key, c]) => {
            const active = cls === key;
            return (
              <div key={key} onClick={() => setCls(key)} style={{ background: active ? ACCENT : CARD, border:`2px solid ${active?ACCENT:"#e5e7eb"}`, borderRadius:18, padding:14, cursor:"pointer", textAlign:"center", color:active?"white":"#111" }}>
                <div style={{ fontSize:24 }}>{c.icon}</div>
                <div style={{ fontWeight:800, fontSize:13 }}>{key}</div>
              </div>
            );
          })}
        </div>
        <button className="btn btn-p" disabled={!name.trim()} onClick={() => onCreate(mkChar(name.trim(), cls))}>Start Journey</button>
      </div>
    </div>
  );
}

// ─── TABS (Simplified for stability) ──────────────────────────────────────────
function HomeTab({ appData, setAppData, awardXP }) {
  const { character, habits=[] } = appData;
  const [showAdd, setShowAdd] = useState(false);
  const rank = getRank(character.level);

  const todayHabits = habits.filter(h => h.frequency === "daily" || (h.days||[]).includes(todayDayIdx()));

  const checkHabit = (habit) => {
    if (habit.lastCompleted === todayStr()) return;
    const newStreak = habit.lastCompleted === yesterdayStr() ? (habit.streak||0) + 1 : 1;
    setAppData(prev => ({
      ...prev,
      habits: prev.habits.map(h => h.id === habit.id ? { ...h, lastCompleted: todayStr(), streak: newStreak } : h)
    }));
    awardXP(habit.xpValue || 20, habit.pillar || "Mindset", newStreak);
  };

  return (
    <div style={{ padding:16 }}>
      <div className="card" style={{ padding:20, marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:18 }}>{character.name}</div>
            <div style={{ fontSize:12, color:rank.color }}>{rank.name} Rank</div>
          </div>
          <div style={{ fontSize:24, fontWeight:900, color:ACCENT }}>Lv.{character.level}</div>
        </div>
        <XPBar xp={character.xp} max={xpForLevel(character.level)} h={10} />
      </div>

      <h2 style={{ fontSize:16, fontWeight:800, marginBottom:12 }}>Today's Quests</h2>
      {todayHabits.map(h => {
        const done = h.lastCompleted === todayStr();
        return (
          <div key={h.id} className="card" style={{ padding:14, marginBottom:10, display:"flex", alignItems:"center", gap:12, opacity:done?0.6:1 }}>
            <button onClick={()=>checkHabit(h)} style={{ width:24, height:24, borderRadius:6, border:`2px solid ${done?ACCENT:"#d1d5db"}`, background:done?ACCENT:"transparent", color:"white" }}>{done?"✓":""}</button>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700 }}>{h.emoji} {h.name}</div>
              <div style={{ fontSize:11, color:"#9ca3af" }}>+{h.xpValue} XP</div>
            </div>
          </div>
        );
      })}
      <button className="btn btn-p" onClick={()=>setShowAdd(true)}>+ Add Habit</button>
      {showAdd && <HabitModal onClose={()=>setShowAdd(false)} onSave={h=>{setAppData(p=>({...p,habits:[...p.habits,{...h,id:uid()}]}));setShowAdd(false)}} />}
    </div>
  );
}

function HabitModal({ onClose, onSave }) {
  const [f, setF] = useState({ name:"", emoji:"⚡", pillar:"Mindset", xpValue:20, frequency:"daily" });
  return (
    <Modal title="New Habit" onClose={onClose}>
      <input className="inp" placeholder="Name..." value={f.name} onChange={e=>setF({...f,name:e.target.value})} style={{ marginBottom:12 }} />
      <button className="btn btn-p" onClick={()=>onSave(f)}>Add</button>
    </Modal>
  );
}

// ─── STATS TAB (Fixed height for charts) ──────────────────────────────────────
function StatsTab({ appData }) {
  const { character } = appData;
  const radarData = [
    { stat:"STR", val:character.stats.str },
    { stat:"INT", val:character.stats.int },
    { stat:"CHM", val:character.stats.chm },
    { stat:"FOC", val:character.stats.foc },
  ];

  return (
    <div style={{ padding:16 }}>
      <div className="card" style={{ padding:16, marginBottom:16 }}>
        <h3 style={{ fontSize:14, fontWeight:800, marginBottom:12 }}>Stat Radar</h3>
        {/* CRITICAL: Parent height defined to prevent blank screen */}
        <div style={{ height: "250px", width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="stat" />
              <Radar dataKey="val" stroke={ACCENT} fill={ACCENT} fillOpacity={0.5} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [appData, setAppData] = useState(() => loadData());
  const [tab, setTab] = useState("home");
  const [levelUp, setLevelUp] = useState(null);

  useEffect(() => {
    // Inject styles only after component mounts to prevent render blocking
    const styleTag = document.createElement('style');
    styleTag.innerHTML = GS;
    document.head.appendChild(styleTag);
    return () => document.head.removeChild(styleTag);
  }, []);

  const awardXP = useCallback((amount, pillar, streak) => {
    setAppData(prev => {
      if (!prev) return prev;
      let char = { ...prev.character };
      char.xp += amount;
      if (char.xp >= xpForLevel(char.level)) {
        char.xp -= xpForLevel(char.level);
        char.level++;
        setTimeout(() => setLevelUp({ level: char.level }), 500);
      }
      const next = { ...prev, character: char };
      saveData(next);
      return next;
    });
  }, []);

  if (!appData) {
    return <CharacterCreation onCreate={char => {
      const d = { character:char, habits:[], workoutDays:[], skills:[], goals:[], people:[] };
      saveData(d);
      setAppData(d);
    }} />;
  }

  return (
    <div style={{ maxWidth:430, margin:"0 auto", minHeight:"100vh", background:BG, paddingBottom:80 }}>
      {levelUp && <LevelUpModal data={levelUp} onClose={()=>setLevelUp(null)} />}
      
      <div style={{ padding:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontWeight:900, fontSize:22, color:ACCENT }}>ASCEND</div>
        <button onClick={()=>{localStorage.removeItem(KEY); window.location.reload()}} style={{ opacity:0.3 }}>Reset</button>
      </div>

      {tab==="home" && <HomeTab appData={appData} setAppData={setAppData} awardXP={awardXP} />}
      {tab==="stats" && <StatsTab appData={appData} />}

      <div style={{ position:"fixed", bottom:0, width:"100%", maxWidth:430, background:"white", display:"flex", borderTop:"1px solid #eee" }}>
        <button onClick={()=>setTab("home")} style={{ flex:1, padding:15, background:tab==="home"?BG:"none", border:"none" }}>🏠 Home</button>
        <button onClick={()=>setTab("stats")} style={{ flex:1, padding:15, background:tab==="stats"?BG:"none", border:"none" }}>📊 Stats</button>
      </div>
    </div>
  );
}
