import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Gem from "./Gem";
import GemArt from "./GemArt";
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

/** Where each gem lands: a full, rounded mound like a real pile, wide at the bottom with a little peak, gems overlapping
 * so no gaps show. Filled on a tight, jittered grid under the mound's outline. % of the heap box (centre x, centre y).
 * Bottom gems land first. */
function heapSpots(_n: number) {
  const size = 20; // gem width, % of the box
  const base = 90, H = 74, W = 48; // floor line, pile height, half-width (in %)
  const top = (x: number) => base - H * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / W, 1.7)), 0.85);
  const rnd = (k: number) => { const v = Math.sin(k * 12.9898) * 43758.5453; return v - Math.floor(v); };
  const pts: { x: number; y: number; r: number; tone: "blue" | "sky" | "deep"; order: number }[] = [];
  const dx = size * 0.56, dy = size * 0.5;
  let k = 0;
  for (let row = 0, y = base - 2; y > base - H - 6; row++, y -= dy) {
    for (let x = -W + (row % 2 ? dx / 2 : 0); x <= W; x += dx, k++) {
      const jx = (rnd(k) - 0.5) * dx * 0.5, jy = (rnd(k + 99) - 0.5) * dy * 0.5;
      const px = x + jx, py = y + jy;
      if (py < top(px) + size * 0.2) continue; // stay inside the mound
      pts.push({ x: 50 + px, y: py, r: Math.round((rnd(k + 7) - 0.5) * 60), tone: (["blue", "sky", "deep"] as const)[Math.floor(rnd(k + 3) * 3)], order: 0 });
    }
  }
  pts.push({ x: 52, y: base - H - 3, r: 12, tone: "sky", order: 0 }, { x: 46, y: base - H + 4, r: -16, tone: "blue", order: 0 }); // the little peak
  pts.sort((p, q) => q.y - p.y || p.x - q.x).forEach((p, i) => { p.order = i; });
  return { spots: pts, size };
}

