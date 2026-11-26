import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Gem from "./Gem";
import GemArt from "./GemArt";
import { playMusic, stopMusic } from "./sounds";

/**
 * The goblin raid: when a member falls onto the Pillar of Shame, a horde of goblins swarms the screen for about
 * 15 seconds, snatches gems out of the wallet and runs off cackling. Then a card says what happened.
 */

const RAID_MS = 15000;

/** A little goblin: green, big ears, yellow eyes, a wicked grin, a sack for stolen gems. View box 0 0 100 100. */
export function Goblin({ sack = false, tone = 0 }: { sack?: boolean; tone?: number }) {
  const skin = ["#6fbf3a", "#5aa832", "#7ccf4a", "#4f9a2c"][tone % 4];
  const dark = ["#3f7a1c", "#336a16", "#4a8a24", "#2a5a10"][tone % 4];
  return (
    <svg viewBox="0 0 100 100" className="gb-svg" aria-hidden="true">
      {sack && <g className="gb-sack">
        <path d="M66 40 C84 36 94 50 90 64 C86 76 70 78 62 70 C56 62 56 46 66 40 Z" fill="#8a5a2b" stroke="#4a2c10" strokeWidth="1.6" />
        <path d="M64 42 C66 36 72 34 76 38" stroke="#4a2c10" strokeWidth="2" fill="none" />
        <path d="M70 46 l4 -5 4 5 -4 5z M80 52 l3 -4 3 4 -3 4z" fill="#5cc4ff" stroke="#1670cc" strokeWidth=".8" />
      </g>}
      {/* legs (they run) */}
      <g className="gb-leg l"><path d="M42 74 L36 92 L44 94" stroke={dark} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" /></g>
      <g className="gb-leg r"><path d="M56 74 L62 92 L54 94" stroke={dark} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" /></g>
      {/* body: a ragged tunic */}
      <path d="M36 56 Q50 50 64 56 L66 78 L60 74 L55 80 L50 74 L45 80 L40 74 L34 78 Z" fill="#7a4a22" stroke="#3a200a" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M38 64 H62" stroke="#3a200a" strokeWidth="2" />
      {/* arms */}
      <path className="gb-arm" d="M36 60 Q24 62 20 52" stroke={skin} strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M64 60 Q74 56 72 46" stroke={skin} strokeWidth="6" strokeLinecap="round" fill="none" />
      {/* head */}
      <path d="M26 30 L4 18 L22 40 Z M74 30 L96 18 L78 40 Z" fill={skin} stroke={dark} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 21 L22 34 M90 21 L78 34" stroke="#e88a8a" strokeWidth="2" opacity=".6" />
      <ellipse cx="50" cy="36" rx="25" ry="22" fill={skin} stroke={dark} strokeWidth="1.8" />
      <path d="M30 26 Q38 20 46 26 M54 26 Q62 20 70 26" stroke={dark} strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="39" cy="33" rx="6.5" ry="5.5" fill="#ffe14a" /><ellipse cx="61" cy="33" rx="6.5" ry="5.5" fill="#ffe14a" />
      <ellipse cx="40" cy="33.5" rx="2.4" ry="3.6" fill="#c0141e" /><ellipse cx="60" cy="33.5" rx="2.4" ry="3.6" fill="#c0141e" />
      <path d="M48 36 Q50 44 54 40" stroke={dark} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M33 44 Q50 60 67 44 Q50 52 33 44 Z" fill="#3a0a0a" stroke={dark} strokeWidth="1.2" />
      <path d="M38 46 l3 4 3 -3 3 4 3 -3 3 4 3 -3 3 4 3 -4" stroke="#fff6d8" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

type Runner = { id: number; y: number; size: number; dur: number; delay: number; dir: 1 | -1; tone: number; sack: boolean; kind: "run" | "jump" | "peek" };

function horde(): Runner[] {
  const out: Runner[] = [];
  const r = (a: number, b: number) => a + Math.random() * (b - a);
  for (let i = 0; i < 64; i++) {
    const kind = i % 9 === 4 ? "jump" : i % 13 === 7 ? "peek" : "run";
    out.push({ id: i, y: r(18, 86), size: r(64, 150), dur: kind === "jump" ? r(1.6, 2.2) : r(2.2, 4.2), delay: r(0.3, RAID_MS / 1000 - 3.5),
      dir: Math.random() < 0.5 ? 1 : -1, tone: i, sack: i % 3 === 0, kind });
  }
  return out;
}

export default function GoblinRaid({ stolen, from, onDone, preview = false }: { stolen: number; from?: number; onDone: () => void; preview?: boolean }) {
  const runners = useMemo(horde, []);
  const [stage, setStage] = useState<"raid" | "after">("raid");
  const [wallet, setWallet] = useState(from ?? stolen);
  const [snatch, setSnatch] = useState<number[]>([]);
  const [took, setTook] = useState(0);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const done = useRef(false);

  useEffect(() => {
    void playMusic("goblins");
    const ts: number[] = [];
    if (reduced) { setWallet((from ?? stolen) - stolen); setStage("after"); return () => stopMusic("goblins", 800); }
    // At 3 seconds they start grabbing gems out of the wallet, one by one.
    // Up to 30 grabs spread over about 10 seconds; each grab takes a handful of gems.
    const start = from ?? stolen;
    const grabs = Math.min(stolen, 30), every = grabs ? Math.min(650, 10000 / grabs) : 0;
    for (let i = 0; i < grabs; i++) {
      const taken = Math.round((stolen * (i + 1)) / grabs);
      ts.push(window.setTimeout(() => { setWallet(start - taken); setSnatch((s) => [...s, i]); setTook(taken); }, 3000 + i * every));
    }
    ts.push(window.setTimeout(() => setStage("after"), RAID_MS));
    return () => { ts.forEach(clearTimeout); stopMusic("goblins", 1200); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => { if (done.current) return; done.current = true; onDone(); };

  return createPortal(
    <div className={`gbr gbr-${stage}`} role="dialog" aria-modal="true" aria-label="Goblin raid">
      <div className="gbr-sky" aria-hidden="true" />
      <span className={`gbr-wallet${stage === "raid" && snatch.length ? " robbed" : ""}`} aria-label={`${wallet} gems`}>
        <Gem size={24} /> <b>{wallet}</b>
      </span>
      {preview && <p className="film-preview">Preview only · nothing changes</p>}

      {stage === "raid" && <>
        <h1 className="gbr-title" aria-live="polite">GOBLIN RAID!</h1>
        <p className="gbr-laugh l1" aria-hidden="true">hehehe!</p>
        <p className="gbr-laugh l2" aria-hidden="true">MINE!</p>
        <p className="gbr-laugh l3" aria-hidden="true">shiny shiny!</p>
        <p className="gbr-laugh l4" aria-hidden="true">kekeke!</p>
        <div className="gbr-horde" aria-hidden="true">
          {runners.map((g) => (
            <span key={g.id} className={`gb gb-${g.kind}${g.dir < 0 ? " flip" : ""}`}
              style={{ top: `${g.y}%`, width: g.size, height: g.size, animationDuration: `${g.dur}s`, animationDelay: `${g.delay}s`, zIndex: Math.round(g.size) }}>
              <span className="gb-hop" style={{ animationDuration: `${0.28 + (g.id % 4) * 0.05}s` }}><Goblin sack={g.sack} tone={g.tone} /></span>
            </span>
          ))}
        </div>
        {snatch.map((i) => (
          <span key={i} className="gbr-gem" style={{ ["--tx" as string]: `${-20 - ((i * 37) % 60)}vw`, ["--ty" as string]: `${30 + ((i * 53) % 55)}vh` }} aria-hidden="true">
            <GemArt tone={(["blue", "sky", "deep"] as const)[i % 3]} glint={false} />
          </span>
        ))}
        {stolen > 0 && took > 0 && <p className="gbr-count">−{took} <Gem size={30} /></p>}
      </>}

      {stage === "after" && (
        <div className="gbr-card">
          <div className="gbr-ogre" aria-hidden="true">👹</div>
          <h2>{stolen > 0 ? `The goblins stole ${stolen} gems!` : "The goblins found nothing to steal… this time."}</h2>
          <p>You fell onto the <b>Pillar of Shame</b>. Your picture is locked to 👹 and your frame to the shame ring until you climb back to <b>Member</b>.</p>
          <p className="gbr-tip">Finish every task each day to climb back up.</p>
          <button className="gbr-ok" onClick={close}>I'll climb back 💪</button>
        </div>
      )}
    </div>,
    document.body,
  );
}
