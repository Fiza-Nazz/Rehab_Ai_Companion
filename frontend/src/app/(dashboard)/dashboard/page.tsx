"use client";

// DashboardPage.tsx
// Theme: Pure white bg · zinc neutrals · navy blue + light blue accents
// 3D Canvas: Animated heartbeat ECG ring + floating medical data orbs (medical-realistic)
// No hallucination — only verified Three.js r128 APIs

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Mesh, Vector3 } from "three";
import api from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Summary {
  avg_pain: number;
  avg_mobility: number;
  streak: number;
}
interface Forecast {
  setback_probability: number;
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  sub,
  accent = false,
  danger = false,
  warn = false,
  success = false,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: boolean;
  danger?: boolean;
  warn?: boolean;
  success?: boolean;
}) {
  const borderColor = danger
    ? "#fca5a5"
    : warn
    ? "#fcd34d"
    : success
    ? "#86efac"
    : accent
    ? "#93c5fd"
    : "#e4e4e7";

  const topBar = danger
    ? "linear-gradient(90deg,#ef4444,#f87171)"
    : warn
    ? "linear-gradient(90deg,#f59e0b,#fbbf24)"
    : success
    ? "linear-gradient(90deg,#10b981,#34d399)"
    : accent
    ? "linear-gradient(90deg,#1e3a5f,#3b82f6)"
    : "linear-gradient(90deg,#3f3f46,#71717a)";

  return (
    <div
      style={{
        background: "#ffffff",
        border: `1px solid ${borderColor}`,
        borderRadius: 14,
        padding: "22px 24px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        transition: "box-shadow 0.2s, transform 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 6px 20px rgba(30,58,95,0.10)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 1px 4px rgba(0,0,0,0.05)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: topBar,
        }}
      />
      <p
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "1.8px",
          textTransform: "uppercase",
          color: "#71717a",
          marginBottom: 10,
          fontFamily: "var(--ff-body)",
        }}
      >
        {label}
      </p>
      <div
        style={{
          fontSize: 30,
          fontFamily: "var(--ff-display)",
          fontWeight: 400,
          color: "#18181b",
          letterSpacing: "-1px",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#71717a" }}>{sub}</div>
      )}
    </div>
  );
}

