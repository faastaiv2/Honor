import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Gem from "./Gem";

/**
 * The gem reward moment: "+N gems" over a heap of gems that tumble in and stack up. A chest shakes, bursts
 * open and pours its gems onto the pile. Tapping Collect sends the gems flying into your wallet,
 * which ticks up as they land.
 */

/** One chunky gem of the pile (a rounded hexagon with a bright facet). */
function PileGem({ hue = 0 }: { hue?: number }) {
  const shades = [["#7fd0ff", "#2f9be8", "#1c78c8"], ["#9fe0ff", "#45b0f5", "#2384d6"], ["#6cc4ff", "#2a8fe0", "#176bb8"]][hue % 3];
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path d="M12 3 H28 L37 15 L32 34 H8 L3 15 Z" fill={shades[1]} />
      <path d="M12 3 H28 L37 15 H3 Z" fill={shades[0]} />
      <path d="M3 15 H37 L32 34 H8 Z" fill={shades[2]} opacity=".55" />
      <path d="M12 3 L16 15 L20 3 L24 15 L28 3" fill="none" stroke="#e8f8ff" strokeWidth="1" opacity=".55" />
      <path d="M9 9 L13 5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity=".85" />
    </svg>
  );
}

function Chest({ open }: { open: boolean }) {
  return (
    <svg className={`gr-chest${open ? " open" : ""}`} viewBox="0 0 120 100" aria-hidden="true">
      <defs>
        <linearGradient id="gr-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e0662a" /><stop offset="1" stopColor="#a8401a" /></linearGradient>
        <linearGradient id="gr-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff6a0" /><stop offset=".5" stopColor="#ffd21a" /><stop offset="1" stopColor="#d49a00" /></linearGradient>
      </defs>
      {open && <ellipse className="gr-chest-light" cx="60" cy="44" rx="44" ry="30" fill="#bff0ff" />}
      <rect x="12" y="46" width="96" height="48" rx="6" fill="url(#gr-wood)" stroke="url(#gr-gold)" strokeWidth="6" />
      <rect x="12" y="62" width="96" height="6" fill="url(#gr-gold)" />
      <g className="gr-lid">
        <path d="M12 46 C12 20 108 20 108 46 Z" fill="url(#gr-wood)" stroke="url(#gr-gold)" strokeWidth="6" strokeLinejoin="round" />
        <path d="M30 26 V46 M90 26 V46" stroke="url(#gr-gold)" strokeWidth="6" />
      </g>
      <rect x="50" y="52" width="20" height="22" rx="4" fill="url(#gr-gold)" stroke="#b07a00" strokeWidth="1.5" />
      <path d="M60 60 V67" stroke="#7a4a00" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Positions for a pyramid of gems, bottom row first (in % of the pile box). */
function pilePositions(n: number) {
  const rows: number[] = [];
  let left = n, w = 1;
  while (rows.reduce((a, b) => a + b, 0) < n) { rows.unshift(w); w++; }
  // rows like [6,5,4,3,2,1] trimmed to n
  const out: { x: number; y: number; r: number; s: number }[] = [];
  const widest = rows[0];
  rows.forEach((count, row) => {
    for (let i = 0; i < count && left > 0; i++, left--) {
      const x = 50 + (i - (count - 1) / 2) * (88 / widest) + ((row * 7 + i * 13) % 5) - 2;
      out.push({ x, y: 92 - row * (62 / Math.max(rows.length, 3)), r: ((i * 37 + row * 23) % 40) - 20, s: 0.9 + ((i + row) % 3) * 0.08 });
    }
  });
  return out;
}

export interface GemRewardProps {
  amount: number;
  title?: string; // e.g. "Streak chest", "Achievement: Early Riser"
  from?: number; // balance before, for the wallet count-up
  chest?: boolean; // burst out of a chest first
  onDone: () => void;
}

export default function GemReward({ amount, title, from, chest = false, onDone }: GemRewardProps) {
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const n = Math.max(5, Math.min(21, Math.round(Math.sqrt(amount) * 2.2)));
  const spots = useMemo(() => pilePositions(n), [n]);
  const [phase, setPhase] = useState<"chest" | "pile" | "fly" | "done">(chest && !reduced ? "chest" : "pile");
  const [shown, setShown] = useState(reduced ? amount : 0);
  const [wallet, setWallet] = useState(from ?? 0);
  const walletRef = useRef<HTMLSpanElement>(null);
  const pileRef = useRef<HTMLDivElement>(null);
  const [fly, setFly] = useState<{ dx: number; dy: number } | null>(null);

  // The chest shakes, then bursts open.
  useEffect(() => {
    if (phase !== "chest") return;
    const t = window.setTimeout(() => setPhase("pile"), 1300);
    return () => clearTimeout(t);
  }, [phase]);

  // "+N gems" counts up while the pile builds.
  useEffect(() => {
    if (phase !== "pile" || reduced) return;
    const start = performance.now(), len = 300 + n * 70;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / len);
      setShown(Math.round(amount * (1 - Math.pow(1 - k, 2))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, amount, n, reduced]);

  function collect() {
    if (reduced || !walletRef.current || !pileRef.current) { onDone(); return; }
    const w = walletRef.current.getBoundingClientRect(), p = pileRef.current.getBoundingClientRect();
    setFly({ dx: w.left + w.width / 2 - (p.left + p.width / 2), dy: w.top + w.height / 2 - (p.top + p.height * 0.7) });
    setPhase("fly");
    const base = from ?? 0, start = performance.now(), len = 900 + n * 40;
    const step = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - start - 350) / len));
      setWallet(Math.round(base + amount * k));
      if (k < 1) requestAnimationFrame(step);
      else window.setTimeout(() => { setPhase("done"); onDone(); }, 450);
    };
    requestAnimationFrame(step);
  }

  return createPortal(
    <div className={`gr gr-is-${phase}`} role="dialog" aria-modal="true" aria-label={`${amount} gems`}>
      <span className={`gr-wallet${phase === "fly" ? " filling" : ""}`} ref={walletRef}>
        <Gem size={22} /> <b>{from === undefined && phase !== "fly" ? "" : wallet}</b>
      </span>
      <div className="gr-card">
        {title && <p className="gr-title">{title}</p>}
        <p className="gr-amount">{phase === "chest" ? "Opening…" : `+${shown} gems`}</p>
        <div className="gr-pile" ref={pileRef} style={fly ? { ["--dx" as string]: `${fly.dx}px`, ["--dy" as string]: `${fly.dy}px` } : undefined}>
          {chest && <Chest open={phase !== "chest"} />}
          {phase !== "chest" && <span className="gr-shadow" />}
          {phase !== "chest" && spots.map((s, i) => (
            <span key={i} className="gr-gem" style={{
              left: `${s.x}%`, top: `${s.y}%`, ["--r" as string]: `${s.r}deg`, ["--s" as string]: s.s,
              animationDelay: phase === "fly" ? `${(n - i) * 35}ms` : `${(chest ? 0 : 120) + i * 65}ms`,
              ["--from" as string]: chest ? "28vh" : "-60vh",
            }}><PileGem hue={i} /></span>
          ))}
        </div>
        {phase === "pile" && <button className="gr-collect" onClick={collect}>Collect</button>}
      </div>
    </div>
  , document.body);
}
