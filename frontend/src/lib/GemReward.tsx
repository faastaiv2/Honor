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

const Y = "#f6c544", Y2 = "#fbd863", YD = "#e2a636", W1 = "#a5603a", W2 = "#8a4e2e", W3 = "#6e3c22";

/** A flat, friendly treasure chest: wooden box, yellow corner plates with stripes, a keyhole lock.
 * Closed: the lid on top with a handle. Open: the lid stands up behind, and blue gems fill the box. View box 0 0 220 200. */
function Chest({ state }: { state: "closed" | "open"; jewel?: string }) {
  const plate = (x: number, y: number, h: number, key: string) => (
    <g key={key}>
      <rect x={x} y={y} width="36" height={h} rx="6" fill={Y} />
      <clipPath id={`fc-${key}`}><rect x={x} y={y} width="36" height={h} rx="6" /></clipPath>
      <g clipPath={`url(#fc-${key})`} opacity=".55">
        {[-40, -10, 20, 50, 80].map((o) => <path key={o} d={`M${x + o} ${y + h} L${x + o + 60} ${y + h - 60}`} stroke={Y2} strokeWidth="9" />)}
      </g>
      <circle cx={x + 11} cy={y + 12} r="4" fill={YD} /><circle cx={x + 11} cy={y + h - 12} r="4" fill={YD} />
    </g>
  );
  return (
    <svg className={`fc fc-${state}`} viewBox="0 0 220 200" aria-hidden="true">
      <rect x="22" y="182" width="176" height="12" rx="6" fill="#000" opacity=".3" />
      {/* open: the lid standing up behind, gems heaped inside */}
      <g className="fc-back">
        <rect x="42" y="40" width="136" height="70" rx="16" fill={W1} />
        <rect x="52" y="50" width="116" height="60" rx="8" fill={W3} />
        <rect x="42" y="30" width="136" height="14" rx="7" fill={Y} />
        <rect x="98" y="18" width="24" height="16" rx="5" fill={Y} />
        <g className="fc-gems">
          <path d="M62 112 L72 82 Q76 74 84 76 L108 86 Q114 90 110 98 L100 118 Z" fill="#4fa6ec" />
          <path d="M98 112 L104 74 Q106 66 114 66 L138 70 Q146 72 144 80 L136 112 Z" fill="#5aaef0" />
          <path d="M130 114 L140 86 Q144 78 152 80 L164 86 Q170 90 166 98 L158 118 Z" fill="#4a9ae8" />
          <path d="M78 90 L90 88 L84 100 Z" fill="#cfeeff" /><path d="M116 76 L128 76 L120 88 Z" fill="#cfeeff" /><path d="M146 90 L156 92 L148 100 Z" fill="#cfeeff" />
        </g>
      </g>
      {/* the box */}
      <rect x="42" y="104" width="136" height="80" rx="4" fill={W1} />
      <path d="M44 132 H176 M44 158 H176" stroke={W3} strokeWidth="6" opacity=".55" />
      {plate(30, 100, 86, "l")}{plate(154, 100, 86, "r")}
      {/* closed: the lid */}
      <g className="fc-lid">
        <path d="M34 108 V78 Q34 56 56 56 H164 Q186 56 186 78 V108 Z" fill={W1} />
        <path d="M44 82 H176" stroke={W2} strokeWidth="5" opacity=".7" />
        <rect x="30" y="98" width="160" height="12" rx="6" fill={Y} />
        <rect x="98" y="46" width="24" height="14" rx="5" fill={Y} />
      </g>
      {/* the lock */}
      <g className="fc-lock">
        <rect x="90" y="96" width="40" height="44" rx="8" fill={Y} />
        <circle cx="110" cy="113" r="7" fill={YD} /><path d="M106 116 L114 116 L116 130 L104 130 Z" fill={YD} />
        <path className="fc-spark" d="M124 128 L125.2 131 L128 132 L125.2 133 L124 136 L122.8 133 L120 132 L122.8 131 Z" fill="#fff" />
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
