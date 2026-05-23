"use client";

import { motion, useAnimation, useInView } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import ExerciseCard from "@/components/exercises/ExerciseCard";

/* ─── Floating 3-D healthcare orb (CSS keyframes injected once) ─── */
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

  :root {
    --navy:   #0B1D3A;
    --navy2:  #112244;
    --blue:   #1A4A8A;
    --sky:    #2F7DD6;
    --light:  #E8F1FB;
    --muted:  #A0B4CC;
    --white:  #FFFFFF;
    --accent: #5BA8FF;
  }

  @keyframes floatOrb {
    0%,100% { transform: translateY(0px) rotateX(0deg) rotateY(0deg); }
    25%      { transform: translateY(-14px) rotateX(8deg) rotateY(6deg); }
    50%      { transform: translateY(-6px)  rotateX(-4deg) rotateY(12deg); }
    75%      { transform: translateY(-18px) rotateX(6deg) rotateY(-8deg); }
  }
  @keyframes pulseRing {
    0%   { transform: scale(1);   opacity: .6; }
    100% { transform: scale(1.9); opacity: 0; }
  }
  @keyframes rotateSlow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes heartbeat {
    0%,100% { transform: scaleY(1); }
    10%     { transform: scaleY(1.6); }
    20%     { transform: scaleY(0.9); }
    30%     { transform: scaleY(1.3); }
    40%     { transform: scaleY(1); }
  }
  @keyframes slideUp {
    from { opacity:0; transform:translateY(24px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes breathe {
    0%,100% { box-shadow: 0 0 0 0 rgba(91,168,255,0); }
    50%      { box-shadow: 0 0 32px 8px rgba(91,168,255,0.18); }
  }

  .ex-page * { box-sizing: border-box; margin: 0; padding: 0; }
  .ex-page {
    font-family: 'DM Sans', sans-serif;
    background: var(--light);
    min-height: 100vh;
    display: grid;
    grid-template-columns: 340px 1fr;
  }

  /* ── LEFT PANEL ── */
  .ex-left {
    background: var(--navy);
    position: sticky;
    top: 0;
    height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 48px 36px;
    overflow: hidden;
    z-index: 10;
  }
  .ex-left::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 20% 10%, rgba(47,125,214,.22) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 90%, rgba(91,168,255,.12) 0%, transparent 55%);
    pointer-events: none;
  }

  /* grid lines */
  .ex-left::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }

  .ex-brand {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 52px; position: relative; z-index:2;
  }
  .ex-brand-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 12px var(--accent);
  }
  .ex-brand-line { width: 32px; height: 1.5px; background: var(--accent); opacity:.6; }
  .ex-brand-text {
    font-family: 'DM Sans', sans-serif;
    font-size: 11px; font-weight: 600;
    letter-spacing: .18em; text-transform: uppercase;
    color: var(--accent); opacity:.85;
  }

  /* 3-D orb */
  .orb-wrap {
    position: relative; z-index:2;
    width: 160px; height: 160px;
    margin: 0 auto 36px;
    animation: floatOrb 6s ease-in-out infinite;
    perspective: 600px;
  }
  .orb-ring {
    position: absolute; inset: -12px;
    border-radius: 50%;
    border: 1.5px solid rgba(91,168,255,.25);
    animation: rotateSlow 12s linear infinite;
  }
  .orb-ring-2 {
    position: absolute; inset: -24px;
    border-radius: 50%;
    border: 1px solid rgba(91,168,255,.12);
    animation: rotateSlow 20s linear infinite reverse;
  }
  .orb-pulse {
    position: absolute; inset: -4px;
    border-radius: 50%;
    background: rgba(91,168,255,.07);
    animation: pulseRing 2.8s ease-out infinite;
  }
  .orb-core {
    width: 160px; height: 160px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%,
      #2F7DD6 0%, #1A4A8A 45%, var(--navy) 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow:
      0 24px 64px rgba(0,0,0,.5),
      inset 0 2px 8px rgba(255,255,255,.12),
      0 0 0 1px rgba(91,168,255,.2);
    position: relative; z-index:3;
  }
  .orb-icon { font-size: 52px; filter: drop-shadow(0 2px 12px rgba(0,0,0,.4)); }

  /* ECG line */
  .ecg-wrap {
    width: 100%; position: relative; z-index:2; margin-bottom: 32px;
    display: flex; align-items: center; gap: 10px;
  }
  .ecg-label {
    font-size: 10px; letter-spacing:.12em; text-transform:uppercase;
    color: var(--muted); white-space:nowrap;
  }
  .ecg-svg { flex:1; height: 36px; }
  .ecg-path {
    stroke: var(--accent); stroke-width:1.8; fill:none;
    animation: heartbeat 2s ease-in-out infinite;
    transform-origin: center;
  }

  /* stats */
  .stat-list { display: flex; flex-direction: column; gap: 12px; position:relative; z-index:2; }
  .stat-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px;
    border-radius: 10px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.07);
    transition: background .2s;
  }
  .stat-row:hover { background: rgba(255,255,255,.07); }
  .stat-label { font-size: 13px; color: var(--muted); display:flex; align-items:center; gap:8px; }
  .stat-dot { width:6px; height:6px; border-radius:50%; }
  .stat-val { font-size:14px; font-weight:600; color: var(--accent); }

  .left-footer {
    margin-top: auto; position: relative; z-index:2;
    font-size: 11px; color: rgba(255,255,255,.2);
    letter-spacing: .06em;
  }

  /* ── RIGHT PANEL ── */
  .ex-right {
    padding: 52px 48px;
    overflow-y: auto;
  }

  .ex-header { margin-bottom: 12px; }
  .ex-eyebrow {
    font-size: 11px; font-weight: 600;
    letter-spacing: .16em; text-transform: uppercase;
    color: var(--sky); margin-bottom: 10px;
    display: flex; align-items:center; gap: 8px;
  }
  .ex-eyebrow::before {
    content:''; display:inline-block; width:20px; height:1.5px;
    background: var(--sky);
  }
  .ex-title {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(28px, 3vw, 40px);
    color: var(--navy);
    line-height: 1.18;
    margin-bottom: 14px;
  }
  .ex-subtitle { font-size: 15px; color: #5A7190; line-height: 1.6; max-width: 540px; }

  /* badge */
  .badge {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight:600; letter-spacing:.1em; text-transform:uppercase;
    padding: 6px 14px;
    border-radius: 100px;
    background: #DCF0E8; color: #1A7A4A;
    margin-bottom: 32px;
    animation: breathe 3s ease-in-out infinite;
  }
  .badge-dot { width:6px; height:6px; border-radius:50%; background:#1A7A4A; }

  /* analysis card */
  .analysis-card {
    background: var(--navy);
    border-radius: 20px;
    padding: 32px;
    margin-bottom: 40px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 16px 48px rgba(11,29,58,.18);
    animation: slideUp .6s ease forwards;
    border: 1px solid rgba(255,255,255,.06);
  }
  .analysis-card::before {
    content: '';
    position: absolute;
    top: -60px; right: -60px;
    width: 240px; height: 240px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(47,125,214,.18) 0%, transparent 70%);
    pointer-events:none;
  }
  .analysis-tag {
    font-size: 10px; font-weight:600; letter-spacing:.16em; text-transform:uppercase;
    color: var(--accent); margin-bottom: 14px;
    display: flex; align-items:center; gap: 8px;
  }
  .analysis-tag::before {
    content:''; display:inline-block; width:16px; height:1.5px;
    background: var(--accent);
  }
  .analysis-text {
    font-family: 'DM Serif Display', serif;
    font-size: 18px; font-weight:400;
    color: rgba(255,255,255,.88);
    line-height: 1.65;
    font-style: italic;
    margin-bottom: 22px;
    max-width: 680px;
  }
  .analysis-pills { display: flex; gap: 10px; flex-wrap:wrap; }
  .pill {
    font-size: 12px; padding: 7px 16px; border-radius: 8px;
    background: rgba(255,255,255,.07);
    border: 1px solid rgba(255,255,255,.1);
    color: rgba(255,255,255,.75);
    display: flex; align-items:center; gap: 6px;
  }
  .pill strong { color: var(--accent); }

  /* section heading */
  .section-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 24px;
  }
  .section-title {
    font-family: 'DM Serif Display', serif;
    font-size: 22px; color: var(--navy);
  }
  .section-count {
    font-size: 12px; color: var(--muted); font-weight:500;
  }

  /* grid */
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }

  /* exercise card */
  .ex-card {
    background: #fff;
    border-radius: 16px;
    border: 1px solid rgba(11,29,58,.07);
    padding: 24px;
    position: relative;
    overflow: hidden;
    transition: transform .25s ease, box-shadow .25s ease;
    animation: slideUp .5s ease both;
    box-shadow: 0 2px 16px rgba(11,29,58,.05);
  }
  .ex-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(11,29,58,.12);
  }
  .ex-card::before {
    content:'';
    position: absolute; top:0; left:0; right:0; height:3px;
    background: linear-gradient(90deg, var(--sky), var(--accent));
    border-radius: 16px 16px 0 0;
  }
  .card-target {
    font-size: 10px; font-weight:600; letter-spacing:.14em; text-transform:uppercase;
    color: var(--sky); margin-bottom: 10px;
    display:flex; align-items:center; gap:6px;
  }
  .card-icon { font-size: 22px; margin-bottom: 6px; }
  .card-name {
    font-family: 'DM Serif Display', serif;
    font-size: 18px; color: var(--navy);
    margin-bottom: 8px; line-height:1.25;
  }
  .card-desc {
    font-size: 13px; color: #5A7190; line-height:1.6;
    margin-bottom: 20px;
  }
  .card-stats {
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
  }
  .card-stat {
    background: var(--light);
    border-radius: 8px;
    padding: 10px 8px;
    text-align: center;
  }
  .card-stat-val {
    font-size: 15px; font-weight:600; color: var(--navy);
    display:block; line-height:1.2;
  }
  .card-stat-lbl {
    font-size: 10px; color: var(--muted);
    letter-spacing:.08em; text-transform:uppercase;
  }

  /* loading / empty */
  .ex-center {
    display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    min-height:100vh; gap:16px;
    font-family:'DM Sans',sans-serif;
  }
  .ex-spinner {
    width:44px; height:44px;
    border-radius:50%;
    border: 3px solid rgba(11,29,58,.1);
    border-top-color: var(--sky);
    animation: rotateSlow .8s linear infinite;
  }

  /* responsive */
  @media (max-width: 900px) {
    .ex-page { grid-template-columns: 1fr; }
    .ex-left { position:relative; height:auto; padding:36px 28px; }
    .ex-right { padding: 32px 24px; }
  }
