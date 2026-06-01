"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { SignInButton } from "@/components/sign-in-button";
import { useEffect, useState } from "react";

const ANIMATIONS = `
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0px); }
}
@keyframes fadeLeft {
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0px); }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-18px); }
  100% { transform: translateY(0px); }
}
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@keyframes particleFloat {
  0% { transform: translateY(0px) translateX(0px); opacity: 0; }
  10% { opacity: 1; }
  100% { transform: translateY(-160px) translateX(30px); opacity: 0; }
}
@keyframes msgSlide {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes drawArrow {
  from { stroke-dashoffset: 300; }
  to { stroke-dashoffset: 0; }
}
@keyframes popIn {
  from { opacity: 0; transform: scale(0.6); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes tickUp {
  0% { transform: translateY(0); opacity: 1; }
  49% { transform: translateY(-12px); opacity: 0; }
  50% { transform: translateY(12px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes pulse2 {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@keyframes dominoPop {
  from { opacity: 0; transform: scale(0.7); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.hero-title {
  background: linear-gradient(90deg, white, #818cf8, #c084fc, white);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmer 6s linear infinite;
}
@media (prefers-color-scheme: light) {
  .hero-title {
    background: linear-gradient(90deg, #1e1b4b, #4f46e5, #7c3aed, #1e1b4b);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer 6s linear infinite;
  }
}

.glass-card {
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(18px);
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  transition: transform 0.3s ease, border-color 0.3s ease, background 0.3s ease, box-shadow 0.3s ease;
}
.glass-card:hover {
  transform: translateY(-4px);
  border-color: rgba(99,102,241,0.35);
  background: rgba(255,255,255,0.06);
  box-shadow: 0 20px 60px rgba(99,102,241,0.12);
}
.glass-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent, rgba(255,255,255,0.08), transparent);
  transform: translateX(-120%);
  transition: transform 1s ease;
}
.glass-card:hover::before { transform: translateX(120%); }

.metric-card { animation: scaleIn 0.7s cubic-bezier(0.22,1,0.36,1) both; }
.metric-card:nth-child(1) { animation-delay: 0.1s; }
.metric-card:nth-child(2) { animation-delay: 0.25s; }
.metric-card:nth-child(3) { animation-delay: 0.4s; }

.feature-card { animation: fadeLeft 0.8s cubic-bezier(0.22,1,0.36,1) both; }
.feature-card:nth-child(1) { animation-delay: 0.3s; }
.feature-card:nth-child(2) { animation-delay: 0.45s; }
.feature-card:nth-child(3) { animation-delay: 0.6s; }

.floating-card { animation: float 5s ease-in-out infinite; }
.floating-card:nth-child(2) { animation-delay: 2s; }

.mesh-bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(circle at top left, rgba(99,102,241,0.18), transparent 35%),
    radial-gradient(circle at top right, rgba(168,85,247,0.14), transparent 35%),
    radial-gradient(circle at bottom center, rgba(59,130,246,0.14), transparent 40%);
  filter: blur(40px);
}
.grid-bg {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(circle at center, black, transparent 90%);
}

.live-marquee { display: flex; gap: 1rem; width: max-content; animation: marquee 18s linear infinite; }
.marquee-wrap { overflow: hidden; mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); }
.live-pill { white-space: nowrap; padding: 0.45rem 0.9rem; border-radius: 9999px; font-size: 0.72rem; }

.cta-button { position: relative; overflow: hidden; transition: all 0.3s ease; }
.cta-button:hover { transform: translateY(-2px) scale(1.02); }

.telegram-btn {
  display: inline-flex; align-items: center; gap: 0.6rem;
  padding: 0.65rem 1.4rem; border-radius: 0.5rem;
  font-size: 0.9rem; font-weight: 600; background: #229ED9;
  color: white; border: none; cursor: pointer;
  transition: all 0.3s ease; text-decoration: none; width: fit-content;
}
.telegram-btn:hover { background: #1a8abf; transform: translateY(-2px) scale(1.02); }

.page-enter { animation: fadeUp 1s cubic-bezier(0.22,1,0.36,1); }

.particle {
  position: absolute; width: 6px; height: 6px; border-radius: 9999px;
  background: rgba(129,140,248,0.55); animation: particleFloat linear infinite;
}

.about-section {
  border-top: 1px solid rgba(255,255,255,0.06);
  padding-top: 4rem; padding-bottom: 4rem;
}
@media (prefers-color-scheme: light) {
  .about-section { border-top: 1px solid rgba(99,102,241,0.12); }
}

.team-card { animation: scaleIn 0.7s cubic-bezier(0.22,1,0.36,1) both; cursor: pointer; text-decoration: none; }
.team-card:nth-child(1) { animation-delay: 0.1s; }
.team-card:nth-child(2) { animation-delay: 0.2s; }
.team-card:nth-child(3) { animation-delay: 0.3s; }
.team-card:nth-child(4) { animation-delay: 0.4s; }
.team-card:nth-child(5) { animation-delay: 0.5s; }
.team-card:hover .team-avatar { box-shadow: 0 0 0 3px rgba(99,102,241,0.5); }

.about-label {
  font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase;
  color: rgba(129,140,248,0.9); font-weight: 600;
}
.section-divider {
  width: 40px; height: 2px;
  background: linear-gradient(90deg, #6366f1, #a855f7);
  border-radius: 9999px; margin-bottom: 1.25rem;
}
.step-number {
  width: 2rem; height: 2rem; border-radius: 9999px;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem; font-weight: 800;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: white; flex-shrink: 0;
}

.live-dot { width: 7px; height: 7px; border-radius: 50%; background: #1D9E75; animation: pulse2 1.2s infinite; display: inline-block; }

.tg-msg { animation: msgSlide 0.35s ease both; }

.swap-arrow-path { stroke-dasharray: 300; animation: drawArrow 0.7s ease forwards; }

.step-dot-ind {
  width: 7px; height: 7px; border-radius: 50%;
  background: rgba(255,255,255,0.2); cursor: pointer;
  transition: background 0.2s; border: none; padding: 0;
}
.step-dot-ind.active { background: #6366f1; }

.chain-node { animation: dominoPop 0.4s cubic-bezier(0.175,0.885,0.32,1.275) both; }

.search-result-item { animation: fadeInUp 0.3s ease both; }

.vis-section {
  border-top: 1px solid rgba(255,255,255,0.06);
  padding-top: 4rem; padding-bottom: 2rem;
}

/* ── MOBILE FIXES ── */
@media (max-width: 639px) {
  .metric-card, .feature-card, .team-card, .page-enter {
    animation: none !important; opacity: 1 !important; transform: none !important;
  }
  .microsoft-btn { width: 100% !important; max-width: 100% !important; }
  .microsoft-btn button, .microsoft-btn [class*="button"], .microsoft-btn [class*="btn"] {
    width: 100% !important; max-width: 100% !important; box-sizing: border-box !important;
  }
  .telegram-btn {
    width: 100% !important; max-width: 100% !important;
    box-sizing: border-box !important; justify-content: center !important;
  }
  .cta-row { width: 100%; }
  .marquee-wrap { max-width: calc(100vw - 2rem); }
  .stats-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 0.5rem !important; }
  .stats-grid .metric-card { padding: 0.6rem 0.25rem !important; }
  .stats-grid .metric-card span:first-child { font-size: 1.1rem !important; color: #818cf8 !important; }
  .stats-grid .metric-card span:last-child { font-size: 0.55rem !important; letter-spacing: 0.08em !important; }
}
`;

