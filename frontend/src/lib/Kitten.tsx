import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Avatar from "./Avatar";
import Gem from "./Gem";
import { playSound } from "./sounds";

/**
 * The thirsty kitten (a test from the Tests tab), inspired by the hadith of the man who gave water to a thirsty dog.
 * A thin kitten meows in the desert with pyramids behind. Water costs every gem you have. Give it, and the kitten
 * drinks, glows… and becomes the Pharaoh Cat: all the gems come back, with a secret achievement. Walk past and it
 * lies down sadly, with nothing lost.
 */

type Mood = "thirsty" | "drink" | "happy" | "sad";

/** The kitten: an original drawing, a thin little tabby. View box 0 0 200 200. */
function Cat({ mood }: { mood: Mood }) {
  const down = mood === "drink";
  return (
    <svg viewBox="0 0 200 200" className={`kt-cat c-${mood}`} aria-hidden="true">
      <ellipse cx="100" cy="188" rx="58" ry="8" fill="#0002" />
      {mood === "sad" ? (
        <g>
          {/* lying down, curled */}
          <path d="M40 180 Q30 150 70 146 Q130 140 158 160 Q170 176 150 184 Q100 192 40 180Z" fill="#e8a560" stroke="#b8763a" strokeWidth="2" />
          <path d="M70 152 q4 14 0 26 M90 148 q4 16 0 32 M112 148 q4 16 0 32" stroke="#c07a3a" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M150 176 Q186 176 180 158" stroke="#e8a560" strokeWidth="10" strokeLinecap="round" fill="none" />
          <g transform="translate(4 52)">
            <path d="M30 96 L26 70 L50 86Z M74 92 L84 68 L90 96Z" fill="#e8a560" stroke="#b8763a" strokeWidth="2" />
            <ellipse cx="58" cy="112" rx="34" ry="28" fill="#f0b46e" stroke="#b8763a" strokeWidth="2" />
            <path d="M42 108 q6 4 12 0 M64 108 q6 4 12 0" stroke="#3a2410" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M44 116 v6 M74 116 v6" stroke="#6ac8ff" strokeWidth="3" strokeLinecap="round" className="kt-tear" />
            <path d="M54 124 h8 l-4 4z" fill="#e0607a" />
          </g>
        </g>
      ) : (
        <g className="kt-sit">
          {/* tail */}
          <path d="M136 178 Q178 172 170 136 Q166 120 176 110" stroke="#e8a560" strokeWidth="10" strokeLinecap="round" fill="none" className="kt-tail" />
          {/* thin body (fuller when happy) */}
          <path d={mood === "happy" ? "M64 184 Q54 124 100 116 Q146 124 136 184Z" : "M74 184 Q66 128 100 120 Q134 128 126 184Z"} fill="#e8a560" stroke="#b8763a" strokeWidth="2" />
          {mood !== "happy" && <path d="M86 150 q14 4 28 0 M86 160 q14 4 28 0 M88 170 q12 3 24 0" stroke="#b8763a" strokeWidth="1.6" fill="none" opacity=".7" />}
          <path d="M88 184 v-14 M112 184 v-14" stroke="#b8763a" strokeWidth="2" />
          {/* head (lowered to drink) */}
          <g transform={down ? "translate(0 52) rotate(18 100 90)" : undefined} className="kt-head">
            <path d="M58 70 L54 26 L88 52Z M142 70 L146 26 L112 52Z" fill="#e8a560" stroke="#b8763a" strokeWidth="2" />
            <path d="M62 62 L60 36 L80 52Z M138 62 L140 36 L120 52Z" fill="#ffb8c8" />
            <ellipse cx="100" cy="82" rx="46" ry="40" fill="#f0b46e" stroke="#b8763a" strokeWidth="2" />
            <path d="M100 44 v12 M88 46 l3 10 M112 46 l-3 10" stroke="#c07a3a" strokeWidth="4" strokeLinecap="round" />
            {mood === "happy"
              ? <path d="M72 80 q10 -10 20 0 M108 80 q10 -10 20 0" stroke="#3a2410" strokeWidth="4" fill="none" strokeLinecap="round" />
              : down
                ? <path d="M72 82 q10 6 20 0 M108 82 q10 6 20 0" stroke="#3a2410" strokeWidth="4" fill="none" strokeLinecap="round" />
                : <><ellipse cx="82" cy="80" rx="9" ry="10" fill="#4a7a3a" /><ellipse cx="118" cy="80" rx="9" ry="10" fill="#4a7a3a" />
                  <ellipse cx="82" cy="81" rx="3.5" ry="8" fill="#1a1a0a" /><ellipse cx="118" cy="81" rx="3.5" ry="8" fill="#1a1a0a" />
                  <circle cx="85" cy="76" r="2.6" fill="#fff" /><circle cx="121" cy="76" r="2.6" fill="#fff" />
                  <path d="M70 68 L92 72 M130 68 L108 72" stroke="#b8763a" strokeWidth="3" strokeLinecap="round" /></>}
            <path d="M95 94 h10 l-5 5z" fill="#e0607a" />
            {mood === "happy"
              ? <path d="M88 102 q6 6 12 0 q6 6 12 0" stroke="#3a2410" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              : <><path d="M90 104 q10 -4 20 0" stroke="#3a2410" strokeWidth="2.4" fill="none" strokeLinecap="round" />
                <path d="M96 104 q4 12 8 0" fill="#ff8a9a" stroke="#c0405a" strokeWidth="1.2" className="kt-tongue" /></>}
            <path d="M60 94 h-22 M60 100 l-20 6 M140 94 h22 M140 100 l20 6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
            {mood === "happy" && <><ellipse cx="72" cy="96" rx="8" ry="4" fill="#ff8a9a" opacity=".55" /><ellipse cx="128" cy="96" rx="8" ry="4" fill="#ff8a9a" opacity=".55" /></>}
          </g>
        </g>
      )}
    </svg>
  );
}

