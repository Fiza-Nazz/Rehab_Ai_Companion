"use client";

import { useRef, useEffect, useState } from "react";
import api from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";

/* ═══════════════════════════════════════════════════════════════
   DESIGN SYSTEM
   White · Ice Blue · Royal Blue · Deep Navy
   #FFFFFF   white
   #F4F8FF   surface
   #E8F1FF   border / tile
   #B8D0F8   muted blue
   #3B82F6   primary blue
   #1D4ED8   medium navy
   #0F2557   deep navy
   #070F2B   darkest
═══════════════════════════════════════════════════════════════ */

/* ─── Canvas: Full hero 3D scene ──────────────────────────── */
function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number, t = 0;

    const setup = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    setup();
    const onResize = () => { setup(); };
    window.addEventListener("resize", onResize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    /* Particles */
    interface Pt { x: number; y: number; z: number; vx: number; vy: number; vz: number; r: number; }
    const pts: Pt[] = Array.from({ length: 80 }, () => ({
      x: (Math.random() - 0.5) * 520, y: (Math.random() - 0.5) * 380,
      z: (Math.random() - 0.5) * 380,
      vx: (Math.random() - 0.5) * 0.16, vy: (Math.random() - 0.5) * 0.16, vz: (Math.random() - 0.5) * 0.16,
      r: Math.random() * 1.8 + 0.5,
    }));

    const proj = (x: number, y: number, z: number) => {
      const fov = 400;
      const s = fov / (fov + z);
      return { px: x * s + W() / 2, py: y * s + H() / 2, s };
    };

    /* Hex grid bg */
    const drawHexGrid = () => {
      const size = 28;
      const rows = Math.ceil(H() / (size * 1.5)) + 1;
      const cols = Math.ceil(W() / (size * Math.sqrt(3))) + 1;
      for (let r = -1; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
          const cx = c * size * Math.sqrt(3) + (r % 2) * size * Math.sqrt(3) / 2;
          const cy = r * size * 1.5;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3 - Math.PI / 6;
            const x = cx + size * Math.cos(a);
            const y = cy + size * Math.sin(a);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.strokeStyle = "rgba(59,130,246,0.06)";
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    };

    /* DNA helix */
    const drawDNA = (cx: number, cy: number) => {
      const w = W(), h = H();
      if (!w || !h || isNaN(w) || isNaN(h)) return;
      const n = 40, hH = h * 0.8, rad = 36;
      for (let strand = 0; strand < 2; strand++) {
        const phase = strand * Math.PI;
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const yp = cy - hH / 2 + (i / n) * hH;
          const angle = (i / n) * Math.PI * 5 + t * 0.4 + phase;
          const xp = cx + Math.cos(angle) * rad;
          const zd = Math.sin(angle);
          const al = 0.25 + 0.65 * ((zd + 1) / 2);
          ctx.strokeStyle = strand === 0
            ? `rgba(59,130,246,${al})`
            : `rgba(29,78,216,${al})`;
          ctx.lineWidth = 2.5;
          i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
        }
        ctx.stroke();
      }
      /* rungs */
      for (let i = 0; i <= n; i += 3) {
        const yp = cy - hH / 2 + (i / n) * hH;
        const angle = (i / n) * Math.PI * 5 + t * 0.4;
        const x1 = cx + Math.cos(angle) * rad;
        const x2 = cx + Math.cos(angle + Math.PI) * rad;
        const zd = Math.sin(angle);
        const al = 0.2 + 0.45 * ((zd + 1) / 2);
        ctx.beginPath(); ctx.moveTo(x1, yp); ctx.lineTo(x2, yp);
        ctx.strokeStyle = `rgba(147,197,253,${al})`; ctx.lineWidth = 1.1; ctx.stroke();
        [x1, x2].forEach(nx => {
          const g = ctx.createRadialGradient(nx, yp, 0, nx, yp, 5);
          g.addColorStop(0, `rgba(147,197,253,${al + 0.5})`);
          g.addColorStop(1, `rgba(29,78,216,0)`);
          ctx.beginPath(); ctx.arc(nx, yp, 5, 0, Math.PI * 2);
          ctx.fillStyle = g; ctx.fill();
        });
      }
    };

    /* Orbiting atom */
    const drawAtom = (cx: number, cy: number) => {
      const w = W(), h = H();
      if (!w || !h || isNaN(w) || isNaN(h)) return;
      /* glow */
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28);
      g.addColorStop(0, "rgba(59,130,246,0.5)");
      g.addColorStop(1, "rgba(59,130,246,0)");
      ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
      /* nucleus */
      const ng = ctx.createRadialGradient(cx - 3, cy - 3, 0, cx, cy, 11);
      ng.addColorStop(0, "#93C5FD"); ng.addColorStop(1, "#1D4ED8");
      ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2);
      ctx.fillStyle = ng; ctx.fill();
      /* rings */
      [[65, 14, 0.7, 0], [50, 11, 1.1, Math.PI / 3], [40, 9, 1.5, -Math.PI / 5]].forEach(([rx, ry, speed, tilt], i) => {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate((tilt as number) + t * 0.06);
        ctx.beginPath(); ctx.ellipse(0, 0, rx as number, ry as number, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(147,197,253,0.22)`; ctx.lineWidth = 1; ctx.stroke();
        const ax = Math.cos(t * (speed as number)) * (rx as number);
        const ay = Math.sin(t * (speed as number)) * (ry as number);
        const ag = ctx.createRadialGradient(ax - 1, ay - 1, 0, ax, ay, 5);
        ag.addColorStop(0, "rgba(147,197,253,0.95)"); ag.addColorStop(1, "rgba(59,130,246,0.2)");
        ctx.beginPath(); ctx.arc(ax, ay, 5 - i * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = ag; ctx.fill();
        ctx.restore();
      });
    };

    /* ECG */
    const drawECG = () => {
      const w = W(), h = H(), y0 = h * 0.91;
      if (!w || !h || isNaN(w) || isNaN(h)) return;
      ctx.beginPath();
      const steps = 140;
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * w;
        const ph = ((i / steps) * Math.PI * 2.5 + t * 1.8) % (Math.PI * 2);
        let y = y0;
        if (ph > 0.1 && ph < 0.25) y -= 8;
        else if (ph > 0.25 && ph < 0.45) y += 52 * Math.sin(((ph - 0.25) / 0.4) * Math.PI);
        else if (ph > 0.45 && ph < 0.6) y -= 16 * Math.sin(((ph - 0.45) / 0.15) * Math.PI);
        else if (ph > 0.6 && ph < 0.78) y += 6;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(59,130,246,0.38)";
      ctx.lineWidth = 1.6; ctx.stroke();
      /* glowing dot */
      const dp = (t * 1.8) % (Math.PI * 2);
      const dx = ((dp / (Math.PI * 2)) * w * 0.7 + w * 0.15) % w;
      const bloom = ctx.createRadialGradient(dx, y0, 0, dx, y0, 10);
      bloom.addColorStop(0, "rgba(59,130,246,0.7)"); bloom.addColorStop(1, "rgba(59,130,246,0)");
      ctx.beginPath(); ctx.arc(dx, y0, 10, 0, Math.PI * 2); ctx.fillStyle = bloom; ctx.fill();
      ctx.beginPath(); ctx.arc(dx, y0, 3.5, 0, Math.PI * 2); ctx.fillStyle = "#60A5FA"; ctx.fill();
    };

    const draw = () => {
      t += 0.009;
      const w = W(), h = H();
      if (!w || !h || isNaN(w) || isNaN(h)) {
        raf = requestAnimationFrame(draw);
        return;
      }
      ctx.clearRect(0, 0, w, h);
      drawHexGrid();
      /* particles + connections */
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.z += p.vz;
        if (Math.abs(p.x) > 270) p.vx *= -1;
        if (Math.abs(p.y) > 200) p.vy *= -1;
        if (Math.abs(p.z) > 200) p.vz *= -1;
        const { px, py, s } = proj(p.x, p.y, p.z);
        if (px < 0 || px > w || py < 0 || py > h) return;
        ctx.beginPath(); ctx.arc(px, py, Math.max(0.5, p.r * s), 0, Math.PI * 2);
        ctx.globalAlpha = 0.55 * s; ctx.fillStyle = "#3B82F6"; ctx.fill(); ctx.globalAlpha = 1;
      });
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, dz = pts[i].z - pts[j].z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d < 95) {
            const { px: x1, py: y1 } = proj(pts[i].x, pts[i].y, pts[i].z);
            const { px: x2, py: y2 } = proj(pts[j].x, pts[j].y, pts[j].z);
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
            ctx.strokeStyle = `rgba(59,130,246,${0.1 * (1 - d / 95)})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      drawAtom(w * 0.18, h * 0.44);
      drawDNA(w * 0.68, h * 0.5);
      drawECG();
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />;
}

/* ─── Sidebar mini DNA canvas ─────────────────────────────── */
function SidebarDNA() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const W = 180, H = 280;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    let t = 0, raf: number;
    const pts = Array.from({ length: 24 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.45, vy: (Math.random() - 0.5) * 0.45,
      r: Math.random() * 2 + 0.8,
    }));
    const draw = () => {
      t += 0.014;
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(59,130,246,0.5)"; ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 55) {
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(59,130,246,${0.12 * (1 - d / 55)})`; ctx.lineWidth = 0.6; ctx.stroke();
        }
      }
      const cx = W / 2, n = 26, hH = 230, rad = 26;
      for (let s = 0; s < 2; s++) {
        const ph = s * Math.PI;
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const yp = 24 + (i / n) * hH;
          const ang = (i / n) * Math.PI * 5 + t * 0.55 + ph;
          const xp = cx + Math.cos(ang) * rad;
          const zd = Math.sin(ang);
          const al = 0.3 + 0.6 * ((zd + 1) / 2);
          ctx.strokeStyle = s === 0 ? `rgba(59,130,246,${al})` : `rgba(29,78,216,${al})`;
          ctx.lineWidth = 2;
          i === 0 ? ctx.moveTo(xp, yp) : ctx.lineTo(xp, yp);
        }
        ctx.stroke();
        if (s === 0) for (let i = 0; i <= n; i += 3) {
          const yp = 24 + (i / n) * hH;
          const ang = (i / n) * Math.PI * 5 + t * 0.55;
          const x1 = cx + Math.cos(ang) * rad, x2 = cx + Math.cos(ang + Math.PI) * rad;
          const zd = Math.sin(ang), al = 0.2 + 0.4 * ((zd + 1) / 2);
          ctx.beginPath(); ctx.moveTo(x1, yp); ctx.lineTo(x2, yp);
          ctx.strokeStyle = `rgba(147,197,253,${al})`; ctx.lineWidth = 0.9; ctx.stroke();
          [x1, x2].forEach(nx => {
            const g = ctx.createRadialGradient(nx, yp, 0, nx, yp, 4);
            g.addColorStop(0, `rgba(147,197,253,${al + 0.5})`); g.addColorStop(1, "rgba(29,78,216,0)");
            ctx.beginPath(); ctx.arc(nx, yp, 4, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
          });
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{ width: 180, height: 280, display: "block" }} />;
}

/* ─── Custom Slider ───────────────────────────────────────── */
function Slider({ label, value, setValue, min, max, unit, low, high, color = "#3B82F6" }: {
  label: string; value: number; setValue: (v: number) => void;
  min: number; max: number; unit: string; low: string; high: string; color?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0F2557", letterSpacing: "-0.01em", fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
        <span style={{
          fontSize: 18, fontWeight: 700, color: "#0F2557",
          background: "#EBF2FF", borderRadius: 8, padding: "2px 12px",
          minWidth: 50, textAlign: "center", letterSpacing: "-0.02em",
          fontFamily: "'Instrument Serif', Georgia, serif",
        }}>
          {value}<span style={{ fontSize: 12, fontWeight: 500, color: "#B8D0F8", marginLeft: 2, fontFamily: "'DM Sans', sans-serif" }}>{unit}</span>
        </span>
      </div>
      <div style={{ position: "relative", height: 5, background: "#E8F1FF", borderRadius: 6 }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${pct}%`,
          background: `linear-gradient(90deg, #0F2557, ${color})`,
          borderRadius: 6, transition: "width 0.08s",
        }} />
        <input type="range" min={min} max={max} value={value}
          onChange={e => setValue(Number(e.target.value))}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", margin: 0 }}
        />
        <div style={{
          position: "absolute", top: "50%", left: `${pct}%`,
          transform: "translate(-50%, -50%)",
          width: 18, height: 18,
          background: "#fff", border: `2px solid ${color}`,
          borderRadius: "50%", boxShadow: `0 2px 8px rgba(59,130,246,0.3)`,
          transition: "left 0.08s", pointerEvents: "none",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 10, color: "#B8D0F8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{low}</span>
        <span style={{ fontSize: 10, color: "#B8D0F8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{high}</span>
      </div>
    </div>
  );
}

/* ─── Toggle group ────────────────────────────────────────── */
function ToggleGroup({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 26 }}>
      <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "#0F2557", marginBottom: 10, fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.01em" }}>{label}</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(opt)} style={{
            padding: "8px 18px",
            border: value === opt ? "1.5px solid #1D4ED8" : "1.5px solid #E8F1FF",
            background: value === opt ? "#0F2557" : "#fff",
            color: value === opt ? "#fff" : "#64748B",
            fontWeight: 600, fontSize: 12.5, cursor: "pointer",
            borderRadius: 10, transition: "all 0.15s",
            fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.01em",
          }}>{opt}</button>
        ))}
      </div>
    </div>
  );
}

