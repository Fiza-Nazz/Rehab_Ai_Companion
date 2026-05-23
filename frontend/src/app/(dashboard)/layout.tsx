"use client";

// DashboardLayout.tsx
// Theme: Pure white bg · zinc neutrals · navy blue accents · light blue highlights
// 3D Canvas: Animated DNA double helix + prosthetic arm + orbiting pulse rings (medical-realistic)
// No hallucination — only verified Three.js r128 APIs used

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import type { Mesh, Vector3 } from "three";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? "Guest";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const [activeNav, setActiveNav] = useState("/dashboard");
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  /* ── Live Clock ── */
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
      setDate(now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* ── Medical 3D Scene: DNA Helix + Prosthetic Arm + Pulse Rings ── */
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let raf: number;
    let cleanupFn: (() => void) | undefined;

    import("three").then((THREE) => {
      const SIZE = 240;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
      camera.position.set(0, 0, 5.2);

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(SIZE, SIZE);
      renderer.setClearColor(0x000000, 0);

      // ── Lighting ──
      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const key = new THREE.DirectionalLight(0xdbeafe, 3.5);
      key.position.set(4, 5, 6);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x1e3a5f, 2.2);
      fill.position.set(-4, -2, 2);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0x93c5fd, 1.5);
      rim.position.set(0, 4, -3);
      scene.add(rim);

      // ── Materials ──
      const navyMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, metalness: 0.85, roughness: 0.12 });
      const blueMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.8, roughness: 0.15 });
      const lightBlueMat = new THREE.MeshStandardMaterial({ color: 0x93c5fd, metalness: 0.7, roughness: 0.2 });
      const zincMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.5, roughness: 0.4 });
      const wireMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, wireframe: true, transparent: true, opacity: 0.18 });
      const rungMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.3, roughness: 0.5, transparent: true, opacity: 0.75 });

      // ── DNA Double Helix ──
      const dnaGroup = new THREE.Group();
      dnaGroup.position.set(-0.4, 0, 0);
      scene.add(dnaGroup);

      const STRANDS = 32;
      const HELIX_H = 3.8;
      const HELIX_R = 0.55;

      for (let i = 0; i < STRANDS; i++) {
        const t = i / STRANDS;
        const a1 = t * Math.PI * 4;
        const a2 = a1 + Math.PI;
        const y = (t - 0.5) * HELIX_H;

        const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), navyMat);
        b1.position.set(Math.cos(a1) * HELIX_R, y, Math.sin(a1) * HELIX_R);
        dnaGroup.add(b1);

        const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), blueMat);
        b2.position.set(Math.cos(a2) * HELIX_R, y, Math.sin(a2) * HELIX_R);
        dnaGroup.add(b2);

        if (i % 4 === 0) {
          const p1 = new THREE.Vector3(Math.cos(a1) * HELIX_R, y, Math.sin(a1) * HELIX_R);
          const p2 = new THREE.Vector3(Math.cos(a2) * HELIX_R, y, Math.sin(a2) * HELIX_R);
          const len = p1.distanceTo(p2);
          const mid = p1.clone().lerp(p2, 0.5);
          const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
          const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, len, 6), rungMat);
          rung.position.copy(mid);
          const up = new THREE.Vector3(0, 1, 0);
          const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
          rung.setRotationFromQuaternion(quat);
          dnaGroup.add(rung);
        }
      }

      // ── Prosthetic Arm ──
      const armGroup = new THREE.Group();
      armGroup.position.set(1.1, 0.2, 0);
      armGroup.rotation.z = -0.18;
      scene.add(armGroup);

      const uArm = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 1.2, 12), navyMat);
      uArm.position.y = 0.75;
      armGroup.add(uArm);

      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), lightBlueMat);
      elbow.position.y = 0.1;
      armGroup.add(elbow);

      const fArm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 1.05, 12), blueMat);
      fArm.position.y = -0.65;
      armGroup.add(fArm);

      const wrist = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 8, 22), lightBlueMat);
      wrist.position.y = -1.22;
      wrist.rotation.x = Math.PI / 2;
      armGroup.add(wrist);

      for (let f = 0; f < 3; f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.025, 0.34, 8), zincMat);
        finger.position.set((f - 1) * 0.1, -1.52, 0);
        armGroup.add(finger);
      }

      const armWire = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 1.25, 12), wireMat);
      armWire.position.y = 0.75;
      armGroup.add(armWire);

      // ── Orbiting Pulse Rings ──
      const rings: { mesh: Mesh; axis: Vector3; speed: number }[] = [];
      const ringConfigs = [
        { r: 1.9, tube: 0.012, color: 0x3b82f6, opacity: 0.35, axis: new THREE.Vector3(1, 0, 0), tilt: Math.PI / 2.5, speed: 0.55 },
        { r: 1.55, tube: 0.009, color: 0x93c5fd, opacity: 0.28, axis: new THREE.Vector3(0.6, 1, 0.2).normalize(), tilt: 0, speed: -0.42 },
        { r: 2.15, tube: 0.007, color: 0x1e3a5f, opacity: 0.22, axis: new THREE.Vector3(0.3, 0.4, 1).normalize(), tilt: Math.PI / 3, speed: 0.32 },
      ];
      ringConfigs.forEach((cfg) => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(cfg.r, cfg.tube, 8, 80),
          new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: cfg.opacity })
        );
        ring.setRotationFromAxisAngle(cfg.axis, cfg.tilt);
        scene.add(ring);
        rings.push({ mesh: ring, axis: cfg.axis, speed: cfg.speed });
      });

      const tracer = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x60a5fa, metalness: 0.9, roughness: 0.05 })
      );
      scene.add(tracer);

      // ── Floating zinc particles ──
      const pCount = 180;
      const pPos = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        pPos[i * 3] = (Math.random() - 0.5) * 5;
        pPos[i * 3 + 1] = (Math.random() - 0.5) * 5;
        pPos[i * 3 + 2] = (Math.random() - 0.5) * 3;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
      scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xa1a1aa, size: 0.018, transparent: true, opacity: 0.4 })));

      // ── Animation loop ──
      let t = 0;
      const ring1Radius = 1.9;

      const animate = () => {
        raf = requestAnimationFrame(animate);
        t += 0.009;
        dnaGroup.rotation.y = t * 0.45;
        dnaGroup.position.y = Math.sin(t * 0.7) * 0.12;
        armGroup.rotation.z = -0.18 + Math.sin(t * 0.5) * 0.06;
        armGroup.position.y = 0.2 + Math.sin(t * 0.6) * 0.1;
        rings.forEach((r) => { r.mesh.rotateOnAxis(r.axis, r.speed * 0.013); });
        tracer.position.x = Math.cos(t * 0.55) * ring1Radius;
        tracer.position.y = Math.sin(t * 0.55) * ring1Radius * 0.38;
        tracer.position.z = Math.sin(t * 0.55) * ring1Radius * 0.12;
        renderer.render(scene, camera);
      };
      animate();

      cleanupFn = () => {
        cancelAnimationFrame(raf);
        renderer.dispose();
        pGeo.dispose();
      };
    });

    return () => cleanupFn?.();
  }, []);

  /* ── GSAP entrance ── */
  useEffect(() => {
    import("gsap").then(({ gsap }) => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      tl.fromTo(sidebarRef.current, { x: -56, opacity: 0 }, { x: 0, opacity: 1, duration: 0.75 })
        .fromTo(".sb-logo", { y: -18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, "-=0.45")
        .fromTo(".nav-link", { x: -20, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.07, duration: 0.38 }, "-=0.3")
        .fromTo(".main-shell", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55 }, "-=0.35")
        .fromTo(".stat-pill", { y: 12, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.06, duration: 0.3 }, "-=0.2")
        .fromTo(".topbar-auth-btn", { scale: 0.88, opacity: 0 }, { scale: 1, opacity: 1, stagger: 0.08, duration: 0.4, ease: "back.out(1.5)" }, "-=0.3");
    });
  }, []);

  /* ── Nav hover GSAP ── */
  const onNavEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    import("gsap").then(({ gsap }) =>
      gsap.to(e.currentTarget, { x: 6, duration: 0.18, ease: "power2.out" })
    );
  };
  const onNavLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    import("gsap").then(({ gsap }) =>
      gsap.to(e.currentTarget, { x: 0, duration: 0.45, ease: "elastic.out(1,0.45)" })
    );
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard",     icon: "▣" },
    { href: "/checkin",   label: "Daily Check-in", icon: "◫" },
    { href: "/exercises", label: "My Exercises",   icon: "◉" },
    { href: "/progress",  label: "Progress",       icon: "◎" },
    { href: "/chat",      label: "Chat with AI",   icon: "◈" },
    { href: "/alerts",    label: "Alerts",         icon: "◬" },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    if (hour >= 17 && hour < 21) return "Good evening";
    return "Good night";
  };

  const initials = userName
    ? userName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "GU";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          /* Zinc scale */
          --zn50:  #fafafa;
          --zn100: #f4f4f5;
          --zn200: #e4e4e7;
          --zn300: #d4d4d8;
          --zn400: #a1a1aa;
          --zn500: #71717a;
          --zn600: #52525b;
          --zn700: #3f3f46;
          --zn800: #27272a;
          --zn900: #18181b;

          /* Navy / Blue scale */
          --navy:      #0f2557;
          --navy-mid:  #1e40af;
          --blue:      #2563eb;
          --blue-mid:  #60a5fa;
          --blue-lt:   #93c5fd;
          --blue-pale: #dbeafe;
          --blue-ultra:#eff6ff;

          /* Surface */
          --bg:      #ffffff;
          --surface: #fafafa;
          --border:  #e4e4e7;
          --text:    #18181b;
          --muted:   #71717a;

          --ff-display: 'Playfair Display', Georgia, serif;
          --ff-body:    'DM Sans', system-ui, sans-serif;
          --radius-sm:  8px;
          --radius-md:  14px;
          --radius-lg:  20px;
          --radius-xl:  28px;

          --shadow-sm:  0 1px 3px rgba(15,37,87,0.06), 0 1px 2px rgba(15,37,87,0.04);
          --shadow-md:  0 4px 16px rgba(15,37,87,0.08), 0 2px 6px rgba(15,37,87,0.04);
          --shadow-lg:  0 12px 40px rgba(15,37,87,0.12), 0 4px 12px rgba(15,37,87,0.06);
          --shadow-blue: 0 8px 28px rgba(37,99,235,0.28), 0 2px 8px rgba(37,99,235,0.14);
          --shadow-navy: 0 8px 28px rgba(15,37,87,0.32), 0 2px 8px rgba(15,37,87,0.16);
        }

        html, body { height: 100%; background: var(--bg); font-family: var(--ff-body); }

        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--zn200); border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--blue-lt); }

        /* ─── KEYFRAMES ──────────────────────────────────────── */
        @keyframes blink {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.72); }
        }
        @keyframes shimmerSlide {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(300%) skewX(-15deg); }
        }
        @keyframes borderPulse {
          0%,100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes floatUp {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes navGlow {
          0% { opacity: 0; transform: scaleX(0); }
          100% { opacity: 1; transform: scaleX(1); }
        }
        @keyframes pillReveal {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes rotateGlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes signupShimmer {
          0% { left: -80%; }
          100% { left: 120%; }
        }
        @keyframes heartbeat {
          0%,100% { transform: scale(1); }
          15% { transform: scale(1.18); }
          30% { transform: scale(1); }
          45% { transform: scale(1.10); }
          60% { transform: scale(1); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotPing {
          0%   { transform: scale(1); opacity: 1; }
          75%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        /* ─── ROOT ─────────────────────────────────────────── */
        .dashboard-root {
          display: flex; height: 100vh;
          background: var(--bg); color: var(--text); overflow: hidden;
        }

        /* Refined dot grid */
        .dot-grid {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image: radial-gradient(circle, var(--zn200) 1px, transparent 1px);
          background-size: 28px 28px; opacity: 0.35;
        }

        /* Soft ambient glow top-right */
        .ambient-glow {
          position: fixed; top: -120px; right: -120px; width: 480px; height: 480px;
          background: radial-gradient(circle, rgba(147,197,253,0.1) 0%, rgba(219,234,254,0.06) 40%, transparent 70%);
          pointer-events: none; z-index: 0; border-radius: 50%;
        }

        /* ─── SIDEBAR ──────────────────────────────────────── */
        .sidebar {
          width: 268px; min-width: 268px;
          background: #ffffff;
          border-right: 1px solid var(--border);
          display: flex; flex-direction: column;
          position: relative; z-index: 20; overflow: hidden;
          box-shadow: 2px 0 24px rgba(15,37,87,0.04);
        }

        /* Top gradient accent bar */
        .sidebar::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, var(--navy) 0%, var(--blue) 55%, var(--blue-lt) 100%);
          z-index: 10;
        }

        /* Pale blue radial glow */
        .sidebar::after {
          content: '';
          position: absolute; top: -100px; right: -100px;
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(147,197,253,0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        /* ── Logo ── */
        .sb-logo {
          padding: 20px 20px 16px;
          border-bottom: 1px solid var(--border);
          position: relative; z-index: 1;
        }
        .logo-link {
          display: flex; align-items: center; gap: 11px; text-decoration: none;
          transition: opacity 0.2s;
        }
        .logo-link:hover { opacity: 0.85; }
        .logo-icon {
          width: 34px; height: 34px; border-radius: 10px;
          background: linear-gradient(135deg, var(--navy) 0%, var(--blue) 100%);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--ff-display); font-size: 15px; font-weight: 600;
          color: #fff; flex-shrink: 0;
          box-shadow: var(--shadow-blue);
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .logo-link:hover .logo-icon {
          transform: rotate(-5deg) scale(1.08);
        }
        .logo-text {
          font-family: var(--ff-display); font-size: 19px; font-weight: 600;
          color: var(--zn900); letter-spacing: -0.3px; line-height: 1;
        }
        .logo-text em { font-style: italic; color: var(--blue); }
        .logo-ver {
          font-family: var(--ff-body); font-size: 9px; letter-spacing: 1.8px;
          text-transform: uppercase; color: var(--blue);
          background: var(--blue-ultra); border: 1px solid var(--blue-pale);
          border-radius: 99px; padding: 2px 8px; font-weight: 600;
          animation: borderPulse 3s ease infinite;
        }

        /* ── 3D Canvas ── */
        .canvas-wrap {
          display: flex; flex-direction: column; align-items: center;
          padding: 6px 0 0; position: relative; flex-shrink: 0; z-index: 1;
          background: linear-gradient(180deg, var(--blue-ultra) 0%, rgba(255,255,255,0) 100%);
          border-bottom: 1px solid var(--border);
        }
        .canvas-wrap canvas { display: block; }
        .canvas-caption {
          font-family: var(--ff-body); font-size: 9px; letter-spacing: 2.8px;
          text-transform: uppercase; color: var(--blue); margin-top: -6px;
          margin-bottom: 8px; opacity: 0.75; font-weight: 600;
        }

        /* ── Nav ── */
        .sb-nav { flex: 1; padding: 10px 12px; overflow-y: auto; position: relative; z-index: 1; }

        .nav-group-label {
          font-size: 8.5px; letter-spacing: 2.2px; text-transform: uppercase;
          color: var(--zn400); font-family: var(--ff-body); font-weight: 600;
          padding: 10px 10px 8px;
        }

        .nav-link {
          display: flex; align-items: center; gap: 11px; padding: 10px 13px;
          border-radius: var(--radius-sm); margin-bottom: 3px;
          font-family: var(--ff-body); font-size: 13.5px; font-weight: 400;
          color: var(--zn500); text-decoration: none;
          transition: background 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s;
          position: relative; border: 1px solid transparent;
          overflow: hidden;
          animation: slideInLeft 0.4s ease both;
        }

        /* Nav shimmer track on hover */
        .nav-link::before {
          content: '';
          position: absolute; top: 0; left: -80%; width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(147,197,253,0.18), transparent);
          transform: skewX(-15deg);
          transition: none; pointer-events: none;
        }
        .nav-link:hover::before {
          animation: shimmerSlide 0.55s ease forwards;
        }

        /* Active left-edge bar */
        .nav-link::after {
          content: '';
          position: absolute; left: 0; top: 20%; bottom: 20%;
          width: 3px; border-radius: 0 3px 3px 0;
          background: var(--blue);
          transform: scaleY(0); transform-origin: center;
          transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
        }
        .nav-link.active::after { transform: scaleY(1); }

        .nav-link:hover {
          background: var(--blue-ultra);
          color: var(--navy);
          border-color: rgba(147,197,253,0.3);
          box-shadow: inset 0 0 0 1px rgba(147,197,253,0.15);
        }
        .nav-link.active {
          background: linear-gradient(135deg, var(--blue-ultra) 0%, rgba(219,234,254,0.6) 100%);
          color: var(--navy);
          border-color: rgba(147,197,253,0.45);
          font-weight: 500;
          box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.8);
        }

        .n-icon {
          font-size: 14px; width: 18px; text-align: center; flex-shrink: 0;
          opacity: 0.55; transition: opacity 0.2s, transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .nav-link.active .n-icon { opacity: 1; color: var(--blue); transform: scale(1.12); }
        .nav-link:hover .n-icon { opacity: 0.85; transform: scale(1.08); }

        .nav-pip {
          position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--blue); opacity: 0; transition: opacity 0.18s;
          box-shadow: 0 0 0 3px var(--blue-pale);
        }
        .nav-link.active .nav-pip {
          opacity: 1;
          animation: blink 2.5s ease infinite;
        }

        /* ── Stat pills ── */
        .sb-stats { display: flex; gap: 6px; padding: 0 12px 12px; position: relative; z-index: 1; }
        .stat-pill {
          flex: 1;
          background: linear-gradient(145deg, var(--blue-ultra) 0%, #fff 100%);
          border: 1px solid var(--blue-pale);
          border-radius: var(--radius-sm); padding: 9px 6px; text-align: center;
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s, border-color 0.2s;
          cursor: default; position: relative; overflow: hidden;
        }
        .stat-pill::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, var(--blue) 0%, var(--blue-lt) 100%);
          opacity: 0; transition: opacity 0.2s;
        }
        .stat-pill:hover { transform: translateY(-3px) scale(1.03); box-shadow: var(--shadow-blue); border-color: var(--blue-lt); }
        .stat-pill:hover::before { opacity: 1; }
        .st-val {
          font-family: var(--ff-display); font-size: 17px; font-weight: 700;
          color: var(--navy); letter-spacing: -0.5px; line-height: 1;
        }
        .st-lbl {
          font-size: 8.5px; color: var(--blue); margin-top: 3px;
          font-family: var(--ff-body); font-weight: 600; letter-spacing: 0.6px;
          text-transform: uppercase;
        }

        /* ── User card ── */
        .sb-foot { padding: 10px 12px 18px; border-top: 1px solid var(--border); position: relative; z-index: 1; }
        .user-card {
          display: flex; align-items: center; gap: 10px;
          background: linear-gradient(135deg, var(--zn50) 0%, var(--blue-ultra) 100%);
          border: 1px solid var(--border);
          border-radius: var(--radius-md); padding: 11px 13px;
          cursor: pointer;
          transition: background 0.22s, border-color 0.22s, transform 0.22s, box-shadow 0.22s;
        }
        .user-card:hover {
          background: linear-gradient(135deg, var(--blue-ultra) 0%, var(--blue-pale) 100%);
          border-color: var(--blue-lt);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: linear-gradient(135deg, var(--navy) 0%, var(--blue) 100%);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--ff-body); font-weight: 700; font-size: 11px;
          color: #fff; flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(15,37,87,0.25);
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
          position: relative;
        }
        .user-card:hover .avatar { transform: scale(1.08) rotate(-4deg); }
        /* Online ring around avatar */
        .avatar-wrap { position: relative; flex-shrink: 0; }
        .avatar-ring {
          position: absolute; inset: -3px; border-radius: 50%;
          border: 2px solid transparent;
          background: linear-gradient(white, white) padding-box,
                      linear-gradient(135deg, #22c55e, #86efac) border-box;
        }

        .u-name {
          font-family: var(--ff-body); font-size: 13px; font-weight: 600;
          color: var(--zn900); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          letter-spacing: -0.1px;
        }
        .u-role { font-size: 10.5px; color: var(--blue); margin-top: 1px; font-weight: 500; }
        .u-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #22c55e; margin-left: auto; flex-shrink: 0; position: relative;
          animation: blink 2.2s ease-in-out infinite;
        }
        /* Ping ring on status dot */
        .u-dot::before {
          content: ''; position: absolute; inset: -3px; border-radius: 50%;
          background: #22c55e; opacity: 0.3;
          animation: dotPing 2s ease infinite;
        }

        /* ─── MAIN SHELL ────────────────────────────────────── */
        .main-shell {
          flex: 1; display: flex; flex-direction: column;
          overflow: hidden; position: relative; z-index: 1;
        }

        /* ── Topbar ── */
        .topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 32px;
          background: rgba(255,255,255,0.97);
          backdrop-filter: blur(20px) saturate(1.4);
          border-bottom: 1px solid var(--border);
          flex-shrink: 0; position: relative; z-index: 10;
          box-shadow: 0 1px 0 rgba(0,0,0,0.03), 0 4px 16px rgba(15,37,87,0.04);
        }

        .topbar::after {
          content: '';
          position: absolute; bottom: -1px; left: 0; width: 90px; height: 2px;
          background: linear-gradient(90deg, var(--navy) 0%, var(--blue) 60%, transparent 100%);
        }

        .page-heading {
          font-family: var(--ff-display); font-size: 22px;
          font-weight: 600; color: var(--zn900); letter-spacing: -0.3px; line-height: 1.2;
        }
        .page-heading em { font-style: italic; color: var(--blue); }
        .page-sub {
          font-family: var(--ff-body); font-size: 12px; color: var(--zn400);
          margin-top: 3px; font-weight: 400; letter-spacing: 0.1px;
        }

        .tb-right { display: flex; align-items: center; gap: 8px; }

        .time-pill {
          font-family: var(--ff-body); font-size: 12.5px; font-weight: 600;
          color: var(--navy); background: var(--blue-ultra);
          border: 1px solid var(--blue-pale); border-radius: 99px; padding: 6px 15px;
          letter-spacing: 0.3px; transition: box-shadow 0.2s;
        }
        .time-pill:hover { box-shadow: var(--shadow-blue); }

        .status-badge {
          display: flex; align-items: center; gap: 6px;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 1px solid #86efac; border-radius: 99px; padding: 5px 13px 5px 9px;
          font-family: var(--ff-body); font-size: 11.5px; font-weight: 600; color: #166534;
          letter-spacing: 0.1px;
        }
        .status-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #22c55e; position: relative;
        }
        .status-dot::after {
          content: ''; position: absolute; inset: -3px; border-radius: 50%;
          background: #22c55e; opacity: 0.25; animation: dotPing 1.8s ease infinite;
        }



        /* ─── LOGIN / SIGNUP BUTTONS ─────────────────────────── */

        /* Login — sharp outlined with navy ink */
        .btn-login {
          display: inline-flex; align-items: center; gap: 7px;
          font-family: var(--ff-body); font-size: 13px; font-weight: 600;
          letter-spacing: 0.3px; color: var(--navy);
          background: transparent;
          border: 1.5px solid var(--navy);
          border-radius: 6px;
          padding: 8px 20px;
          cursor: pointer; text-decoration: none;
          position: relative; overflow: hidden;
          transition: color 0.3s, background 0.3s, box-shadow 0.3s, transform 0.2s;
        }
        /* Ink fill sweep on hover */
        .btn-login::before {
          content: '';
          position: absolute; inset: 0;
          background: var(--navy);
          transform: translateX(-101%);
          transition: transform 0.32s cubic-bezier(0.76,0,0.24,1);
          z-index: 0;
        }
        .btn-login:hover::before { transform: translateX(0); }
        .btn-login > * { position: relative; z-index: 1; }
        .btn-login:hover {
          color: #fff;
          box-shadow: var(--shadow-navy);
          transform: translateY(-2px);
        }
        .btn-login:active { transform: translateY(0) scale(0.98); }

        /* Signup — gradient fill with animated shimmer */
        .btn-signup {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: var(--ff-body); font-size: 13px; font-weight: 700;
          letter-spacing: 0.4px; color: #fff;
          background: linear-gradient(115deg, var(--navy) 0%, var(--blue) 55%, #38bdf8 100%);
          background-size: 200% 100%; background-position: 100% 0;
          border: none; border-radius: 6px;
          padding: 8.5px 22px;
          cursor: pointer; text-decoration: none;
          position: relative; overflow: hidden;
          transition: background-position 0.5s ease, box-shadow 0.3s, transform 0.2s;
          box-shadow: var(--shadow-blue);
        }
        /* Shimmer sweep */
        .btn-signup::after {
          content: '';
          position: absolute; top: 0; left: -80%; width: 55%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
          transform: skewX(-15deg);
          animation: signupShimmer 2.2s ease-in-out infinite;
          pointer-events: none;
        }
        /* Top highlight edge */
        .btn-signup::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: rgba(255,255,255,0.35);
          border-radius: 6px 6px 0 0;
        }
        .btn-signup:hover {
          background-position: 0% 0;
          box-shadow: 0 10px 36px rgba(37,99,235,0.38), 0 4px 12px rgba(37,99,235,0.2);
          transform: translateY(-2px) scale(1.02);
        }
        .btn-signup:active { transform: translateY(0) scale(0.98); }
        .btn-signup > span { position: relative; z-index: 1; }

        /* Arrow icon inside signup */
        .btn-signup-arrow {
          display: inline-flex; align-items: center; justify-content: center;
          width: 18px; height: 18px; border-radius: 50%;
          background: rgba(255,255,255,0.2);
          font-size: 11px; transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
          position: relative; z-index: 1;
        }
        .btn-signup:hover .btn-signup-arrow { transform: translateX(3px) scale(1.1); }

        /* Logout — elegant red outlined */
        .btn-logout {
          display: inline-flex; align-items: center; gap: 7px;
          font-family: var(--ff-body); font-size: 13px; font-weight: 600;
          letter-spacing: 0.3px; color: #ef4444;
          background: transparent;
          border: 1.5px solid #ef4444;
          border-radius: 6px;
          padding: 8px 20px;
          cursor: pointer; text-decoration: none;
          position: relative; overflow: hidden;
          transition: color 0.3s, background 0.3s, box-shadow 0.3s, transform 0.2s;
        }
        .btn-logout::before {
          content: '';
          position: absolute; inset: 0;
          background: #ef4444;
          transform: translateX(-101%);
          transition: transform 0.32s cubic-bezier(0.76,0,0.24,1);
          z-index: 0;
        }
        .btn-logout:hover::before { transform: translateX(0); }
        .btn-logout > * { position: relative; z-index: 1; }
        .btn-logout:hover {
          color: #fff;
          box-shadow: 0 8px 28px rgba(239,68,68,0.32), 0 2px 8px rgba(239,68,68,0.16);
          transform: translateY(-2px);
        }
        .btn-logout:active { transform: translateY(0) scale(0.98); }

        /* Auth buttons group in topbar */
        .auth-btns {
          display: flex; align-items: center; gap: 8px;
        }

        /* ── Main content area ── */
        .main-content { flex: 1; overflow-y: auto; padding: 28px 32px; position: relative; }

        .date-strip {
          font-family: var(--ff-body); font-size: 11px; color: var(--zn400);
          letter-spacing: 0.6px; margin-bottom: 26px;
          display: flex; align-items: center; gap: 10px; font-weight: 500;
        }
        .date-strip::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, var(--border), transparent); }

        /* Subtle blue ambient behind content */
        .main-content::before {
          content: '';
          position: fixed; top: 0; right: 0;
          width: 480px; height: 480px;
          background: radial-gradient(circle, rgba(147,197,253,0.07) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }

        .page-body { position: relative; z-index: 1; }

        /* ── Topbar auth button container ── */
        .topbar-auth-btn { display: inline-flex; }
      `}</style>

      <div className="dashboard-root">
        <div className="dot-grid" />
        <div className="ambient-glow" />

        {/* ── SIDEBAR ── */}
        <aside className="sidebar" ref={sidebarRef}>
          {/* Logo */}
          <div className="sb-logo">
            <Link href="/dashboard" className="logo-link">
              <div className="logo-icon">R</div>
              <span className="logo-text">Rehab<em>AI</em></span>
              <span className="logo-ver">v2</span>
            </Link>
          </div>

          {/* Medical 3D Canvas */}
          <div className="canvas-wrap">
            <canvas ref={canvasRef} width={240} height={240} />
            <span className="canvas-caption">Recovery Core</span>
          </div>

          {/* Nav links */}
          <nav className="sb-nav">
            <div className="nav-group-label">Navigation</div>
            {navLinks.map(({ href, label, icon }, idx) => (
              <Link
                key={href}
                href={href}
                className={`nav-link${activeNav === href ? " active" : ""}`}
                style={{ animationDelay: `${idx * 0.05}s` }}
                onClick={() => setActiveNav(href)}
                onMouseEnter={(e) => { setHoveredNav(href); onNavEnter(e); }}
                onMouseLeave={(e) => { setHoveredNav(null); onNavLeave(e); }}
              >
                <span className="n-icon">{icon}</span>
                {label}
                <span className="nav-pip" />
              </Link>
            ))}
          </nav>

          {/* Quick stats */}
          <div className="sb-stats">
            {[
              { val: "92", lbl: "Score" },
              { val: "14", lbl: "Streak" },
              { val: "6/7", lbl: "Done" },
            ].map((s) => (
              <div className="stat-pill" key={s.lbl}>
                <div className="st-val">{s.val}</div>
                <div className="st-lbl">{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* User card */}
          <div className="sb-foot">
            <div className="user-card">
              <div className="avatar-wrap">
                <div className="avatar-ring" />
                <div className="avatar">{initials}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="u-name">{userName}</div>
                <div className="u-role">Patient · Active</div>
              </div>
              <div className="u-dot" />
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="main-shell">
          {/* Topbar */}
          <div className="topbar">
            <div>
              <h1 className="page-heading">
                {getGreeting()}, <em>{userName.split(" ")[0]}</em>
              </h1>
              <p className="page-sub">Your recovery is progressing well — keep it up.</p>
            </div>

            <div className="tb-right">
              <span className="time-pill">{time}</span>

              <div className="status-badge">
                <span className="status-dot" />
                Optimal
              </div>

              {/* ── Auth Buttons ── */}
              <div className="auth-btns">
                <Link href="/login" className="btn-login topbar-auth-btn">
                  <span>Log in</span>
                </Link>
                <Link href="/register" className="btn-signup topbar-auth-btn">
                  <span>Register</span>
                  <span className="btn-signup-arrow">→</span>
                </Link>
                <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn-logout topbar-auth-btn">
                  <span>Logout</span>
                </button>
              </div>

            </div>
          </div>

          {/* Page content */}
          <div className="main-content">
            <div className="date-strip">{date}</div>
            <div className="page-body">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}