type Stage = "arrive" | "choose" | "pay" | "drink" | "happy" | "pharaoh" | "walk" | "leave";

export default function KittenScene({ name, balance, onAnswer, onDone, preview = false }: {
  name: string; balance: number;
  onAnswer?: (water: boolean) => Promise<unknown> | void;
  onDone: (returned: number) => void; preview?: boolean;
}) {
  const [stage, setStage] = useState<Stage>("arrive");
  useEffect(() => {
    void playSound("kitten-meow");
    const t = window.setTimeout(() => setStage("choose"), 3200);
    return () => clearTimeout(t);
  }, []);
  const later = (ms: number, fn: () => void) => window.setTimeout(fn, ms);

  async function choose(water: boolean) {
    if (!preview) await onAnswer?.(water);
    if (water) {
      setStage("pay");
      later(2000, () => { setStage("drink"); void playSound("kitten-drink"); });
      later(5200, () => setStage("happy"));
      later(7600, () => { setStage("pharaoh"); void playSound("kitten-pharaoh"); });
    } else {
      setStage("walk");
      later(5500, () => setStage("leave"));
      later(6500, () => onDone(0));
    }
  }

  const mood: Mood = stage === "drink" ? "drink" : stage === "happy" ? "happy" : stage === "walk" || stage === "leave" ? "sad" : "thirsty";
  return createPortal(
    <div className={`kt kt-${stage}`} role="dialog" aria-modal="true" aria-label="A thirsty kitten in the desert">
      <div className="kt-sky" aria-hidden="true">
        <span className="kt-sun" />
        <svg className="kt-pyramids" viewBox="0 0 400 120" preserveAspectRatio="xMidYMax slice">
          <path d="M30 120 L110 30 L190 120Z" fill="#e0b060" /><path d="M110 30 L190 120 L130 120Z" fill="#c08a40" />
          <path d="M170 120 L270 10 L370 120Z" fill="#e8bb6a" /><path d="M270 10 L370 120 L292 120Z" fill="#c8924a" />
          <path d="M330 120 L372 74 L414 120Z" fill="#d8a858" /><path d="M372 74 L414 120 L384 120Z" fill="#b8843e" />
        </svg>
        <span className="kt-dune back" /><span className="kt-dune front" />
        <span className="kt-heat" />
      </div>
      {stage === "pharaoh" ? (
        <div className="kt-reveal">
          <div className="kt-rays" aria-hidden="true" />
          <div className="kt-pharaoh-pic"><Avatar avatar="pharaohcat" color="#ffd24a" frame="" size={170} /></div>
          <div className="kt-card">
            <p className="kt-kicker">🔓 Pharaoh Cat unlocked!</p>
            <h2>Mercy is never wasted, {name}</h2>
            <p className="kt-hadith">The Prophet ﷺ told of a man who gave water to a thirsty dog, and Allah thanked him and forgave him. Allah loves those who show mercy.</p>
            {balance > 0 && <p className="kt-back">All <b>{balance} <Gem /></b> are yours again!</p>}
            <button className="primary" autoFocus onClick={() => onDone(balance)}>Alhamdulillah ✨</button>
          </div>
        </div>
      ) : (
        <>
          <div className="kt-stage">
            <div className="kt-catwrap"><Cat mood={mood} /></div>
            {(stage === "pay" || stage === "drink" || stage === "happy") && <div className="kt-bowl" aria-hidden="true"><span className="kt-water" /></div>}
            {stage === "pay" && <div className="kt-gems" aria-hidden="true">{Array.from({ length: Math.min(14, Math.max(4, balance)) }, (_, i) => <span key={i} style={{ ["--i" as string]: i }}><Gem size={20} /></span>)}</div>}
            {stage === "happy" && <div className="kt-hearts" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }}>{i % 2 ? "💛" : "✨"}</i>)}</div>}
            {(stage === "arrive" || stage === "choose") && <span className="kt-think" aria-hidden="true">💧</span>}
          </div>
          <div className="kt-talk">
            {stage === "arrive" && <p className="kt-bubble">Meow… meow… 🥺</p>}
            {stage === "choose" && <>
              <p className="kt-bubble">A thin little kitten in the burning desert. It hasn't had water for days…</p>
              <p className="kt-note">Water costs <b>all your gems</b>{balance > 0 && <> ({balance} <Gem />)</>}.</p>
              <div className="kt-choices">
                <button className="kt-water-btn" onClick={() => choose(true)}>💧 Give it water{balance > 0 && <span>all {balance} <Gem /></span>}</button>
                <button className="kt-walk-btn" onClick={() => choose(false)}>🚶 Walk past</button>
              </div>
            </>}
            {stage === "pay" && <p className="kt-bubble">You gave everything you had… 💧</p>}
            {stage === "drink" && <p className="kt-bubble">*lap lap lap* 💦</p>}
            {stage === "happy" && <p className="kt-bubble good">Purrrr… 💛 Thank you, {name}!</p>}
            {(stage === "walk" || stage === "leave") && <p className="kt-bubble sad">You walked past… the kitten is still thirsty 😿</p>}
          </div>
        </>
      )}
      {preview && <button className="sh-skip" onClick={() => onDone(0)}>Close</button>}
    </div>,
    document.body,
  );
}
