"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

declare global {
  interface Window { THREE: any; gsap: any; }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = () => resolve(); s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function LoginPage() {
  const router = useRouter();
  
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const cardRef    = useRef<HTMLDivElement>(null);
  const titleRef   = useRef<HTMLHeadingElement>(null);
  const field2Ref  = useRef<HTMLDivElement>(null);
  const field3Ref  = useRef<HTMLDivElement>(null);
  const btnRef     = useRef<HTMLButtonElement>(null);
  const rightRef   = useRef<HTMLDivElement>(null);

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [ready, setReady]       = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  /* ── load libs ── */
  useEffect(() => {
    (async () => {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js");
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js");
      setReady(true);
    })();
  }, []);

  /* ── Three.js scene ── */
  useEffect(() => {
    if (!ready || !canvasRef.current) return;
    const THREE = window.THREE;
    const gsap  = window.gsap;
    const canvas = canvasRef.current;

    const W = canvas.clientWidth, H = canvas.clientHeight;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
    camera.position.set(0, 0, 9);

    /* lighting */
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const sun = new THREE.DirectionalLight(0xf59e0b, 2.8);
    sun.position.set(6, 8, 5); sun.castShadow = true;
    scene.add(sun);
    const rim1 = new THREE.PointLight(0x38bdf8, 3.5, 30);
    rim1.position.set(-7, 4, 2); scene.add(rim1);
    const rim2 = new THREE.PointLight(0xf472b6, 2.5, 25);
    rim2.position.set(5, -6, 1); scene.add(rim2);
    scene.add(new THREE.PointLight(0xffffff, 1.2, 40));

    const master = new THREE.Group();
    scene.add(master);

    /* wireframe icosahedron */
    const ico = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.8, 1),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, wireframe: true, transparent: true, opacity: 0.15 })
    );
    master.add(ico);
    gsap.to(ico.rotation, { x: Math.PI*2, y: Math.PI*2, duration: 22, repeat: -1, ease: "none" });

    /* inner solid ico */
    const icoS = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.7, 0),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.1 })
    );
    master.add(icoS);
    gsap.to(icoS.rotation, { x: -Math.PI*2, z: Math.PI*2, duration: 15, repeat: -1, ease: "none" });

    /* DNA helix */
    const helix = new THREE.Group();
    master.add(helix);
    const m1 = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.2 });
    const m2 = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.7, roughness: 0.2 });
    for (let i = 0; i < 28; i++) {
      const t = (i / 27) * Math.PI * 4;
      const r = 3.6, y = (i / 27) * 7 - 3.5;
      const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), m1);
      s1.position.set(Math.cos(t)*r, y, Math.sin(t)*r); helix.add(s1);
      const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), m2);
      s2.position.set(Math.cos(t+Math.PI)*r, y, Math.sin(t+Math.PI)*r); helix.add(s2);
      const mid = new THREE.Vector3(0, y, 0);
      const len = new THREE.Vector3(
        Math.cos(t+Math.PI)*r - Math.cos(t)*r, 0,
        Math.sin(t+Math.PI)*r - Math.sin(t)*r
      ).length();
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, len, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.4, transparent: true, opacity: 0.15 })
      );
      rod.position.copy(mid);
      rod.lookAt(new THREE.Vector3(Math.cos(t)*r, y, Math.sin(t)*r));
      rod.rotateX(Math.PI/2); helix.add(rod);
    }
    gsap.to(helix.rotation, { y: Math.PI*2, duration: 18, repeat: -1, ease: "none" });

    /* orbiting rings */
    [
      { r:4.5, t:0.04, c:0xf59e0b, rx:Math.PI/3, ry:0,         spd:12, op:0.45 },
      { r:5.5, t:0.03, c:0x38bdf8, rx:Math.PI/5, ry:Math.PI/4, spd:17, op:0.28 },
      { r:6.2, t:0.025,c:0xf472b6, rx:-Math.PI/4,ry:Math.PI/3, spd:21, op:0.18 },
    ].forEach((cfg, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(cfg.r, cfg.t, 16, 120),
        new THREE.MeshStandardMaterial({ color: cfg.c, metalness: 0.8, roughness: 0.1, transparent: true, opacity: cfg.op })
      );
      ring.rotation.x = cfg.rx; ring.rotation.y = cfg.ry;
      master.add(ring);
      gsap.to(ring.rotation, { z: (i%2===0?1:-1)*Math.PI*2, duration: cfg.spd*6, repeat:-1, ease:"none" });
    });

    /* crystals */
    const cgeos = [
      new THREE.OctahedronGeometry(0.28), new THREE.TetrahedronGeometry(0.32),
      new THREE.OctahedronGeometry(0.20), new THREE.IcosahedronGeometry(0.22,0),
      new THREE.OctahedronGeometry(0.18), new THREE.TetrahedronGeometry(0.25),
      new THREE.OctahedronGeometry(0.15), new THREE.IcosahedronGeometry(0.18,0),
    ];
    const ccols = [0xf59e0b,0x38bdf8,0xf472b6,0x34d399,0xa78bfa,0xfb923c,0x22d3ee,0xe879f9];
    cgeos.forEach((geo, i) => {
      const mat = new THREE.MeshStandardMaterial({ color: ccols[i], metalness: 0.85, roughness: 0.1, transparent: true, opacity: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      const angle = (i/cgeos.length)*Math.PI*2, dist = 4.8+Math.random()*1.5;
      mesh.position.set(Math.cos(angle)*dist, (Math.random()-0.5)*5, Math.sin(angle)*dist*0.6);
      master.add(mesh);
      gsap.to(mesh.position, { y: mesh.position.y+(Math.random()>0.5?1.2:-1.2), duration:2.5+Math.random()*2, repeat:-1, yoyo:true, ease:"sine.inOut", delay:Math.random()*2 });
      gsap.to(mesh.rotation, { x:Math.PI*2, y:Math.PI*2, duration:5+Math.random()*4, repeat:-1, ease:"none" });
      gsap.to(mat, { opacity:0.35, duration:2+Math.random()*2, repeat:-1, yoyo:true, ease:"sine.inOut", delay:Math.random() });
    });

    /* medical cross */
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.2 });
    const cross = new THREE.Group();
    cross.add(new THREE.Mesh(new THREE.BoxGeometry(0.9,0.22,0.1), crossMat));
    cross.add(new THREE.Mesh(new THREE.BoxGeometry(0.22,0.9,0.1), crossMat));
    cross.position.set(4.2, 2.5, 1.5); master.add(cross);
    gsap.to(cross.rotation, { y:Math.PI*2, duration:9, repeat:-1, ease:"none" });
    gsap.to(cross.position, { y:3.2, duration:2.8, repeat:-1, yoyo:true, ease:"sine.inOut" });

    /* mouse parallax */
    let mX=0, mY=0, tX=0, tY=0;
    const onMouse = (e: MouseEvent) => {
      mX=(e.clientX/window.innerWidth-0.5)*2;
      mY=(e.clientY/window.innerHeight-0.5)*2;
    };
    window.addEventListener("mousemove", onMouse);
    const onResize = () => {
      camera.aspect=canvas.clientWidth/canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let rafId: number;
    const clock = new THREE.Clock();
    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      tX += (mX-tX)*0.04; tY += (mY-tY)*0.04;
      master.rotation.y = t*0.06+tX*0.22;
      master.rotation.x = Math.sin(t*0.15)*0.12+tY*0.12;
      rim1.position.x = Math.cos(t*0.3)*8; rim1.position.z = Math.sin(t*0.3)*5;
      rim2.position.x = Math.cos(t*0.2+Math.PI)*7; rim2.position.z = Math.sin(t*0.2+Math.PI)*4;
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, [ready]);

  /* ── GSAP entrance ── */
  useEffect(() => {
    if (!ready) return;
    const gsap = window.gsap;
    gsap.timeline({ defaults: { ease: "expo.out" } })
      .fromTo(cardRef.current,  { y:60, opacity:0, rotateX:8 }, { y:0, opacity:1, rotateX:0, duration:1.1 }, 0.1)
      .fromTo(rightRef.current, { x:40, opacity:0 },            { x:0, opacity:1, duration:0.9 }, 0.35)
      .fromTo(titleRef.current, { y:-24, opacity:0 },           { y:0, opacity:1, duration:0.7 }, 0.45)
      .fromTo([field2Ref.current,field3Ref.current],
              { y:18, opacity:0 }, { y:0, opacity:1, stagger:0.1, duration:0.55 }, 0.6)
      .fromTo(btnRef.current,   { y:10, opacity:0, scale:0.95 },{ y:0, opacity:1, scale:1, duration:0.5 }, 1.05);
  }, [ready]);

  /* ── submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMsg("");
    window.gsap?.to(btnRef.current,{ scaleX:0.97,scaleY:0.96,duration:0.1,yoyo:true,repeat:1 });
    
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setErrorMsg("Invalid credentials. Please try again.");
      } else {
        setSuccess(true);
        window.gsap?.fromTo(".success-overlay",{ opacity:0,scale:0.94 },{ opacity:1,scale:1,duration:0.55,ease:"back.out(1.5)" });
        
        setTimeout(() => {
          router.push("/progress");
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const onFocus = (el: HTMLInputElement) =>
    window.gsap?.to(el,{ scale:1.012,duration:0.2,ease:"power2.out",transformOrigin:"left center" });
  const onBlur  = (el: HTMLInputElement) =>
    window.gsap?.to(el,{ scale:1,duration:0.2,ease:"power2.in" });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Geist:wght@300;400;500;600&display=swap');

        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

        :root{
          --amber:#f59e0b; --amber-d:#d97706; --amber-l:#fef3c7;
          --blue:#38bdf8; --ink:#0c2d6b; --ink2:#1e4d8c;
          --mute:#64748b; --border:#e2e8f0; --white:#ffffff;
          --fh:'Cormorant Garamond',serif; --fb:'Geist',sans-serif;
        }

        .root{
          position:relative; width:100vw; min-height:100vh;
          background:#ffffff;
          display:flex; align-items:center; justify-content:center;
          font-family:var(--fb); overflow:hidden;
        }

        .bg-canvas{
          position:fixed; inset:0; width:100%; height:100%;
          z-index:0; pointer-events:none; opacity:0.2;
        }

        .grid-overlay{
          position:fixed; inset:0; z-index:1; pointer-events:none;
          background-image:
            linear-gradient(rgba(56,189,248,0.045) 1px,transparent 1px),
            linear-gradient(90deg,rgba(56,189,248,0.045) 1px,transparent 1px);
          background-size:52px 52px;
        }

        .card{
          position:relative; z-index:10;
          display:grid; grid-template-columns:1fr 1fr;
          width:min(900px,96vw); min-height:580px;
          background:#fff;
          border:1.5px solid var(--border);
          box-shadow:0 2px 4px rgba(0,0,0,0.04),0 12px 40px rgba(0,0,0,0.08),0 40px 80px rgba(0,0,0,0.05);
          opacity:0;
        }

        .left{
          padding:3.5rem 3rem 3rem;
          display:flex; flex-direction:column;
          border-right:1.5px solid var(--border);
        }

        .brand-tag{
          display:inline-flex; align-items:center; gap:8px;
          margin-bottom:2.2rem;
          font-family:var(--fb); font-size:0.67rem; font-weight:600;
          letter-spacing:0.18em; text-transform:uppercase; color:var(--amber);
        }
        .brand-line{ width:28px; height:1.5px; background:var(--amber); }

        .form-title{
          font-family:var(--fh); font-size:2.6rem; font-weight:600;
          color:var(--ink); line-height:1.08; letter-spacing:-0.02em;
          margin-bottom:0.5rem; opacity:0;
        }
        .form-sub{ font-size:0.8rem; color:var(--mute); margin-bottom:2.2rem; font-weight:300; }

        .fields{ display:flex; flex-direction:column; gap:1.2rem; }

        .field{ display:flex; flex-direction:column; gap:0.4rem; opacity:0; }

        .label{
          font-size:0.66rem; font-weight:600;
          letter-spacing:0.14em; text-transform:uppercase; color:var(--ink2);
        }

        .iw{ position:relative; }

        .input{
          width:100%; padding:0.78rem 1rem 0.78rem 2.55rem;
          border:1.5px solid var(--border); border-radius:0;
          font-family:var(--fb); font-size:0.875rem; font-weight:300;
          color:var(--ink); background:#fff; outline:none;
          transition:border-color 0.2s, box-shadow 0.2s;
          -webkit-appearance:none;
        }
        .input::placeholder{ color:#c0cad5; }
        .input:focus{
          border-color:var(--amber);
          box-shadow:inset 4px 0 0 var(--amber);
        }

        .ico{
          position:absolute; left:0.82rem; top:50%; transform:translateY(-50%);
          width:15px; height:15px; color:#c0cad5; pointer-events:none;
          transition:color 0.2s;
        }
        .input:focus + .ico{ color:var(--amber); }

        .btn{
          width:100%; padding:0.9rem 1rem;
          background:var(--ink); color:#fff;
          font-family:var(--fb); font-size:0.78rem; font-weight:600;
          letter-spacing:0.14em; text-transform:uppercase;
          border:none; border-radius:0; cursor:pointer;
          margin-top:1.5rem; display:flex; align-items:center; justify-content:center; gap:0.55rem;
          position:relative; overflow:hidden; opacity:0;
          transition:color 0.2s;
        }
        .btn::after{
          content:''; position:absolute; inset:0;
          background:var(--amber); transform:translateX(-101%);
          transition:transform 0.35s cubic-bezier(0.77,0,0.18,1); z-index:0;
        }
        .btn:hover::after{ transform:translateX(0); }
        .btn span{ position:relative; z-index:1; }
        .btn:disabled{ opacity:0.5; cursor:not-allowed; }
        .btn:disabled::after{ display:none; }

        .sr{ margin-top:1.3rem; font-size:0.78rem; color:var(--mute); text-align:center; }
        .sr a{ color:var(--amber); font-weight:500; text-decoration:none; cursor:pointer; }
        .error-msg{ color: #ef4444; font-size: 0.8rem; text-align: center; margin-bottom: 1rem; font-weight: 500; }

        .right{
          position:relative; background:var(--ink);
          display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          padding:3rem 2.5rem; overflow:hidden; opacity:0;
        }
        .right::before{
          content:''; position:absolute; top:0; left:0; right:0;
          height:3px; background:var(--amber);
        }

        .rgrid{
          position:absolute; inset:0; pointer-events:none;
          background-image:
            linear-gradient(rgba(56,189,248,0.07) 1px,transparent 1px),
            linear-gradient(90deg,rgba(56,189,248,0.07) 1px,transparent 1px);
          background-size:38px 38px;
        }

        .rc{ position:relative; z-index:2; text-align:center; }

        .ri{
          width:80px; height:80px;
          border:1.5px solid rgba(56,189,248,0.4);
          display:flex; align-items:center; justify-content:center;
          font-size:2.1rem; margin:0 auto 1.8rem; position:relative;
          animation:floatY 3.5s ease-in-out infinite;
        }
        .ri::before{
          content:''; position:absolute; inset:-7px;
          border:1px solid rgba(56,189,248,0.18);
          animation:spinSlow 10s linear infinite;
        }
        .ri::after{
          content:''; position:absolute; inset:-14px;
          border:1px solid rgba(56,189,248,0.08);
          animation:spinSlow 16s linear infinite reverse;
        }

        .rt{
          font-family:var(--fh); font-size:2rem; font-weight:600;
          color:#fff; letter-spacing:-0.01em; line-height:1.12;
          margin-bottom:0.7rem;
        }
        .rs{ font-size:0.78rem; color:rgba(255,255,255,0.38); line-height:1.65; max-width:210px; margin:0 auto 2rem; font-weight:300; }

        .stats{ display:flex; flex-direction:column; gap:0.6rem; width:100%; }
        .stat{
          display:flex; align-items:center; gap:0.75rem;
          padding:0.62rem 0.95rem;
          border:1px solid rgba(255,255,255,0.07);
          background:rgba(255,255,255,0.03);
        }
        .sd{ width:6px; height:6px; flex-shrink:0; }
        .sl{ font-size:0.73rem; color:rgba(255,255,255,0.45); font-weight:300; letter-spacing:0.04em; }
        .sv{ margin-left:auto; font-size:0.76rem; font-weight:600; color:var(--amber); }

        .corner{ position:absolute; width:22px; height:22px; border-color:rgba(56,189,248,0.35); border-style:solid; }
        .ctl{ top:1rem; left:1rem;  border-width:1.5px 0 0 1.5px; }
        .ctr{ top:1rem; right:1rem; border-width:1.5px 1.5px 0 0; }
        .cbl{ bottom:1rem; left:1rem;  border-width:0 0 1.5px 1.5px; }
        .cbr{ bottom:1rem; right:1rem; border-width:0 1.5px 1.5px 0; }

        .close{
          position:absolute; top:1rem; right:1rem;
          width:28px; height:28px; border:1.5px solid var(--border);
          background:none; cursor:pointer; font-size:13px;
          color:var(--mute); z-index:20;
          display:flex; align-items:center; justify-content:center;
          transition:border-color 0.2s,color 0.2s;
        }
        .close:hover{ border-color:var(--amber); color:var(--amber); }

        .success-overlay{
          position:absolute; inset:0; background:#fff;
          display:flex; flex-direction:column;
          align-items:center; justify-content:center; gap:1rem;
          z-index:30; opacity:0;
        }
        .sm{
          width:64px; height:64px; background:var(--amber);
          display:flex; align-items:center; justify-content:center;
          font-size:1.8rem; color:#fff;
          animation:popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .st{ font-family:var(--fh); font-size:1.9rem; font-weight:600; color:var(--ink); }
        .ss{ font-size:0.8rem; color:var(--mute); }

        .spin{
          width:16px; height:16px;
          border:2px solid rgba(255,255,255,0.3); border-top-color:#fff;
          border-radius:50%; animation:spinF 0.7s linear infinite;
        }

        @keyframes floatY{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes spinSlow{ to{transform:rotate(360deg)} }
        @keyframes spinF{ to{transform:rotate(360deg)} }
        @keyframes popIn{ from{transform:scale(0) rotate(-15deg)} to{transform:scale(1) rotate(0deg)} }

        @media(max-width:640px){
          .card{ grid-template-columns:1fr; }
          .right{ display:none; }
          .left{ padding:2.5rem 1.5rem; }
        }
      `}</style>

      <div className="root">
        <canvas ref={canvasRef} className="bg-canvas" />
        <div className="grid-overlay" />

        <div className="card" ref={cardRef}>
          <button className="close">✕</button>

          <div className="left">
            <div className="brand-tag">
              <span className="brand-line" />
              Like Hire Medical
            </div>

            <h1 className="form-title" ref={titleRef}>
              Welcome<br />Back.
            </h1>
            <p className="form-sub">Sign in to your account to continue</p>
            
            {errorMsg && <div className="error-msg">{errorMsg}</div>}

            <form onSubmit={handleSubmit}>
              <div className="fields">
                <div ref={field2Ref} className="field">
                  <label className="label">Email Address</label>
                  <div className="iw">
                    <input className="input" type="email" placeholder="Enter your email address"
                      value={email} onChange={e=>setEmail(e.target.value)}
                      onFocus={e=>onFocus(e.currentTarget)} onBlur={e=>onBlur(e.currentTarget)} required />
                    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="2" y="4" width="20" height="16" rx="0"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </div>
                </div>

                <div ref={field3Ref} className="field">
                  <label className="label">Password</label>
                  <div className="iw">
                    <input className="input" type="password" placeholder="Enter your password"
                      value={password} onChange={e=>setPassword(e.target.value)}
                      onFocus={e=>onFocus(e.currentTarget)} onBlur={e=>onBlur(e.currentTarget)} required />
                    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="11" width="18" height="11" rx="0"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                </div>
              </div>

              <button ref={btnRef} className="btn" type="submit" disabled={loading}>
                {loading
                  ? <><span className="spin"/><span>Processing…</span></>
                  : <span>Sign In</span>
                }
              </button>
            </form>

            <p className="sr">Don't have an account? <a href="/register">Sign Up</a></p>
          </div>

          <div className="right" ref={rightRef}>
            <div className="rgrid"/>
            <div className="corner ctl"/><div className="corner ctr"/>
            <div className="corner cbl"/><div className="corner cbr"/>

            <div className="rc">
              <div className="ri">🩺</div>
              <h2 className="rt">Trusted<br/>Healthcare<br/>Network</h2>
              <p className="rs">Connect with certified professionals trusted by thousands worldwide.</p>

              <div className="stats">
                {[
                  { d:"#34d399", l:"Verified Doctors",  v:"12,400+" },
                  { d:"#38bdf8", l:"Success Rate",      v:"98.4%"   },
                  { d:"#f59e0b", l:"Countries Covered", v:"54"      },
                  { d:"#f472b6", l:"24 / 7 Support",    v:"Active"  },
                ].map(s=>(
                  <div className="stat" key={s.l}>
                    <span className="sd" style={{background:s.d}}/>
                    <span className="sl">{s.l}</span>
                    <span className="sv">{s.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {success && (
            <div className="success-overlay">
              <div className="sm">✓</div>
              <p className="st">Welcome back.</p>
              <p className="ss">Login successful — redirecting…</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}