/* ─── Stat pill ───────────────────────────────────────────── */
function StatPill({ label, val, color }: { label: string; val: string; color: string }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #E8F1FF", borderRadius: 14,
      borderTop: `3px solid ${color}`, padding: "16px 20px", flex: 1, minWidth: 110,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#B8D0F8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 400, color: "#0F2557", letterSpacing: "-0.03em", fontFamily: "'Instrument Serif', Georgia, serif" }}>{val}</div>
    </div>
  );
}

/* ─── Section divider ─────────────────────────────────────── */
function SectionHeader({ children }: { children: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, marginTop: 4 }}>
      <div style={{ width: 3, height: 16, background: "#3B82F6", borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: 10, fontWeight: 800, color: "#3B82F6", letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: "#E8F1FF" }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN CHECK-IN PAGE
═══════════════════════════════════════════════════════════════ */
export default function CheckInPage() {
  const [pain, setPain] = useState(3);
  const [mobility, setMobility] = useState(6);
  const [fatigue, setFatigue] = useState(4);
  const [sleep, setSleep] = useState(7);
  const [mood, setMood] = useState("Okay");
  const [swelling, setSwelling] = useState("None");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const moodMap: Record<string, number> = { Great: 10, Good: 8, Okay: 5, Low: 3, Struggling: 1 };
      await api.post("/api/checkin/", {
        pain_score: pain, fatigue_score: fatigue,
        mobility_score: mobility, mood_score: moodMap[mood] ?? 5,
        notes: notes || null,
      });
      try { await api.post("/api/exercises/generate"); } catch {}
      setSubmitted(true);
    } catch (err: unknown) {
      const ae = err as { response?: { data?: { detail?: string }; status?: number } };
      if (ae?.response?.status === 409) toast.error("You've already submitted today's check-in!");
      else toast.error(ae?.response?.data?.detail || "Failed to submit. Please try again.");
    } finally { setSubmitting(false); }
  };

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  /* ── Success screen ── */
  if (submitted) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        @keyframes checkPop{0%{transform:scale(0) rotate(-12deg)}70%{transform:scale(1.12) rotate(2deg)}100%{transform:scale(1) rotate(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulseRing{0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,0.3)}50%{box-shadow:0 0 0 18px rgba(59,130,246,0)}}
      `}</style>
      <div style={{ minHeight: "100vh", background: "#F4F8FF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{
          width: 76, height: 76,
          background: "linear-gradient(135deg, #0F2557, #3B82F6)",
          borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center",
          animation: "checkPop 0.6s cubic-bezier(.34,1.56,.64,1) both, pulseRing 1.6s 0.7s ease-out",
          marginBottom: 28,
        }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M7 18L15 26L29 10" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 34, fontWeight: 400, color: "#0F2557", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
          Check-In <em style={{ fontStyle: "italic", color: "#3B82F6" }}>Complete</em>
        </h2>
        <p style={{ fontSize: 14, color: "#64748B", textAlign: "center", maxWidth: 320, lineHeight: 1.7, marginBottom: 36 }}>
          Your recovery data has been logged. AI is generating your personalised plan for today.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <StatPill label="Pain Level" val={`${pain}/10`} color="#3B82F6" />
          <StatPill label="Mobility" val={`${mobility}/10`} color="#1D4ED8" />
          <StatPill label="Fatigue" val={`${fatigue}/10`} color="#0F2557" />
          <StatPill label="Sleep" val={`${sleep}h`} color="#60A5FA" />
        </div>
      </div>
    </>
  );

  /* ── Main layout ── */
  return (
    <>
      <Toaster position="top-right" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spinLoader{to{transform:rotate(360deg)}}
        @keyframes dotPulse{0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,0.4)}50%{box-shadow:0 0 0 6px rgba(52,211,153,0)}}
        .ci-root { font-family: 'DM Sans', system-ui, sans-serif; background: #F4F8FF; min-height: 100vh; }

        /* HERO */
        .hero {
          position: relative; height: 230px; overflow: hidden;
          background: linear-gradient(130deg, #070F2B 0%, #0F2557 55%, #1D4ED8 100%);
        }
        .hero-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .hero-canvas { position: absolute; inset: 0; opacity: 0.93; }
        .hero-vignette {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(100deg, rgba(7,15,43,0.82) 30%, rgba(7,15,43,0.05) 100%);
        }
        .hero-content {
          position: relative; z-index: 5; padding: 38px 40px;
          animation: fadeUp 0.65s ease both;
        }
        .hero-chip {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(59,130,246,0.18); border: 1px solid rgba(96,165,250,0.3);
          border-radius: 20px; padding: 4px 12px; margin-bottom: 14px;
        }
        .hero-chip-dot { width: 6px; height: 6px; border-radius: 50%; background: #34D399; animation: dotPulse 1.8s ease-in-out infinite; }
        .hero-chip-txt { font-size: 10px; font-weight: 700; color: #93C5FD; letter-spacing: 0.12em; text-transform: uppercase; }
        .hero-h1 { margin: 0 0 8px; font-family: 'Instrument Serif', Georgia, serif; font-size: 36px; font-weight: 400; color: #fff; letter-spacing: -0.03em; line-height: 1.1; }
        .hero-h1 em { font-style: italic; color: #93C5FD; }
        .hero-sub { margin: 0; font-size: 13px; color: rgba(255,255,255,0.55); font-weight: 500; max-width: 360px; line-height: 1.6; }

        /* CONTENT WRAPPER */
        .ci-body { max-width: 940px; margin: 0 auto; padding: 30px 24px 72px; animation: fadeUp 0.65s 0.08s ease both; }

        /* STAT ROW */
        .stat-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 28px; }

        /* TWO-COLUMN */
        .ci-cols { display: grid; grid-template-columns: 1fr 220px; gap: 20px; align-items: start; }
        @media(max-width: 780px){ .ci-cols{ grid-template-columns: 1fr; } .dna-col{ display: none; } }

        /* MAIN CARD */
        .main-card {
          background: #fff; border: 1px solid #E8F1FF; border-radius: 18px;
          box-shadow: 0 4px 28px rgba(15,37,87,0.08); overflow: hidden;
        }
        .card-header {
          padding: 20px 28px; border-bottom: 1px solid #E8F1FF;
          background: linear-gradient(90deg, #F0F7FF, #fff);
          border-left: 4px solid #0F2557;
          display: flex; align-items: center; gap: 16;
        }
        .card-icon {
          width: 44px; height: 44px; border-radius: 13px; flex-shrink: 0;
          background: linear-gradient(135deg, #0F2557, #3B82F6);
          display: flex; align-items: center; justify-content: center;
        }
        .card-title { font-weight: 700; font-size: 16px; color: #0F2557; letter-spacing: -0.01em; margin: 0 0 3px; }
        .card-desc { font-size: 12.5px; color: "#64748B"; font-weight: 500; margin: 0; color: #64748B; }
        .card-body { padding: 30px 28px 26px; }

        /* DNA SIDEBAR */
        .dna-col .dna-card {
          background: linear-gradient(170deg, #0F2557, #070F2B);
          border-radius: 16px; overflow: hidden;
          box-shadow: 0 12px 40px rgba(15,37,87,0.22);
          display: flex; flex-direction: column; align-items: center;
          padding-bottom: 20px;
        }
        .dna-label { font-family: 'Instrument Serif', serif; font-size: 17px; color: #fff; font-weight: 400; padding: 0 20px 4px; text-align: center; }
        .dna-sub { font-size: 11px; color: #4a70b8; padding: 0 20px; text-align: center; line-height: 1.55; }

        /* SUBMIT BUTTON */
        .submit-btn {
          width: 100%; padding: 16px 24px; border: none; border-radius: 13px;
          background: linear-gradient(135deg, #0F2557, #3B82F6);
          color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          letter-spacing: 0.01em;
          box-shadow: 0 6px 20px rgba(59,130,246,0.35);
          transition: opacity 0.2s, transform 0.15s;
          font-family: 'DM Sans', sans-serif;
        }
        .submit-btn:hover:not(:disabled) { opacity: 0.93; transform: translateY(-1px); }
        .submit-btn:disabled { background: #94A3B8; box-shadow: none; cursor: not-allowed; }

        /* NOTES TEXTAREA */
        .notes-area {
          width: 100%; padding: 13px 16px; border: 1.5px solid #E8F1FF;
          border-radius: 11px; background: #F4F8FF; font-size: 13.5px;
          color: #0F2557; resize: vertical; outline: none;
          font-family: 'DM Sans', sans-serif; line-height: 1.65;
          transition: border-color 0.2s;
        }
        .notes-area:focus { border-color: #3B82F6; }

        .security-note { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 13px; }
        .security-txt { font-size: 11.5px; color: #B8D0F8; font-weight: 500; }
      `}</style>

      <div className="ci-root">
        {/* ── HERO ── */}
        <div className="hero">
          <div className="hero-grid" />
          <div className="hero-canvas"><HeroCanvas /></div>
          <div className="hero-vignette" />
          <div className="hero-content">
            <div className="hero-chip">
              <span className="hero-chip-dot" />
              <span className="hero-chip-txt">RehabAI · Active Recovery</span>
            </div>
            <h1 className="hero-h1">Daily <em>Check-In</em></h1>
            <p className="hero-sub">{today} · Log your metrics for a personalised AI exercise plan</p>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="ci-body">

          {/* Stat summary pills */}
          <div className="stat-row">
            <StatPill label="Pain" val={`${pain}/10`} color="#3B82F6" />
            <StatPill label="Mobility" val={`${mobility}/10`} color="#1D4ED8" />
            <StatPill label="Fatigue" val={`${fatigue}/10`} color="#0F2557" />
            <StatPill label="Sleep" val={`${sleep}h`} color="#60A5FA" />
          </div>

          <div className="ci-cols">
            {/* ── MAIN CARD ── */}
            <div className="main-card">
              <div className="card-header">
                <div className="card-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M3 10h2l2-6 3 12 2-8 2 4h3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p className="card-title">Recovery Metrics</p>
                  <p className="card-desc">Rate honestly — your AI plan depends on accuracy</p>
                </div>
              </div>

              <div className="card-body">
                <SectionHeader>Physical Assessment</SectionHeader>

                <Slider label="Pain Level" value={pain} setValue={setPain} min={0} max={10} unit="/10" low="No pain" high="Severe" color="#3B82F6" />
                <Slider label="Mobility Score" value={mobility} setValue={setMobility} min={0} max={10} unit="/10" low="Very limited" high="Full range" color="#1D4ED8" />
                <Slider label="Fatigue Level" value={fatigue} setValue={setFatigue} min={0} max={10} unit="/10" low="Energised" high="Exhausted" color="#0F2557" />
                <Slider label="Hours of Sleep" value={sleep} setValue={setSleep} min={0} max={12} unit="h" low="0 hrs" high="12 hrs" color="#60A5FA" />

                <div style={{ marginTop: 8 }}>
                  <SectionHeader>Wellbeing</SectionHeader>
                </div>

                <ToggleGroup label="Today's Mood" options={["Great", "Good", "Okay", "Low", "Struggling"]} value={mood} onChange={setMood} />
                <ToggleGroup label="Swelling / Inflammation" options={["None", "Mild", "Moderate", "Severe"]} value={swelling} onChange={setSwelling} />

                <div style={{ marginBottom: 6 }}>
                  <SectionHeader>Additional Notes</SectionHeader>
                </div>
                <textarea
                  className="notes-area"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Describe any specific pain locations, unusual symptoms, or how your last session felt…"
                  rows={4}
                />

                {/* Submit */}
                <button className="submit-btn" onClick={handleSubmit} disabled={submitting} style={{ marginTop: 26 }}>
                  {submitting ? (
                    <>
                      <span style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.25)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spinLoader 0.75s linear infinite", flexShrink: 0 }} />
                      Analysing your data…
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M2 9h5l2-5 3 10 2-6h2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Submit Check-In
                    </>
                  )}
                </button>

                <div className="security-note">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1L2 3.5V7c0 2.5 1.9 4.8 4.5 5.5C9.1 11.8 11 9.5 11 7V3.5L6.5 1Z" stroke="#B8D0F8" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                  <span className="security-txt">Your health data is encrypted and private</span>
                </div>
              </div>
            </div>

            {/* ── DNA SIDEBAR ── */}
            <div className="dna-col">
              <div className="dna-card">
                <SidebarDNA />
                <p className="dna-label">Recovery Core</p>
                <p className="dna-sub">AI biometric analysis running in real time</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}