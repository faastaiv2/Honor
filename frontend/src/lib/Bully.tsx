import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Gem from "./Gem";
import GobiGame from "./GobiGame";
import { playSound } from "./sounds";

/**
 * Someone was rude to you (a test from the Tests tab). A boastful kid struts in: "You are very bad and lazy!
 * I am better than you…". Three choices:
 *  - Launch Gobi (25 gems): the upgraded golden launcher; hit him and he runs off crying.
 *  - Say something mean back: he gets angrier, a storm cloud, and two angry people.
 *  - Reply kindly: he says sorry and becomes a friend (the Gentle Heart achievement).
 */

type Mood = "smug" | "angry" | "sorry" | "crying";

/** The kid: an original cartoon, spiky hair, a cap, a T-shirt with a lightning bolt. View box 0 0 200 240. */
export function Kid({ mood = "smug" }: { mood?: Mood }) {
  const skin = mood === "angry" ? "#f0907a" : "#f6c9a0";
  return (
    <svg viewBox="0 0 200 240" className={`bl-kid m-${mood}`} aria-hidden="true">
      {/* body: arms crossed when smug or angry, open when sorry */}
      <path d="M52 240 Q50 168 100 160 Q150 168 148 240Z" fill="#e0453a" stroke="#9a2a20" strokeWidth="2" />
      <path d="M96 180 L86 204 L100 202 L92 226 L114 196 L100 198 L108 180Z" fill="#ffd24a" stroke="#c08a00" strokeWidth="1.2" />
      {mood === "sorry"
        ? <><path d="M58 186 Q44 214 62 232" stroke={skin} strokeWidth="16" strokeLinecap="round" fill="none" /><path d="M142 186 Q160 210 150 230" stroke={skin} strokeWidth="16" strokeLinecap="round" fill="none" /></>
        : <><path d="M58 190 Q100 214 142 192" stroke="#c8392f" strokeWidth="20" strokeLinecap="round" fill="none" /><path d="M66 194 Q100 210 134 196" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" opacity=".9" /></>}
      {/* neck and head */}
      <rect x="90" y="140" width="20" height="24" rx="6" fill={skin} />
      <ellipse cx="100" cy="100" rx="48" ry="50" fill={skin} stroke="#c08a6a" strokeWidth="1.5" />
      <ellipse cx="52" cy="104" rx="8" ry="11" fill={skin} /><ellipse cx="148" cy="104" rx="8" ry="11" fill={skin} />
      {/* spiky hair and a backwards cap */}
      <path d="M54 82 L50 52 L66 64 L70 36 L86 56 L96 30 L106 54 L122 34 L126 60 L144 48 L146 82 Q100 60 54 82Z" fill="#3a2414" />
      <path d="M58 70 Q100 40 142 70 Q138 56 100 50 Q62 56 58 70Z" fill="#2a5ad0" />
      <path d="M58 70 Q40 74 34 66 Q44 60 60 62Z" fill="#1e44a8" />
      {/* eyebrows, eyes, mouth by mood */}
      {mood === "smug" && <>
        <path d="M70 84 L92 90 M108 90 L130 82" stroke="#3a2414" strokeWidth="5" strokeLinecap="round" />
        <path d="M74 100 Q82 96 90 100" stroke="#1a1a1a" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M110 100 Q118 96 126 100" stroke="#1a1a1a" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M84 124 Q104 132 120 118" stroke="#7a2a1a" strokeWidth="4" fill="none" strokeLinecap="round" />
      </>}
      {mood === "angry" && <>
        <path d="M68 80 L92 94 M108 94 L132 80" stroke="#3a2414" strokeWidth="6" strokeLinecap="round" />
        <circle cx="82" cy="102" r="5" fill="#1a1a1a" /><circle cx="118" cy="102" r="5" fill="#1a1a1a" />
        <path d="M80 130 Q100 116 120 130 Z" fill="#7a1a1a" />
        <g className="bl-steam" fill="#fff"><circle cx="40" cy="60" r="8" /><circle cx="160" cy="60" r="8" /><circle cx="34" cy="46" r="5" /><circle cx="166" cy="46" r="5" /></g>
      </>}
      {mood === "sorry" && <>
        <path d="M72 88 L90 84 M110 84 L128 88" stroke="#3a2414" strokeWidth="4.5" strokeLinecap="round" />
        <ellipse cx="82" cy="102" rx="6" ry="7" fill="#1a1a1a" /><ellipse cx="118" cy="102" rx="6" ry="7" fill="#1a1a1a" />
        <circle cx="84" cy="99" r="2" fill="#fff" /><circle cx="120" cy="99" r="2" fill="#fff" />
        <ellipse cx="70" cy="118" rx="9" ry="5" fill="#ff8a9a" opacity=".6" /><ellipse cx="130" cy="118" rx="9" ry="5" fill="#ff8a9a" opacity=".6" />
        <path d="M88 124 Q100 132 112 124" stroke="#7a2a1a" strokeWidth="4" fill="none" strokeLinecap="round" />
      </>}
      {mood === "crying" && <>
        <path d="M70 90 L90 84 M110 84 L130 90" stroke="#3a2414" strokeWidth="5" strokeLinecap="round" />
        <path d="M74 102 Q82 108 90 102 M110 102 Q118 108 126 102" stroke="#1a1a1a" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M82 134 Q100 116 118 134 Q100 128 82 134Z" fill="#7a1a1a" />
        <g className="bl-tears" fill="#6ac8ff"><path d="M80 108 q-4 10 0 14 q4 -4 0 -14Z" /><path d="M120 108 q-4 10 0 14 q4 -4 0 -14Z" /></g>
        {/* cauliflower bits stuck in his hair */}
        <g fill="#fff6d8" stroke="#e0d2a0" strokeWidth="1"><circle cx="70" cy="58" r="7" /><circle cx="118" cy="50" r="6" /><circle cx="134" cy="70" r="5" /><circle cx="90" cy="46" r="5" /></g>
      </>}
    </svg>
  );
}

type Stage = "enter" | "taunt" | "choose" | "gobi" | "fled" | "mean" | "mean2" | "kind" | "kind2" | "leave";

const TAUNTS = [
  "You are very bad and lazy! 😏",
  "I am better than you!",
  "I am very powerful and strong 💪… and you are WEAK!",
];

export default function BullyScene({ name, balance, price = 25, onAnswer, onDone, preview = false }: {
  name: string; balance: number; price?: number;
  onAnswer?: (choice: "gobi" | "mean" | "kind") => Promise<unknown> | void;
  onDone: () => void; preview?: boolean;
}) {
  const [stage, setStage] = useState<Stage>("enter");
  const [line, setLine] = useState(0);
  const [error, setError] = useState("");
  const lastMood = useRef<Mood>("smug");
  useEffect(() => {
    const t = [
      window.setTimeout(() => { setStage("taunt"); void playSound("bully-taunt"); }, 1500),
      window.setTimeout(() => setLine(1), 3300),
      window.setTimeout(() => setLine(2), 5000),
      window.setTimeout(() => setStage("choose"), 7400),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  const later = (ms: number, fn: () => void) => window.setTimeout(fn, ms);
  async function choose(c: "gobi" | "mean" | "kind") {
    setError("");
    if (!preview) {
      try { await onAnswer?.(c); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); return; }
    }
    if (c === "gobi") setStage("gobi");
    if (c === "mean") { setStage("mean"); later(3000, () => setStage("mean2")); later(7600, () => setStage("leave")); later(8600, onDone); }
    if (c === "kind") {
      setStage("kind");
      later(3200, () => { setStage("kind2"); void playSound("bully-sorry"); });
      later(9000, () => setStage("leave")); later(10000, onDone);
    }
  }

  if (stage === "gobi") {
    return <GobiGame name="The rude kid" avatar="" frame="" color="#ffffff" mega target={<span className="bl-target"><Kid mood="angry" /></span>}
      winText={<>Bullseye! He's covered in cauliflower! 🥦</>}
      onHit={async () => 0}
      onClose={() => { setStage("fled"); void playSound("bully-cry"); later(3400, () => setStage("leave")); later(4400, onDone); }} />;
  }

  const moodNow: Mood | null = stage === "mean" || stage === "mean2" ? "angry" : stage === "kind2" ? "sorry" : stage === "fled" ? "crying" : stage === "leave" ? null : "smug";
  if (moodNow) lastMood.current = moodNow;
  const mood = lastMood.current;
  const can = balance >= price;
  return createPortal(
    <div className={`bl bl-${stage}`} role="dialog" aria-modal="true" aria-label="Someone is being rude to you">
      <div className="bl-ground" aria-hidden="true" />
      {stage === "mean2" && <div className="bl-storm" aria-hidden="true"><span>⛈️</span></div>}
      {stage === "kind2" && <div className="bl-hearts" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }}>{i % 3 ? "💛" : "💖"}</i>)}</div>}
      <div className="bl-stage"><div className="bl-kidwrap"><Kid mood={mood} /></div></div>
      <div className="bl-talk">
        {stage === "taunt" && <p className="bl-bubble them" key={line}>{TAUNTS[line]}</p>}
        {stage === "choose" && <>
          <p className="bl-bubble them">…and you are <b>WEAK</b>! 😤</p>
          <p className="bl-q">What will you do, {name}?</p>
          <div className="bl-choices">
            <button className="bl-c bl-gobi" disabled={!can} onClick={() => choose("gobi")}>🥦 Launch Gobi <span>{price} <Gem /></span>{!can && <small>you need {price} gems</small>}</button>
            <button className="bl-c bl-mean" onClick={() => choose("mean")}>😤 Say something mean back</button>
            <button className="bl-c bl-kind" onClick={() => choose("kind")}>🤝 Reply kindly</button>
          </div>
          {error && <p className="err">{error}</p>}
        </>}
        {stage === "mean" && <p className="bl-bubble you">Well YOU are mean and annoying! You're not strong at all, and nobody even likes you! 😠</p>}
        {stage === "mean2" && <>
          <p className="bl-bubble them">WHAT?! You're the WORST! I'm never talking to you again! 😡</p>
          <p className="bl-lesson">Being mean back only made two angry people… 😞</p>
        </>}
        {stage === "kind" && <p className="bl-bubble you">I'm sorry you're having a bad day. I don't think you're weak or bad… would you like to be friends? 😊</p>}
        {stage === "kind2" && <>
          <p className="bl-bubble them soft">…I'm sorry. I was just being mean. You're actually really nice. Friends? 🤝</p>
          <p className="bl-lesson good">Kindness turned a bully into a friend 💛</p>
        </>}
        {stage === "fled" && <p className="bl-bubble them">WAAAAH! 😭 Okay, okay, I'm going!</p>}
      </div>
      {preview && <button className="sh-skip" onClick={onDone}>Close</button>}
    </div>,
    document.body,
  );
}
