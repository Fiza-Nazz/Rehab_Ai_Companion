"use client";

import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import api from "@/lib/api";

/* ═══════════════════════════════════════════════════════════
   DESIGN SYSTEM
   Palette: pure white · icy blues · deep navy
   #FFFFFF  background
   #F4F8FF  surface tint
   #E8F0FE  tile bg / borders
   #C5D8FB  muted accent
   #3B82F6  primary blue
   #1D4ED8  mid navy
   #0F2A6B  deep navy
   #060F2E  darkest (right panel)
═══════════════════════════════════════════════════════════ */

/* ─── 3D DNA Helix (Three.js) ─────────────────────────── */
function DNAHelix() {
  const mountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    cam.position.set(0, 0, 5);

    // Ambient + directional lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0x93c5fd, 4);
    sun.position.set(3, 5, 4);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x1d4ed8, 2);
    fill.position.set(-3, -2, 2);
    scene.add(fill);

    const group = new THREE.Group();
    scene.add(group);

    // Build double helix
    const strandA: THREE.Mesh[] = [];
    const strandB: THREE.Mesh[] = [];
    const rungs: THREE.Mesh[] = [];
    const N = 28;

    const sphereGeoA = new THREE.SphereGeometry(0.095, 10, 10);
    const sphereGeoB = new THREE.SphereGeometry(0.095, 10, 10);
    const matA = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.3, roughness: 0.35 });
    const matB = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.3, roughness: 0.35 });
    const matRung = new THREE.MeshStandardMaterial({ color: 0xc5d8fb, transparent: true, opacity: 0.55, metalness: 0.1 });

    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 4 - Math.PI * 2;
      const y = (i / N) * 4 - 2;
      const r = 0.72;

      const sA = new THREE.Mesh(sphereGeoA, matA);
      sA.position.set(Math.cos(t) * r, y, Math.sin(t) * r);
      group.add(sA);
      strandA.push(sA);

      const sB = new THREE.Mesh(sphereGeoB, matB);
      sB.position.set(Math.cos(t + Math.PI) * r, y, Math.sin(t + Math.PI) * r);
      group.add(sB);
      strandB.push(sB);

      if (i % 3 === 0) {
        const rungGeo = new THREE.CylinderGeometry(0.02, 0.02, r * 2, 6);
        const rung = new THREE.Mesh(rungGeo, matRung);
        rung.position.set(0, y, 0);
        rung.lookAt(sA.position.x * 2, y, sA.position.z * 2);
        rung.rotateX(Math.PI / 2);
        group.add(rung);
        rungs.push(rung);
      }
    }

    // Outer glow sphere (wireframe)
    const glowGeo = new THREE.SphereGeometry(1.35, 18, 18);
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6, wireframe: true, transparent: true, opacity: 0.08,
    });
    const glowSphere = new THREE.Mesh(glowGeo, glowMat);
    group.add(glowSphere);

    // Floating particles
    const ptCount = 90;
    const ptPositions = new Float32Array(ptCount * 3);
    for (let i = 0; i < ptCount; i++) {
      ptPositions[i * 3] = (Math.random() - 0.5) * 4.5;
      ptPositions[i * 3 + 1] = (Math.random() - 0.5) * 4.5;
      ptPositions[i * 3 + 2] = (Math.random() - 0.5) * 4.5;
    }
    const ptGeo = new THREE.BufferGeometry();
    ptGeo.setAttribute("position", new THREE.Float32BufferAttribute(ptPositions, 3));
    const ptMesh = new THREE.Points(ptGeo, new THREE.PointsMaterial({ color: 0x93c5fd, size: 0.038 }));
    scene.add(ptMesh);

    let t2 = 0, raf: number;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      t2 += 0.012;
      group.rotation.y = t2 * 0.5;
      group.rotation.x = Math.sin(t2 * 0.2) * 0.15;
      ptMesh.rotation.y = -t2 * 0.08;
      glowSphere.rotation.y = t2 * 0.3;
      renderer.render(scene, cam);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);
  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}