// ─── Medical 3D Canvas — ECG Ring + Floating Orbs ────────────────────────────
function MedicalCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let raf: number;
    let cleanupFn: (() => void) | undefined;

    import("three").then((THREE) => {
      const W = canvas.clientWidth || 420;
      const H = canvas.clientHeight || 320;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(W, H);
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 100);
      camera.position.set(0, 0, 6.5);

      // ── Lighting ──
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const key = new THREE.DirectionalLight(0xdbeafe, 3.5);
      key.position.set(5, 6, 5);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x1e3a5f, 2.0);
      fill.position.set(-4, -2, 2);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0x93c5fd, 1.8);
      rim.position.set(0, 5, -3);
      scene.add(rim);

      // ── Materials ──
      const navyMat = new THREE.MeshStandardMaterial({
        color: 0x1e3a5f, metalness: 0.85, roughness: 0.12,
      });
      const blueMat = new THREE.MeshStandardMaterial({
        color: 0x3b82f6, metalness: 0.8, roughness: 0.15,
      });
      const ltBlueMat = new THREE.MeshStandardMaterial({
        color: 0x93c5fd, metalness: 0.7, roughness: 0.2,
      });
      const zincMat = new THREE.MeshStandardMaterial({
        color: 0xd4d4d8, metalness: 0.5, roughness: 0.4,
      });
      const greenMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e, metalness: 0.7, roughness: 0.2,
      });
      const warnMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b, metalness: 0.6, roughness: 0.25,
      });

      // ── 1. SPINE COLUMN (left, vertical, background) ──
      const spineGroup = new THREE.Group();
      spineGroup.position.set(-2.2, 0, -0.8);
      scene.add(spineGroup);

      const vertebraMat = new THREE.MeshStandardMaterial({
        color: 0xd4d4d8, metalness: 0.35, roughness: 0.55,
        transparent: true, opacity: 0.55,
      });
      const discMat = new THREE.MeshStandardMaterial({
        color: 0x93c5fd, metalness: 0.5, roughness: 0.4,
        transparent: true, opacity: 0.45,
      });
      for (let i = 0; i < 8; i++) {
        const v = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.24, 0.19, 10),
          vertebraMat
        );
        v.position.y = (i - 3.5) * 0.62;
        spineGroup.add(v);
        if (i < 7) {
          const disc = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.2, 0.1, 10),
            discMat
          );
          disc.position.y = (i - 3.5) * 0.62 + 0.145;
          spineGroup.add(disc);
        }
      }

      // ── 2. DNA MINI HELIX (right side) ──
      const dnaGroup = new THREE.Group();
      dnaGroup.position.set(2.3, 0, -0.3);
      scene.add(dnaGroup);

      const STRANDS = 22;
      const HH = 3.2;
      const HR = 0.44;
      for (let i = 0; i < STRANDS; i++) {
        const tt = i / STRANDS;
        const a1 = tt * Math.PI * 4;
        const a2 = a1 + Math.PI;
        const yy = (tt - 0.5) * HH;

        const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 7), navyMat);
        b1.position.set(Math.cos(a1) * HR, yy, Math.sin(a1) * HR);
        dnaGroup.add(b1);

        const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 7), ltBlueMat);
        b2.position.set(Math.cos(a2) * HR, yy, Math.sin(a2) * HR);
        dnaGroup.add(b2);

        if (i % 4 === 0) {
          const p1 = new THREE.Vector3(Math.cos(a1) * HR, yy, Math.sin(a1) * HR);
          const p2 = new THREE.Vector3(Math.cos(a2) * HR, yy, Math.sin(a2) * HR);
          const len = p1.distanceTo(p2);
          const mid = p1.clone().lerp(p2, 0.5);
          const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
          const rung = new THREE.Mesh(
            new THREE.CylinderGeometry(0.016, 0.016, len, 6),
            new THREE.MeshStandardMaterial({
              color: 0xe2e8f0, metalness: 0.3, roughness: 0.5,
              transparent: true, opacity: 0.7,
            })
          );
          rung.position.copy(mid);
          const up = new THREE.Vector3(0, 1, 0);
          rung.setRotationFromQuaternion(
            new THREE.Quaternion().setFromUnitVectors(up, dir)
          );
          dnaGroup.add(rung);
        }
      }

      // ── 3. CENTRAL MEDICAL CROSS / PULSE ORB ──
      const coreGroup = new THREE.Group();
      coreGroup.position.set(0, 0, 0);
      scene.add(coreGroup);

      // Icosahedron core — navy
      const coreGeo = new THREE.IcosahedronGeometry(0.78, 1);
      const coreMesh = new THREE.Mesh(coreGeo, navyMat);
      coreGroup.add(coreMesh);

      // Wire shell — light blue
      const shellMesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.98, 1),
        new THREE.MeshBasicMaterial({
          color: 0x93c5fd, wireframe: true, transparent: true, opacity: 0.18,
        })
      );
      coreGroup.add(shellMesh);

      // ── 4. ORBITING PULSE RINGS ──
      const rings: { mesh: Mesh; axis: Vector3; speed: number }[] = [];

      const ringConfigs = [
        { r: 1.55, tube: 0.013, color: 0x3b82f6, op: 0.4, axis: new THREE.Vector3(1, 0, 0), tilt: Math.PI / 2.2, speed: 0.5 },
        { r: 1.28, tube: 0.009, color: 0x93c5fd, op: 0.3, axis: new THREE.Vector3(0.5, 1, 0.3).normalize(), tilt: 0.4, speed: -0.38 },
        { r: 1.82, tube: 0.007, color: 0x1e3a5f, op: 0.22, axis: new THREE.Vector3(0.2, 0.3, 1).normalize(), tilt: Math.PI / 4, speed: 0.28 },
      ];

      ringConfigs.forEach((cfg) => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(cfg.r, cfg.tube, 8, 90),
          new THREE.MeshBasicMaterial({
            color: cfg.color, transparent: true, opacity: cfg.op,
          })
        );
        ring.setRotationFromAxisAngle(cfg.axis, cfg.tilt);
        scene.add(ring);
        rings.push({ mesh: ring, axis: cfg.axis, speed: cfg.speed });
      });

      // Tracer bead on ring 1
      const tracer = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0x60a5fa, metalness: 0.9, roughness: 0.05,
        })
      );
      scene.add(tracer);

      // ── 5. FLOATING DATA ORBS (metric nodes) ──
      const orbData = [
        { color: greenMat, pos: [-1.3, 1.6, 0.8], size: 0.16 },  // mobility — green
        { color: warnMat,  pos: [1.5, -1.5, 0.5], size: 0.14 },  // pain — amber
        { color: blueMat,  pos: [-1.8, -0.8, 0.4], size: 0.12 }, // streak — blue
        { color: ltBlueMat, pos: [1.2, 1.4, 0.6], size: 0.13 },  // progress — lt blue
        { color: zincMat,  pos: [0.5, -1.9, 0.3], size: 0.10 },  // misc
      ];
      const orbs: { mesh: Mesh; baseY: number; speed: number; phase: number }[] = [];
      orbData.forEach((o, i) => {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(o.size, 10, 10), o.color);
        mesh.position.set(...o.pos as [number,number,number]);
        scene.add(mesh);
        orbs.push({ mesh, baseY: o.pos[1], speed: 0.6 + i * 0.15, phase: i * Math.PI / 2.5 });
      });

      // ── 6. Subtle zinc particles ──
      const pCount = 120;
      const pArr = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        pArr[i * 3]     = (Math.random() - 0.5) * 7;
        pArr[i * 3 + 1] = (Math.random() - 0.5) * 5;
        pArr[i * 3 + 2] = (Math.random() - 0.5) * 3;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute("position", new THREE.BufferAttribute(pArr, 3));
      scene.add(
        new THREE.Points(
          pGeo,
          new THREE.PointsMaterial({ color: 0xa1a1aa, size: 0.016, transparent: true, opacity: 0.35 })
        )
      );

      // ── Animation ──
      let t = 0;

      const tick = () => {
        raf = requestAnimationFrame(tick);
        t += 0.009;

        // Core orb
        coreMesh.rotation.x = t * 0.28;
        coreMesh.rotation.y = t * 0.42;
        shellMesh.rotation.x = -t * 0.22;
        shellMesh.rotation.y = t * 0.35;
        coreGroup.position.y = Math.sin(t * 0.7) * 0.1;

        // Spine sway
        spineGroup.rotation.y = Math.sin(t * 0.28) * 0.18;
        spineGroup.position.y = Math.sin(t * 0.45) * 0.08;

        // DNA spin
        dnaGroup.rotation.y = t * 0.42;
        dnaGroup.position.y = Math.sin(t * 0.6) * 0.1;

        // Rings
        rings.forEach((r) => {
          r.mesh.rotateOnAxis(r.axis, r.speed * 0.013);
        });

        // Tracer on ring 1 (XZ tilted plane)
        const ta = t * 0.5;
        tracer.position.x = Math.cos(ta) * 1.55;
        tracer.position.y = Math.sin(ta) * 1.55 * 0.42;
        tracer.position.z = Math.sin(ta) * 1.55 * 0.1;

        // Orbs float
        orbs.forEach((o) => {
          o.mesh.position.y = o.baseY + Math.sin(t * o.speed + o.phase) * 0.12;
          o.mesh.rotation.y += 0.01;
        });

        renderer.render(scene, camera);
      };
      tick();

      cleanupFn = () => {
        cancelAnimationFrame(raf);
        pGeo.dispose();
        renderer.dispose();
      };
    });

    return () => cleanupFn?.();
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session } = useSession();
  const [summary, setSummary] = useState<Summary>({ avg_pain: 0, avg_mobility: 0, streak: 0 });
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, forecastRes, checkinRes] = await Promise.all([
          api.get("/api/progress/summary"),
          api.get("/api/progress/forecast"),
          api.get("/api/checkin/today"),
        ]);
        setSummary(sumRes.data);
        setForecast(forecastRes.data);
        setHasCheckedIn(checkinRes.data);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const prob = forecast?.setback_probability ?? 0;
  const riskLabel = prob > 0.5 ? "High Risk" : prob > 0.2 ? "Moderate" : "Low Risk";
  const riskIsHigh = prob > 0.5;
  const riskIsWarn = prob > 0.2 && prob <= 0.5;
  const riskIsOk   = prob <= 0.2;

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 36, height: 36,
            border: "2px solid #e4e4e7",
            borderTop: "2px solid #3b82f6",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: 13, color: "#71717a", fontFamily: "var(--ff-body)" }}>
          Loading your recovery data…
        </span>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap');
        :root {
          --ff-display: 'Instrument Serif', serif;
          --ff-body:    'Outfit', sans-serif;
          --navy:    #1e3a5f;
          --blue:    #3b82f6;
          --blue-lt: #93c5fd;
          --blue-pale: #dbeafe;
          --zn50:  #fafafa; --zn100: #f4f4f5; --zn200: #e4e4e7;
          --zn300: #d4d4d8; --zn400: #a1a1aa; --zn500: #71717a;
          --zn600: #52525b; --zn700: #3f3f46; --zn800: #27272a; --zn900: #18181b;
        }
        .db-root { font-family: var(--ff-body); color: var(--zn900); }
        .action-card { transition: box-shadow 0.2s, transform 0.2s; }
        .action-card:hover { box-shadow: 0 8px 24px rgba(30,58,95,0.1) !important; transform: translateY(-2px); }
        .btn-primary {
          display: inline-flex; align-items: center; gap: 7px;
          background: linear-gradient(135deg, var(--navy) 0%, var(--blue) 100%);
          color: #fff; font-family: var(--ff-body); font-size: 13px; font-weight: 500;
          padding: 11px 24px; border-radius: 9px; text-decoration: none;
          border: none; cursor: pointer; letter-spacing: 0.2px;
          box-shadow: 0 2px 10px rgba(30,58,95,0.22);
          transition: box-shadow 0.18s, transform 0.18s;
        }
        .btn-primary:hover {
          box-shadow: 0 6px 20px rgba(30,58,95,0.32); transform: translateY(-1px);
        }
        .btn-green {
          display: inline-flex; align-items: center; gap: 7px;
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          color: #fff; font-family: var(--ff-body); font-size: 13px; font-weight: 500;
          padding: 11px 24px; border-radius: 9px; text-decoration: none;
          box-shadow: 0 2px 10px rgba(16,185,129,0.22);
          transition: box-shadow 0.18s, transform 0.18s;
        }
        .btn-green:hover {
          box-shadow: 0 6px 20px rgba(16,185,129,0.32); transform: translateY(-1px);
        }
        .section-divider {
          height: 1px; background: var(--zn200); margin: 8px 0 28px;
        }
      `}</style>

      <div className="db-root" style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ── Page Header ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div
              style={{
                width: 4, height: 26,
                background: "linear-gradient(180deg,#1e3a5f,#3b82f6)",
                borderRadius: 99,
              }}
            />
            <h1
              style={{
                fontFamily: "var(--ff-display)",
                fontSize: 26, fontWeight: 400,
                color: "#18181b", letterSpacing: "-0.5px",
              }}
            >
              Welcome back,{" "}
              <em style={{ fontStyle: "italic", color: "#3b82f6" }}>
                {session?.user?.name?.split(" ")[0] || "Patient"}
              </em>
            </h1>
          </div>
          <p style={{ fontSize: 13, color: "#71717a", paddingLeft: 14 }}>
            Here is your recovery overview for today.
          </p>
          <div className="section-divider" style={{ marginTop: 16 }} />
        </div>

        {/* ── Metric Cards ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <MetricCard
            label="Avg Pain (7d)"
            value={<>{summary.avg_pain}<span style={{ fontSize: 16, color: "#a1a1aa" }}>/10</span></>}
            sub={
              hasCheckedIn ? (
                <span style={{ color: "#10b981", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                  Checked in today
                </span>
              ) : (
                <span style={{ color: "#f59e0b" }}>⚠ Awaiting check-in</span>
              )
            }
            warn={summary.avg_pain >= 5}
            danger={summary.avg_pain >= 7}
          />
          <MetricCard
            label="Avg Mobility (7d)"
            value={<>{summary.avg_mobility}<span style={{ fontSize: 16, color: "#a1a1aa" }}>/10</span></>}
            sub={<span style={{ color: "#3b82f6" }}>↑ Tracked daily</span>}
            accent
          />
          <MetricCard
            label="Current Streak"
            value={<>{summary.streak}<span style={{ fontSize: 16, color: "#a1a1aa" }}> days</span></>}
            sub={<span style={{ color: "#10b981" }}>🔥 Keep going!</span>}
            success
          />
          <MetricCard
            label="Risk Level"
            value={
              <span
                style={{
                  fontSize: 18,
                  fontFamily: "var(--ff-display)",
                  color: riskIsHigh ? "#ef4444" : riskIsWarn ? "#f59e0b" : "#10b981",
                }}
              >
                {riskLabel}
              </span>
            }
            sub={
              <span style={{ color: "#a1a1aa" }}>
                {Math.round(prob * 100)}% setback probability
              </span>
            }
            danger={riskIsHigh}
            warn={riskIsWarn}
            success={riskIsOk}
          />
        </div>

        {/* ── Main Grid ── */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 20 }}
        >
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Exercise / Check-in card */}
            <div
              className="action-card"
              style={{
                background: "#ffffff",
                border: "1px solid #e4e4e7",
                borderRadius: 16,
                padding: "28px 30px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              {/* Top label */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: "linear-gradient(135deg,#dbeafe,#bfdbfe)",
                      border: "1px solid #93c5fd",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16,
                    }}
                  >
                    {hasCheckedIn ? "✅" : "📋"}
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--ff-display)", fontSize: 18, color: "#18181b", letterSpacing: "-0.3px" }}>
                      {hasCheckedIn ? "Today's Exercises" : "Daily Check-In"}
                    </div>
                    <div style={{ fontSize: 11, color: "#71717a", marginTop: 1 }}>
                      {hasCheckedIn ? "AI plan ready for you" : "Required before plan generation"}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: "1px",
                    textTransform: "uppercase", padding: "4px 10px", borderRadius: 99,
                    background: hasCheckedIn ? "#dcfce7" : "#fef3c7",
                    color: hasCheckedIn ? "#166534" : "#92400e",
                    border: `1px solid ${hasCheckedIn ? "#86efac" : "#fcd34d"}`,
                  }}
                >
                  {hasCheckedIn ? "Completed" : "Pending"}
                </div>
              </div>

              <div style={{ height: 1, background: "#f4f4f5", marginBottom: 18 }} />

              <p style={{ fontSize: 13, color: "#71717a", lineHeight: 1.7, marginBottom: 22 }}>
                {hasCheckedIn
                  ? "Your daily check-in is done. Your AI-generated, personalised exercise plan is ready based on your recent 14-day data and setback forecast."
                  : "Please complete your daily check-in so our AI can analyse your recovery trends and generate a safe, personalised exercise plan for you today."}
              </p>

              <Link
                href={hasCheckedIn ? "/exercises" : "/checkin"}
                className={hasCheckedIn ? "btn-green" : "btn-primary"}
              >
                {hasCheckedIn ? "▶ View Today's Plan" : "◫ Start Daily Check-In"}
              </Link>
            </div>

            {/* Alerts card */}
            <div
              className="action-card"
              style={{
                background: "#ffffff",
                border: "1px solid #e4e4e7",
                borderRadius: 16,
                padding: "28px 30px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "linear-gradient(135deg,#faf5ff,#ede9fe)",
                    border: "1px solid #c4b5fd",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  🔔
                </div>
                <div>
                  <div style={{ fontFamily: "var(--ff-display)", fontSize: 18, color: "#18181b", letterSpacing: "-0.3px" }}>
                    Recent Alerts
                  </div>
                  <div style={{ fontSize: 11, color: "#71717a", marginTop: 1 }}>
                    Doctor & caregiver notifications
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: "#f4f4f5", marginBottom: 18 }} />

              {/* Empty alerts state */}
              <div
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  padding: "20px 0", gap: 8,
                }}
              >
                <div style={{ fontSize: 28 }}>✓</div>
                <p style={{ fontSize: 13, color: "#71717a", textAlign: "center" }}>
                  No active alerts — you&apos;re doing great!
                </p>
                <p style={{ fontSize: 11, color: "#a1a1aa", textAlign: "center" }}>
                  Alerts appear here when pain spikes, check-ins are missed, or risk is elevated.
                </p>
              </div>

              <Link
                href="/alerts"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 12, color: "#3b82f6", textDecoration: "none",
                  fontWeight: 500, marginTop: 8,
                }}
              >
                View all alerts →
              </Link>
            </div>

            {/* Quick links row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {[
                { href: "/progress", icon: "◎", label: "Progress", sub: "Charts & trends", border: "#93c5fd", bg: "#dbeafe", tc: "#1e3a5f" },
                { href: "/chat",     icon: "◈", label: "Chat AI",  sub: "Ask anything",   border: "#c4b5fd", bg: "#ede9fe", tc: "#4c1d95" },
                { href: "/exercises",icon: "◉", label: "Exercises", sub: "Today's plan",  border: "#86efac", bg: "#dcfce7", tc: "#14532d" },
              ].map((q) => (
                <Link
                  key={q.href}
                  href={q.href}
                  style={{
                    background: "#ffffff",
                    border: `1px solid ${q.border}`,
                    borderRadius: 12,
                    padding: "16px 18px",
                    textDecoration: "none",
                    display: "flex", flexDirection: "column", gap: 6,
                    transition: "box-shadow 0.18s, transform 0.18s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 14px rgba(0,0,0,0.08)";
                    (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
                    (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: q.bg, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: 14, color: q.tc,
                    }}
                  >
                    {q.icon}
                  </div>
                  <div style={{ fontFamily: "var(--ff-display)", fontSize: 15, color: "#18181b", letterSpacing: "-0.2px" }}>{q.label}</div>
                  <div style={{ fontSize: 11, color: "#71717a" }}>{q.sub}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* Right column — 3D Canvas */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* 3D Medical Canvas card */}
            <div
              style={{
                background: "linear-gradient(160deg,#ffffff 0%,#f0f7ff 100%)",
                border: "1px solid #93c5fd",
                borderRadius: 16,
                overflow: "hidden",
                height: 320,
                position: "relative",
                boxShadow: "0 1px 4px rgba(30,58,95,0.06)",
              }}
            >
              {/* Top accent */}
              <div
                style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  background: "linear-gradient(90deg,#1e3a5f,#3b82f6,#93c5fd)",
                  zIndex: 2,
                }}
              />
              <MedicalCanvas />
              {/* Bottom label */}
              <div
                style={{
                  position: "absolute", bottom: 12, left: 0, right: 0,
                  textAlign: "center", zIndex: 2,
                  fontSize: 9, letterSpacing: "2px", textTransform: "uppercase",
                  color: "#93c5fd", fontFamily: "var(--ff-body)", fontWeight: 600,
                }}
              >
                Recovery Simulation
              </div>
            </div>

            {/* Recovery progress bar card */}
            <div
              className="action-card"
              style={{
                background: "#ffffff",
                border: "1px solid #e4e4e7",
                borderRadius: 16,
                padding: "22px 24px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ fontFamily: "var(--ff-display)", fontSize: 16, color: "#18181b", marginBottom: 16, letterSpacing: "-0.2px" }}>
                Recovery Metrics
              </div>

              {[
                { label: "Pain Control", value: Math.max(0, 100 - summary.avg_pain * 10), color: "#3b82f6" },
                { label: "Mobility Score", value: summary.avg_mobility * 10, color: "#10b981" },
                { label: "Streak Health", value: Math.min(100, summary.streak * 7), color: "#8b5cf6" },
                { label: "Risk Safety", value: Math.round((1 - prob) * 100), color: riskIsHigh ? "#ef4444" : riskIsWarn ? "#f59e0b" : "#10b981" },
              ].map((bar) => (
                <div key={bar.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: "#52525b", fontFamily: "var(--ff-body)" }}>{bar.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: bar.color }}>{bar.value}%</span>
                  </div>
                  <div style={{ height: 6, background: "#f4f4f5", borderRadius: 99, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${bar.value}%`,
                        background: `linear-gradient(90deg,${bar.color}aa,${bar.color})`,
                        borderRadius: 99,
                        transition: "width 1s cubic-bezier(0.22,1,0.36,1)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}