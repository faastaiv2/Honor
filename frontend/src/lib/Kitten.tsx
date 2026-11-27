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

type Mood = "thirsty" | "drink" | "happy" | "sad" | "still";

/** Big shiny kitten eyes (teary when thirsty). */
function KEyes({ teary }: { teary: boolean }) {
  return (
    <g>
      {[78, 122].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="96" rx="15" ry="16.5" fill="#2a1a12" />
          <ellipse cx={x} cy="99" rx="11" ry="12" fill="#5a3a24" />
          <circle cx={x + 5} cy="89" r="5.6" fill="#fff" />
          <circle cx={x - 5} cy="104" r="2.6" fill="#fff" />
          {teary && <path d={`M${x - 12} 108 Q${x} 114 ${x + 12} 108`} stroke="#9ad8ff" strokeWidth="3" fill="none" strokeLinecap="round" />}
        </g>
      ))}
    </g>
  );
}

/** The kitten: an original chibi drawing, a little cream-and-ginger kitten. View box 0 0 200 200. */
function Cat({ mood }: { mood: Mood }) {
  const down = mood === "drink"; // the head dips to the bowl (see .kt-drink .kt-head)
  const fur = "#ffd3a1", dark = "#f2a65e", line = "#c98a52";
  return (
    <svg viewBox="0 0 200 200" className={`kt-cat c-${mood}`} aria-hidden="true">
      <ellipse cx="100" cy="190" rx="54" ry="7" fill="#0002" />
      {mood === "sad" || mood === "still" ? (
        <g>
          {/* curled up, ears flat */}
          <path d="M46 184 Q34 154 72 150 Q132 144 156 164 Q166 180 146 186 Q100 194 46 184Z" fill={fur} stroke={line} strokeWidth="2" />
          <path d="M146 182 Q184 182 176 160" stroke={dark} strokeWidth="12" strokeLinecap="round" fill="none" />
          <g transform="translate(-6 58)">
            <path d="M28 98 Q22 78 44 84Z M92 98 Q98 78 76 84Z" fill={dark} stroke={line} strokeWidth="2" />
            <ellipse cx="60" cy="106" rx="38" ry="32" fill={fur} stroke={line} strokeWidth="2" />
            <path d="M54 76 q6 -6 12 0" stroke={dark} strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M40 106 q7 5 14 0 M66 106 q7 5 14 0" stroke="#3a2412" strokeWidth="3.4" fill="none" strokeLinecap="round" />
            {mood === "sad" && <path d="M47 114 v7 M73 114 v7" stroke="#9ad8ff" strokeWidth="3" strokeLinecap="round" className="kt-tear" />}
            <path d="M56 118 h8 l-4 4z" fill="#ff8aa6" />
          </g>
        </g>
      ) : (
        <g className="kt-sit">
          {/* fluffy tail */}
          <path d="M132 176 Q176 176 172 140 Q170 124 182 114" stroke={dark} strokeWidth="14" strokeLinecap="round" fill="none" className="kt-tail" />
          {/* small body (rounder once it has had water) */}
          <path d={mood === "happy" ? "M66 186 Q58 132 100 126 Q142 132 134 186Z" : "M74 186 Q68 136 100 130 Q132 136 126 186Z"} fill={fur} stroke={line} strokeWidth="2" />
          <path d="M86 140 Q100 158 114 140 Q108 150 100 152 Q92 150 86 140Z" fill="#fff6ea" />
          {mood !== "happy" && <path d="M88 162 q12 3 24 0 M90 170 q10 3 20 0" stroke={line} strokeWidth="1.4" fill="none" opacity=".55" />}
          {/* little paws */}
          <ellipse cx="86" cy="186" rx="11" ry="7" fill="#fff6ea" stroke={line} strokeWidth="1.6" />
          <ellipse cx="114" cy="186" rx="11" ry="7" fill="#fff6ea" stroke={line} strokeWidth="1.6" />
          <path d="M82 184 v4 M86 184 v4 M90 184 v4 M110 184 v4 M114 184 v4 M118 184 v4" stroke={line} strokeWidth="1.2" />
          {/* big head (lowered to drink) */}
          <g className="kt-head">
            {/* ears: droopy when thirsty, perky when happy */}
            <g transform={mood === "thirsty" ? "rotate(-14 60 64)" : undefined}><path d="M48 72 Q40 26 80 48Z" fill={fur} stroke={line} strokeWidth="2" /><path d="M54 64 Q50 38 74 52Z" fill="#ffb6c8" /></g>
            <g transform={mood === "thirsty" ? "rotate(14 140 64)" : undefined}><path d="M152 72 Q160 26 120 48Z" fill={fur} stroke={line} strokeWidth="2" /><path d="M146 64 Q150 38 126 52Z" fill="#ffb6c8" /></g>
            <ellipse cx="100" cy="96" rx="56" ry="48" fill={fur} stroke={line} strokeWidth="2" />
            {/* ginger stripes and a cream muzzle */}
            <path d="M100 50 v12 M88 52 q2 6 3 11 M112 52 q-2 6 -3 11" stroke={dark} strokeWidth="5" strokeLinecap="round" />
            <path d="M46 92 h10 M47 100 h8 M154 92 h-10 M153 100 h-8" stroke={dark} strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="100" cy="122" rx="24" ry="16" fill="#fff6ea" />
            {mood === "happy"
              ? <path d="M64 98 q14 -14 28 0 M108 98 q14 -14 28 0" stroke="#3a2412" strokeWidth="4.5" fill="none" strokeLinecap="round" />
              : down
                ? <path d="M66 100 q12 8 24 0 M110 100 q12 8 24 0" stroke="#3a2412" strokeWidth="4.5" fill="none" strokeLinecap="round" />
                : <KEyes teary />}
            {mood === "thirsty" && <path d="M62 76 Q72 72 84 78 M138 76 Q128 72 116 78" stroke={line} strokeWidth="3" fill="none" strokeLinecap="round" />}
            <path d="M95 114 Q100 110 105 114 Q100 120 95 114Z" fill="#ff8aa6" />
            {mood === "happy"
              ? <path d="M90 122 q5 6 10 0 q5 6 10 0" stroke="#3a2412" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              : <><path d="M92 123 q4 4 8 0 q4 4 8 0" stroke="#3a2412" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                <path d="M97 125 q3 9 6 0" fill="#ff9ab0" stroke="#d0607a" strokeWidth="1" className="kt-tongue" /></>}
            <ellipse cx="66" cy="116" rx="9" ry="5" fill="#ff9ab0" opacity={mood === "happy" ? .75 : .45} />
            <ellipse cx="134" cy="116" rx="9" ry="5" fill="#ff9ab0" opacity={mood === "happy" ? .75 : .45} />
            <path d="M72 120 h-24 M72 126 l-22 6 M128 120 h24 M128 126 l22 6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".9" />
          </g>
        </g>
      )}
    </svg>
  );
}

