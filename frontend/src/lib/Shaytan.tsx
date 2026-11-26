import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Gem from "./Gem";
import { playSound } from "./sounds";
import type { SoundKey } from "../api";

/**
 * Deploy Shaytan: dark clouds roll in, lightning, and Shaytan rises out of them with a sack of gems.
 * He offers gems to skip the day's tasks. Yes: he grows huge in a ring of fire, laughs (there are no gems,
 * his promises are empty) and vanishes into his clouds. No: he shrinks and is blown away.
 */

/** Shaytan himself: an original cartoon imp. View box 0 0 200 220. */
function Devil() {
  return (
    <svg viewBox="0 0 200 220" className="sh-devil" aria-hidden="true">
      <defs>
        <radialGradient id="sh-skin" cx="45%" cy="35%" r="70%"><stop offset="0" stopColor="#ff5a4a" /><stop offset=".6" stopColor="#c81e1e" /><stop offset="1" stopColor="#7a0a10" /></radialGradient>
        <linearGradient id="sh-horn" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#3a2a2a" /><stop offset="1" stopColor="#d8c8a8" /></linearGradient>
        <radialGradient id="sh-eye"><stop offset="0" stopColor="#fff8a0" /><stop offset=".6" stopColor="#ffd000" /><stop offset="1" stopColor="#ff8a00" /></radialGradient>
        <linearGradient id="sh-cape" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a0a20" /><stop offset="1" stopColor="#0a0008" /></linearGradient>
      </defs>
      {/* tail */}
      <path className="sh-tail" d="M140 190 Q186 186 180 150 Q176 128 190 120" stroke="#b01818" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M186 112 L198 118 L188 128 Z" fill="#b01818" />
      {/* cape and body */}
      <path d="M40 220 Q44 150 70 136 L100 150 L130 136 Q156 150 160 220Z" fill="url(#sh-cape)" />
      <path d="M70 136 L100 172 L130 136 Q116 130 100 132 Q84 130 70 136Z" fill="url(#sh-skin)" />
      <path d="M60 140 Q36 120 50 96 L62 104 Q54 118 70 132Z M140 140 Q164 120 150 96 L138 104 Q146 118 130 132Z" fill="#5a0a20" />
      {/* horns */}
      <path d="M62 52 Q48 24 58 6 Q66 30 80 40Z M138 52 Q152 24 142 6 Q134 30 120 40Z" fill="url(#sh-horn)" stroke="#2a1a1a" strokeWidth="1.5" />
      {/* pointed ears */}
      <path d="M52 74 L30 60 L52 92Z M148 74 L170 60 L148 92Z" fill="url(#sh-skin)" stroke="#6a0a10" strokeWidth="1.5" />
      {/* head */}
      <path d="M100 32 C70 32 50 52 50 80 C50 104 66 124 84 130 L100 142 L116 130 C134 124 150 104 150 80 C150 52 130 32 100 32Z" fill="url(#sh-skin)" stroke="#6a0a10" strokeWidth="2" />
      {/* goatee */}
      <path d="M90 128 Q100 160 110 128 Q100 136 90 128Z" fill="#2a0a0a" />
      {/* sly eyebrows and glowing eyes */}
      <path d="M64 66 L92 76 M136 66 L108 76" stroke="#2a0a0a" strokeWidth="5" strokeLinecap="round" />
      <g className="sh-eyes">
        <path d="M68 82 Q80 72 92 84 Q80 90 68 82Z" fill="url(#sh-eye)" />
        <path d="M132 82 Q120 72 108 84 Q120 90 132 82Z" fill="url(#sh-eye)" />
        <ellipse cx="81" cy="82" rx="1.8" ry="5" fill="#1a0000" /><ellipse cx="119" cy="82" rx="1.8" ry="5" fill="#1a0000" />
      </g>
      {/* nose and a wicked grin */}
      <path d="M96 96 Q100 104 104 96" stroke="#6a0a10" strokeWidth="2" fill="none" />
      <path className="sh-grin" d="M72 106 Q100 132 128 106 Q100 118 72 106Z" fill="#2a0000" />
      <path d="M78 108 l4 6 4 -5 4 6 4 -5 4 6 4 -5 4 6 4 -5 4 6 4 -6" stroke="#fff" strokeWidth="2" fill="none" strokeLinejoin="round" />
      {/* the sack of gems he offers */}
      <g transform="translate(14 -16)"><g className="sh-sack">
        <path d="M128 176 Q120 150 138 146 L162 146 Q180 150 172 176 Q170 196 150 196 Q130 196 128 176Z" fill="#8a5a2b" stroke="#4a2c10" strokeWidth="2" />
        <path d="M136 148 Q150 140 164 148" stroke="#d4a017" strokeWidth="3" fill="none" />
        <path d="M142 140 l6 -8 6 8 -6 8z M154 136 l5 -6 5 6 -5 6z M136 136 l4 -5 4 5 -4 5z" fill="#5cc4ff" stroke="#1670cc" strokeWidth="1" />
        <circle cx="146" cy="130" r="2" fill="#fff" className="fx-twinkle" />
        <ellipse cx="131" cy="156" rx="8" ry="9" fill="url(#sh-skin)" stroke="#6a0a10" strokeWidth="1.5" />
        <path d="M127 151 q5 2 8 7 M126 156 q5 2 8 6" stroke="#6a0a10" strokeWidth="1.1" fill="none" />
      </g></g>
    </svg>
  );
}