/* ─── ECG Pulse SVG (animated) ────────────────────────── */
function ECGLine() {
  return (
    <svg viewBox="0 0 420 60" preserveAspectRatio="none" style={{ width: "100%", height: 44, display: "block" }}>
      <defs>
        <linearGradient id="ecgGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
          <stop offset="40%" stopColor="#3b82f6" stopOpacity="1" />
          <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.7" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* base flatline with spike */}
      <polyline
        points="0,30 60,30 75,30 82,10 88,48 94,30 110,30 170,30 185,30 192,8 198,50 204,30 220,30 280,30 295,30 302,8 308,50 314,30 330,30 390,30 420,30"
        fill="none"
        stroke="url(#ecgGrad)"
        strokeWidth="1.8"
        filter="url(#glow)"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <animate attributeName="stroke-dashoffset" from="600" to="-600" dur="3.2s" repeatCount="indefinite" />
        <animate attributeName="stroke-dasharray" values="600 600" dur="3.2s" repeatCount="indefinite" />
      </polyline>
      {/* moving dot */}
      <circle r="3" fill="#3b82f6" filter="url(#glow)" opacity="0.9">
        <animateMotion dur="3.2s" repeatCount="indefinite"
          path="M0,30 L60,30 L75,30 L82,10 L88,48 L94,30 L110,30 L170,30 L185,30 L192,8 L198,50 L204,30 L220,30 L280,30 L295,30 L302,8 L308,50 L314,30 L330,30 L390,30 L420,30" />
      </circle>
    </svg>
  );
}

/* ─── Animated counter ────────────────────────────────── */
function Counter({ to, decimals = 0, suffix = "" }: { to: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obj = { v: 0 };
    gsap.to(obj, {
      v: to, duration: 1.8, ease: "power3.out",
      onUpdate() { if (ref.current) ref.current.textContent = obj.v.toFixed(decimals) + suffix; },
    });
  }, [to]);
  return <span ref={ref}>0{suffix}</span>;
}

/* ─── Metric card ─────────────────────────────────────── */
interface MetricCardProps {
  label: string;
  value: number;
  suffix: string;
  decimals?: number;
  hint: string;
  accentColor: string;
  icon: React.ReactNode;
  delay: number;
}
function MetricCard({ label, value, suffix, decimals = 0, hint, accentColor, icon, delay }: MetricCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current,
      { y: 32, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, delay, ease: "power3.out" }
    );
  }, [delay]);

  return (
    <div ref={ref} className="metric-card" style={{ opacity: 0 }}>
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <span className="metric-icon" style={{ color: accentColor }}>{icon}</span>
      </div>
      <div className="metric-value" style={{ color: accentColor }}>
        <Counter to={value} decimals={decimals} suffix={suffix} />
      </div>
      <div className="metric-hint">{hint}</div>
      <div className="metric-bar-track">
        <div className="metric-bar-fill" style={{ background: accentColor, width: `${Math.min((value / 10) * 100, 100)}%` }} />
      </div>
    </div>
  );
}

/* ─── Right-panel stat row ────────────────────────────── */
function PanelRow({ label, val, dot, delay }: { label: string; val: React.ReactNode; dot: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current, { x: 18, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, delay, ease: "power2.out" });
  }, [delay]);
  return (
    <div ref={ref} className="panel-row" style={{ opacity: 0 }}>
      <div className="panel-row-left">
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, display: "block", flexShrink: 0 }} />
        <span className="panel-row-label">{label}</span>
      </div>
      <span className="panel-row-val">{val}</span>
    </div>
  );
}

