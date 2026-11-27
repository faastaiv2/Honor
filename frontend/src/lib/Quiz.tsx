import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { QuizShow } from "../api";
import Gem from "./Gem";
import { playSound } from "./sounds";

/**
 * The quiz scroll (a test from the Tests tab). A wise owl flies in with a scroll of questions the admin wrote.
 * One try per question: a right answer earns gems at once; a wrong one shows the right answer. Get them all right
 * and the owl takes a bow.
 */

type OwlMood = "calm" | "happy" | "sad" | "bow";

/** The owl sage: an original drawing with round glasses and a little cap. View box 0 0 180 200. */
export function Owl({ mood = "calm" }: { mood?: OwlMood }) {
  return (
    <svg viewBox="0 0 180 200" className={`qz-owl o-${mood}`} aria-hidden="true">
      <defs>
        <radialGradient id="qz-belly" cx="50%" cy="40%"><stop offset="0" stopColor="#f6e2c0" /><stop offset="1" stopColor="#d8b888" /></radialGradient>
        <linearGradient id="qz-feather" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9a6a3e" /><stop offset="1" stopColor="#6a4424" /></linearGradient>
      </defs>
      {/* branch */}
      <path d="M0 186 Q90 176 180 188" stroke="#6a4424" strokeWidth="10" strokeLinecap="round" fill="none" />
      <g className="qz-owl-body">
        <path className="qz-wing l" d="M40 100 Q18 136 36 170 Q50 150 52 112Z" fill="#7a4e2a" />
        <path className="qz-wing r" d="M140 100 Q162 136 144 170 Q130 150 128 112Z" fill="#7a4e2a" />
        <ellipse cx="90" cy="120" rx="54" ry="62" fill="url(#qz-feather)" />
        <ellipse cx="90" cy="134" rx="36" ry="44" fill="url(#qz-belly)" />
        <path d="M70 120 q6 6 12 0 M98 120 q6 6 12 0 M78 138 q6 6 12 0 M94 150 q6 6 12 0 M74 156 q6 6 12 0" stroke="#b8925a" strokeWidth="2" fill="none" />
        {/* ear tufts and a little scholar's cap */}
        <path d="M46 70 L40 36 L66 58Z M134 70 L140 36 L114 58Z" fill="#6a4424" />
        <path d="M58 46 L90 32 L122 46 L90 58Z" fill="#2a2a3a" /><rect x="84" y="50" width="12" height="10" fill="#2a2a3a" />
        <path d="M122 46 Q128 58 124 70" stroke="#e8b830" strokeWidth="2.5" fill="none" /><circle cx="124" cy="71" r="3.5" fill="#e8b830" />
        {/* face disc, glasses, eyes */}
        <ellipse cx="68" cy="84" rx="22" ry="20" fill="#e8cfa4" /><ellipse cx="112" cy="84" rx="22" ry="20" fill="#e8cfa4" />
        {mood === "happy" || mood === "bow"
          ? <path d="M58 86 Q68 76 78 86 M102 86 Q112 76 122 86" stroke="#2a1a0a" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          : mood === "sad"
            ? <><circle cx="68" cy="88" r="8" fill="#2a1a0a" /><circle cx="112" cy="88" r="8" fill="#2a1a0a" /><path d="M54 70 L80 78 M126 70 L100 78" stroke="#4a2c14" strokeWidth="3.5" strokeLinecap="round" /></>
            : <><circle cx="68" cy="84" r="9" fill="#2a1a0a" /><circle cx="112" cy="84" r="9" fill="#2a1a0a" /><circle cx="71" cy="81" r="3" fill="#fff" /><circle cx="115" cy="81" r="3" fill="#fff" /></>}
        <circle cx="68" cy="84" r="15" fill="none" stroke="#c8a030" strokeWidth="3" /><circle cx="112" cy="84" r="15" fill="none" stroke="#c8a030" strokeWidth="3" />
        <path d="M83 84 H97" stroke="#c8a030" strokeWidth="3" />
        <path d="M84 98 L90 110 L96 98Z" fill="#f0a030" />
        {/* feet */}
        <path d="M74 180 l-6 8 M78 180 v9 M82 180 l6 8 M98 180 l-6 8 M102 180 v9 M106 180 l6 8" stroke="#f0a030" strokeWidth="3.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

type Result = { right: boolean; answer: number; gems: number };

export default function QuizScene({ name, quiz, onAnswer, onDone, preview = false }: {
  name: string; quiz: QuizShow;
  onAnswer?: (index: number, choice: number) => Promise<Result>;
  onDone: (gems: number) => void; preview?: boolean;
}) {
  const n = quiz.questions.length;
  // Pick up where they left off (a quiz they started and closed).
  const firstOpen = Math.max(0, quiz.answers.findIndex((a) => a === -1));
  const [stage, setStage] = useState<"arrive" | "ask" | "end">("arrive");
  const [i, setI] = useState(firstOpen);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [score, setScore] = useState(() => quiz.answers.filter((a, k) => a !== -1 && a === quiz.questions[k].answer).length);
  const [earned, setEarned] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void playSound("owl-hoot");
    const t = window.setTimeout(() => setStage("ask"), 2200);
    return () => clearTimeout(t);
  }, []);

  async function pick(choice: number) {
    if (picked !== null || busy) return;
    setBusy(true);
    setPicked(choice);
    const r: Result = preview ? { right: choice === (quiz.questions[i].answer ?? 0), answer: quiz.questions[i].answer ?? 0, gems: choice === (quiz.questions[i].answer ?? 0) ? quiz.gems_each : 0 }
      : await (onAnswer?.(i, choice) ?? Promise.resolve({ right: false, answer: 0, gems: 0 }));
    setResult(r);
    if (r.right) { setScore((s) => s + 1); setEarned((g) => g + r.gems); }
    void playSound(r.right ? "quiz-right" : "quiz-wrong");
    setBusy(false);
  }
  function next() {
    if (i + 1 >= n) { setStage("end"); return; }
    setI(i + 1); setPicked(null); setResult(null);
  }

  const q = quiz.questions[i];
  const perfect = stage === "end" && score === n;
  const mood: OwlMood = stage === "end" ? (perfect ? "bow" : score > 0 ? "happy" : "sad") : result ? (result.right ? "happy" : "sad") : "calm";
  return createPortal(
    <div className={`qz qz-${stage}`} role="dialog" aria-modal="true" aria-label="The owl's quiz">
      <div className="qz-sky" aria-hidden="true">{Array.from({ length: 16 }, (_, k) => <i key={k} style={{ left: `${(k * 61) % 100}%`, top: `${(k * 23) % 40}%`, ["--i" as string]: k }} />)}</div>
      <div className={`qz-owlwrap${result?.right ? " yay" : ""}`}><Owl mood={mood} /></div>

      <div className="qz-card">
        {stage === "arrive" && <p className="qz-say">Hoo-hoo! Peace be upon you, <b>{name}</b>. I have brought you {n} question{n === 1 ? "" : "s"}… 📜</p>}
        {stage === "ask" && q && <>
          <div className="qz-head"><span>Question {i + 1} of {n}</span><span className="qz-score">{score} ✓{quiz.gems_each > 0 && <> · +{quiz.gems_each} <Gem /> each</>}</span></div>
          <p className="qz-q">{q.q}</p>
          <div className="qz-opts">
            {q.options.map((o, k) => {
              const state = result ? (k === result.answer ? " right" : k === picked ? " wrong" : " dim") : k === picked ? " picked" : "";
              return <button key={k} className={`qz-opt${state}`} onClick={() => pick(k)} disabled={picked !== null}>
                <span className="qz-letter">{"ABCD"[k]}</span>{o}</button>;
            })}
          </div>
          {result && <div className={`qz-result ${result.right ? "right" : "wrong"}`}>
            {result.right ? <b>Correct! {result.gems > 0 && <span className="qz-gems">+{result.gems} <Gem /></span>}</b> : <b>Not quite… the answer is {"ABCD"[result.answer]}.</b>}
            <button className="primary" autoFocus onClick={next}>{i + 1 >= n ? "Finish" : "Next question →"}</button>
          </div>}
        </>}
        {stage === "end" && <div className="qz-end">
          <p className="qz-big">{perfect ? "🌟" : score > 0 ? "👏" : "📚"}</p>
          <h2>{perfect ? <>MashaAllah! A true scholar!</> : score > 0 ? <>Well done, {name}!</> : <>Keep learning, {name}!</>}</h2>
          <p>You got <b>{score} of {n}</b> right{earned > 0 && <> and earned <b className="qz-gems">{earned} <Gem /></b></>}.</p>
          {perfect && <p className="qz-bow">The owl bows to you 🙇</p>}
          <button className="primary" autoFocus onClick={() => onDone(earned)}>{earned > 0 ? <>Collect <Gem /></> : "Thank you, owl!"}</button>
        </div>}
      </div>
      {preview && <button className="sh-skip" onClick={() => onDone(0)}>Close</button>}
    </div>,
    document.body,
  );
}
