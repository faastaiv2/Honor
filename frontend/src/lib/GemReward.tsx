import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Gem from "./Gem";
import { HexGem } from "./GemArt";
import { Particles } from "./particles";
import { playSound } from "./sounds";
import type { SoundKey } from "../api";

/**
 * The gem reward moment: one clean, calm sequence used everywhere (chests, achievements, wins, rank-ups).
 * A chest waits for a tap, opens, a fan of gems pops out and settles into one big gem while "+N" counts up;
 * Collect sends it to your wallet. Gold background for the Legendary rank-up, night blue otherwise.
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

export interface GemRewardProps {
  amount: number;
  title?: string;
  from?: number; // balance before, for the wallet count-up
  chest?: boolean;
  gold?: boolean; // a golden background all the way through (the Legendary rank-up)
  jewel?: string; // colour of the gem on the chest's lock (the rank's colour)
  sound?: SoundKey; // a sound for this moment (an achievement, a tournament win), played as it appears
  onDone: () => void;
}

export default function GemReward({ amount, title, from, chest = false, gold = false, jewel, sound, onDone }: GemRewardProps) {
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // One calm sequence for every reward:
  //   ready (chest only: it breathes, "Tap to open") → open (a short wiggle, the lid swings up, a soft flash)
  //   → shown (a fan of gems pops out and settles into one big gem, "+N" counts up) → fly (Collect: the gem
  //   flies to your wallet, which counts up) → done.
  const [phase, setPhase] = useState<"ready" | "open" | "shown" | "fly" | "done">(chest && !reduced ? "ready" : "shown");
  const [shown, setShown] = useState(reduced ? amount : 0);
  const [wallet, setWallet] = useState(from ?? 0);
  const [fly, setFly] = useState<{ dx: number; dy: number } | null>(null);
  const walletRef = useRef<HTMLSpanElement>(null);
  const bigRef = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Particles | null>(null);
  const colors = gold ? ["#fff6c8", "#ffd24a", "#ffffff"] : SPARK;

  useEffect(() => {
    const c = canvas.current;
    if (!c || reduced) return;
    const e = new Particles(c);
    engine.current = e;
    e.start();
    const onResize = () => e.resize();
    window.addEventListener("resize", onResize);
    return () => { e.stop(); window.removeEventListener("resize", onResize); };
  }, [reduced]);

  useEffect(() => {
    if (sound) void playSound(sound);
    if (!chest || reduced) void playSound("gems");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const center = () => {
    const r = bigRef.current?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined;
  };
  function open() {
    if (phase !== "ready") return;
    setPhase("open");
    void playSound("chest");
    window.setTimeout(() => { const at = center(); if (at) engine.current?.burst("sparkle", 70, colors, at); void playSound("gems"); setPhase("shown"); }, 900);
  }

  // "+N" counts up once the gems are out; a little sparkle when it lands.
  useEffect(() => {
    if (phase !== "shown" || reduced) return;
    if (!chest) { const t = window.setTimeout(() => { const at = center(); if (at) engine.current?.burst("sparkle", 40, colors, at); }, 350); void t; }
    const start = performance.now() + 450, len = Math.min(1600, 500 + amount * 6);
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - start) / len));
      setShown(Math.round(amount * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, amount, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  function collect() {
    void playSound("collect");
    if (reduced || !walletRef.current || !bigRef.current) { onDone(); return; }
    const w = walletRef.current.getBoundingClientRect(), g = bigRef.current.getBoundingClientRect();
    setFly({ dx: w.left + w.width / 2 - (g.left + g.width / 2), dy: w.top + w.height / 2 - (g.top + g.height / 2) });
    setPhase("fly");
    const base = from ?? 0, start = performance.now() + 550, len = 700;
    const step = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - start) / len));
      setWallet(Math.round(base + amount * k));
      if (k < 1) requestAnimationFrame(step);
      else {
        engine.current?.burst("sparkle", 24, colors, { x: w.left + w.width / 2, y: w.top + w.height / 2 });
        window.setTimeout(() => { setPhase("done"); onDone(); }, 450);
      }
    };
    requestAnimationFrame(step);
  }

  const out = phase === "shown" || phase === "fly" || phase === "done";
  const fan = 9;
  return createPortal(
    <div className={`gx gx-${phase}${gold ? " gx-gold" : ""}${chest ? " gx-chest" : ""}`} role="dialog" aria-modal="true" aria-label={`${amount} gems`}>
      <div className="gx-bg" aria-hidden="true"><i className="gx-glow" /></div>
      <canvas ref={canvas} className="gx-canvas" />
      <span className={`gx-wallet${phase === "fly" ? " filling" : ""}`} ref={walletRef}>
        <Gem size={22} /> <b>{from === undefined && phase !== "fly" && phase !== "done" ? "" : wallet}</b>
      </span>
      <div className="gx-card">
        {title && <p className="gx-title">{title}</p>}
        <div className="gx-stage">
          {chest && (
            <button type="button" className="gx-chest-btn" onClick={open} disabled={phase !== "ready"} aria-label="Open the chest">
              <Chest state={phase === "ready" ? "closed" : "open"} jewel={jewel} />
            </button>
          )}
          {out && <div className="gx-fan" aria-hidden="true">
            {Array.from({ length: fan }, (_, i) => <span key={i} className="gx-fan-gem" style={{ ["--a" as string]: `${-80 + (160 / (fan - 1)) * i}deg`, ["--d" as string]: `${i * 25}ms` }}><HexGem tone={(["blue", "sky", "deep"] as const)[i % 3]} /></span>)}
          </div>}
          <div className={`gx-big${out ? " on" : ""}`} ref={bigRef} style={fly ? { ["--dx" as string]: `${fly.dx}px`, ["--dy" as string]: `${fly.dy}px` } : undefined}>
            {out && <HexGem tone="sky" glint />}
          </div>
        </div>
        <p className="gx-amount" aria-live="polite">
          {phase === "ready" ? <span className="gx-hint">Tap the chest to open</span> : phase === "open" ? "\u00a0" : <>+{shown} <Gem size={34} /></>}
        </p>
        <button className={`gx-collect${phase === "shown" ? "" : " wait"}`} onClick={collect} disabled={phase !== "shown"} aria-hidden={phase !== "shown"}>Collect</button>
      </div>
    </div>,
    document.body,
  );
}
