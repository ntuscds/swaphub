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
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top left, rgba(99,102,241,0.18), transparent 35%),
    radial-gradient(circle at top right, rgba(168,85,247,0.14), transparent 35%),
    radial-gradient(circle at bottom center, rgba(59,130,246,0.14), transparent 40%);
  filter: blur(40px);
}
.grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(circle at center, black, transparent 90%);
}

.live-marquee {
  display: flex;
  gap: 1rem;
  width: max-content;
  animation: marquee 18s linear infinite;
}
.marquee-wrap {
  overflow: hidden;
  mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
}
.live-pill {
  white-space: nowrap;
  padding: 0.45rem 0.9rem;
  border-radius: 9999px;
  font-size: 0.72rem;
}

.cta-button {
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}
.cta-button:hover { transform: translateY(-2px) scale(1.02); }

.telegram-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem 1.4rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  background: #229ED9;
  color: white;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  width: fit-content;
}
.telegram-btn:hover {
  background: #1a8abf;
  transform: translateY(-2px) scale(1.02);
}

.page-enter { animation: fadeUp 1s cubic-bezier(0.22,1,0.36,1); }

.particle {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: rgba(129,140,248,0.55);
  animation: particleFloat linear infinite;
}

.about-section {
  border-top: 1px solid rgba(255,255,255,0.06);
  padding-top: 4rem;
  padding-bottom: 4rem;
}
@media (prefers-color-scheme: light) {
  .about-section { border-top: 1px solid rgba(99,102,241,0.12); }
}

.team-card {
  animation: scaleIn 0.7s cubic-bezier(0.22,1,0.36,1) both;
  cursor: pointer;
  text-decoration: none;
}
.team-card:nth-child(1) { animation-delay: 0.1s; }
.team-card:nth-child(2) { animation-delay: 0.2s; }
.team-card:nth-child(3) { animation-delay: 0.3s; }
.team-card:nth-child(4) { animation-delay: 0.4s; }
.team-card:nth-child(5) { animation-delay: 0.5s; }

.team-card:hover .team-avatar {
  box-shadow: 0 0 0 3px rgba(99,102,241,0.5);
}
.team-card:hover .linkedin-icon {
  opacity: 1;
  transform: translateY(0px);
}
.linkedin-icon {
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  font-size: 0.7rem;
  color: rgba(129,140,248,0.9);
  margin-top: 0.25rem;
}

