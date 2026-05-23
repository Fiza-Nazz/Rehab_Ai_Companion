"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import api from "@/lib/api";

// ─── Data Types ──────────────────────────────────────────────────────────────
export interface AlertType {
  id: string;
  type: "crit" | "warn" | "ok";
  title: string;
  message: string;
  sent_to: string;
  channel: string;
  time: string;
  acknowledged: boolean;
}

// ─── Type config — strictly navy/blue/white palette ───────────────────────────
const typeConfig = {
  crit: {
    topBar: "#1E3A5F",
    badgeBg: "rgba(30,58,95,0.1)",
    badgeText: "#1E3A5F",
    label: "CRITICAL",
    dot: "#1E3A5F",
    pulsing: true,
  },
  warn: {
    topBar: "#2563EB",
    badgeBg: "rgba(37,99,235,0.08)",
    badgeText: "#2563EB",
    label: "WARNING",
    dot: "#2563EB",
    pulsing: false,
  },
  ok: {
    topBar: "#93C5FD",
    badgeBg: "rgba(147,197,253,0.15)",
    badgeText: "#1E3A5F",
    label: "INFO",
    dot: "#93C5FD",
    pulsing: false,
  },
};

// ─── Healthcare 3D Canvas ─────────────────────────────────────────────────────
// Renders: rotating molecular structure + ECG line + floating depth particles
function HealthCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    let t = 0;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    // 3D projection helper
    const proj = (x: number, y: number, z: number, fov = 320) => {
      const s = fov / (fov + z);
      return { px: x * s + W() / 2, py: y * s + H() / 2, s };
    };

    // Molecular node positions on a sphere
    const NODE_COUNT = 18;
    interface Node3D { x:number; y:number; z:number; }
    const nodes: Node3D[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const phi   = Math.acos(1 - (2 * (i + 0.5)) / NODE_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const R = 70;
      nodes.push({
        x: R * Math.sin(phi) * Math.cos(theta),
        y: R * Math.sin(phi) * Math.sin(theta),
        z: R * Math.cos(phi),
      });
    }

    // Edges: connect nodes within distance threshold
    const edges: [number, number][] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dz = nodes[i].z - nodes[j].z;
        if (Math.sqrt(dx*dx+dy*dy+dz*dz) < 95) edges.push([i, j]);
      }
    }

    // Floating background particles
    interface Dot { x:number; y:number; z:number; vx:number; vy:number; vz:number; r:number; a:number; }
    const dots: Dot[] = Array.from({ length: 40 }, () => ({
      x: (Math.random() - 0.5) * 500,
      y: (Math.random() - 0.5) * 500,
      z: (Math.random() - 0.5) * 500,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      vz: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 2 + 0.8,
      a: Math.random() * 0.35 + 0.1,
    }));

    // ECG path draw
    const drawECG = (sx: number, sy: number, w: number, time: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = "rgba(37,99,235,0.35)";
      ctx.lineWidth = 1.6;
      const step = w / 100;
      for (let i = 0; i <= 100; i++) {
        const x = sx + i * step;
        const ph = ((i / 100) * 2.5 * Math.PI + time * 1.8) % (Math.PI * 2);
        let y = sy;
        if      (ph > 0.08 && ph < 0.25) y -= 6;
        else if (ph > 0.25 && ph < 0.55) y += 52 * Math.sin(((ph - 0.25) / 0.45) * Math.PI);
        else if (ph > 0.55 && ph < 0.72) y -= 14 * Math.sin(((ph - 0.55) / 0.22) * Math.PI);
        else if (ph > 0.72 && ph < 0.88) y += 4;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    };

    const draw = () => {
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);
      t += 0.009;

      // Rotate angle for molecule
      const rx = t * 0.38;
      const ry = t * 0.52;

      // Rotate a 3D point around Y then X
      const rotate = (nx: number, ny: number, nz: number) => {
        // Y-axis
        let x1 = nx * Math.cos(ry) + nz * Math.sin(ry);
        let z1 = -nx * Math.sin(ry) + nz * Math.cos(ry);
        // X-axis
        let y2 = ny * Math.cos(rx) - z1 * Math.sin(rx);
        let z2 = ny * Math.sin(rx) + z1 * Math.cos(rx);
        return { x: x1, y: y2, z: z2 };
      };

      // Offset molecule to left side
      const cx = w * 0.72, cy = h * 0.5;

      // Rotated node positions
      const rNodes = nodes.map(n => {
        const r = rotate(n.x, n.y, n.z);
        return proj(r.x + cx - w / 2, r.y + cy - h / 2, r.z);
      });

      // Draw edges
      for (const [i, j] of edges) {
        const ni = rNodes[i], nj = rNodes[j];
        const alpha = Math.min(ni.s, nj.s) * 0.35;
        ctx.beginPath();
        ctx.moveTo(ni.px, ni.py);
        ctx.lineTo(nj.px, nj.py);
        ctx.strokeStyle = `rgba(37,99,235,${alpha})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }

      // Draw nodes
      for (const rn of rNodes) {
        const radius = 3.5 * rn.s;
        const alpha = 0.3 + 0.65 * ((rn.s - 0.7) / 0.6);
        ctx.beginPath();
        ctx.arc(rn.px, rn.py, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(30,58,95,${Math.max(0.1, alpha)})`;
        ctx.fill();
        // Highlight ring on front nodes
        if (rn.s > 1.05) {
          ctx.beginPath();
          ctx.arc(rn.px, rn.py, radius + 2.5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(37,99,235,${alpha * 0.4})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }

      // Background floating dots
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy; d.z += d.vz;
        if (Math.abs(d.x) > 260) d.vx *= -1;
        if (Math.abs(d.y) > 260) d.vy *= -1;
        if (Math.abs(d.z) > 260) d.vz *= -1;
        const { px, py, s } = proj(d.x, d.y, d.z);
        if (px < 0 || px > w || py < 0 || py > h) continue;
        ctx.beginPath();
        ctx.arc(px, py, d.r * s, 0, Math.PI * 2);
        ctx.fillStyle = "#1E3A5F";
        ctx.globalAlpha = d.a * s * 0.6;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ECG line near bottom
      drawECG(w * 0.04, h * 0.87, w * 0.92, t);

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    />
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{
      background: "#fff",
      border: "1.5px solid #E4E8F0",
      borderTop: `3px solid ${highlight ? "#1E3A5F" : "#2563EB"}`,
      padding: "16px 24px",
      minWidth: 90, textAlign: "center",
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#1E3A5F", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 6 }}>{label}</div>
    </div>
  );
}

// ─── Rule Card ────────────────────────────────────────────────────────────────
function RuleCard({ title, sub, dual }: { title: string; sub: string; dual: boolean }) {
  return (
    <div style={{
      background: "#fff",
      border: "1.5px solid #E4E8F0",
      borderLeft: `3px solid ${dual ? "#1E3A5F" : "#2563EB"}`,
      padding: "16px 18px",
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#1E3A5F", marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 500, lineHeight: 1.55 }}>{sub}</div>
      {dual && (
        <div style={{
          display: "inline-block", marginTop: 10,
          fontSize: 10, fontWeight: 800, color: "#1E3A5F",
          background: "rgba(30,58,95,0.07)",
          padding: "3px 10px",
          letterSpacing: "0.1em", textTransform: "uppercase",
        }}>DUAL CHANNEL</div>
      )}
    </div>
  );
}

// ─── Alert Card ───────────────────────────────────────────────────────────────
function AlertCard({
  alert, index, sending, onAcknowledge,
}: {
  alert: AlertType;
  index: number;
  sending: string | null;
  onAcknowledge: (id: string) => void;
}) {
  const cfg = typeConfig[alert.type as keyof typeof typeConfig];
  const isLoading = sending === alert.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: "#fff",
        border: "1.5px solid #E4E8F0",
        borderLeft: `4px solid ${cfg.topBar}`,
        boxShadow: "0 2px 16px rgba(30,58,95,0.06)",
        overflow: "hidden",
        transition: "box-shadow 0.2s, transform 0.2s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 28px rgba(30,58,95,0.12)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 16px rgba(30,58,95,0.06)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      <div style={{ padding: "20px 24px 22px" }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badge row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: cfg.dot, display: "inline-block", flexShrink: 0,
                animation: cfg.pulsing ? "alertPip 1.5s ease infinite" : "none",
              }} />
              <span style={{
                fontSize: 10, fontWeight: 800, color: cfg.badgeText,
                background: cfg.badgeBg, padding: "3px 10px",
                letterSpacing: "0.1em", textTransform: "uppercase" as const,
              }}>{cfg.label}</span>
              {alert.acknowledged && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "#6B7280",
                  background: "rgba(107,114,128,0.08)", padding: "3px 10px",
                  letterSpacing: "0.08em", textTransform: "uppercase" as const,
                }}>Acknowledged</span>
              )}
              {alert.type === "crit" && !alert.acknowledged && (
                <span style={{
                  fontSize: 10, fontWeight: 800, color: "#2563EB",
                  background: "rgba(37,99,235,0.08)", padding: "3px 10px",
                  letterSpacing: "0.08em", textTransform: "uppercase" as const,
                  border: "1px solid rgba(37,99,235,0.15)",
                }}>Dual Channel</span>
              )}
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: 15, fontWeight: 800, color: "#1E3A5F",
              margin: "0 0 7px", letterSpacing: "-0.01em",
            }}>{alert.title}</h3>

            {/* Message */}
            <p style={{
              fontSize: 13.5, color: "#4B5C78", fontWeight: 500,
              lineHeight: 1.65, margin: "0 0 14px",
            }}>{alert.message}</p>

            {/* Meta */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              {[
                alert.sent_to,
                `via ${alert.channel}`,
                alert.time,
              ].map((txt, i) => (
                <span key={i} style={{
                  fontSize: 11.5, color: "#6B7280", fontWeight: 500,
                  background: "#F4F6FA",
                  border: "1px solid #E4E8F0",
                  padding: "4px 12px",
                }}>{txt}</span>
              ))}
            </div>
          </div>

          {/* Acknowledge button */}
          {!alert.acknowledged && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              disabled={isLoading}
              style={{
                flexShrink: 0, marginTop: 2,
                padding: "10px 20px",
                background: "#1E3A5F",
                color: "#fff",
                border: "none",
                borderRadius: 0,
                fontSize: 12, fontWeight: 800,
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.65 : 1,
                letterSpacing: "0.04em",
                textTransform: "uppercase" as const,
                display: "flex", alignItems: "center", gap: 8,
                transition: "background 0.15s",
                whiteSpace: "nowrap" as const,
              }}
              onMouseEnter={e => { if (!isLoading) (e.currentTarget).style.background = "#2563EB"; }}
              onMouseLeave={e => { (e.currentTarget).style.background = "#1E3A5F"; }}
            >
              {isLoading ? (
                <>
                  <span style={{
                    width: 14, height: 14, borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    display: "inline-block",
                    animation: "alertSpin 0.65s linear infinite",
                    flexShrink: 0,
                  }} />
                  Sending
                </>
              ) : (
                alert.type === "crit" ? "Send & Acknowledge" : "Acknowledge"
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Section Divider ──────────────────────────────────────────────────────────
function SectionDivider({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <span style={{ fontSize: 10, fontWeight: 800, color: "#6B7280", letterSpacing: "0.14em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>{label}</span>
      <span style={{
        fontSize: 11, fontWeight: 800, color: "#fff",
        background: "#1E3A5F", padding: "2px 10px",
        minWidth: 24, textAlign: "center" as const,
      }}>{count}</span>
      <div style={{ flex: 1, height: 1, background: "#E4E8F0" }} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AlertsPage() {
  const { data: session, status } = useSession();
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || !session?.accessToken) return;

    const fetchAlerts = async () => {
      try {
        const { data } = await api.get("/api/alerts/");
        const formatted = data.map((d: any) => ({
          id: d.id,
          type: (d.alert_type === 'pain_spike' || d.alert_type === 'rapid_deterioration') ? 'crit' : (d.alert_type === 'high_risk' || d.alert_type === 'missed_checkin' ? 'warn' : 'ok'),
          title: d.alert_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          message: d.message,
          sent_to: d.sent_to,
          channel: d.channel,
          time: new Date(d.sent_at).toLocaleString(),
          acknowledged: d.acknowledged,
        }));
        setAlerts(formatted);
      } catch (err) {
        console.error("Error fetching alerts", err);
      }
    };
    fetchAlerts();
  }, [session, status]);

  const [customEmail, setCustomEmail] = useState("Fizanaazz321@gmail.com");
  const [customPhone, setCustomPhone] = useState("923123632197");
  const [customTitle, setCustomTitle] = useState("Severe Pain Spike");
  const [customMsg, setCustomMsg] = useState("");
  const [refining, setRefining] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  const handleRefineAI = async () => {
    if (!customMsg.trim()) {
      toast.error("Pehle apni beemari/symptoms likhein!");
      return;
    }
    setRefining(true);
    try {
      const { data: result } = await api.post("/api/alerts/refine-ai", { symptoms: customMsg });
      setCustomMsg(result.refined_message);
      toast.success("AI refined your symptoms professionally!");
    } catch {
      toast.error("Failed to refine symptoms. Ensure backend is running.");
    } finally {
      setRefining(false);
    }
  };

  const handleCustomDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMsg.trim()) {
      toast.error("Alert message/symptoms cannot be empty.");
      return;
    }
    setDispatching(true);
    try {
      const { data: result } = await api.post("/api/alerts/trigger-critical", {
        alert_type: customTitle,
        message: customMsg,
        email: customEmail,
        phone: customPhone
      });

      if (result.email_sent)     toast.success(`Email sent to ${customEmail}`, { duration: 4000 });
      else                       toast.error("Email sending failed");
      
      await new Promise(r => setTimeout(r, 900));
      if (result.whatsapp_sent) toast.success(`WhatsApp sent to ${customPhone}`, { duration: 4000 });
      else                      toast.error("WhatsApp sending failed");

      // Add to dynamic list as acknowledged
      const newAlert: AlertType = {
        id: Date.now().toString(),
        type: "crit",
        title: customTitle,
        message: customMsg,
        sent_to: customEmail,
        channel: "Email + WhatsApp",
        time: "Just Now",
        acknowledged: true,
      };
      setAlerts(prev => [newAlert, ...prev]);
      setCustomMsg("");
    } catch {
      toast.error("Failed to trigger alert. Ensure backend is running.");
    } finally {
      setDispatching(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    const alert = alerts.find(a => a.id === id);
    if (!alert) return;
    setSending(id);
    try {
      await api.patch(`/api/alerts/${id}/acknowledge`);
      toast.success("Alert acknowledged successfully", { duration: 3000 });
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
    } catch {
      toast.error("Failed to acknowledge alert. Ensure backend is running.");
    } finally {
      setSending(null);
    }
  };

  const active   = alerts.filter(a => !a.acknowledged);
  const resolved = alerts.filter(a =>  a.acknowledged);

  const KF = `
    @keyframes alertSpin { to { transform: rotate(360deg); } }
    @keyframes alertPip  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.6)} }
    @keyframes alertFade { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
    @keyframes orbFloat  { from{transform:translateY(0)} to{transform:translateY(-12px)} }
  `;

  return (
    <>
      <style>{KF}</style>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13, fontWeight: 600,
            borderRadius: 0,
            border: "1px solid #E4E8F0",
            color: "#1E3A5F",
            background: "#fff",
            boxShadow: "0 4px 20px rgba(30,58,95,0.1)",
          },
        }}
      />

      <div style={{
        minHeight: "100vh",
        background: "#FFFFFF",
        fontFamily: "'DM Sans', 'Outfit', sans-serif",
        display: "flex", flexDirection: "column",
      }}>

        {/* ── Hero Banner ─────────────────────────────────────────────────── */}
        <div style={{
          position: "relative",
          background: "linear-gradient(135deg, #0D1F3C 0%, #1E3A5F 55%, #163059 100%)",
          height: 240, flexShrink: 0, overflow: "hidden",
        }}>
          {/* Dot grid overlay */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }} />

          {/* Healthcare 3D canvas */}
          <HealthCanvas />

          {/* Floating orb accent */}
          <div style={{
            position: "absolute", right: 52, bottom: 32,
            width: 80, height: 80, borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #93C5FD, #1E3A5F 70%)",
            boxShadow: "0 8px 32px rgba(37,99,235,0.3), inset 0 1px 6px rgba(255,255,255,0.12)",
            animation: "orbFloat 3.8s ease-in-out infinite alternate",
            opacity: 0.75,
          }}>
            <div style={{
              position: "absolute", top: "18%", left: "22%",
              width: "26%", height: "15%", borderRadius: "50%",
              background: "rgba(255,255,255,0.2)", filter: "blur(3px)",
            }} />
          </div>

          {/* Text */}
          <div style={{
            position: "relative", zIndex: 2,
            padding: "40px 40px 0",
            animation: "alertFade 0.7s ease both",
          }}>
            <div style={{
              fontSize: 10, fontWeight: 800, color: "#93C5FD",
              letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 10,
            }}>RehabAI · V2 — Live Monitoring</div>
            <h1 style={{
              fontSize: 30, fontWeight: 800, color: "#fff",
              margin: "0 0 10px", letterSpacing: "-0.025em", lineHeight: 1.1,
            }}>Alert Center</h1>
            <p style={{
              fontSize: 14, color: "rgba(255,255,255,0.62)", fontWeight: 500,
              margin: 0, maxWidth: 420, lineHeight: 1.65,
            }}>
              Automated alerts dispatched to doctors and caregivers.{" "}
              <span style={{ color: "#93C5FD", fontWeight: 700 }}>
                Critical alerts trigger dual-channel delivery instantly.
              </span>
            </p>
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div style={{
          flex: 1, maxWidth: 900, width: "100%",
          margin: "0 auto", padding: "32px 24px 64px",
          animation: "alertFade 0.7s 0.12s ease both",
        }}>

          {/* Stat row */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 32 }}>
            <StatCard label="Active"   value={active.length}   highlight />
            <StatCard label="Resolved" value={resolved.length} />
            <StatCard label="Total"    value={alerts.length}   />
          </div>

          {/* Automated Rules */}
          <div style={{ marginBottom: 32 }}>
            {/* Rules header */}
            <div style={{
              padding: "18px 24px",
              background: "#1E3A5F",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 6, height: 22, background: "#2563EB", flexShrink: 0,
              }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Automated Alert Rules
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
                — system-defined triggers
              </span>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 0,
              border: "1.5px solid #E4E8F0",
              borderTop: "none",
            }}>
              <RuleCard title="Pain > 7/10"            sub="Email + WhatsApp → Doctor & Caregiver" dual={true}  />
              <RuleCard title="2+ Days No Check-In"    sub="Email → Caregiver"                      dual={false} />
              <RuleCard title="Pain +3 pts vs Week"    sub="WhatsApp → Doctor"                      dual={true}  />
              <RuleCard title="AI Risk Score > 75%"    sub="Email → Doctor"                         dual={false} />
            </div>
          </div>

          {/* ── Custom Alert Dispatcher ── */}
          <div style={{
            background: "#fff",
            border: "1.5px solid #E4E8F0",
            borderTop: "3px solid #1E3A5F",
            padding: "24px",
            marginBottom: "32px",
            boxShadow: "0 2px 16px rgba(30,58,95,0.04)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "20px" }}>
              <span style={{ fontSize: "20px" }}>🚨</span>
              <h3 style={{ fontSize: "13px", fontWeight: 800, color: "#1E3A5F", margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                AI-Assisted Custom Alert Dispatcher
              </h3>
            </div>

            <form onSubmit={handleCustomDispatch} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "10px", fontWeight: 800, color: "#6B7280", textTransform: "uppercase", display: "block", marginBottom: "6px", letterSpacing: "0.05em" }}>Recipient Email</label>
                  <input 
                    type="email" 
                    value={customEmail} 
                    onChange={e => setCustomEmail(e.target.value)}
                    placeholder="doctor@hospital.com"
                    required
                    style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E4E8F0", outline: "none", fontSize: "13px", color: "#1E3A5F", fontWeight: 500 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "10px", fontWeight: 800, color: "#6B7280", textTransform: "uppercase", display: "block", marginBottom: "6px", letterSpacing: "0.05em" }}>Recipient WhatsApp Number</label>
                  <input 
                    type="text" 
                    value={customPhone} 
                    onChange={e => setCustomPhone(e.target.value)}
                    placeholder="923123632197"
                    required
                    style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E4E8F0", outline: "none", fontSize: "13px", color: "#1E3A5F", fontWeight: 500 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "10px", fontWeight: 800, color: "#6B7280", textTransform: "uppercase", display: "block", marginBottom: "6px", letterSpacing: "0.05em" }}>Alert Title / Illness Category</label>
                <input 
                  type="text" 
                  value={customTitle} 
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="e.g. Socket Pain Spike"
                  required
                  style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E4E8F0", outline: "none", fontSize: "13px", color: "#1E3A5F", fontWeight: 500 }}
                />
              </div>

              <div>
                <label style={{ fontSize: "10px", fontWeight: 800, color: "#6B7280", textTransform: "uppercase", display: "block", marginBottom: "6px", letterSpacing: "0.05em" }}>
                  Describe your symptoms / illness (Apni Beemari Ya Symptoms Likhein)
                </label>
                <textarea 
                  value={customMsg} 
                  onChange={e => setCustomMsg(e.target.value)}
                  placeholder="Type symptoms here (e.g. 'Mujhe stump main tez chubhan ho rahi hai aur sujan hai...')"
                  required
                  rows={3}
                  style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E4E8F0", outline: "none", fontSize: "13px", color: "#4B5C78", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={handleRefineAI}
                  disabled={refining || !customMsg.trim()}
                  style={{
                    padding: "10px 20px",
                    background: "linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)",
                    color: "#fff",
                    border: "none",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: (refining || !customMsg.trim()) ? "not-allowed" : "pointer",
                    opacity: (refining || !customMsg.trim()) ? 0.6 : 1,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  {refining ? (
                    <>
                      <span style={{
                        width: 12, height: 12, borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "#fff",
                        display: "inline-block",
                        animation: "alertSpin 0.65s linear infinite"
                      }} />
                      Refining...
                    </>
                  ) : "✨ Refine with AI"}
                </button>

                <button
                  type="submit"
                  disabled={dispatching}
                  style={{
                    padding: "10px 24px",
                    background: "#1E3A5F",
                    color: "#fff",
                    border: "none",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: dispatching ? "not-allowed" : "pointer",
                    opacity: dispatching ? 0.65 : 1,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  {dispatching ? (
                    <>
                      <span style={{
                        width: 12, height: 12, borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "#fff",
                        display: "inline-block",
                        animation: "alertSpin 0.65s linear infinite"
                      }} />
                      Dispatching...
                    </>
                  ) : "🚀 Dispatch Alert"}
                </button>
              </div>
            </form>
          </div>

          {/* Active Alerts */}
          {active.length > 0 ? (
            <section style={{ marginBottom: 32 }}>
              <SectionDivider label="Active Alerts" count={active.length} />
              <AnimatePresence>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {active.map((a, i) => (
                    <AlertCard key={a.id} alert={a} index={i} sending={sending} onAcknowledge={handleAcknowledge} />
                  ))}
                </div>
              </AnimatePresence>
            </section>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                background: "#fff",
                border: "1.5px solid #E4E8F0",
                borderTop: "3px solid #2563EB",
                padding: "48px 32px",
                textAlign: "center",
                marginBottom: 32,
              }}
            >
              <div style={{
                width: 56, height: 56, background: "#1E3A5F",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 18px",
              }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M5 14 L12 21 L23 8" stroke="#fff" strokeWidth="2.8" strokeLinecap="square" strokeLinejoin="miter"/>
                </svg>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1E3A5F", marginBottom: 8 }}>
                No active alerts
              </div>
              <div style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>
                System is monitoring patient 24/7.
              </div>
            </motion.div>
          )}

          {/* Acknowledged */}
          {resolved.length > 0 && (
            <section>
              <SectionDivider label="Acknowledged" count={resolved.length} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: 0.5 }}>
                {resolved.map((a, i) => (
                  <AlertCard key={a.id} alert={a} index={i} sending={sending} onAcknowledge={handleAcknowledge} />
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </>
  );
}