type Stage = "arrive" | "choose" | "pay" | "drink" | "happy" | "pharaoh" | "walk" | "still" | "soul" | "leave";

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
      // Left thirsty: it lies down, goes still, and its little soul rises to Heaven in a beam of light.
      setStage("walk");
      later(3200, () => setStage("still"));
      later(5200, () => setStage("soul"));
      later(12000, () => setStage("leave"));
      later(13000, () => onDone(0));
    }
  }

  const mood: Mood = stage === "drink" ? "drink" : stage === "happy" ? "happy" : stage === "walk" ? "sad"
    : stage === "still" || stage === "soul" || stage === "leave" ? "still" : "thirsty";
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
          {(stage === "soul" || stage === "leave") && <div className="kt-beam" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div>}
          <div className="kt-stage">
            <div className="kt-catwrap"><Cat mood={mood} /></div>
            {(stage === "soul" || stage === "leave") && <div className="kt-ghost" aria-hidden="true"><span className="kt-halo" /><Cat mood="happy" /><span className="kt-wing l" /><span className="kt-wing r" /></div>}
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
            {stage === "walk" && <p className="kt-bubble sad">You walked past… the kitten is still thirsty 😿</p>}
            {stage === "still" && <p className="kt-bubble sad">The little kitten couldn't go on… 💔</p>}
            {(stage === "soul" || stage === "leave") && <p className="kt-bubble soul">Its little soul rose up to Heaven… 🕊️<br /><small>A cup of water was all it needed.</small></p>}
          </div>
        </>
      )}
      {preview && <button className="sh-skip" onClick={() => onDone(0)}>Close</button>}
    </div>,
    document.body,
  );
}
