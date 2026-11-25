import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Gem from "./Gem";
import GemArt from "./GemArt";
import { Particles } from "./particles";
import { playSound } from "./sounds";
import type { SoundKey } from "../api";

/**
 * The gem reward moment, on a night-blue stage with turning rays: a treasure chest sits in the middle, glowing
 * and breathing, until you tap it. Then the lid lifts smoothly, light pours out with a fountain of gems, and
 * the gems pile up while "+N" counts up. Collect sends them flying into your wallet. Nothing jumps around:
 * every part keeps its place on the screen.
 */

const SPARK = ["#ffffff", "#bfe9ff", "#7fd0ff", "#ffe9a8"];

/** A treasure chest: wood planks, gold bands and rivets, an ornate lock with a gem. View box 0 0 220 200. */
function Chest({ state, jewel = "#e3214a" }: { state: "closed" | "open"; jewel?: string }) {
  return (
    <svg className={`tc tc-${state}`} viewBox="0 0 220 200" aria-hidden="true">
      <defs>
        <linearGradient id="tc-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a0522d" /><stop offset=".55" stopColor="#7a3b16" /><stop offset="1" stopColor="#4e220a" /></linearGradient>
        <linearGradient id="tc-wood-lid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b8642f" /><stop offset="1" stopColor="#7a3b16" /></linearGradient>
        <linearGradient id="tc-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff6c0" /><stop offset=".35" stopColor="#ffd34a" /><stop offset=".7" stopColor="#d99a10" /><stop offset="1" stopColor="#8a5a00" /></linearGradient>
        <linearGradient id="tc-gold-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff2a8" /><stop offset=".5" stopColor="#f0b820" /><stop offset="1" stopColor="#9a6400" /></linearGradient>
        <radialGradient id="tc-glow"><stop offset="0" stopColor="#ffffff" /><stop offset=".35" stopColor="#bfeaff" /><stop offset="1" stopColor="#4ab8ff" stopOpacity="0" /></radialGradient>
        <linearGradient id="tc-beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ffffff" stopOpacity=".95" /><stop offset="1" stopColor="#9fdcff" stopOpacity="0" /></linearGradient>
      </defs>
      <ellipse cx="110" cy="186" rx="88" ry="10" fill="#000" opacity=".35" />
      <g className="tc-beams">
        {[-58, -34, -12, 12, 34, 58].map((a) => <path key={a} d="M104 104 L116 104 L132 -40 L88 -40 Z" fill="url(#tc-beam)" transform={`rotate(${a} 110 104)`} />)}
        <ellipse cx="110" cy="100" rx="78" ry="30" fill="url(#tc-glow)" />
      </g>
      <path className="tc-mouth" d="M34 104 Q110 84 186 104 L186 110 Q110 92 34 110 Z" fill="#2a1204" />
      <g className="tc-body">
        <path d="M30 104 H190 V168 Q190 178 180 178 H40 Q30 178 30 168 Z" fill="url(#tc-wood)" stroke="#3a1804" strokeWidth="2" />
        <path d="M32 128 H188 M32 152 H188" stroke="#3a1804" strokeWidth="2" opacity=".7" />
        <path d="M50 114 q20 3 40 0 M120 138 q22 3 44 0 M56 162 q18 -3 36 0 M130 116 q16 3 30 0" stroke="#d98a50" strokeWidth="1.4" fill="none" opacity=".45" />
        {[34, 172].map((x) => <rect key={x} x={x} y="104" width="14" height="74" rx="3" fill="url(#tc-gold-v)" stroke="#7a4a00" strokeWidth="1.2" />)}
        {[78, 128].map((x) => <rect key={x} x={x} y="104" width="14" height="74" fill="url(#tc-gold-v)" stroke="#7a4a00" strokeWidth="1.2" />)}
        <rect x="30" y="170" width="160" height="8" rx="3" fill="url(#tc-gold)" stroke="#7a4a00" strokeWidth="1" />
        {[[41, 116], [41, 164], [179, 116], [179, 164], [85, 140], [135, 140]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.6" fill="#fff6c0" stroke="#8a5a00" strokeWidth=".8" />)}
      </g>
      <rect className="tc-seam" x="34" y="100" width="152" height="6" rx="3" fill="#e6f8ff" />
      <g className="tc-lid">
        <path d="M28 104 V80 Q110 30 192 80 V104 Z" fill="url(#tc-wood-lid)" stroke="#3a1804" strokeWidth="2" strokeLinejoin="round" />
        <path d="M30 88 Q110 44 190 88" stroke="#3a1804" strokeWidth="1.6" fill="none" opacity=".6" />
        <path d="M40 76 Q75 56 108 52" stroke="#e8a070" strokeWidth="2" fill="none" opacity=".5" strokeLinecap="round" />
        <path d="M34 104 V80 Q37 77 48 71 V104 Z M172 71 Q183 77 186 80 V104 H172 Z" fill="url(#tc-gold-v)" stroke="#7a4a00" strokeWidth="1.2" />
        <path d="M78 104 V58 Q84 55 92 53 V104 Z M128 53 Q136 55 142 58 V104 H128 Z" fill="url(#tc-gold-v)" stroke="#7a4a00" strokeWidth="1.2" />
        <path d="M26 104 H194 V98 Q110 92 26 98 Z" fill="url(#tc-gold)" stroke="#7a4a00" strokeWidth="1.2" />
        {[[41, 86], [179, 86], [85, 66], [135, 66]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.4" fill="#fff6c0" stroke="#8a5a00" strokeWidth=".8" />)}
      </g>
      <g className="tc-lock">
        <path d="M94 88 H126 L130 100 V120 Q110 136 90 120 V100 Z" fill="url(#tc-gold)" stroke="#7a4a00" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M97 92 H123 L126 101 V118 Q110 130 94 118 V101 Z" fill="none" stroke="#fff6c0" strokeWidth="1" opacity=".7" />
        <circle cx="110" cy="99" r="6" fill={jewel} stroke="#fff" strokeWidth="1.4" />
        <circle cx="108" cy="97" r="1.8" fill="#fff" opacity=".85" />
        <circle cx="110" cy="112" r="3.4" fill="#3a1804" /><path d="M108.6 113 L110 121 L111.4 113 Z" fill="#3a1804" />
      </g>
    </svg>
  );
}

/** Spots for a pyramid of gems, bottom row first (in % of the heap box). */
function heapSpots(n: number) {
  const rows: number[] = [];
  for (let w = 1; rows.reduce((a, b) => a + b, 0) < n; w++) rows.unshift(w);
  const out: { x: number; y: number; r: number; s: number; tone: "blue" | "sky" | "deep" }[] = [];
  const widest = rows[0];
  let left = n;
  rows.forEach((count, row) => {
    for (let i = 0; i < count && left > 0; i++, left--) {
      out.push({
        x: 50 + (i - (count - 1) / 2) * (84 / widest) + (((row * 7 + i * 13) % 5) - 2),
        y: 96 - row * (70 / Math.max(rows.length, 3)),
        r: ((i * 37 + row * 23) % 36) - 18,
        s: 0.9 + ((i + row) % 3) * 0.09,
        tone: (["blue", "sky", "deep"] as const)[(i * 2 + row) % 3],
      });
    }
  });
  return out;
}

export interface GemRewardProps {
  amount: number;
  title?: string;
  from?: number; // balance before, for the wallet count-up
  chest?: boolean;
  jewel?: string; // colour of the gem on the chest's lock (the rank's colour)
  sound?: SoundKey; // a sound for this moment (an achievement, a tournament win), played as it appears
  onDone: () => void;
}

export default function GemReward({ amount, title, from, chest = false, jewel, sound, onDone }: GemRewardProps) {
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const n = Math.max(6, Math.min(24, Math.round(Math.sqrt(amount) * 2.4)));
  const spots = useMemo(() => heapSpots(n), [n]);
  const [phase, setPhase] = useState<"ready" | "burst" | "heap" | "fly" | "done">(chest && !reduced ? "ready" : "heap");
  const [shown, setShown] = useState(reduced ? amount : 0);
  const [wallet, setWallet] = useState(from ?? 0);
  const [fly, setFly] = useState<{ dx: number; dy: number } | null>(null);
  const walletRef = useRef<HTMLSpanElement>(null);
  const heapRef = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Particles | null>(null);

  useEffect(() => {
    const c = canvas.current;
    if (!c || reduced) return;
    const e = new Particles(c);
    engine.current = e;
    e.start();
    e.burst("star", 90, ["#ffffff", "#bfe9ff"]);
    const onResize = () => e.resize();
    window.addEventListener("resize", onResize);
    return () => { e.stop(); window.removeEventListener("resize", onResize); };
  }, [reduced]);

  // Tap the chest: the lid lifts, light and gems pour out.
  function open() {
    if (phase !== "ready") return;
    setPhase("burst");
    void playSound("chest");
    const e = engine.current, h = heapRef.current?.getBoundingClientRect();
    if (e && h) {
      const at = { x: h.left + h.width / 2, y: h.top + h.height * 0.6 };
      window.setTimeout(() => {
        e.burst("sparkle", 160, SPARK, at);
        e.burst("ring", 48, ["#ffffff", "#9fdcff"], at);
        e.burst("firework", 70, ["#ffe9a8", "#ffffff"], at);
      }, 260);
    }
  }
  useEffect(() => {
    if (phase !== "burst") return;
    const t = window.setTimeout(() => setPhase("heap"), 700);
    return () => clearTimeout(t);
  }, [phase]);
  useEffect(() => {
    if (sound) void playSound(sound);
    else if (!chest || reduced) void playSound("gems");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // "+N" counts up while the heap builds, with glints as gems land.
  useEffect(() => {
    if (phase !== "heap" || reduced) return;
    const e = engine.current, h = heapRef.current?.getBoundingClientRect();
    const glints = spots.map((s, i) => window.setTimeout(() => {
      if (e && h && i % 3 === 0) e.burst("sparkle", 8, SPARK, { x: h.left + (h.width * s.x) / 100, y: h.top + (h.height * s.y) / 100 - 20 });
    }, 560 + i * 70));
    const start = performance.now(), len = 400 + n * 70;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / len);
      setShown(Math.round(amount * (1 - Math.pow(1 - k, 2))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); glints.forEach(clearTimeout); };
  }, [phase, amount, n, reduced, spots]);

  function collect() {
    void playSound("collect");
    if (reduced || !walletRef.current || !heapRef.current) { onDone(); return; }
    const w = walletRef.current.getBoundingClientRect(), h = heapRef.current.getBoundingClientRect();
    setFly({ dx: w.left + w.width / 2 - (h.left + h.width / 2), dy: w.top + w.height / 2 - (h.top + h.height * 0.7) });
    setPhase("fly");
    const base = from ?? 0, start = performance.now(), len = 900 + n * 40;
    const step = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - start - 350) / len));
      setWallet(Math.round(base + amount * k));
      if (k < 1) requestAnimationFrame(step);
      else {
        engine.current?.burst("sparkle", 30, SPARK, { x: w.left + w.width / 2, y: w.top + w.height / 2 });
        window.setTimeout(() => { setPhase("done"); onDone(); }, 500);
      }
    };
    requestAnimationFrame(step);
  }

  const showGems = phase === "heap" || phase === "fly" || phase === "done";
  return createPortal(
    <div className={`gr gr-is-${phase}`} role="dialog" aria-modal="true" aria-label={`${amount} gems`}>
      <div className="gr-stage" aria-hidden="true"><i className="gr-rays" /></div>
      <canvas ref={canvas} className="gr-canvas" />
      <span className={`gr-wallet${phase === "fly" ? " filling" : ""}`} ref={walletRef}>
        <Gem size={24} /> <b>{from === undefined && phase !== "fly" && phase !== "done" ? "" : wallet}</b>
      </span>
      <div className="gr-card">
        {title && <p className="gr-title">{title}</p>}
        <p className="gr-amount">{chest && !showGems ? <span className="gr-opening">{phase === "ready" ? "Tap the chest to open" : "\u00a0"}</span> : <>+{shown} <Gem size={44} /></>}</p>
        <div className="gr-heap" ref={heapRef} style={fly ? { ["--dx" as string]: `${fly.dx}px`, ["--dy" as string]: `${fly.dy}px` } : undefined}>
          {chest && (
            <button type="button" className="gr-chest-btn" onClick={open} disabled={phase !== "ready"} aria-label="Open the chest">
              <Chest state={phase === "ready" ? "closed" : "open"} jewel={jewel} />
            </button>
          )}
          {showGems && <span className="gr-pedestal" />}
          {showGems && spots.map((s, i) => (
            <span key={i} className="gr-gem" style={{
              left: `${s.x}%`, top: `${s.y}%`, ["--r" as string]: `${s.r}deg`, ["--s" as string]: s.s,
              animationDelay: phase === "fly" ? `${(n - i) * 35}ms` : `${(chest ? 0 : 120) + i * 70}ms`,
            }}><GemArt tone={s.tone} glint={i % 4 === 0} /></span>
          ))}
        </div>
        <button className={`gr-collect${phase === "heap" ? "" : " wait"}`} onClick={collect} disabled={phase !== "heap"} aria-hidden={phase !== "heap"}>Collect</button>
      </div>
    </div>,
    document.body,
  );
}