function MouseGlow() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const move = (e: MouseEvent) => setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-0 z-0 transition-all duration-300"
      style={{ background: `radial-gradient(600px at ${position.x}px ${position.y}px, rgba(99,102,241,0.12), transparent 80%)` }} />
  );
}

function useIsDark() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

// ── BEFORE/AFTER + 3-WAY SWAP SECTION ──
const TG_MESSAGES = [
  { txt: "anyone have SC2000 index 10003??", side: "left" },
  { txt: "need CZ1106 index 10002 ASAP", side: "left" },
  { txt: "I have MH1810 10001, want 10003", side: "right" },
  { txt: "@all does anyone want to swap CE1103?", side: "left" },
  { txt: "SC2000 index 10005 available??", side: "left" },
  { txt: "did anyone see my msg above 😭", side: "right" },
  { txt: "CZ1106 swap 10002 → 10001 anyone?", side: "left" },
  { txt: "URGENT need index 10004 CE2101", side: "left" },
];

const THREE_WAY_STEPS = [
  "Alice registers: has 10001, wants 10003",
  "Sam registers: has 10003, wants 10002",
  "Priya registers: has 10002, wants 10001",
  "SwapHub detects the 3-way chain instantly!",
  "All three notified simultaneously 🎉",
];

function BeforeAfterSection() {
  const [tgMsgs, setTgMsgs] = useState<typeof TG_MESSAGES>([]);
  const [shSteps, setShSteps] = useState<number[]>([]);
  const [arrowA, setArrowA] = useState(false);
  const [arrowB, setArrowB] = useState(false);
  const [arrowC, setArrowC] = useState(false);
  const [badge, setBadge] = useState(false);
  const [checks, setChecks] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  const startAnimation = () => {
    setTgMsgs([]);
    setShSteps([]);
    setArrowA(false); setArrowB(false); setArrowC(false);
    setBadge(false); setChecks(false); setStepIdx(0);

    TG_MESSAGES.forEach((_, i) => {
      setTimeout(() => setTgMsgs(prev => [...prev, TG_MESSAGES[i]]), i * 500);
    });
    [0,1,2,3,4,5].forEach(i => {
      setTimeout(() => setShSteps(prev => [...prev, i]), 3200 + i * 600);
    });
    setTimeout(() => { setArrowA(true); setStepIdx(1); }, 800);
    setTimeout(() => { setArrowB(true); setStepIdx(2); }, 2000);
    setTimeout(() => { setArrowC(true); setStepIdx(3); }, 3200);
    setTimeout(() => { setBadge(true); setStepIdx(4); }, 4400);
    setTimeout(() => { setChecks(true); }, 4800);
  };

  useEffect(() => { startAnimation(); }, []);

  return (
    <div className="vis-section">
      <div className="section-divider" />
      <span className="about-label">See It In Action</span>
      <h2 className="text-2xl md:text-3xl font-black mt-3 mb-8">How SwapHub changes everything.</h2>

      {/* Before / After */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Before */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#E24B4A" }} />
            <span className="text-xs font-semibold text-muted-foreground">Before — Telegram</span>
          </div>
          <div style={{ background: "#1a2332", borderRadius: 8, padding: "0.5rem", minHeight: 160, display: "flex", flexDirection: "column", gap: 3 }}>
            {tgMsgs.map((m, i) => (
              <div key={i} className="tg-msg" style={{
                color: m.side === "right" ? "#72c4f0" : "#9ba8b4",
                textAlign: m.side === "right" ? "right" : "left",
                fontSize: "0.7rem", padding: "1px 0",
                animationDelay: `${i * 0.05}s`
              }}>{m.txt}</div>
            ))}
          </div>
          <div className="text-center text-xs text-muted-foreground mt-2">10,000+ msgs daily 😵</div>
        </div>

        {/* After */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#1D9E75" }} />
            <span className="text-xs font-semibold text-muted-foreground">After — SwapHub</span>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { label: "1. You register once", content: "Have 10001 → Want 10003", bg: "rgba(255,255,255,0.04)" },
              { label: "↓", content: null, bg: "transparent" },
              { label: "2. Engine scans 2000+ modules", content: "Matching…", bg: "rgba(255,255,255,0.04)" },
              { label: "↓", content: null, bg: "transparent" },
              { label: "✓ Match found in 0.3s", content: "📱 Telegram alert sent!", bg: "rgba(29,158,117,0.15)", border: "rgba(99,210,145,0.3)" },
              { label: "3. Confirm swap on SwapHub 🎉", content: null, bg: "rgba(255,255,255,0.04)" },
            ].map((s, i) => (
              <div key={i} style={{
                opacity: shSteps.includes(i) ? 1 : 0,
                transition: "opacity 0.4s ease",
                background: s.bg,
                border: s.border ? `0.5px solid ${s.border}` : s.bg !== "transparent" ? "0.5px solid rgba(255,255,255,0.08)" : "none",
                borderRadius: 6,
                padding: s.bg !== "transparent" ? "0.4rem 0.6rem" : "0",
                textAlign: s.label === "↓" ? "center" : "left",
              }}>
                <div style={{ fontSize: "0.7rem", color: s.label.startsWith("✓") ? "#1D9E75" : "rgba(255,255,255,0.8)", fontWeight: s.label.startsWith("✓") ? 700 : 500 }}>{s.label}</div>
                {s.content && <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", marginTop: 1 }}>{s.content}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3-Way Swap */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-sm">The magic: 3-way chain swaps</p>
          <button onClick={startAnimation} style={{
            fontSize: "0.65rem", padding: "2px 8px", borderRadius: 20, cursor: "pointer",
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.6)"
          }}>↺ Replay</button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">No human could coordinate this — SwapHub detects it instantly</p>

        <div style={{ overflowX: "auto" }}>
          <svg width="100%" viewBox="0 0 560 210" style={{ minWidth: 300, display: "block" }}>
            <defs>
              <marker id="arr3w" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </marker>
            </defs>

            {/* Person A */}
            <circle cx="80" cy="55" r="22" fill="#EEEDFE" stroke="#7F77DD" strokeWidth="1.2"/>
            <text x="80" y="62" textAnchor="middle" fontSize="18" fill="#534AB7">👤</text>
            <text x="80" y="92" textAnchor="middle" fontSize="10" fontWeight="600" fill="#3C3489">Alice</text>
            <text x="80" y="106" textAnchor="middle" fontSize="9" fill="#534AB7">has 10001</text>
            <text x="80" y="118" textAnchor="middle" fontSize="9" fill="#7F77DD">wants 10003</text>

            {/* Person B */}
            <circle cx="280" cy="30" r="22" fill="#E1F5EE" stroke="#1D9E75" strokeWidth="1.2"/>
            <text x="280" y="37" textAnchor="middle" fontSize="18" fill="#0F6E56">👤</text>
            <text x="280" y="67" textAnchor="middle" fontSize="10" fontWeight="600" fill="#085041">Sam</text>
            <text x="280" y="81" textAnchor="middle" fontSize="9" fill="#0F6E56">has 10003</text>
            <text x="280" y="93" textAnchor="middle" fontSize="9" fill="#1D9E75">wants 10002</text>

            {/* Person C */}
            <circle cx="480" cy="55" r="22" fill="#FAEEDA" stroke="#BA7517" strokeWidth="1.2"/>
            <text x="480" y="62" textAnchor="middle" fontSize="18" fill="#854F0B">👤</text>
            <text x="480" y="92" textAnchor="middle" fontSize="10" fontWeight="600" fill="#412402">Priya</text>
            <text x="480" y="106" textAnchor="middle" fontSize="9" fill="#854F0B">has 10002</text>
            <text x="480" y="118" textAnchor="middle" fontSize="9" fill="#BA7517">wants 10001</text>

            {/* Arrow A→B */}
            {arrowA && (
              <>
                <path className="swap-arrow-path" d="M100 50 Q190 5 258 32" fill="none" stroke="#7F77DD" strokeWidth="1.8" markerEnd="url(#arr3w)" style={{ animationDelay: "0s" }}/>
                <text x="180" y="14" textAnchor="middle" fontSize="8.5" fill="#7F77DD">gives 10001</text>
              </>
            )}
            {/* Arrow B→C */}
            {arrowB && (
              <>
                <path className="swap-arrow-path" d="M302 32 Q390 5 458 52" fill="none" stroke="#1D9E75" strokeWidth="1.8" markerEnd="url(#arr3w)" style={{ animationDelay: "0s" }}/>
                <text x="382" y="14" textAnchor="middle" fontSize="8.5" fill="#1D9E75">gives 10003</text>
              </>
            )}
            {/* Arrow C→A */}
            {arrowC && (
              <>
                <path className="swap-arrow-path" d="M460 105 Q280 195 100 105" fill="none" stroke="#BA7517" strokeWidth="1.8" markerEnd="url(#arr3w)" style={{ animationDelay: "0s" }}/>
                <text x="280" y="198" textAnchor="middle" fontSize="8.5" fill="#BA7517">gives 10002</text>
              </>
            )}

            {/* Badge */}
            {badge && (
              <g style={{ animation: "popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) both" }}>
                <rect x="210" y="128" width="140" height="28" rx="14" fill="#6366f1"/>
                <text x="280" y="146" textAnchor="middle" fontSize="10.5" fontWeight="600" fill="white">SwapHub matched ✓</text>
              </g>
            )}

            {/* Check marks */}
            {checks && (
              <>
                <g style={{ animation: "popIn 0.3s ease both", animationDelay: "0s" }}>
                  <circle cx="100" cy="36" r="9" fill="#1D9E75"/>
                  <text x="100" y="41" textAnchor="middle" fontSize="10" fill="white">✓</text>
                </g>
                <g style={{ animation: "popIn 0.3s ease both", animationDelay: "0.15s" }}>
                  <circle cx="300" cy="12" r="9" fill="#1D9E75"/>
                  <text x="300" y="17" textAnchor="middle" fontSize="10" fill="white">✓</text>
                </g>
                <g style={{ animation: "popIn 0.3s ease both", animationDelay: "0.3s" }}>
                  <circle cx="500" cy="36" r="9" fill="#1D9E75"/>
                  <text x="500" y="41" textAnchor="middle" fontSize="10" fill="white">✓</text>
                </g>
              </>
            )}
          </svg>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mt-3">
          {THREE_WAY_STEPS.map((_, i) => (
            <button key={i} className={`step-dot-ind ${stepIdx === i ? "active" : ""}`} />
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">{THREE_WAY_STEPS[Math.min(stepIdx, 4)]}</p>
      </div>
    </div>
  );
}

// ── INTERACTIVE TOOLS SECTION ──
const CHAIN_DATA = [
  { label: "Alice", color: "#EEEDFE", stroke: "#7F77DD", text: "#534AB7" },
  { label: "Sam", color: "#E1F5EE", stroke: "#1D9E75", text: "#085041" },
  { label: "Priya", color: "#FAEEDA", stroke: "#BA7517", text: "#412402" },
  { label: "Raj", color: "#E6F1FB", stroke: "#378ADD", text: "#0C447C" },
  { label: "Mei", color: "#FBEAF0", stroke: "#D4537E", text: "#4B1528" },
  { label: "Arjun", color: "#EAF3DE", stroke: "#639922", text: "#173404" },
];
const CHAIN_LABELS = [
  "Alice joins — 1 request waiting",
  "Sam joins — direct swap found! 🎉",
  "Priya joins — 3-way chain unlocked! 🔗",
  "Raj joins — 2 new matches triggered ⚡",
  "Mei joins — chain reaction: 3 swaps! 🔥",
  "Arjun joins — 5 simultaneous matches 🚀",
];

function InteractiveToolsSection() {
  const [modules, setModules] = useState(2);

  const tgHrs = modules * 3;
  const shMins = modules * 2;
  const savedPct = Math.round(((tgHrs * 60 - shMins) / (tgHrs * 60)) * 100);
  const savedH = Math.floor((tgHrs * 60 - shMins) / 60);
  const savedM = (tgHrs * 60 - shMins) % 60;

  return (
    <div className="about-section mt-0">
      <div className="section-divider" />
      <span className="about-label">Save Your Time</span>
      <h2 className="text-2xl md:text-3xl font-black mt-3 mb-8">How much time could you save?</h2>

      <div className="flex flex-col gap-4">

        {/* Time Saved Calculator */}
        <div className="glass-card rounded-2xl p-5">
          <p className="font-semibold text-sm mb-1">⏱ Your time saved calculator</p>
          <p className="text-xs text-muted-foreground mb-4">How many modules do you need to swap this semester?</p>
          <div className="flex items-center gap-3 mb-4">
            <input type="range" min={1} max={6} value={modules} onChange={e => setModules(Number(e.target.value))} className="flex-1" />
            <span className="text-sm font-semibold">{modules}</span>
            <span className="text-xs text-muted-foreground">modules</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div style={{ background: "rgba(226,75,74,0.08)", border: "0.5px solid rgba(240,149,149,0.3)", borderRadius: 8, padding: "0.6rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.65rem", color: "#F09595", marginBottom: 4 }}>Telegram way 😩</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#E24B4A" }}>~{tgHrs} hrs</div>
              <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>of scrolling & DMs</div>
            </div>
            <div style={{ background: "rgba(29,158,117,0.08)", border: "0.5px solid rgba(99,210,145,0.3)", borderRadius: 8, padding: "0.6rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.65rem", color: "#1D9E75", marginBottom: 4 }}>SwapHub way ✨</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#1D9E75" }}>~{shMins} min</div>
              <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>register & wait</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Time saved</div>
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 20, height: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg,#6366f1,#1D9E75)", borderRadius: 20, width: `${savedPct}%`, transition: "width 0.5s ease" }} />
            </div>
            <div style={{ fontSize: "0.7rem", color: "#818cf8", fontWeight: 600, marginTop: 4, textAlign: "right" }}>
              ≈ {savedH > 0 ? `${savedH}h ` : ""}{savedM}min saved
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

const TEAM = [
  { name: "Benedict Tan",     photo: "/benedict.jpg",  linkedin: "https://www.linkedin.com/in/benedict-tan-265403215/" },
  { name: "Vidisha Bajoria",  photo: "/vidisha.jpg",   linkedin: "https://www.linkedin.com/in/vidishabajoria/" },
  { name: "Suhani Mishra",    photo: "/suhani.jpg",    linkedin: "https://www.linkedin.com/in/suhanimishra07/" },
  { name: "Rushika Gupta",    photo: "/rushika.jpg",   linkedin: "https://www.linkedin.com/in/rushikagupta/" },
  { name: "Shrujan Beesetty", photo: "/shrujan.jpg",   linkedin: "https://www.linkedin.com/in/shrujan-beesetty/" },
];

const HOW_IT_WORKS = [
  { step: 1, title: "Sign in with your NTU account", desc: "Authenticate securely via Microsoft SSO — no new passwords, no spam." },
  { step: 2, title: "Register your swap", desc: "Tell us the index you have and the index you want across 2000+ modules." },
  { step: 3, title: "We find your match", desc: "Our engine instantly scans for direct swaps and 3-way chain swaps on your behalf." },
  { step: 4, title: "Get notified on Telegram", desc: "The moment a match is found, you receive an instant Telegram alert with next steps." },
];

export default function LandingPage() {
  const callbackUrl = "/onboard";
  const isDark = useIsDark();

  return (
    <main className="bg-background text-foreground min-h-screen relative overflow-x-hidden">
      <style>{ANIMATIONS}</style>
      <MouseGlow />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="mesh-bg" />
        <div className="grid-bg" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${Math.random() * 100}%`,
            bottom: `-${Math.random() * 100}px`,
            animationDuration: `${8 + Math.random() * 8}s`,
            animationDelay: `${Math.random() * 5}s`,
          }} />
        ))}
      </div>

      <ScrollArea className="min-h-screen">
        <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">

          {/* HERO */}
          <div className="grid xl:grid-cols-[minmax(0,1fr)_280px] gap-8 xl:gap-12 items-center">
            <div className="page-enter flex flex-col gap-6 xl:gap-7 justify-center py-8 xl:py-16">
              <div className="inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs backdrop-blur-xl"
                style={{ border: "1px solid rgba(99,102,241,0.2)", color: "var(--muted-foreground)", background: "rgba(99,102,241,0.06)" }}>
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                Trusted by NTU students
              </div>
              <div className="space-y-5">
                <h1 className="hero-title text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight leading-[1.02]">
                  Swap Your<br />Indexes<br />Instantly.
                </h1>
                <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
                  Find direct swaps, 3-way chain swaps, and open indexes across 2000+ modules — all in seconds. Built exclusively for NTU students.
                </p>
              </div>
              <div className="cta-row flex flex-col sm:flex-row gap-3">
                <div className="cta-button microsoft-btn">
                  <SignInButton callbackUrl={callbackUrl} />
                </div>
                <a href="https://t.me/Findex_ntu_bot" target="_blank" rel="noopener noreferrer" className="telegram-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  Open in Telegram
                </a>
              </div>
              <div className="marquee-wrap py-1">
                <div className="live-marquee">
                  {["SC2000 index swapped","3-way chain completed","CZ1106 match found","MH1810 index available","Telegram notification sent","500+ successful swaps",
                    "SC2000 index swapped","3-way chain completed","CZ1106 match found","MH1810 index available","Telegram notification sent","500+ successful swaps",
                  ].map((item, index) => (
                    <div key={index} className="live-pill" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.35)", color: "var(--foreground)" }}>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/80" />
                        <span>{item}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="stats-grid grid grid-cols-3 gap-3">
                <div className="metric-card glass-card rounded-xl p-4 flex flex-col items-center">
                  <span className="text-2xl font-black text-primary">500+</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-2 text-center">Successful Swaps</span>
                </div>
                <div className="metric-card glass-card rounded-xl p-4 flex flex-col items-center">
                  <span className="text-2xl font-black text-primary">300+</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-2 text-center">Active Students</span>
                </div>
                <div className="metric-card glass-card rounded-xl p-4 flex flex-col items-center">
                  <span className="text-2xl font-black text-primary">2000+</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-2 text-center">Modules</span>
                </div>
              </div>
            </div>
            <div className="hidden xl:flex relative items-center justify-center">
              <div className="flex flex-col gap-5">
                <div className="floating-card glass-card rounded-2xl p-4 w-[260px]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-sm">SC2000 Swap</span>
                    <span className="text-xs text-green-400">Matched</span>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between"><span>Have</span><span>Fri 8:30 AM</span></div>
                    <div className="flex items-center justify-between"><span>Want</span><span>Thu 10:30 AM</span></div>
                  </div>
                </div>
                <div className="floating-card glass-card rounded-2xl p-4 w-[260px]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-sm">CZ1106 Chain</span>
                    <span className="text-xs text-blue-400">3-Way</span>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between"><span>Students</span><span>3 Connected</span></div>
                    <div className="flex items-center justify-between"><span>Status</span><span>Completed</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FEATURES */}
          <div className="grid md:grid-cols-3 gap-4 pt-8 md:pt-12">
            {[
              { title: "Smart Index Matching", desc: "Automatically detects direct swaps and 3-way chain swaps so everyone gets the index they want.", pulse: false },
              { title: "Instant Telegram Alerts", desc: "Get notified the moment a compatible swap appears — no refreshing, no missed opportunities.", pulse: true },
              { title: "NTU Verified Only", desc: "Microsoft SSO ensures every user is a real NTU student — a trusted space with zero spam.", pulse: false },
            ].map((f) => (
              <div key={f.title} className="feature-card glass-card rounded-xl p-4 md:p-5">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <div className={`h-2 w-2 rounded-full bg-primary${f.pulse ? " animate-pulse" : ""}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* HOW IT WORKS */}
          <div className="about-section mt-0">
            <div className="section-divider" />
            <span className="about-label">How It Works</span>
            <h2 className="text-2xl md:text-3xl font-black mt-3 mb-8">From sign-up to swap in minutes.</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {HOW_IT_WORKS.map((item) => (
                <div key={item.step} className="glass-card rounded-xl p-5 flex gap-4 items-start">
                  <div className="step-number">{item.step}</div>
                  <div>
                    <h3 className="font-semibold mb-1 text-sm">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* BEFORE/AFTER + 3-WAY */}
          <BeforeAfterSection />

          {/* INTERACTIVE TOOLS */}
          <InteractiveToolsSection />

          {/* ABOUT */}
          <div className="about-section mt-0">
            <div className="glass-card rounded-2xl p-6 md:p-10 mb-10">
              <div className="section-divider" />
              <span className="about-label">Our Story</span>
              <h2 className="text-2xl md:text-3xl font-black mt-3 mb-6">
                Built because we{" "}
                <span style={{ background: "linear-gradient(90deg, #6366f1, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  felt the pain.
                </span>
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed max-w-2xl">
                <p>Index swapping at NTU has always been a mess — scattered Telegram messages, endless back-and-forth, and deals that fall through because finding a mutual match manually is nearly impossible. We lived through it ourselves and decided to fix it properly.</p>
                <p>What makes SwapHub different is its ability to resolve <span className="text-foreground font-semibold">3-way chain swaps</span> that no human coordination could reliably pull off. If A wants B&apos;s slot, B wants C&apos;s slot, and C wants A&apos;s slot, SwapHub finds that chain instantly and notifies all three parties at once.</p>
                <p>No group chats. No missed DMs. Just log in with your NTU account, register what you have and what you want, and let the system do the rest — across 2000+ modules.</p>
              </div>
              <blockquote className="mt-6 pl-4 border-l-2 border-primary/50 italic text-muted-foreground text-sm">
                &ldquo;Index swapping should take minutes, not weeks.&rdquo;
              </blockquote>
            </div>

            <div className="mb-8">
              <div className="section-divider" />
              <span className="about-label">The Team</span>
              <h2 className="text-2xl md:text-3xl font-black mt-3 mb-2">Who We Are</h2>
              <p className="text-muted-foreground text-sm max-w-xl">A mixed team of Year 1 and Year 2 Computer Science students at NTU Singapore, building tools that make student life genuinely easier.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {TEAM.map((member) => (
                <a key={member.name} href={member.linkedin} target="_blank" rel="noopener noreferrer"
                  className="team-card glass-card rounded-2xl p-4 flex flex-col items-center text-center gap-3"
                  style={{ textDecoration: "none", color: "inherit" }}>
                  <img src={member.photo} alt={member.name}
                    className="team-avatar h-14 w-14 rounded-full object-cover transition-all duration-200"
                    style={{ border: "2px solid rgba(99,102,241,0.3)" }} />
                  <div>
                    <p className="font-semibold text-sm leading-snug">{member.name}</p>
                    <p style={{ fontSize: "0.7rem", color: "rgba(129,140,248,0.9)", marginTop: "0.25rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      LinkedIn ↗
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>

        </div>
      </ScrollArea>
    </main>
  );
}