/* ─── Custom chart tooltip ────────────────────────────── */
const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0f2a6b", border: "1px solid #1d4ed8", borderRadius: 10, padding: "10px 16px", fontFamily: "'Geist', 'DM Sans', sans-serif", fontSize: 12, boxShadow: "0 8px 32px rgba(15,42,107,0.4)" }}>
      <p style={{ color: "#93c5fd", fontWeight: 600, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: "#fff", fontWeight: 700, margin: "2px 0" }}>
          <span style={{ color: p.color }}>{p.name}</span>&nbsp;{p.value}
        </p>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function ProgressPage() {
  const [summary, setSummary] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [adherenceData, setAdherenceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, c, f, a] = await Promise.all([
          api.get("/api/progress/summary"),
          api.get("/api/progress/charts"),
          api.get("/api/progress/forecast"),
          api.get("/api/progress/adherence"),
        ]);
        setSummary(s.data); setChartData(c.data);
        setForecast(f.data); setAdherenceData(a.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (headerRef.current)
      gsap.fromTo(headerRef.current.children,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.08, duration: 0.6, ease: "power2.out" }
      );
    if (rightRef.current)
      gsap.fromTo(rightRef.current,
        { x: 36, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.8, delay: 0.15, ease: "power3.out" }
      );
  }, [loading]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320, fontFamily: "'DM Sans', sans-serif", color: "#3b82f6", fontSize: 14, gap: 12 }}>
        <span style={{ width: 20, height: 20, border: "2px solid #e8f0fe", borderTopColor: "#3b82f6", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
        Loading your recovery data…
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const riskPct = forecast?.setback_probability ? Math.round(forecast.setback_probability * 100) : 0;
  const riskLabel = riskPct > 50 ? "High" : riskPct > 20 ? "Moderate" : "Low";
  const riskColor = riskPct > 50 ? "#f87171" : riskPct > 20 ? "#60a5fa" : "#34d399";

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <>
      {/* ── GLOBAL STYLES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .pr-root {
          font-family: 'DM Sans', system-ui, sans-serif;
          background: #f4f8ff;
          min-height: 100vh;
          padding: 36px 28px 60px;
        }
        .pr-inner { max-width: 1220px; margin: 0 auto; }

        /* PAGE HEADER */
        .pr-header {
          display: flex; align-items: flex-end; justify-content: space-between;
          margin-bottom: 32px; gap: 16px; flex-wrap: wrap;
        }
        .pr-header-left h1 {
          font-family: 'Instrument Serif', Georgia, serif;
          font-size: 40px; font-weight: 400; line-height: 1.1;
          color: #0f2a6b; letter-spacing: -0.02em;
        }
        .pr-header-left h1 em {
          font-style: italic; color: #3b82f6;
        }
        .pr-header-left p {
          font-size: 13px; color: #93a8cf; font-weight: 500; margin-top: 6px;
        }
        .pr-badge {
          display: inline-flex; align-items: center; gap: 7px;
          background: #0f2a6b; color: #fff; border-radius: 40px;
          padding: 8px 18px; font-size: 12px; font-weight: 600; letter-spacing: 0.04em;
        }
        .pr-badge-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #34d399;
          animation: pulse-dot 1.8s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,0.4)}
          50%{box-shadow:0 0 0 5px rgba(52,211,153,0)}
        }

        /* LAYOUT */
        .pr-layout {
          display: grid;
          grid-template-columns: 1fr 310px;
          gap: 22px;
          align-items: start;
        }
        @media(max-width:900px){ .pr-layout{grid-template-columns:1fr;} }

        /* ECG STRIP */
        .ecg-strip {
          background: #fff; border: 1px solid #e8f0fe; border-radius: 14px;
          padding: 18px 24px 14px; margin-bottom: 20px;
          display: flex; align-items: center; gap: 20px;
        }
        .ecg-strip-label {
          flex-shrink: 0;
          font-size: 10px; font-weight: 700; color: #c5d8fb;
          text-transform: uppercase; letter-spacing: 0.12em;
          line-height: 1.4;
        }
        .ecg-strip-label span { display: block; color: #0f2a6b; font-size: 15px; font-weight: 700; letter-spacing: -0.01em; margin-top: 2px; }

        /* METRIC CARDS GRID */
        .metric-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;
          margin-bottom: 20px;
        }
        @media(max-width:700px){ .metric-grid{grid-template-columns:1fr 1fr;} }

        .metric-card {
          background: #fff; border: 1px solid #e8f0fe; border-radius: 14px;
          padding: 22px 20px 18px; position: relative; overflow: hidden;
          transition: box-shadow 0.25s, transform 0.25s;
          cursor: default;
        }
        .metric-card:hover {
          box-shadow: 0 12px 40px rgba(59,130,246,0.12);
          transform: translateY(-2px);
        }
        .metric-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: var(--accent, #3b82f6);
          border-radius: 14px 14px 0 0;
        }
        .metric-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
        .metric-label { font-size: 10px; font-weight: 700; color: #93a8cf; text-transform: uppercase; letter-spacing: 0.1em; line-height: 1.3; }
        .metric-icon { font-size: 18px; line-height: 1; }
        .metric-value {
          font-family: 'Instrument Serif', serif;
          font-size: 42px; font-weight: 400; line-height: 1;
          letter-spacing: -0.03em; margin-bottom: 6px;
        }
        .metric-hint { font-size: 11px; color: #93a8cf; font-weight: 500; margin-bottom: 14px; }
        .metric-bar-track {
          height: 3px; background: #e8f0fe; border-radius: 2px; overflow: hidden;
        }
        .metric-bar-fill {
          height: 100%; border-radius: 2px;
          transition: width 1.5s cubic-bezier(0.23,1,0.32,1);
        }

        /* CHART CARD */
        .chart-card {
          background: #fff; border: 1px solid #e8f0fe; border-radius: 14px;
          overflow: hidden; margin-bottom: 18px;
        }
        .chart-card:last-child { margin-bottom: 0; }
        .chart-head {
          padding: 20px 26px 16px;
          border-bottom: 1px solid #e8f0fe;
          display: flex; align-items: flex-end; justify-content: space-between;
        }
        .chart-title {
          font-family: 'Instrument Serif', serif;
          font-size: 20px; color: #0f2a6b; font-weight: 400; letter-spacing: -0.01em;
        }
        .chart-sub { font-size: 11px; color: #93a8cf; font-weight: 500; margin-top: 2px; }
        .chart-tag {
          font-size: 10px; font-weight: 700; color: #3b82f6;
          background: #e8f0fe; padding: 4px 10px; border-radius: 20px;
          letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap;
        }
        .chart-body { padding: 20px 14px 16px; }

        /* RIGHT PANEL */
        .right-panel {
          background: linear-gradient(170deg, #0f2a6b 0%, #060f2e 100%);
          border-radius: 18px; overflow: hidden;
          position: sticky; top: 32px;
          box-shadow: 0 24px 64px rgba(15,42,107,0.3);
        }
        .panel-dna { width: 100%; height: 210px; }
        .panel-brand {
          padding: 0 24px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .panel-brand h2 {
          font-family: 'Instrument Serif', serif;
          font-size: 22px; color: #fff; font-weight: 400; letter-spacing: -0.02em;
          margin-bottom: 4px;
        }
        .panel-brand p { font-size: 12px; color: #6487c8; font-weight: 400; line-height: 1.55; }

        .panel-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 13px 22px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .panel-row:hover { background: rgba(59,130,246,0.06); }
        .panel-row-left { display: flex; align-items: center; gap: 10px; }
        .panel-row-label { color: #7a9bce; font-size: 12.5px; font-weight: 500; }
        .panel-row-val { color: #fff; font-size: 13.5px; font-weight: 700; letter-spacing: -0.01em; }

        .panel-ecg {
          padding: 14px 22px 10px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .panel-ecg-label { font-size: 10px; font-weight: 700; color: #3b5a98; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; }

        .panel-footer {
          padding: 14px 22px; display: flex; align-items: center; gap: 8px;
        }
        .panel-footer-dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; animation: pulse-dot 1.8s ease-in-out infinite; }
        .panel-footer-text { font-size: 11px; color: #3b5a98; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
      `}</style>

      <div className="pr-root">
        <div className="pr-inner">

          {/* ── PAGE HEADER ── */}
          <div className="pr-header" ref={headerRef}>
            <div className="pr-header-left">
              <h1>Recovery <em>Progress</em></h1>
              <p>{today} · 14-day AI analysis · RehabAI</p>
            </div>
            <div className="pr-badge">
              <span className="pr-badge-dot" />
              Active Recovery Mode
            </div>
          </div>

          <div className="pr-layout">
            {/* ══ LEFT COLUMN ══ */}
            <div ref={leftRef}>

              {/* ECG header strip */}
              <div className="ecg-strip">
                <div className="ecg-strip-label">
                  Live Signal
                  <span>Heart Rhythm</span>
                </div>
                <div style={{ flex: 1 }}>
                  <ECGLine />
                </div>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontFamily: "'Instrument Serif', serif", color: "#0f2a6b", fontWeight: 400, letterSpacing: "-0.03em" }}>72 <span style={{ fontSize: 12, color: "#93a8cf", fontWeight: 500 }}>bpm</span></div>
                  <div style={{ fontSize: 10, color: "#c5d8fb", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Normal</div>
                </div>
              </div>

              {/* Metric tiles */}
              <div className="metric-grid">
                <MetricCard
                  label="Avg Pain" value={summary?.avg_pain || 0}
                  suffix="/10" decimals={1} hint="14-day average · lower is better"
                  accentColor="#3b82f6" delay={0.1}
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 8v4l3 3"/></svg>
                  }
                />
                <MetricCard
                  label="Mobility" value={summary?.avg_mobility || 0}
                  suffix="/10" decimals={1} hint="14-day average · higher is better"
                  accentColor="#1d4ed8" delay={0.18}
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"/><path d="M12 7v8m-4-5l4 5 4-5"/></svg>
                  }
                />
                <MetricCard
                  label="Streak" value={summary?.streak || 0}
                  suffix=" d" hint="Current exercise streak"
                  accentColor="#0f2a6b" delay={0.26}
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  }
                />
                <MetricCard
                  label="Risk Level" value={riskPct}
                  suffix="%" hint={`${riskLabel} setback probability`}
                  accentColor={riskColor} delay={0.34}
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  }
                />
              </div>

              {/* Pain & Mobility chart */}
              <div className="chart-card">
                <div className="chart-head">
                  <div>
                    <div className="chart-title">Pain & Mobility Trend</div>
                    <div className="chart-sub">14-day overview — scores out of 10</div>
                  </div>
                  <span className="chart-tag">14 Days</span>
                </div>
                <div className="chart-body">
                  <ResponsiveContainer width="100%" height={268}>
                    <AreaChart data={chartData} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gPain" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gMob" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 6" stroke="#e8f0fe" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#93a8cf", fontFamily: "DM Sans", fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "#93a8cf", fontFamily: "DM Sans", fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTip />} />
                      <Legend wrapperStyle={{ fontSize: 12, fontFamily: "DM Sans", fontWeight: 600, paddingTop: 12 }} />
                      <Area type="monotone" dataKey="pain" name="Pain" stroke="#3b82f6" strokeWidth={2.2} fill="url(#gPain)" dot={{ r: 3.5, fill: "#3b82f6", strokeWidth: 0 }} activeDot={{ r: 5.5, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }} />
                      <Area type="monotone" dataKey="mobility" name="Mobility" stroke="#1d4ed8" strokeWidth={2.2} fill="url(#gMob)" dot={{ r: 3.5, fill: "#1d4ed8", strokeWidth: 0 }} activeDot={{ r: 5.5, fill: "#1d4ed8", stroke: "#fff", strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Adherence chart */}
              <div className="chart-card">
                <div className="chart-head">
                  <div>
                    <div className="chart-title">Exercise Adherence</div>
                    <div className="chart-sub">Completed vs. missed sessions per week</div>
                  </div>
                  <span className="chart-tag">Weekly</span>
                </div>
                <div className="chart-body">
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={adherenceData} barGap={4} barCategoryGap="32%" margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 6" stroke="#e8f0fe" />
                      <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#93a8cf", fontFamily: "DM Sans", fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#93a8cf", fontFamily: "DM Sans", fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTip />} />
                      <Legend wrapperStyle={{ fontSize: 12, fontFamily: "DM Sans", fontWeight: 600, paddingTop: 12 }} />
                      <Bar dataKey="completed" name="Completed" fill="#3b82f6" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="missed" name="Missed" fill="#c5d8fb" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* ══ RIGHT PANEL ══ */}
            <div ref={rightRef} className="right-panel" style={{ opacity: 0 }}>

              {/* DNA 3D */}
              <div className="panel-dna">
                <DNAHelix />
              </div>

              <div className="panel-brand">
                <h2>Recovery Core</h2>
                <p>AI-powered rehabilitation tracking with real-time biometric analysis.</p>
              </div>

              {/* Mini ECG */}
              <div className="panel-ecg">
                <div className="panel-ecg-label">Live ECG Signal</div>
                <ECGLine />
              </div>

              {/* Stat rows */}
              <PanelRow
                label="Avg Pain (14d)"
                val={<><Counter to={summary?.avg_pain || 0} decimals={1} /><span style={{ fontSize: 11, color: "#4a70b8" }}>/10</span></>}
                dot="#60a5fa" delay={0.3}
              />
              <PanelRow
                label="Avg Mobility (14d)"
                val={<><Counter to={summary?.avg_mobility || 0} decimals={1} /><span style={{ fontSize: 11, color: "#4a70b8" }}>/10</span></>}
                dot="#93c5fd" delay={0.4}
              />
              <PanelRow
                label="Exercise Streak"
                val={<><Counter to={summary?.streak || 0} /><span style={{ fontSize: 11, color: "#4a70b8" }}> days</span></>}
                dot="#bfdbfe" delay={0.5}
              />
              <PanelRow
                label="Setback Risk"
                val={<><Counter to={riskPct} suffix="%" /><span style={{ fontSize: 11, color: riskColor, marginLeft: 6 }}>{riskLabel}</span></>}
                dot={riskColor} delay={0.6}
              />

              <div className="panel-footer">
                <span className="panel-footer-dot" />
                <span className="panel-footer-text">RehabAI · Updated today</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}