/** The storm: big clouds roll in over the top from both sides, a cloud bank gathers below, lightning strikes. */
const TOP: [number, number, number][] = [[-8, -6, 62], [22, -10, 70], [52, -4, 64], [-14, 8, 54], [40, 6, 60], [70, 10, 50]];
const BANK: [number, number][] = [[-10, 0], [18, 4], [44, -2], [70, 3]];
const BOLTS = [
  { x: 22, d: "M30 0 L18 42 L32 42 L14 96 L46 34 L30 34 L42 0Z", t: 0.35 },
  { x: 72, d: "M24 0 L36 36 L22 36 L40 92 L10 30 L26 30 L14 0Z", t: 0.95 },
  { x: 46, d: "M28 0 L16 30 L30 30 L20 70 L44 24 L30 24 L38 0Z", t: 1.6 },
];

function Clouds({ closing }: { closing: boolean }) {
  return (
    <div className={`sh-clouds${closing ? " closing" : ""}`} aria-hidden="true">
      {BOLTS.map((b, i) => (
        <svg key={i} className="sh-bolt" viewBox="0 0 56 100" style={{ left: `${b.x}%`, ["--t" as string]: `${b.t}s`, ["--loop" as string]: `${5 + i * 1.7}s` }}>
          <path d={b.d} fill="#fffbe0" stroke="#ffe060" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      ))}
      {TOP.map(([x, y, w], i) => (
        <span key={`t${i}`} className="sh-cloud top" style={{ left: `${x}%`, top: `${y}%`, width: `${w}vmax`, ["--i" as string]: i,
          ["--from" as string]: x < 30 ? "-70vw" : "70vw" }} />
      ))}
      {BANK.map(([x, y], i) => (
        <span key={`b${i}`} className="sh-cloud bank" style={{ left: `${x}%`, bottom: `${y - 8}%`, ["--i" as string]: i + 3,
          ["--from" as string]: i % 2 ? "60vw" : "-60vw" }} />
      ))}
    </div>
  );
}

type Stage = "clouds" | "rise" | "offer" | "sink" | "grow" | "flee" | "leave";

/** What he says at each visit: the first offer, the second (bigger), and his "final offer". */
const PITCH = [
  (n: string) => <>Psst… <b className="who">{n}</b>! Skip your tasks today, and I'll give you</>,
  () => <>Hmm… you're tough. Fine! Skip just today and I'll give you</>,
  () => <>Okay, okay! My <b className="who">FINAL</b> offer. Skip today and take</>,
];

