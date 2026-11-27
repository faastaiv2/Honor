import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Gem from "./Gem";
import { Devil } from "./Shaytan";
import { playSound } from "./sounds";

/**
 * The man in the cloak (a test from the Tests tab). A poor man in a hooded cloak shuffles in and begs for gems.
 * Give: the gems fly into his bowl, he thanks them, glows, and gives back more (sadaqah never makes you poorer).
 * Get lost: he stands up straight and throws off his cloak. It was Shaytan all along. "Good job!", an evil laugh,
 * and he's gone.
 */

/** The poor man: an original drawing of a hooded, patched cloak with a wooden bowl. View box 0 0 200 240. */
function Cloaked() {
  return (
    <svg viewBox="0 0 200 240" className="cg-man" aria-hidden="true">
      <defs>
        <linearGradient id="cg-cloth" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6b4d36" /><stop offset="1" stopColor="#3a271a" /></linearGradient>
        <radialGradient id="cg-hood" cx="50%" cy="30%" r="70%"><stop offset="0" stopColor="#7a5a40" /><stop offset="1" stopColor="#3e2a1c" /></radialGradient>
      </defs>
      {/* the cloak */}
      <path d="M58 236 Q54 150 76 104 L124 104 Q146 150 142 236 Q120 230 100 236 Q80 230 58 236Z" fill="url(#cg-cloth)" stroke="#2a1a10" strokeWidth="2" />
      <path d="M86 120 Q82 180 80 232 M114 120 Q118 180 120 232 M100 130 V234" stroke="#2a1a10" strokeWidth="1.5" opacity=".45" fill="none" />
      {/* patches */}
      <rect x="66" y="196" width="18" height="14" rx="2" fill="#8a6a48" stroke="#2a1a10" strokeWidth="1" transform="rotate(-8 75 203)" />
      <path d="M68 200 h14 M68 205 h14" stroke="#2a1a10" strokeWidth=".8" strokeDasharray="2 2" transform="rotate(-8 75 203)" />
      <rect x="118" y="170" width="14" height="12" rx="2" fill="#5a4a3a" stroke="#2a1a10" strokeWidth="1" transform="rotate(10 125 176)" />
      {/* hood with a shadowed face */}
      <path d="M68 112 Q62 52 100 38 Q138 52 132 112 Q100 124 68 112Z" fill="url(#cg-hood)" stroke="#2a1a10" strokeWidth="2" />
      <ellipse cx="100" cy="84" rx="21" ry="25" fill="#140c07" />
      <g className="cg-eyes"><circle cx="92" cy="84" r="2.2" fill="#e8dcc0" /><circle cx="108" cy="84" r="2.2" fill="#e8dcc0" /></g>
      {/* hands and a wooden bowl held out */}
      <g className="cg-bowl">
        <ellipse cx="82" cy="152" rx="8" ry="6" fill="#b88f68" />
        <ellipse cx="118" cy="152" rx="8" ry="6" fill="#b88f68" />
        <path d="M78 150 Q100 176 122 150 Z" fill="#8a5a32" stroke="#4a2c14" strokeWidth="2" />
        <path d="M80 151 H120" stroke="#c08a52" strokeWidth="2" />
      </g>
    </svg>
  );
}

type Stage = "enter" | "ask" | "give" | "thanks" | "reveal" | "laugh" | "leave";

export default function CharityScene({ name, ask, balance, onAnswer, onDone, preview = false }: {
  name: string; ask: number; balance: number;
  onAnswer?: (give: boolean) => Promise<{ given: number; give_back: number } | void> | void;
  onDone: (gemsBack: number) => void; preview?: boolean;
}) {
  const [stage, setStage] = useState<Stage>("enter");
  const [back, setBack] = useState(0);
  const giveN = Math.max(0, Math.min(ask, balance));
  useEffect(() => {
    const t = window.setTimeout(() => setStage("ask"), 2400);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const say: Partial<Record<Stage, Parameters<typeof playSound>[0]>> = { ask: "charity-ask", thanks: "charity-thanks", reveal: "charity-reveal", laugh: "shaytan-laugh" };
    const k = say[stage];
    if (k) void playSound(k);
  }, [stage]);

  async function choose(give: boolean) {
    setStage(give ? "give" : "reveal");
    const r = preview ? { given: giveN, give_back: Math.max(ask * 2, 10) } : await onAnswer?.(give);
    const gemsBack = give && r ? r.give_back : 0;
    setBack(gemsBack);
    if (give) {
      window.setTimeout(() => setStage("thanks"), 2200);
      window.setTimeout(() => setStage("leave"), 7200);
      window.setTimeout(() => onDone(gemsBack), 8200);
    } else {
      window.setTimeout(() => setStage("laugh"), 4200);
      window.setTimeout(() => setStage("leave"), 8000);
      window.setTimeout(() => onDone(0), 9000);
    }
  }

  const devil = stage === "reveal" || stage === "laugh" || (stage === "leave" && back === 0);
  return createPortal(
    <div className={`cg cg-${stage}${devil ? " cg-devil" : ""}`} role="dialog" aria-modal="true" aria-label="A man in a cloak">
      <div className="cg-sky" aria-hidden="true">
        <span className="cg-moon" />
        {Array.from({ length: 18 }, (_, i) => <i key={i} className="cg-star" style={{ left: `${(i * 53) % 100}%`, top: `${(i * 29) % 45}%`, ["--i" as string]: i }} />)}
        <span className="cg-lamp" />
      </div>
      {devil && <div className="cg-fire" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div>}
      <div className="cg-stage">
        <div className="cg-figure">
          <div className="cg-devil-wrap"><Devil /></div>
          <div className="cg-cloak-wrap"><Cloaked /></div>
          {stage === "thanks" && <div className="cg-halo" aria-hidden="true" />}
          {stage === "give" && <div className="cg-coins" aria-hidden="true">{Array.from({ length: Math.min(10, Math.max(3, giveN)) }, (_, i) => <span key={i} style={{ ["--i" as string]: i }}><Gem size={22} /></span>)}</div>}
        </div>
      </div>
      <div className="cg-talk">
        {stage === "ask" && <>
          <p className="cg-bubble">Please, <b>{name}</b>… could you spare me <b className="cg-amt">{ask} <Gem /></b>? I haven't eaten all day… 🥺</p>
          <div className="cg-choices">
            <button className="cg-btn-give" onClick={() => choose(true)}>🤲 Give {giveN < ask ? `${giveN} (all I have)` : ask} <Gem /></button>
            <button className="cg-btn-no" onClick={() => choose(false)}>👋 Get lost!</button>
          </div>
        </>}
        {stage === "give" && <p className="cg-bubble">Oh… thank you, thank you! 🥹</p>}
        {stage === "thanks" && <p className="cg-bubble good">JazākAllāhu khayran, {name}! Sadaqah never makes you poorer.{back > 0 && <> Here, take <b className="cg-amt">{back} <Gem /></b> back!</>} ✨</p>}
        {stage === "reveal" && <p className="cg-bubble evil">Good job, {name}! 😈 Turning away someone in need… just what I wanted!</p>}
        {(stage === "laugh" || (stage === "leave" && back === 0)) && <p className="cg-bubble evil">MWAHAHAHA! HA HA HA!</p>}
      </div>
      {preview && <button className="sh-skip" onClick={() => onDone(0)}>Close</button>}
    </div>,
    document.body,
  );
}
