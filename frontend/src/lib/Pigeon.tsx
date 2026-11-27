import "@fontsource/im-fell-english/latin-400.css";
import "@fontsource/im-fell-english/latin-400-italic.css";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Gem from "./Gem";
import { playSound } from "./sounds";

/**
 * A carrier pigeon (sent from the Tests tab). It flutters in with a little scroll tied to its leg and lands on a
 * post. Tap the note: the pigeon flies off and the scroll unrolls: a thank-you in old (medieval) English,
 * signed by whoever sent it, with a gift of gems.
 */

/** The standard note, when the sender didn't write their own. */
export function medievalNote(name: string, gems: number) {
  return `Hear ye, hear ye! Unto the most noble ${name}, greetings and good tidings.

Word hath reached me of thy faithful labours, done day upon day without fail. Thy diligence bringeth great Honor unto this household, and it gladdeneth my heart.

As a token of my gratitude, pray accept ${gems > 0 ? `this humble gift of ${gems} gems` : "my heartfelt thanks"}. Keep up thy great work, and may Allah bless thee always.`;
}

/** The pigeon: an original drawing, grey with a shimmering neck, a scroll on its leg. View box 0 0 160 140. */
function Bird({ flying }: { flying: boolean }) {
  return (
    <svg viewBox="0 0 160 140" className={`pg-bird${flying ? " flying" : ""}`} aria-hidden="true">
      <defs>
        <linearGradient id="pg-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b9c0cc" /><stop offset="1" stopColor="#8a93a3" /></linearGradient>
        <linearGradient id="pg-neck" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5fae8a" /><stop offset=".5" stopColor="#7a6ab8" /><stop offset="1" stopColor="#4e8aa8" /></linearGradient>
        <linearGradient id="pg-wing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9aa3b2" /><stop offset="1" stopColor="#6c7586" /></linearGradient>
      </defs>
      {/* tail */}
      <path d="M30 78 L4 70 L8 86 L2 96 L34 92Z" fill="#5d6576" />
      {/* far wing */}
      <g className="pg-wing far"><path d="M70 64 Q40 20 20 26 Q40 50 54 74Z" fill="#7a8394" /></g>
      {/* body */}
      <ellipse cx="72" cy="82" rx="44" ry="28" fill="url(#pg-body)" />
      {/* legs and the scroll */}
      <path d="M70 106 L66 122 M66 122 l-6 4 M66 122 l2 6 M66 122 l6 3 M84 106 L86 122 M86 122 l-6 4 M86 122 l3 6 M86 122 l6 2" stroke="#d0546a" strokeWidth="3" strokeLinecap="round" fill="none" />
      <g className="pg-scroll">
        <rect x="88" y="110" width="26" height="12" rx="6" fill="#f3e2b8" stroke="#a8823e" strokeWidth="1.5" />
        <ellipse cx="88" cy="116" rx="3" ry="6" fill="#e2c98e" stroke="#a8823e" strokeWidth="1.2" />
        <path d="M84 112 L100 120 M100 112 L84 120" stroke="#b0242a" strokeWidth="2.4" />
      </g>
      {/* neck and head */}
      <path d="M96 76 Q100 46 112 40 Q128 40 128 56 Q124 70 112 84Z" fill="url(#pg-neck)" />
      <circle cx="118" cy="42" r="15" fill="#a4acba" />
      <circle cx="123" cy="39" r="4.2" fill="#ff9a2a" /><circle cx="124" cy="39" r="2" fill="#1a1a1a" /><circle cx="124.8" cy="38.2" r=".7" fill="#fff" />
      <path d="M132 43 L146 47 L132 50Z" fill="#3a3a3a" />
      <path d="M131 42 q3 -2 5 0" stroke="#f2f2f2" strokeWidth="2" fill="none" />
      {/* near wing */}
      <g className="pg-wing near"><path d="M58 70 Q74 20 104 14 Q100 46 92 76 Q76 86 58 70Z" fill="url(#pg-wing)" stroke="#5d6576" strokeWidth="1.2" />
        <path d="M66 70 Q76 48 92 34 M74 74 Q84 54 98 40 M82 78 Q90 60 100 50" stroke="#5d6576" strokeWidth="1.4" fill="none" opacity=".7" /></g>
    </svg>
  );
}

type Stage = "fly" | "land" | "open" | "read";

export default function PigeonScene({ name, sender, gems, message, onOpen, onDone, preview = false }: {
  name: string; sender: string; gems: number; message?: string;
  onOpen?: () => Promise<unknown> | void; onDone: (gems: number) => void; preview?: boolean;
}) {
  const [stage, setStage] = useState<Stage>("fly");
  useEffect(() => {
    void playSound("pigeon-coo");
    const t = window.setTimeout(() => setStage("land"), 2600);
    return () => clearTimeout(t);
  }, []);
  async function open() {
    if (stage !== "land") return;
    setStage("open");
    void playSound("pigeon-scroll");
    if (!preview) await onOpen?.();
    window.setTimeout(() => setStage("read"), 1200);
  }
  const text = message?.trim() || medievalNote(name, gems);
  const paras = text.split(/\n\s*\n/);
  return createPortal(
    <div className={`pg pg-${stage}`} role="dialog" aria-modal="true" aria-label={`A carrier pigeon with a note from ${sender}`}>
      <div className="pg-sky" aria-hidden="true">
        <span className="pg-sun" />
        {[0, 1, 2, 3].map((i) => <span key={i} className="pg-cloud" style={{ ["--i" as string]: i }} />)}
      </div>
      <div className="pg-perch" aria-hidden="true"><span className="pg-post" /></div>
      <button className="pg-birdbtn" onClick={open} disabled={stage !== "land"} aria-label="Open the note">
        <Bird flying={stage !== "land"} />
        {stage === "land" && <span className="pg-tap">📜 Tap the note</span>}
      </button>
      {stage === "land" && <p className="pg-bubble">Coo-coo! A message for <b>{name}</b>, from <b>{sender}</b>!</p>}

      {(stage === "open" || stage === "read") && (
        <div className="pg-letter">
          <span className="pg-rod top" aria-hidden="true" />
          <div className="pg-paper">
            <p className="pg-from">A letter from <b>{sender}</b></p>
            {paras.map((p, i) => <p key={i} className={i === 0 ? "pg-p first" : "pg-p"}>{p}</p>)}
            {gems > 0 && <p className="pg-gift"><span>Thy gift</span> <b>{gems} <Gem size={22} /></b></p>}
            <p className="pg-sign">By mine own hand,<br /><b>{sender}</b></p>
            <span className="pg-seal" aria-hidden="true">{(sender.trim()[0] || "H").toUpperCase()}</span>
            {stage === "read" && <button className="pg-accept" autoFocus onClick={() => onDone(gems)}>{gems > 0 ? <>Accept the gift <Gem /></> : "Thank you!"}</button>}
          </div>
          <span className="pg-rod bottom" aria-hidden="true" />
        </div>
      )}
      {preview && <button className="sh-skip" onClick={() => onDone(0)}>Close</button>}
    </div>,
    document.body,
  );
}
