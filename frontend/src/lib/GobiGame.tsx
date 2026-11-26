import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Avatar from "./Avatar";
import Gem from "./Gem";

/**
 * Launch Gobi: a cauliflower in a slingshot. Pull it back, let go, and try to hit the picture of the person
 * on the Pillar of Shame (it drifts from side to side). A hit splats and pays 10 gems; a miss can be tried again.
 * Everything is drawn in one SVG (360 × 600 units) so it scales to any screen.
 */
const W = 360, H = 600;
const REST = { x: 180, y: 470 };     // the cauliflower sits here in the sling
const FORK = [{ x: 150, y: 452 }, { x: 210, y: 452 }];
const MAX_PULL = 115;
const POWER = 7.2;                   // launch speed per unit pulled (units / s)
const GRAVITY = 520;                 // units / s²
const TARGET_R = 40, GOBI_R = 20;

export function Cauliflower({ size = 40 }: { size?: number }) {
  return (
    <g>
      <g fill="#4caf50" stroke="#2e7d32" strokeWidth="1.2">
        <path d={`M${-size * .55} ${size * .1} Q${-size * .9} ${-size * .2} ${-size * .45} ${-size * .55} Q${-size * .2} ${-size * .1} ${-size * .55} ${size * .1}Z`} />
        <path d={`M${size * .55} ${size * .1} Q${size * .9} ${-size * .2} ${size * .45} ${-size * .55} Q${size * .2} ${-size * .1} ${size * .55} ${size * .1}Z`} />
        <path d={`M${-size * .5} ${size * .15} Q0 ${size * .75} ${size * .5} ${size * .15} Q0 ${size * .4} ${-size * .5} ${size * .15}Z`} fill="#66bb6a" />
      </g>
      {[[0, -.18, .3], [-.24, -.04, .24], [.24, -.04, .24], [-.12, .14, .22], [.12, .14, .22], [0, -.42, .2], [-.3, -.3, .18], [.3, -.3, .18]].map(([x, y, r], i) => (
        <circle key={i} cx={x * size} cy={y * size} r={r * size} fill={i % 2 ? "#fffbea" : "#fff6d8"} stroke="#e8dcb0" strokeWidth="1" />
      ))}
      <g fill="#efe3bb" opacity=".8">{[[-.06, -.22], [.08, -.12], [-.2, 0], [.2, .02], [0, .08]].map(([x, y], i) => <circle key={i} cx={x * size} cy={y * size} r={size * .045} />)}</g>
    </g>
  );
}

type Phase = "aim" | "fly" | "hit" | "miss" | "done";