.about-label {
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(129,140,248,0.9);
  font-weight: 600;
}
.section-divider {
  width: 40px;
  height: 2px;
  background: linear-gradient(90deg, #6366f1, #a855f7);
  border-radius: 9999px;
  margin-bottom: 1.25rem;
}

.step-number {
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 800;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: white;
  flex-shrink: 0;
}

/* ── MOBILE FIXES ── */
@media (max-width: 639px) {
  .metric-card {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .feature-card {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .team-card {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .page-enter {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .microsoft-btn {
    width: 100% !important;
    max-width: 100% !important;
  }
  .microsoft-btn button,
  .microsoft-btn [class*="button"],
  .microsoft-btn [class*="btn"] {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
  .telegram-btn {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    justify-content: center !important;
  }
  .cta-row {
    width: 100%;
  }
  .marquee-wrap {
    max-width: calc(100vw - 2rem);
  }
  .stats-grid {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 0.5rem !important;
  }
  .stats-grid .metric-card {
    padding: 0.6rem 0.25rem !important;
  }
  .stats-grid .metric-card span:first-child {
    font-size: 1.1rem !important;
    color: #818cf8 !important;
  }
  .stats-grid .metric-card span:last-child {
    font-size: 0.55rem !important;
    letter-spacing: 0.08em !important;
  }
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
    <div
      className="pointer-events-none fixed inset-0 z-0 transition-all duration-300"
      style={{
        background: `radial-gradient(600px at ${position.x}px ${position.y}px, rgba(99,102,241,0.12), transparent 80%)`,
      }}
    />
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

const TEAM = [
  { name: "Benedict Tan",     initial: "B", linkedin: "https://www.linkedin.com/in/benedict-tan-265403215/" },
  { name: "Vidisha Bajoria",  initial: "V", linkedin: "https://www.linkedin.com/in/vidishabajoria/" },
  { name: "Suhani Mishra",    initial: "S", linkedin: "https://www.linkedin.com/in/suhanimishra07/" },
  { name: "Rushika Gupta",    initial: "R", linkedin: "https://www.linkedin.com/in/rushikagupta/" },
  { name: "Shrujan Beesetty", initial: "S", linkedin: "https://www.linkedin.com/in/shrujan-beesetty/" },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Sign in with your NTU account",
    desc: "Authenticate securely via Microsoft SSO — no new passwords, no spam.",
  },
  {
    step: 2,
    title: "Register your swap",
    desc: "Tell us the index you have and the index you want across 2000+ modules.",
  },
  {
    step: 3,
    title: "We find your match",
    desc: "Our engine instantly scans for direct swaps and 3-way chain swaps on your behalf.",
  },
  {
    step: 4,
    title: "Get notified on Telegram",
    desc: "The moment a match is found, you receive an instant Telegram alert with next steps.",
  },
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
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: `-${Math.random() * 100}px`,
              animationDuration: `${8 + Math.random() * 8}s`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <ScrollArea className="min-h-screen">
        <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">

          {/* ── HERO ─────────────────────────────────────────── */}
          <div className="grid xl:grid-cols-[minmax(0,1fr)_280px] gap-8 xl:gap-12 items-center">

            {/* LEFT */}
            <div className="page-enter flex flex-col gap-6 xl:gap-7 justify-center py-8 xl:py-16">

              <div
                className="inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs backdrop-blur-xl"
                style={{ border: "1px solid rgba(99,102,241,0.2)", color: "var(--muted-foreground)", background: "rgba(99,102,241,0.06)" }}
              >
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                Trusted by NTU students
              </div>

              <div className="space-y-5">
                <h1 className="hero-title text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight leading-[1.02]">
                  Swap Your
                  <br />
                  Indexes
                  <br />
                  Instantly.
                </h1>

                <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
                  Find direct swaps, 3-way chain swaps, and open indexes across
                  2000+ modules — all in seconds. Built exclusively for NTU students.
                </p>
              </div>

              {/* CTA BUTTONS */}
              <div className="cta-row flex flex-col sm:flex-row gap-3">
                <div className="cta-button microsoft-btn">
                  <SignInButton callbackUrl={callbackUrl} />
                </div>
                <a
                  href="https://t.me/Findex_ntu_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="telegram-btn"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  Open in Telegram
                </a>
              </div>

              {/* TICKER */}
              <div className="marquee-wrap py-1">
                <div className="live-marquee">
                  {[
                    "SC2000 index swapped",
                    "3-way chain completed",
                    "CZ1106 match found",
                    "MH1810 index available",
                    "Telegram notification sent",
                    "500+ successful swaps",
                    "SC2000 index swapped",
                    "3-way chain completed",
                    "CZ1106 match found",
                    "MH1810 index available",
                    "Telegram notification sent",
                    "500+ successful swaps",
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="live-pill"
                      style={{
                        background: "rgba(99,102,241,0.15)",
                        border: "1px solid rgba(99,102,241,0.35)",
                        color: "var(--foreground)",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/80" />
                        <span>{item}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* STATS */}
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

            {/* RIGHT */}
            <div className="hidden xl:flex relative items-center justify-center">
              <div className="flex flex-col gap-5">
                <div className="floating-card glass-card rounded-2xl p-4 w-[260px]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-sm">SC2000 Swap</span>
                    <span className="text-xs text-green-400">Matched</span>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Have</span><span>Fri 8:30 AM</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Want</span><span>Thu 10:30 AM</span>
                    </div>
                  </div>
                </div>

                <div className="floating-card glass-card rounded-2xl p-4 w-[260px]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-sm">CZ1106 Chain</span>
                    <span className="text-xs text-blue-400">3-Way</span>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Students</span><span>3 Connected</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Status</span><span>Completed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ── FEATURES ─────────────────────────────────────── */}
          <div className="grid md:grid-cols-3 gap-4 pt-8 md:pt-12">
            <div className="feature-card glass-card rounded-xl p-4 md:p-5">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Smart Index Matching</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Automatically detects direct swaps and 3-way chain
                    swaps so everyone gets the index they want.
                  </p>
                </div>
              </div>
            </div>

            <div className="feature-card glass-card rounded-xl p-4 md:p-5">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Instant Telegram Alerts</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Get notified the moment a compatible swap appears —
                    no refreshing, no missed opportunities.
                  </p>
                </div>
              </div>
            </div>

            <div className="feature-card glass-card rounded-xl p-4 md:p-5">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary/80" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">NTU Verified Only</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Microsoft SSO ensures every user is a real NTU student —
                    a trusted space with zero spam.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── HOW IT WORKS ─────────────────────────────────── */}
          <div className="about-section mt-0">
            <div className="section-divider" />
            <span className="about-label">How It Works</span>
            <h2 className="text-2xl md:text-3xl font-black mt-3 mb-8">
              From sign-up to swap in minutes.
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              {HOW_IT_WORKS.map((item, idx) => (
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

          {/* ── ABOUT US ─────────────────────────────────────── */}
          <div className="about-section mt-0">

            {/* Origin story */}
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
                <p>
                  Index swapping at NTU has always been a mess — scattered Telegram
                  messages, endless back-and-forth, and deals that fall through because
                  finding a mutual match manually is nearly impossible. We lived through
                  it ourselves and decided to fix it properly.
                </p>
                <p>
                  What makes SwapHub different is its ability to resolve{" "}
                  <span className="text-foreground font-semibold">3-way chain swaps</span>{" "}
                  that no human coordination could reliably pull off. If A wants B&apos;s
                  slot, B wants C&apos;s slot, and C wants A&apos;s slot, SwapHub finds
                  that chain instantly and notifies all three parties at once.
                </p>
                <p>
                  No group chats. No missed DMs. Just log in with your NTU account,
                  register what you have and what you want, and let the system do
                  the rest — across 2000+ modules.
                </p>
              </div>

              <blockquote className="mt-6 pl-4 border-l-2 border-primary/50 italic text-muted-foreground text-sm">
                &ldquo;Index swapping should take minutes, not weeks.&rdquo;
              </blockquote>
            </div>

            {/* Team */}
            <div className="mb-8">
              <div className="section-divider" />
              <span className="about-label">The Team</span>
              <h2 className="text-2xl md:text-3xl font-black mt-3 mb-2">Who We Are</h2>
              <p className="text-muted-foreground text-sm max-w-xl">
                A mixed team of Year 1 and Year 2 Computer Science students at NTU Singapore,
                building tools that make student life genuinely easier.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {TEAM.map((member) => (
                <a
                  key={member.name}
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="team-card glass-card rounded-2xl p-4 flex flex-col items-center text-center gap-3"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    className="team-avatar h-14 w-14 rounded-full flex items-center justify-center text-lg font-black text-white transition-all duration-200"
                    style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}
                  >
                    {member.initial}
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-snug">{member.name}</p>
                    <p className="linkedin-icon">View LinkedIn ↗</p>
                  </div>
                </a>
              ))}
            </div>

          </div>
          {/* ── END ABOUT ─────────────────────────────────────── */}

        </div>
      </ScrollArea>
    </main>
  );
}
