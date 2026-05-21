"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Send, Bot, User, Trash2 } from "lucide-react";
import api from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWindow() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Auto-scroll ──
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => { scrollToBottom(); }, [messages]);

  // ── Load history ──
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await api.get('/api/chat/history');
        if (res.data && res.data.length > 0) {
          setMessages(res.data.map((m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })));
        } else {
          setMessages([{ role: "assistant", content: "Hello! I am your AI Rehab Companion. How are you feeling today? Do you have any questions about your exercises, prosthetic device, or pain management?" }]);
        }
      } catch {
        setMessages([{ role: "assistant", content: "Hello! I am your AI Rehab Companion. How are you feeling today?" }]);
      }
    };
    loadHistory();
  }, []);

  // ── Three.js particle field ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = canvas.offsetWidth;
    let H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;

    const PARTICLE_COUNT = 55;
    interface Particle { x: number; y: number; vx: number; vy: number; r: number; alpha: number; }
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 2.2 + 0.6,
      alpha: Math.random() * 0.5 + 0.15,
    }));

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      // Connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(59,130,246,${0.12 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      // Dots
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(26,79,160,${p.alpha})`;
        ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight;
      canvas.width = W; canvas.height = H;
    };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", onResize); };
  }, []);

  // ── GSAP entrance ──
  useEffect(() => {
    const loadGSAP = async () => {
      if ((window as any).gsap) { runGSAP(); return; }
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js";
      s.onload = runGSAP;
      document.head.appendChild(s);
    };
    const runGSAP = () => {
      const gsap = (window as any).gsap;
      if (!gsap || !containerRef.current) return;
      gsap.fromTo(containerRef.current,
        { opacity: 0, y: 32, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "power3.out" }
      );
    };
    loadGSAP();
  }, []);

  // ── Send handler (logic unchanged) ──
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    const updatedMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(updatedMessages);
    setIsLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.accessToken) headers['Authorization'] = `Bearer ${session.accessToken}`;
      const response = await fetch('http://127.0.0.1:8000/api/chat/message', {
        method: 'POST', headers,
        body: JSON.stringify({ message: userMessage, history: messages })
      });
      if (!response.ok) throw new Error("Network response was not ok");
      if (!response.body) throw new Error("No response body");
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const n = [...prev];
          n[n.length - 1].content = assistantContent;
          return n;
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I am having trouble connecting to the server. Please check your backend." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Clear handler (logic unchanged) ──
  const handleClear = async () => {
    try { await api.delete('/api/chat/history'); } catch (e) { console.error("Failed to clear chat history from DB:", e); }
    setMessages([{ role: "assistant", content: "Chat history cleared. How can I help you today?" }]);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

        .cw-root {
          font-family: 'DM Sans', system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          position: relative;
          background: #fff;
          border-radius: 0;
          overflow: hidden;
        }

        /* ── Canvas bg ── */
        .cw-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
          opacity: 0.7;
        }

        /* ── Header ── */
        .cw-header {
          position: relative;
          z-index: 10;
          background: linear-gradient(100deg, #0c1f4a 0%, #1a4fa0 60%, #2563eb 100%);
          padding: 0 20px;
          height: 62px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
          overflow: hidden;
        }

        .cw-header::before {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            90deg,
            rgba(255,255,255,0.03) 0px,
            rgba(255,255,255,0.03) 1px,
            transparent 1px,
            transparent 40px
          );
          pointer-events: none;
        }

        .cw-header-left {
          display: flex;
          align-items: center;
          gap: 11px;
          position: relative;
        }

        .cw-header-icon {
          width: 36px;
          height: 36px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .cw-header-icon svg {
          width: 18px; height: 18px; color: #fff;
        }

        .cw-header-title {
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 800;
          color: #fff;
          letter-spacing: 0.02em;
          line-height: 1;
        }

        .cw-header-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.55);
          font-weight: 400;
          margin-top: 2px;
          letter-spacing: 0.01em;
        }

        .cw-status-pip {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 8px rgba(74,222,128,0.8);
          animation: pipPulse 2.2s ease infinite;
          flex-shrink: 0;
        }
        @keyframes pipPulse {
          0%,100% { opacity:1; box-shadow: 0 0 7px rgba(74,222,128,0.7); }
          50% { opacity:0.6; box-shadow: 0 0 14px rgba(74,222,128,1); }
        }

        .cw-clear-btn {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 8px;
          color: #fff;
          width: 34px; height: 34px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.18s, transform 0.15s;
          position: relative; z-index: 1;
        }
        .cw-clear-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.06); }
        .cw-clear-btn svg { width: 15px; height: 15px; }

        /* ── Messages ── */
        .cw-messages {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 20px 20px 12px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          position: relative;
          z-index: 5;
          background: transparent;
          scrollbar-width: thin;
          scrollbar-color: rgba(59,130,246,0.2) transparent;
        }
        .cw-messages::-webkit-scrollbar { width: 4px; }
        .cw-messages::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.2); border-radius: 4px; }

        /* ── Message Row ── */
        .cw-row { display: flex; align-items: flex-end; gap: 9px; animation: msgIn 0.35s cubic-bezier(.22,.8,.4,1) both; }
        @keyframes msgIn {
          from { opacity:0; transform: translateY(14px) scale(0.97); }
          to   { opacity:1; transform: translateY(0) scale(1); }
        }
        .cw-row.user  { flex-direction: row-reverse; }
        .cw-row.bot   { flex-direction: row; }

        /* Avatar */
        .cw-avatar {
          width: 30px; height: 30px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .cw-avatar.bot {
          background: linear-gradient(135deg, #0c1f4a, #1a4fa0);
          box-shadow: 0 3px 10px rgba(26,79,160,0.35);
        }
        .cw-avatar.user {
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
          border: 1px solid rgba(59,130,246,0.25);
        }
        .cw-avatar svg { width: 14px; height: 14px; }
        .cw-avatar.bot svg { color: #fff; }
        .cw-avatar.user svg { color: #1a4fa0; }

        /* Bubble */
        .cw-bubble {
          max-width: 72%;
          padding: 11px 15px;
          font-size: 13.5px;
          font-weight: 400;
          line-height: 1.6;
          letter-spacing: 0.005em;
          position: relative;
          word-break: break-word;
        }

        .cw-bubble.bot {
          background: #fff;
          color: #0c1f4a;
          border: 1px solid rgba(59,130,246,0.14);
          border-radius: 0px 14px 14px 14px;
          box-shadow: 0 2px 16px rgba(26,79,160,0.07), 0 1px 3px rgba(0,0,0,0.04);
        }

        .cw-bubble.user {
          background: linear-gradient(135deg, #1a4fa0 0%, #2563eb 100%);
          color: #fff;
          border-radius: 14px 0px 14px 14px;
          box-shadow: 0 4px 20px rgba(37,99,235,0.3);
          font-weight: 500;
        }

        /* Typing dots */
        .cw-typing {
          display: flex; gap: 4px; align-items: center; padding: 4px 0;
        }
        .cw-typing span {
          width: 5px; height: 5px; border-radius: 50%;
          background: #93c5fd;
          animation: typingDot 1.2s ease infinite;
        }
        .cw-typing span:nth-child(2) { animation-delay: 0.18s; }
        .cw-typing span:nth-child(3) { animation-delay: 0.36s; }
        @keyframes typingDot {
          0%,60%,100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-5px); opacity: 1; }
        }

        /* ── Input area ── */
        .cw-input-area {
          position: relative;
          z-index: 10;
          padding: 14px 16px 16px;
          background: #fff;
          border-top: 1px solid rgba(59,130,246,0.1);
          flex-shrink: 0;
        }

        .cw-input-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f5f8ff;
          border: 1.5px solid rgba(59,130,246,0.18);
          border-radius: 14px;
          padding: 6px 6px 6px 16px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .cw-input-wrap:focus-within {
          border-color: rgba(37,99,235,0.5);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.09);
          background: #fff;
        }

        .cw-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 13.5px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 400;
          color: #0c1f4a;
          outline: none;
          min-width: 0;
          padding: 5px 0;
          letter-spacing: 0.01em;
        }
        .cw-input::placeholder { color: #94afd4; }

        .cw-send {
          width: 38px; height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, #1a4fa0, #2563eb);
          border: none;
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          box-shadow: 0 3px 12px rgba(37,99,235,0.35);
        }
        .cw-send:hover:not(:disabled) { transform: scale(1.07); box-shadow: 0 5px 18px rgba(37,99,235,0.45); }
        .cw-send:active:not(:disabled) { transform: scale(0.95); }
        .cw-send:disabled { opacity: 0.42; cursor: not-allowed; box-shadow: none; }
        .cw-send svg { width: 16px; height: 16px; }

        /* Loading spinner on send */
        .cw-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Timestamp labels ── */
        .cw-time {
          font-size: 10px;
          color: #94afd4;
          text-align: center;
          margin: 6px 0 2px;
          letter-spacing: 0.04em;
          font-weight: 500;
        }

        /* ── Empty state ── */
        .cw-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #94afd4;
          font-size: 13px;
          font-weight: 500;
        }
        .cw-empty-icon {
          width: 48px; height: 48px;
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid rgba(59,130,246,0.15);
          margin-bottom: 4px;
        }
        .cw-empty-icon svg { width: 24px; height: 24px; color: #3b82f6; }
      `}</style>

      <div ref={containerRef} className="cw-root">
        {/* Particle canvas */}
        <canvas ref={canvasRef} className="cw-canvas" />

        {/* ── Header ── */}
        <div className="cw-header">
          <div className="cw-header-left">
            <div className="cw-header-icon">
              <Bot />
            </div>
            <div>
              <div className="cw-header-title">AI Support Assistant</div>
              <div className="cw-header-sub">RehabAI · Recovery Core</div>
            </div>
            <div className="cw-status-pip" title="Online" />
          </div>
          <button className="cw-clear-btn" onClick={handleClear} title="Clear History">
            <Trash2 />
          </button>
        </div>

        {/* ── Messages ── */}
        <div className="cw-messages">
          {messages.length === 0 && (
            <div className="cw-empty">
              <div className="cw-empty-icon"><Bot /></div>
              Starting session…
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`cw-row ${msg.role === 'user' ? 'user' : 'bot'}`}>
              <div className={`cw-avatar ${msg.role === 'user' ? 'user' : 'bot'}`}>
                {msg.role === 'user' ? <User /> : <Bot />}
              </div>
              <div className={`cw-bubble ${msg.role === 'user' ? 'user' : 'bot'}`}>
                {msg.content
                  ? msg.content
                  : <span className="cw-typing"><span /><span /><span /></span>
                }
              </div>
            </div>
          ))}

          {/* Loading indicator row */}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="cw-row bot">
              <div className="cw-avatar bot"><Bot /></div>
              <div className="cw-bubble bot">
                <span className="cw-typing"><span /><span /><span /></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input Area ── */}
        <div className="cw-input-area">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            style={{ display: 'contents' }}
          >
            <div className="cw-input-wrap">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your recovery…"
                className="cw-input"
                disabled={isLoading}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="cw-send"
                aria-label="Send message"
              >
                {isLoading
                  ? <span className="cw-spinner" />
                  : <Send />
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}