`;

/* ── inject styles once ── */
function useGlobalStyle(css: string) {
  useEffect(() => {
    const id = "ex-page-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = css;
      document.head.appendChild(el);
    }
  }, [css]);
}

/* ── ECG SVG ── */
function EcgLine() {
  return (
    <div className="ecg-wrap">
      <span className="ecg-label">Vitals</span>
      <svg className="ecg-svg" viewBox="0 0 220 36" preserveAspectRatio="none">
        <path
          className="ecg-path"
          d="M0,18 L30,18 L38,18 L42,4 L46,32 L50,10 L54,18 L80,18 L88,18 L92,4 L96,32 L100,10 L104,18 L140,18 L148,18 L152,4 L156,32 L160,10 L164,18 L200,18 L220,18"
        />
      </svg>
    </div>
  );
}

/* ── Left Panel ── */
function LeftPanel({ planData }: { planData: any }) {
  return (
    <aside className="ex-left">
      {/* brand */}
      <div className="ex-brand">
        <div className="ex-brand-dot" />
        <div className="ex-brand-line" />
        <span className="ex-brand-text">AI Physio</span>
      </div>

      {/* 3-D orb */}
      <div className="orb-wrap">
        <div className="orb-ring" />
        <div className="orb-ring-2" />
        <div className="orb-pulse" />
        <div className="orb-core">
          <span className="orb-icon">🫀</span>
        </div>
      </div>

      {/* ECG */}
      <EcgLine />

      {/* stats */}
      <div className="stat-list">
        {[
          { dot: "#5BA8FF", label: "Risk Level",   val: planData?.risk_level ?? "—" },
          { dot: "#3CB371", label: "Exercises",    val: `${planData?.exercises?.length ?? 0} planned` },
          { dot: "#2F7DD6", label: "Rest Note",    val: planData?.rest_recommendation ?? "—" },
          { dot: "#5BA8FF", label: "Plan Status",  val: "Active" },
        ].map((s) => (
          <div className="stat-row" key={s.label}>
            <span className="stat-label">
              <span className="stat-dot" style={{ background: s.dot }} />
              {s.label}
            </span>
            <span className="stat-val">{s.val}</span>
          </div>
        ))}
      </div>

      <div className="left-footer">Recovery Intelligence System · v2.4</div>
    </aside>
  );
}

/* ── Exercise Card ── */
function ExCard({ ex, delay }: { ex: any; delay: number }) {
  const icons: Record<string, string> = {
    shoulder: "🦾", knee: "🦵", back: "🏋️", hip: "🧘", ankle: "🦶",
    neck: "💪", core: "🫁", wrist: "✋",
  };
  const target = (ex.target_area ?? "").toLowerCase();
  const icon = Object.entries(icons).find(([k]) => target.includes(k))?.[1] ?? "🏃";

  return (
    <div className="ex-card" style={{ animationDelay: `${delay}s` }}>
      <div className="card-target">{ex.target_area}</div>
      <div className="card-icon">{icon}</div>
      <div className="card-name">{ex.name}</div>
      <p className="card-desc">{ex.description}</p>
      <div className="card-stats">
        <div className="card-stat">
          <span className="card-stat-val">{ex.duration_minutes ?? "—"}</span>
          <span className="card-stat-lbl">Min</span>
        </div>
        <div className="card-stat">
          <span className="card-stat-val">{ex.sets ?? "—"}</span>
          <span className="card-stat-lbl">Sets</span>
        </div>
        <div className="card-stat">
          <span className="card-stat-val">{ex.repetitions ?? "—"}</span>
          <span className="card-stat-lbl">Reps</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export default function ExercisesPage() {
  useGlobalStyle(GLOBAL_STYLES);

  const [planData, setPlanData] = useState<any>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/exercises/current");
        setPlanData(res.data);
      } catch (err: any) {
        if (err.response?.status !== 404) toast.error("Failed to load your exercise plan.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="ex-center" style={{ fontFamily: "'DM Sans',sans-serif", background: "#E8F1FB" }}>
        <div className="ex-spinner" />
        <p style={{ color: "#5A7190", fontSize: 14 }}>Loading your personalised exercise plan…</p>
      </div>
    );
  }

  /* ── Empty ── */
  if (!planData) {
    return (
      <div className="ex-center" style={{ fontFamily: "'DM Sans',sans-serif", background: "#E8F1FB", display: "flex", flexDirection: "column", gap: 10, alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <span style={{ fontSize: 48 }}>🏥</span>
        <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 26, color: "#0B1D3A", margin: 0 }}>
          No Active Plan Found
        </h2>
        <p style={{ color: "#5A7190", fontSize: 14, marginBottom: 20 }}>
          Please complete your daily check-in to generate today's exercise plan. If you already checked in, click Generate below.
        </p>
        <button
          onClick={async () => {
            setLoading(true);
            try {
              await api.post("/api/exercises/generate");
              const res = await api.get("/api/exercises/current");
              setPlanData(res.data);
              toast.success("Plan generated successfully!");
            } catch (err) {
              toast.error("Failed to generate plan. Please try again.");
            } finally {
              setLoading(false);
            }
          }}
          style={{
            padding: "12px 24px",
            background: "#0B1D3A",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            fontSize: 14
          }}
        >
          Generate Plan Now
        </button>
      </div>
    );
  }

  /* ── Full page ── */
  return (
    <div className="ex-page">
      <LeftPanel planData={planData} />

      <main className="ex-right">
        {/* header */}
        <header className="ex-header">
          <div className="ex-eyebrow">AI Physio · Daily Program</div>
          <h1 className="ex-title">
            Today's Personalised<br />Recovery Plan
          </h1>
          <p className="ex-subtitle">
            Based on your latest check-in metrics, our clinical AI has designed this
            safe and progressive exercise program tailored to your recovery stage.
          </p>
        </header>

        {/* badge */}
        <div className="badge">
          <span className="badge-dot" />
          Plan Generated
        </div>

        {/* analysis */}
        <motion.div
          className="analysis-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <div className="analysis-tag">AI Clinical Analysis</div>
          <p className="analysis-text">"{planData.analysis || planData.ai_analysis}"</p>
          <div className="analysis-pills">
            <div className="pill">
              Risk Level <strong>{planData.risk_level}</strong>
            </div>
            <div className="pill">
              Recovery <strong>{planData.rest_recommendation || (planData.setback_probability !== undefined ? `${Math.round(planData.setback_probability * 100)}% setback risk` : "Active Recovery")}</strong>
            </div>
            <div className="pill">
              Exercises <strong>{planData.exercises?.length ?? 0}</strong>
            </div>
          </div>
        </motion.div>

        {/* exercises */}
        <div className="section-head">
          <h2 className="section-title">Exercise Program</h2>
          <span className="section-count">{planData.exercises?.length ?? 0} exercises</span>
        </div>

        <div className="cards-grid">
          {planData.exercises.map((ex: any, i: number) => (
            <ExCard key={i} ex={ex} delay={i * 0.08} />
          ))}
        </div>
      </main>
    </div>
  );
}