export default function GemReward({ amount, title, from, chest = false, gold = false, sound, onDone }: GemRewardProps) {
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // ready (chest: tap to open) → open (wiggle, lid up, gems inside) → rain (the chest goes, a dark floor appears and the gems
  // fall in one by one, piling into a heap) → crack (the floor cracks under the weight, the heap sinks a little and two gems
  // tumble off the sides) → shown ("+N gems" counts up, Collect) → fly (the heap flies into the wallet) → done.
  const [phase, setPhase] = useState<"ready" | "open" | "rain" | "crack" | "fly" | "done">(reduced ? "crack" : chest ? "ready" : "rain");
  const [shown, setShown] = useState(reduced ? amount : 0);
  const [wallet, setWallet] = useState(from ?? 0);
  const [fly, setFly] = useState<{ dx: number; dy: number } | null>(null);
  const walletRef = useRef<HTMLSpanElement>(null);
  const heapRef = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Particles | null>(null);
  const colors = gold ? ["#fff6c8", "#ffd24a", "#ffffff"] : SPARK;
  const { spots, size } = useMemo(() => heapSpots(0), []);
  const n = spots.length;
  const STEP = 7; // ms between gems: they drop together as one big clump, the lowest landing first
  const rainMs = 200 + n * STEP + 1000;

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

  useEffect(() => { if (sound) void playSound(sound); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function open() {
    if (phase !== "ready") return;
    setPhase("open");
    void playSound("chest");
    window.setTimeout(() => setPhase("rain"), 1100);
  }
  // The rain, then the crack.
  useEffect(() => {
    if (phase !== "rain") return;
    void playSound("gems");
    const t = window.setTimeout(() => {
      setPhase("crack");
      void playSound("gems-crack");
      const h = heapRef.current?.getBoundingClientRect();
      if (h) engine.current?.burst("sparkle", 30, ["#9aa8b4", "#cfd8df", "#ffffff"], { x: h.left + h.width / 2, y: h.top + h.height * 0.92 });
    }, rainMs);
    return () => clearTimeout(t);
  }, [phase, rainMs]);
  // "+N gems" counts up after the crack.
  useEffect(() => {
    if (phase !== "crack" || reduced) return;
    const start = performance.now() + 250, len = Math.min(1400, 450 + amount * 5);
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - start) / len));
      setShown(Math.round(amount * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, amount, reduced]);

  function collect() {
    void playSound("collect");
    if (reduced || !walletRef.current || !heapRef.current) { onDone(); return; }
    const w = walletRef.current.getBoundingClientRect(), g = heapRef.current.getBoundingClientRect();
    setFly({ dx: w.left + w.width / 2 - (g.left + g.width / 2), dy: w.top + w.height / 2 - (g.top + g.height / 2) });
    setPhase("fly");
    const base = from ?? 0, start = performance.now() + 500, len = 800;
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

  const heap = phase === "rain" || phase === "crack" || phase === "fly" || phase === "done";
  const cracked = phase === "crack" || phase === "fly" || phase === "done";
  return createPortal(
    <div className={`gx gx-${phase}${gold ? " gx-gold" : ""}${chest ? " gx-chest" : ""}`} role="dialog" aria-modal="true" aria-label={`${amount} gems`}>
      <div className="gx-bg" aria-hidden="true"><i className="gx-glow" /></div>
      <canvas ref={canvas} className="gx-canvas" />
      <span className={`gx-wallet${phase === "fly" ? " filling" : ""}`} ref={walletRef}>
        <Gem size={22} /> <b>{from === undefined && phase !== "fly" && phase !== "done" ? "" : wallet}</b>
      </span>
      <div className="gx-card">
        {title && <p className="gx-title">{title}</p>}
        <p className={`gx-amount${cracked ? " on" : ""}`} aria-live="polite">
          {phase === "ready" ? <span className="gx-hint">Tap the chest to open</span> : cracked ? <>+{shown} gems</> : "\u00a0"}
        </p>
        <div className="gx-stage">
          {chest && !heap && (
            <button type="button" className="gx-chest-btn" onClick={open} disabled={phase !== "ready"} aria-label="Open the chest">
              <Chest state={phase === "ready" ? "closed" : "open"} />
            </button>
          )}
          {heap && <div className={`gx-floor${cracked ? " cracked" : ""}`} aria-hidden="true">
            <svg className="gx-cracks" viewBox="0 0 300 80" aria-hidden="true">
              <path d="M34 24 L-6 16 L10 40 Z" /><path d="M26 46 L-10 60 L22 64 Z" /><path d="M56 62 L36 86 L74 72 Z" />
              <path d="M266 24 L306 14 L292 40 Z" /><path d="M274 46 L312 58 L278 64 Z" /><path d="M244 62 L266 88 L228 72 Z" />
              <path d="M116 72 L104 92 L134 78 Z" /><path d="M184 72 L200 92 L168 78 Z" /><path d="M150 76 L140 96 L162 96 Z" />
            </svg>
          </div>}
          {heap && <svg className={`gx-rim${cracked ? " on" : ""}`} viewBox="0 0 280 54" aria-hidden="true">
              <g><path className="gx-plate-side" transform="translate(0 5)" d="M14.7 24.7 L-4.8 8.2 L-21.6 -14.4 L35.5 14.7 Z" /><path className="gx-plate" d="M14.7 24.7 L-4.8 8.2 L-21.6 -14.4 L35.5 14.7 Z" /></g>
              <g><path className="gx-plate-side" transform="translate(0 5)" d="M15.6 30.4 L-7.8 21.6 L-37.6 7.7 L19.5 20.6 Z" /><path className="gx-plate" d="M15.6 30.4 L-7.8 21.6 L-37.6 7.7 L19.5 20.6 Z" /></g>
              <g><path className="gx-plate-side" transform="translate(0 5)" d="M24.0 35.6 L9.1 32.2 L-16.5 25.1 L14.0 27.4 Z" /><path className="gx-plate" d="M24.0 35.6 L9.1 32.2 L-16.5 25.1 L14.0 27.4 Z" /></g>
              <g><path className="gx-plate-side" transform="translate(0 5)" d="M40.7 40.5 L30.4 40.3 L5.8 37.4 L20.2 33.8 Z" /><path className="gx-plate" d="M40.7 40.5 L30.4 40.3 L5.8 37.4 L20.2 33.8 Z" /></g>
              <g><path className="gx-plate-side" transform="translate(0 5)" d="M64.2 44.6 L57.0 46.0 L33.5 45.9 L36.8 39.6 Z" /><path className="gx-plate" d="M64.2 44.6 L57.0 46.0 L33.5 45.9 L36.8 39.6 Z" /></g>
              <g><path className="gx-plate-side" transform="translate(0 5)" d="M94.8 47.5 L90.3 50.4 L67.0 52.7 L60.7 44.1 Z" /><path className="gx-plate" d="M94.8 47.5 L90.3 50.4 L67.0 52.7 L60.7 44.1 Z" /></g>
              <g><path className="gx-plate-side" transform="translate(0 5)" d="M126.8 48.9 L124.9 51.8 L105.2 55.1 L92.8 47.4 Z" /><path className="gx-plate" d="M126.8 48.9 L124.9 51.8 L105.2 55.1 L92.8 47.4 Z" /></g>
              <g><path className="gx-plate-side" transform="translate(0 5)" d="M157.5 48.8 L157.5 52.8 L140.0 58.0 L122.5 48.8 Z" /><path className="gx-plate" d="M157.5 48.8 L157.5 52.8 L140.0 58.0 L122.5 48.8 Z" /></g>
              <g><path className="gx-plate-side" transform="translate(0 5)" d="M187.2 47.4 L189.2 50.3 L174.8 55.1 L153.2 48.9 Z" /><path className="gx-plate" d="M187.2 47.4 L189.2 50.3 L174.8 55.1 L153.2 48.9 Z" /></g>
              <g><path className="gx-plate-side" transform="translate(0 5)" d="M219.3 44.1 L224.2 46.4 L214.0 51.6 L185.2 47.5 Z" /><path className="gx-plate" d="M219.3 44.1 L224.2 46.4 L214.0 51.6 L185.2 47.5 Z" /></g>
              <g><path className="gx-plate-side" transform="translate(0 5)" d="M244.5 39.3 L252.9 40.4 L249.3 45.3 L214.1 44.8 Z" /><path className="gx-plate" d="M244.5 39.3 L252.9 40.4 L249.3 45.3 L214.1 44.8 Z" /></g>
              <g><path className="gx-plate-side" transform="translate(0 5)" d="M260.5 33.4 L274.0 32.0 L281.3 35.3 L237.9 40.8 Z" /><path className="gx-plate" d="M260.5 33.4 L274.0 32.0 L281.3 35.3 L237.9 40.8 Z" /></g>
              <g><path className="gx-plate-side" transform="translate(0 5)" d="M266.0 26.6 L288.9 21.0 L314.1 21.0 L254.2 36.3 Z" /><path className="gx-plate" d="M266.0 26.6 L288.9 21.0 L314.1 21.0 L254.2 36.3 Z" /></g>
              <g><path className="gx-plate-side" transform="translate(0 5)" d="M259.8 20.2 L280.5 6.5 L311.6 -2.1 L264.1 30.8 Z" /><path className="gx-plate" d="M259.8 20.2 L280.5 6.5 L311.6 -2.1 L264.1 30.8 Z" /></g>
              <g><path className="gx-plate-side" transform="translate(0 5)" d="M24.9 18.1 L13.7 4.3 L10.7 -13.7 L49.4 11.7 Z" /><path className="gx-plate" d="M24.9 18.1 L13.7 4.3 L10.7 -13.7 L49.4 11.7 Z" /></g>
              <g><path className="gx-plate-side" transform="translate(0 5)" d="M251.3 16.7 L264.1 4.6 L288.4 -4.4 L264.8 23.9 Z" /><path className="gx-plate" d="M251.3 16.7 L264.1 4.6 L288.4 -4.4 L264.8 23.9 Z" /></g>
            </svg>}
          {heap && (
            <div className={`gx-heap${cracked ? " sunk" : ""}`} ref={heapRef} style={fly ? { ["--dx" as string]: `${fly.dx}px`, ["--dy" as string]: `${fly.dy}px` } : undefined}>
              {spots.map((g, i) => (
                <span key={i} className="gx-hg" style={{ left: `${g.x}%`, top: `${g.y}%`, width: `${size}%`, ["--r" as string]: `${g.r}deg`,
                  animationDelay: reduced ? "0ms" : `${200 + g.order * STEP}ms`, zIndex: g.order,
                  ["--sx" as string]: `${(50 - g.x) * 0.9}px`, ["--h" as string]: `${560 + (g.order % 4) * 14}px`, ["--r0" as string]: `${(g.order * 47) % 80 - 40}deg` }}><GemArt tone={g.tone} glint={false} /></span>
              ))}
            </div>
          )}
          {heap && <>
            <span className={`gx-spill l${cracked ? " go" : ""}`} aria-hidden="true"><GemArt tone="sky" glint={false} /></span>
            <span className={`gx-spill r${cracked ? " go" : ""}`} aria-hidden="true"><GemArt tone="blue" glint={false} /></span>
          </>}
        </div>
        <button className={`gx-collect${phase === "crack" ? "" : " wait"}`} onClick={collect} disabled={phase !== "crack"} aria-hidden={phase !== "crack"}>Collect</button>
      </div>
    </div>,
    document.body,
  );
}
