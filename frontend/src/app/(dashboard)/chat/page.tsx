"use client";

import { useEffect, useRef, useState } from "react";
import ChatWindow from "@/components/chat/ChatWindow";

export default function ChatPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Dynamically load Three.js & GSAP from CDN
    const loadScripts = async () => {
      const loadScript = (src: string) =>
        new Promise<void>((resolve) => {
          if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
          }
          const s = document.createElement("script");
          s.src = src;
          s.onload = () => resolve();
          document.head.appendChild(s);
        });

      await loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
      );
      await loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"
      );

      initThreeJS();
      initGSAP();
    };

    loadScripts();

    return () => {
      // cleanup handled inside
    };
  }, []);

  const initThreeJS = () => {
    const THREE = (window as any).THREE;
    if (!THREE || !canvasRef.current) return;

    const container = canvasRef.current;
    const W = container.offsetWidth;
    const H = container.offsetHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.pointerEvents = "none";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
    camera.position.set(0, 0, 5);

    // Central glowing sphere (DNA-like orb)
    const sphereGeo = new THREE.SphereGeometry(0.9, 64, 64);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: 0x1a4fa0,
      emissive: 0x0a2560,
      shininess: 120,
      transparent: true,
      opacity: 0.85,
      wireframe: false,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphere);

    // Wireframe shell
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x4d8cff,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const wireShell = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 32, 32),
      wireMat
    );
    scene.add(wireShell);

    // Ring 1
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.7, 0.018, 16, 120),
      new THREE.MeshBasicMaterial({ color: 0x3a7bd5, transparent: true, opacity: 0.6 })
    );
    ring1.rotation.x = Math.PI / 2;
    scene.add(ring1);

    // Ring 2
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(2.1, 0.012, 16, 120),
      new THREE.MeshBasicMaterial({ color: 0x1a4fa0, transparent: true, opacity: 0.35 })
    );
    ring2.rotation.x = Math.PI / 3;
    ring2.rotation.z = Math.PI / 5;
    scene.add(ring2);

    // Floating particles
    const particleCount = 160;
    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const particleRadii: number[] = [];
    for (let i = 0; i < particleCount; i++) {
      const r = 1.4 + Math.random() * 1.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      particleRadii.push(r);
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x5ba3ff,
      size: 0.045,
      transparent: true,
      opacity: 0.85,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0x4488ff, 1.5);
    dirLight.position.set(3, 4, 5);
    scene.add(dirLight);
    const pointLight = new THREE.PointLight(0x1a4fa0, 2, 8);
    pointLight.position.set(-2, 2, 2);
    scene.add(pointLight);

    let frame = 0;
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      frame += 0.008;

      sphere.rotation.y += 0.004;
      sphere.rotation.x += 0.0015;
      wireShell.rotation.y -= 0.003;
      wireShell.rotation.x += 0.001;

      ring1.rotation.z += 0.006;
      ring2.rotation.y += 0.005;
      ring2.rotation.z -= 0.003;

      particles.rotation.y += 0.0015;
      particles.rotation.x += 0.0008;

      // Pulsing scale
      const pulse = 1 + Math.sin(frame * 1.5) * 0.04;
      sphere.scale.setScalar(pulse);

      renderer.render(scene, camera);
    };
    animate();

    // Mouse parallax
    const onMouse = (e: MouseEvent) => {
      const mx = (e.clientX / window.innerWidth - 0.5) * 0.5;
      const my = (e.clientY / window.innerHeight - 0.5) * 0.5;
      sphere.rotation.y += mx * 0.02;
      sphere.rotation.x += my * 0.02;
      camera.position.x += (mx * 0.3 - camera.position.x) * 0.05;
      camera.position.y += (-my * 0.3 - camera.position.y) * 0.05;
    };
    window.addEventListener("mousemove", onMouse);

    const onResize = () => {
      const nW = container.offsetWidth;
      const nH = container.offsetHeight;
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
    };
    window.addEventListener("resize", onResize);

    // Cleanup stored on container
    (container as any)._threeCleanup = () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  };

  const initGSAP = () => {
    const gsap = (window as any).gsap;
    if (!gsap) return;

    // Header entrance
    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -40, filter: "blur(10px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 1, ease: "power3.out" }
      );
    }

    // Card entrance
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 60, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 1.1, delay: 0.3, ease: "power3.out" }
      );
    }

    // Orb pulse
    if (orbRef.current) {
      gsap.to(orbRef.current, {
        boxShadow: "0 0 60px 20px rgba(59,130,246,0.35)",
        scale: 1.06,
        repeat: -1,
        yoyo: true,
        duration: 2.2,
        ease: "sine.inOut",
      });
    }

    // Badge shimmer
    const badges = document.querySelectorAll(".rehab-badge");
    gsap.fromTo(
      badges,
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, stagger: 0.12, delay: 0.5, duration: 0.7, ease: "power2.out" }
    );
  };

  useEffect(() => {
    return () => {
      const container = canvasRef.current;
      if (container && (container as any)._threeCleanup) {
        (container as any)._threeCleanup();
      }
    };
  }, []);

  return (
    <div className="rehab-chat-page">
      {/* ── Global Styles ── */}
      <style>{`
        .rehab-chat-page {
          min-height: 100vh;
          background: linear-gradient(145deg, #f0f6ff 0%, #e8f0fe 40%, #ddeeff 100%);
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          padding: 0;
        }

        /* ── Mesh background ── */
        .rehab-chat-page::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 20% 20%, rgba(59,130,246,0.12) 0%, transparent 70%),
            radial-gradient(ellipse 50% 60% at 80% 80%, rgba(26,79,160,0.10) 0%, transparent 70%),
            radial-gradient(ellipse 40% 40% at 50% 10%, rgba(147,197,253,0.15) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }

        /* ── 3D Canvas Container ── */
        .rehab-three-canvas {
          position: fixed;
          top: -10%;
          right: -8%;
          width: 420px;
          height: 420px;
          z-index: 1;
          opacity: 0.55;
          pointer-events: none;
        }

        /* ── Header ── */
        .rehab-header {
          position: relative;
          z-index: 10;
          padding: 28px 36px 16px;
          display: flex;
          align-items: center;
          gap: 20px;
          flex-shrink: 0;
        }

        .rehab-orb {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: linear-gradient(135deg, #1a4fa0 0%, #3b82f6 60%, #60a5fa 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 8px 32px rgba(59,130,246,0.4), 0 0 0 1px rgba(255,255,255,0.5) inset;
          position: relative;
          overflow: hidden;
        }

        .rehab-orb::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 60%);
          border-radius: 16px;
        }

        .rehab-orb svg {
          width: 28px;
          height: 28px;
          color: #fff;
          position: relative;
          z-index: 1;
        }

        .rehab-title-group {
          flex: 1;
        }

        .rehab-eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #3b82f6;
          margin-bottom: 2px;
        }

        .rehab-title {
          font-size: 28px;
          font-weight: 800;
          color: #0c1f4a;
          line-height: 1.1;
          letter-spacing: -0.5px;
          margin: 0;
        }

        .rehab-subtitle {
          font-size: 13.5px;
          color: #5b7aab;
          margin-top: 4px;
          font-weight: 400;
        }

        /* ── Stats Row ── */
        .rehab-stats {
          display: flex;
          gap: 10px;
          padding: 0 36px 20px;
          position: relative;
          z-index: 10;
          flex-shrink: 0;
        }

        .rehab-badge {
          background: rgba(255,255,255,0.75);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(59,130,246,0.18);
          border-radius: 12px;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 600;
          color: #1a4fa0;
          box-shadow: 0 2px 12px rgba(59,130,246,0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: default;
        }

        .rehab-badge:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59,130,246,0.2);
        }

        .rehab-badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #3b82f6;
          animation: badgePulse 2s ease infinite;
        }

        @keyframes badgePulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.5; transform:scale(0.7); }
        }

        .rehab-badge-dot.green { background: #22c55e; }
        .rehab-badge-dot.amber { background: #f59e0b; }

        /* ── Divider line ── */
        .rehab-divider {
          height: 1px;
          margin: 0 36px 20px;
          background: linear-gradient(90deg, transparent, rgba(59,130,246,0.25) 30%, rgba(26,79,160,0.2) 70%, transparent);
          position: relative;
          z-index: 10;
          flex-shrink: 0;
        }

        /* ── Chat Card ── */
        .rehab-chat-card {
          flex: 1;
          min-height: 0;
          margin: 0 28px 28px;
          position: relative;
          z-index: 10;
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(24px);
          border-radius: 24px;
          border: 1.5px solid rgba(59,130,246,0.18);
          box-shadow:
            0 4px 6px rgba(0,0,0,0.02),
            0 20px 60px rgba(26,79,160,0.12),
            0 0 0 1px rgba(255,255,255,0.6) inset;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        /* Top edge glow */
        .rehab-chat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 10%;
          right: 10%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #3b82f6 40%, #1a4fa0 60%, transparent);
          border-radius: 2px;
          z-index: 2;
        }

        /* ── Card Header ── */
        .rehab-card-header {
          padding: 16px 24px 14px;
          border-bottom: 1px solid rgba(59,130,246,0.1);
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(248,251,255,0.8);
          flex-shrink: 0;
        }

        .rehab-status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34,197,94,0.6);
          animation: statusPulse 2.5s ease infinite;
          flex-shrink: 0;
        }

        @keyframes statusPulse {
          0%,100% { box-shadow: 0 0 6px rgba(34,197,94,0.5); }
          50% { box-shadow: 0 0 14px rgba(34,197,94,0.9), 0 0 24px rgba(34,197,94,0.3); }
        }

        .rehab-card-label {
          font-size: 13px;
          font-weight: 600;
          color: #1a4fa0;
          flex: 1;
          letter-spacing: 0.01em;
        }

        .rehab-model-tag {
          font-size: 11px;
          font-weight: 600;
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
          color: #2563eb;
          padding: 3px 10px;
          border-radius: 20px;
          border: 1px solid rgba(59,130,246,0.25);
          letter-spacing: 0.04em;
        }

        /* ── Chat Window Wrapper ── */
        .rehab-chat-window {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          position: relative;
        }

        /* ── Floating grid overlay ── */
        .rehab-grid-bg {
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
          z-index: 0;
        }

        /* ── Floating decorative orbs ── */
        .rehab-float-orb {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          animation: floatMove 8s ease-in-out infinite;
        }

        .rehab-float-orb-1 {
          width: 300px; height: 300px;
          bottom: 5%; left: -80px;
          background: radial-gradient(circle, rgba(59,130,246,0.12), transparent 70%);
          animation-delay: 0s;
          animation-duration: 9s;
        }

        .rehab-float-orb-2 {
          width: 200px; height: 200px;
          top: 30%; left: 5%;
          background: radial-gradient(circle, rgba(26,79,160,0.08), transparent 70%);
          animation-delay: -3s;
          animation-duration: 11s;
        }

        @keyframes floatMove {
          0%,100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-24px) scale(1.04); }
        }
      `}</style>

      {/* ── Decorative Backgrounds ── */}
      <div className="rehab-grid-bg" />
      <div className="rehab-float-orb rehab-float-orb-1" />
      <div className="rehab-float-orb rehab-float-orb-2" />

      {/* ── Three.js 3D Canvas ── */}
      <div ref={canvasRef} className="rehab-three-canvas" />

      {/* ── Header ── */}
      <header ref={headerRef} className="rehab-header">
        <div ref={orbRef} className="rehab-orb">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div className="rehab-title-group">
          <div className="rehab-eyebrow">RehabAI · Recovery Core</div>
          <h1 className="rehab-title">Chat with AI Support</h1>
          <p className="rehab-subtitle">
            Ask about your recovery, exercises, or device care.
          </p>
        </div>
      </header>

      {/* ── Stats Badges ── */}
      <div className="rehab-stats">
        <div className="rehab-badge">
          <span className="rehab-badge-dot green" />
          AI Online
        </div>
        <div className="rehab-badge">
          <span className="rehab-badge-dot" />
          Streak · 14
        </div>
        <div className="rehab-badge">
          <span className="rehab-badge-dot amber" />
          Score · 92
        </div>
        <div className="rehab-badge">
          <span className="rehab-badge-dot green" />
          Done · 6/7
        </div>
      </div>

      <div className="rehab-divider" />

      {/* ── Chat Card ── */}
      <main ref={cardRef} className="rehab-chat-card">
        {/* Card Header Bar */}
        <div className="rehab-card-header">
          <div className="rehab-status-dot" />
          <span className="rehab-card-label">AI Recovery Assistant</span>
          <span className="rehab-model-tag">POWERED BY AI</span>
        </div>

        {/* Chat Window — logic untouched */}
        <div className="rehab-chat-window">
          <ChatWindow />
        </div>
      </main>
    </div>
  );
}