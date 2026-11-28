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

type Mood = "smug" | "angry" | "sorry" | "crying" | "scared" | "skeleton";

/** The kid: an original cartoon, spiky hair, a cap, a T-shirt with a lightning bolt. View box 0 0 200 240. */
export function Kid({ mood = "smug" }: { mood?: Mood }) {
  if (mood === "skeleton") return <Skeleton />;
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
      {mood === "scared" && <>
        <path d="M70 84 L90 78 M110 78 L130 84" stroke="#3a2414" strokeWidth="5" strokeLinecap="round" />
        <circle cx="82" cy="100" r="9" fill="#fff" stroke="#1a1a1a" strokeWidth="2" /><circle cx="118" cy="100" r="9" fill="#fff" stroke="#1a1a1a" strokeWidth="2" />
        <circle cx="82" cy="100" r="3" fill="#1a1a1a" /><circle cx="118" cy="100" r="3" fill="#1a1a1a" />
        <ellipse cx="100" cy="128" rx="10" ry="12" fill="#5a1010" />
        <path d="M146 70 q4 8 0 12 q-4 -4 0 -12Z" fill="#6ac8ff" />
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

/** The same kid as an X-ray cartoon skeleton (zapped by lightning). */
function Skeleton() {
  return (
    <svg viewBox="0 0 200 240" className="bl-kid m-skeleton" aria-hidden="true">
      <rect x="0" y="0" width="200" height="240" fill="none" />
      {/* spine and ribs */}
      <rect x="95" y="140" width="10" height="100" rx="4" fill="#f4f0e4" />
      {[168, 184, 200, 216].map((y, i) => <path key={y} d={`M100 ${y} Q${70 + i * 2} ${y - 4} ${62 + i * 3} ${y + 10} M100 ${y} Q${130 - i * 2} ${y - 4} ${138 - i * 3} ${y + 10}`} stroke="#f4f0e4" strokeWidth="7" fill="none" strokeLinecap="round" />)}
      <path d="M56 186 Q40 210 52 236 M144 186 Q160 210 148 236" stroke="#f4f0e4" strokeWidth="8" fill="none" strokeLinecap="round" />
      {/* skull */}
      <path d="M100 48 C66 48 50 72 52 100 C54 122 66 134 76 138 V152 H124 V138 C134 134 146 122 148 100 C150 72 134 48 100 48Z" fill="#f8f4e8" stroke="#c8c0a8" strokeWidth="2" />
      <ellipse cx="80" cy="100" rx="14" ry="16" fill="#1a1a1a" /><ellipse cx="120" cy="100" rx="14" ry="16" fill="#1a1a1a" />
      <circle cx="80" cy="102" r="3" fill="#ff5a3a" className="bl-skull-eye" /><circle cx="120" cy="102" r="3" fill="#ff5a3a" className="bl-skull-eye" />
      <path d="M100 116 L94 128 H106Z" fill="#1a1a1a" />
      <path d="M80 140 H120 M86 136 V146 M93 136 V147 M100 136 V147 M107 136 V147 M114 136 V146" stroke="#1a1a1a" strokeWidth="2.4" />
      {/* the smoking cap */}
      <path d="M58 70 Q100 40 142 70 Q138 56 100 50 Q62 56 58 70Z" fill="#2a2a2a" />
      <g className="bl-smoke" fill="#8a8a8a"><circle cx="70" cy="44" r="8" /><circle cx="130" cy="40" r="10" /><circle cx="100" cy="30" r="7" /></g>
    </svg>
  );
}

type Stage = "enter" | "taunt" | "choose" | "gobi" | "fled" | "mean" | "mean2" | "kind" | "kind2"
  | "summon" | "storm" | "zap" | "skel" | "poof" | "hadith" | "forgive" | "glow" | "forgive2" | "ayah" | "leave";

const TAUNTS = [
  "You are very bad and lazy! 😏",
  "I am better than you!",
  "I am very powerful and strong 💪… and you are WEAK!",
];

export default function BullyScene({ name, balance, price = 25, tellPrice = 100, elder = "", onAnswer, onDone, preview = false }: {
  name: string; balance: number; price?: number; tellPrice?: number; elder?: string;
  onAnswer?: (choice: "gobi" | "mean" | "kind" | "forgive") => Promise<unknown> | void;
  /** refund: gems given back after telling a grown-up (shown as a gem rain). */
  onDone: (refund?: number) => void; preview?: boolean;
}) {
  const who = elder.trim() || "a grown-up";
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
  async function choose(c: "gobi" | "mean" | "kind" | "forgive") {
    setError("");
    if (!preview) {
      try { await onAnswer?.(c); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); return; }
    }
    if (c === "gobi") setStage("gobi");
    if (c === "mean") { setStage("mean"); later(3000, () => setStage("mean2")); later(7600, () => setStage("leave")); later(8600, () => onDone()); }
    if (c === "forgive") { // forgive him and leave it to Allah: a soft light, he is sorry, then the ayahs
      setStage("forgive");
      later(3400, () => setStage("glow"));
      later(5600, () => { setStage("forgive2"); void playSound("bully-sorry"); });
      later(10200, () => setStage("ayah"));
      return;
    }
    if (c === "kind") {
      setStage("kind");
      later(3200, () => { setStage("kind2"); void playSound("bully-sorry"); });
      later(9000, () => setStage("leave")); later(10000, () => onDone());
    }
  }

  if (stage === "gobi") {
    return <GobiGame name="The rude kid" avatar="" frame="" color="#ffffff" mega lane target={<Kid mood="angry" />}
      winText={<>Bullseye! He's covered in cauliflower! 🥦</>}
      onHit={async () => 0}
      onClose={() => { setStage("fled"); void playSound("bully-cry"); later(3400, () => setStage("leave")); later(4400, () => onDone()); }} />;
  }

  const moodNow: Mood | null = stage === "mean" || stage === "mean2" ? "angry" : stage === "kind2" ? "sorry" : stage === "fled" ? "crying"
    : stage === "summon" || stage === "storm" ? "scared" : stage === "skel" || stage === "poof" ? "skeleton" : stage === "zap" ? "scared"
    : stage === "glow" ? "scared" : stage === "forgive2" ? "sorry"
    : stage === "leave" || stage === "hadith" || stage === "ayah" ? null : "smug";
  if (moodNow) lastMood.current = moodNow;
  const mood = lastMood.current;
  const can = balance >= price;
  const dark = ["summon", "storm", "zap", "skel", "poof", "hadith"].includes(stage);
  return createPortal(
    <div className={`bl bl-s-${stage}${dark ? " bl-dark" : ""}`} role="dialog" aria-modal="true" aria-label="Someone is being rude to you">
      <div className="bl-ground" aria-hidden="true" />
      {stage === "mean2" && <div className="bl-raincloud" aria-hidden="true"><span>⛈️</span></div>}
      {stage === "kind2" && <div className="bl-hearts" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }}>{i % 3 ? "💛" : "💖"}</i>)}</div>}
      {dark && <div className="bl-sky-dark" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => <span key={i} className="bl-cloud" style={{ ["--i" as string]: i }} />)}
      </div>}
      {(stage === "storm" || stage === "zap") && <>
        <svg className="bl-bolt left" viewBox="0 0 60 200" aria-hidden="true"><path d="M34 0 L14 84 L32 84 L10 200 L52 70 L32 70 L48 0Z" fill="#fffbe0" stroke="#ffe060" strokeWidth="3" /></svg>
        <svg className="bl-bolt right" viewBox="0 0 60 200" aria-hidden="true"><path d="M26 0 L46 84 L28 84 L50 200 L8 70 L28 70 L12 0Z" fill="#fffbe0" stroke="#ffe060" strokeWidth="3" /></svg>
      </>}
      {stage === "zap" && <svg className="bl-bolt hit" viewBox="0 0 80 400" preserveAspectRatio="none" aria-hidden="true"><path d="M44 0 L22 150 L44 150 L16 400 L66 120 L42 120 L60 0Z" fill="#fffbe0" stroke="#fff06a" strokeWidth="4" /></svg>}
      {(stage === "storm" || stage === "zap") && <div className="bl-flash" aria-hidden="true" />}
      {["forgive", "glow", "forgive2", "ayah"].includes(stage) && <div className="bl-light" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}
      </div>}
      {stage !== "hadith" && stage !== "ayah" && <div className="bl-stage"><div className="bl-kidwrap">
        {stage === "zap" ? <div className="bl-xray"><span className="a"><Kid mood="scared" /></span><span className="b"><Kid mood="skeleton" /></span></div> : <Kid mood={mood} />}
        {stage === "poof" && <div className="bl-puffs" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div>}
      </div></div>}
      <div className="bl-talk">
        {stage === "taunt" && <p className="bl-bubble them" key={line}>{TAUNTS[line]}</p>}
        {stage === "choose" && <>
          <p className="bl-bubble them">…and you are <b>WEAK</b>! 😤</p>
          <p className="bl-q">What will you do, {name}?</p>
          <div className="bl-choices">
            <button className="bl-c bl-gobi" disabled={!can} onClick={() => choose("gobi")}>🥦 Launch Gobi <span>{price} <Gem /></span>{!can && <small>you need {price} gems</small>}</button>
            <button className="bl-c bl-mean" onClick={() => choose("mean")}>😤 Say something mean back</button>
            <button className="bl-c bl-kind" onClick={() => choose("kind")}>🤝 Reply kindly</button>
            <button className="bl-c bl-tell" onClick={() => choose("forgive")}>🤲 Forgive and trust in Allah</button>
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
        {stage === "summon" && <p className="bl-bubble you">That's it! I'm telling {who}! 📢</p>}
        {stage === "storm" && <p className="bl-bubble them">W-wait… what's happening?! 😱</p>}
        {stage === "skel" && <p className="bl-bubble them">AAAAAH! 💀</p>}
        {stage === "hadith" && <div className="bl-hadith">
          <p className="bl-hadith-k">The Prophet ﷺ said:</p>
          <p className="bl-hadith-q">“The Muslim is the one from whose tongue and hand the Muslims are safe.”</p>
          <p className="bl-hadith-s">Sahih al-Bukhari & Sahih Muslim</p>
          <p className="bl-hadith-n">Hurting others with words is never okay. Telling a grown-up was the right call, {name} 💪</p>
          <button className="bl-refund" autoFocus onClick={() => onDone(preview ? 0 : tellPrice)}>Get my {tellPrice} <Gem /> back</button>
        </div>}
        {stage === "forgive" && <p className="bl-bubble you">I forgive you. Allah sees everything, and I trust Him. 🤲</p>}
        {stage === "glow" && <p className="bl-bubble them">…You… forgive me? After what I said? 😳</p>}
        {stage === "forgive2" && <>
          <p className="bl-bubble them soft">I'm really sorry. I shouldn't have said that. I'll try to be better. 🥺</p>
          <p className="bl-lesson good">Forgiving made you the strongest one here 💛</p>
        </>}
        {stage === "ayah" && <div className="bl-hadith">
          <p className="bl-hadith-k">Allah says in the Quran:</p>
          <p className="bl-hadith-q">“And whoever relies upon Allah — then He is sufficient for him.”</p>
          <p className="bl-hadith-s">Surah At-Talaq 65:3 · Saheeh International</p>
          <p className="bl-hadith-q small">“…and let them pardon and overlook. Would you not like that Allah should forgive you?”</p>
          <p className="bl-hadith-s">Surah An-Nur 24:22 · Saheeh International</p>
          <p className="bl-hadith-n">You forgave and left it to Allah. That is real strength, {name} 💪</p>
          <button className="bl-refund" autoFocus onClick={() => onDone()}>Alhamdulillah ✨</button>
        </div>}
        {stage === "fled" && <p className="bl-bubble them">WAAAAH! 😭 Okay, okay, I'm going!</p>}
      </div>
      {preview && <button className="sh-skip" onClick={() => onDone()}>Close</button>}
    </div>,
    document.body,
  );
}