export default function ShaytanScene({ name, offer, ladder, onAnswer, onDone, preview = false }: {
  name: string; offer: number; ladder?: number[]; onAnswer?: (accept: boolean, refusals: number) => Promise<void> | void; onDone: () => void; preview?: boolean;
}) {
  const steps = ladder && ladder.length ? ladder : [offer, 100, 500];
  const [stage, setStage] = useState<Stage>("clouds");
  const [round, setRound] = useState(0);
  const [won, setWon] = useState(false); // the third "no": the happy ending
  useEffect(() => {
    void playSound("shaytan-arrive");
    const t = [window.setTimeout(() => setStage("rise"), 1500), window.setTimeout(() => setStage("offer"), 2900)];
    return () => t.forEach(clearTimeout);
  }, []);
  // His voice: each offer, the grumble, the laugh, the escape.
  useEffect(() => {
    const say: Partial<Record<Stage, SoundKey>> = { sink: "shaytan-grumble", grow: "shaytan-laugh", flee: "shaytan-flee" };
    const key = stage === "offer" ? (["shaytan-offer1", "shaytan-offer2", "shaytan-offer3"] as SoundKey[])[Math.min(round, 2)] : say[stage];
    if (key) void playSound(key);
  }, [stage, round]);
  async function answer(accept: boolean) {
    if (!accept && round < steps.length - 1) {
      // "No": he grumbles, sinks back into his clouds, and comes back with a bigger sack.
      setStage("sink");
      window.setTimeout(() => { setRound((r) => r + 1); setStage("rise"); }, 1700);
      window.setTimeout(() => setStage("offer"), 2900);
      return;
    }
    setStage(accept ? "grow" : "flee");
    setWon(!accept);
    if (!preview) await onAnswer?.(accept, round);
    window.setTimeout(() => setStage("leave"), accept ? 3600 : 5200);
    window.setTimeout(onDone, accept ? 5000 : 6200);
  }
  const amount = steps[Math.min(round, steps.length - 1)];
  const fire = stage === "grow" || (stage === "leave" && !won);
  return createPortal(
    <div className={`sh sh-${stage}${won ? " sh-won" : ""}`} role="dialog" aria-modal="true" aria-label="Shaytan appears">
      <div className="sh-flash" aria-hidden="true" />
      <div className="sh-flash late" aria-hidden="true" />
      {won && <div className="sh-dawn" aria-hidden="true">
        <div className="sh-sun" />
        {Array.from({ length: 14 }, (_, i) => <i key={i} className="sh-spark" style={{ ["--i" as string]: i, left: `${6 + i * 6.5}%`, top: `${10 + ((i * 37) % 55)}%` }} />)}
      </div>}
      <Clouds closing={stage === "leave" && !won} />
      <div className="sh-stage">
        {fire && <div className="sh-fire" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div>}
        <div className="sh-body" style={{ ["--sack" as string]: 1 + round * 0.35 }}><Devil /></div>
        {won && <div className="sh-vortex" aria-hidden="true" />}
        {won && <div className="sh-poof" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div>}
        {won && (
          <div className="sh-shield" aria-hidden="true">
            <svg viewBox="0 0 120 130">
              <defs>
                <radialGradient id="sh-sg" cx="50%" cy="35%"><stop offset="0" stopColor="#fffbe0" /><stop offset=".55" stopColor="#ffd34a" /><stop offset="1" stopColor="#c88a00" /></radialGradient>
              </defs>
              <g className="sh-rays">{Array.from({ length: 16 }, (_, i) => <path key={i} d="M60 64 L57 -30 H63 Z" fill="#fff6c0" opacity=".55" transform={`rotate(${i * 22.5} 60 64)`} />)}</g>
              <path d="M60 6 L108 24 V62 C108 94 86 116 60 126 C34 116 12 94 12 62 V24Z" fill="url(#sh-sg)" stroke="#fff" strokeWidth="3" />
              <path d="M60 18 L96 32 V62 C96 86 80 104 60 112 C40 104 24 86 24 62 V32Z" fill="none" stroke="#fff6c0" strokeWidth="2" opacity=".8" />
              <path d="M44 66 l12 12 22 -26" stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
      <div className="sh-talk">
        {stage === "offer" && <>
          <p className={`sh-bubble r${round}`} key={round}>{PITCH[Math.min(round, 2)](name)} <b className="sh-amount">{amount} <Gem /></b>. Deal?</p>
          <div className="sh-choices">
            <button className="sh-yes" onClick={() => answer(true)}>😈 Yes, deal!</button>
            <button className="sh-no" onClick={() => answer(false)}>🛡️ No! Aʿūdhu billāh</button>
          </div>
        </>}
        {stage === "sink" && <p className="sh-bubble grumble">Grrr… we'll see about that!</p>}
        {stage === "grow" && <p className="sh-bubble evil">HA HA HA! There are no gems, {name}. My promises are empty!</p>}
        {won && <div className="sh-win">
          <p className="sh-ar" lang="ar" dir="rtl">أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ</p>
          <p className="sh-win-title">You turned him down 3 times, {name}! 🌟</p>
          <p className="sh-win-sub">Shaytan is gone. Your Honor stays strong.</p>
        </div>}
      </div>
    </div>,
    document.body,
  );
}

/** The admin cut Honor after a deal with Shaytan: the member sees how much and why. */
export function ShaytanCut({ levels, onDone }: { levels: number; onDone: () => void }) {
  useEffect(() => { void playSound("shaytan-cut"); }, []);
  return createPortal(
    <div className="sh sh-verdict" role="dialog" aria-modal="true" aria-label="Honor cut">
      <div className="sh-verdict-card">
        <div className="sh-crack" aria-hidden="true">
          <svg viewBox="0 0 100 110"><path d="M50 4 L90 20 V54 C90 80 72 98 50 106 C28 98 10 80 10 54 V20Z" fill="#6a6f78" stroke="#2a2e35" strokeWidth="3" />
            <path className="sh-crack-line" d="M50 8 L44 34 L56 50 L42 70 L52 88 L48 104" stroke="#1a1d22" strokeWidth="3.5" fill="none" strokeLinejoin="round" /></svg>
        </div>
        <p className="sh-verdict-kicker">Honor cut</p>
        <b className="sh-verdict-num">−{levels}</b>
        <p>You made a deal with <b>Shaytan</b> and agreed to skip your tasks. His gems were never real, but the Honor you lost is.</p>
        <p className="sh-verdict-note">Finish every task to climb back up. You can do it!</p>
        <button className="primary" onClick={onDone}>I understand</button>
      </div>
    </div>,
    document.body,
  );
}