export default function GobiGame({ name, avatar, frame, color, onHit, onClose }: {
  name: string; avatar: string; frame: string; color: string; onHit: () => Promise<number>; onClose: () => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [gobi, setGobi] = useState(REST);
  const [phase, setPhase] = useState<Phase>("aim");
  const [target, setTarget] = useState({ x: W / 2, y: 120 });
  const [won, setWon] = useState(0);
  const [error, setError] = useState("");
  const dragging = useRef(false);
  const phaseRef = useRef<Phase>("aim");
  phaseRef.current = phase;
  const targetRef = useRef(target);
  targetRef.current = target;

  // The target drifts from side to side, a little faster after each miss.
  const misses = useRef(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      if (phaseRef.current !== "hit" && phaseRef.current !== "done") {
        const speed = 0.0007 + Math.min(misses.current, 6) * 0.00008;
        setTarget({ x: W / 2 + Math.sin((t - t0) * speed) * 110, y: 120 + Math.sin((t - t0) * speed * 2.3) * 12 });
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toLocal = (e: { clientX: number; clientY: number }) => {
    const s = svg.current, m = s?.getScreenCTM();
    if (!s || !m) return REST;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const pull = (p: { x: number; y: number }) => {
    let dx = p.x - REST.x, dy = p.y - REST.y;
    const d = Math.hypot(dx, dy);
    if (d > MAX_PULL) { dx *= MAX_PULL / d; dy *= MAX_PULL / d; }
    if (dy < -20) dy = -20; // only backwards (down), mostly
    return { x: REST.x + dx, y: REST.y + dy };
  };

  function down(e: React.PointerEvent) {
    if (phase !== "aim") return;
    dragging.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setGobi(pull(toLocal(e)));
  }
  function move(e: React.PointerEvent) {
    if (dragging.current) setGobi(pull(toLocal(e)));
  }
  function up() {
    if (!dragging.current) return;
    dragging.current = false;
    const vx = (REST.x - gobi.x) * POWER, vy = (REST.y - gobi.y) * POWER;
    if (Math.hypot(vx, vy) < 120) { setGobi(REST); return; } // barely pulled: nothing happens
    launch(gobi, vx, vy);
  }

  function launch(from: { x: number; y: number }, vx0: number, vy0: number) {
    setPhase("fly");
    let x = from.x, y = from.y, vx = vx0, vy = vy0, last = performance.now();
    const step = (t: number) => {
      const dt = Math.min(0.033, (t - last) / 1000);
      last = t;
      vy += GRAVITY * dt; x += vx * dt; y += vy * dt;
      setGobi({ x, y });
      const tg = targetRef.current;
      if (Math.hypot(x - tg.x, y - tg.y) < TARGET_R + GOBI_R) { hit({ x, y }); return; }
      if (x < -60 || x > W + 60 || y > H + 60 || y < -200) { miss(); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  async function hit(at: { x: number; y: number }) {
    setGobi(at);
    setPhase("hit");
    try { setWon(await onHit()); } catch (e) { setError(e instanceof Error ? e.message : "Could not save the hit"); }
    window.setTimeout(() => setPhase("done"), 1300);
  }
  function miss() {
    misses.current++;
    setPhase("miss");
    window.setTimeout(() => { setGobi(REST); setPhase("aim"); }, 900);
  }

  // A dotted guide while aiming: where the cauliflower would go for the first moments of flight.
  const guide: { x: number; y: number }[] = [];
  if (phase === "aim" && (gobi.x !== REST.x || gobi.y !== REST.y)) {
    const vx = (REST.x - gobi.x) * POWER, vy = (REST.y - gobi.y) * POWER;
    for (let i = 1; i <= 7; i++) {
      const t = i * 0.06;
      guide.push({ x: gobi.x + vx * t, y: gobi.y + vy * t + 0.5 * GRAVITY * t * t });
    }
  }
  const splat = phase === "hit" || phase === "done";

  return createPortal(
    <div className="gobi" role="dialog" aria-modal="true" aria-label={`Launch a gobi at ${name}`}>
      <div className="gobi-box">
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="gobi-stage" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <defs>
          <linearGradient id="gobi-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7ec8ff" /><stop offset=".7" stopColor="#d8f0ff" /><stop offset="1" stopColor="#f4fbff" /></linearGradient>
          <clipPath id="gobi-target"><circle r={TARGET_R} /></clipPath>
        </defs>
        <rect width={W} height={H} fill="url(#gobi-sky)" />
        {[[60, 70, 1], [280, 50, .8], [200, 230, .7]].map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(${s})`} opacity=".9" className="gobi-cloud" style={{ animationDelay: `${i * -4}s` }}>
            <ellipse rx="34" ry="12" fill="#fff" /><circle cx="-12" cy="-8" r="14" fill="#fff" /><circle cx="10" cy="-10" r="16" fill="#fff" />
          </g>
        ))}
        <path d={`M0 ${H - 70} Q${W / 2} ${H - 100} ${W} ${H - 70} V${H} H0Z`} fill="#7cc46a" />
        <path d={`M0 ${H - 40} Q${W / 2} ${H - 62} ${W} ${H - 40} V${H} H0Z`} fill="#5aa84e" />

        {/* the target: the person on the Pillar of Shame */}
        <g transform={`translate(${target.x} ${target.y})`}>
          <circle r={TARGET_R + 8} fill="#ff4a4a22" stroke="#ff4a4a" strokeWidth="2" strokeDasharray="4 5" className="gobi-aim" />
          <foreignObject x={-TARGET_R - 12} y={-TARGET_R - 12} width={(TARGET_R + 12) * 2} height={(TARGET_R + 12) * 2}>
            <div className="gobi-face"><Avatar avatar={avatar} color={color} frame={frame} size={TARGET_R * 2} /></div>
          </foreignObject>
          <text y={TARGET_R + 30} textAnchor="middle" className="gobi-name">⛓️ {name}</text>
          {splat && <g className="gobi-splat">
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * Math.PI * 2, r = 22 + (i % 3) * 10;
              return <circle key={i} cx={Math.cos(a) * r} cy={Math.sin(a) * r} r={6 + (i % 4) * 2} fill={i % 2 ? "#fffbea" : "#f1e7c4"} stroke="#e0d2a0" strokeWidth="1"
                style={{ ["--dx" as string]: `${Math.cos(a) * 30}px`, ["--dy" as string]: `${Math.sin(a) * 30}px` }} />;
            })}
            <g transform="scale(1.1)"><Cauliflower size={34} /></g>
          </g>}
        </g>

        {/* the slingshot */}
        <path d={`M${REST.x} ${H - 60} V${REST.y + 22} M${REST.x} ${REST.y + 30} L${FORK[0].x} ${FORK[0].y} M${REST.x} ${REST.y + 30} L${FORK[1].x} ${FORK[1].y}`}
          stroke="#7a4a22" strokeWidth="11" strokeLinecap="round" fill="none" />
        {phase === "aim" && <path d={`M${FORK[0].x} ${FORK[0].y} L${gobi.x} ${gobi.y} L${FORK[1].x} ${FORK[1].y}`} stroke="#c0392b" strokeWidth="4" fill="none" strokeLinejoin="round" />}
        {guide.map((g, i) => <circle key={i} cx={g.x} cy={g.y} r={4 - i * 0.4} fill="#ffffff" stroke="#2a6ad0" strokeWidth="1" opacity={1 - i * 0.12} />)}

        {/* the cauliflower */}
        {!splat && (
          <g transform={`translate(${gobi.x} ${gobi.y}) rotate(${phase === "fly" ? (gobi.x * 3) % 360 : 0})`}
            onPointerDown={down} style={{ touchAction: "none", cursor: phase === "aim" ? "grab" : "default" }}>
            <circle r={GOBI_R + 14} fill="transparent" />
            <g className={phase === "aim" ? "gobi-ball" : ""}><Cauliflower size={GOBI_R * 1.7} /></g>
          </g>
        )}
      </svg>

      <div className="gobi-top">
        <b>🥦 Launch Gobi</b>
        <button className="gobi-x" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <p className={`gobi-say${phase === "miss" ? " miss" : ""}`}>
        {phase === "aim" ? <>Pull the cauliflower back and let go to hit <b>{name}</b>!</>
          : phase === "fly" ? "Wheee…" : phase === "miss" ? "Missed! Try again" : null}
      </p>
      {(phase === "hit" || phase === "done") && (
        <div className="gobi-win">
          <b>SPLAT! 🥦</b>
          {error ? <p className="err">{error}</p> : <p>You hit {name}! <span className="gobi-gems">+{won || 10} <Gem /></span></p>}
          {phase === "done" && <button className="primary" onClick={onClose}>Done</button>}
        </div>
      )}
      </div>
    </div>,
    document.body,
  );
}
