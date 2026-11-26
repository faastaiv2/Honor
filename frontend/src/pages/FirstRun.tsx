import { useEffect, useRef, useState } from "react";
import { api, type Profile } from "../api";
import Brazier from "../lib/Brazier";
import Gem from "../lib/Gem";
import Medal from "../lib/Medal";
import RankIcon from "../lib/RankIcon";
import { confetti } from "../lib/confetti";
import { useChangeCounter } from "../lib/events";

/**
 * The first time a member signs in: the Oath of Honor (they type I SWEAR), then a short welcome tour.
 * The server remembers both, so they show once on any device.
 */

const RANKS = ["bronze", "silver", "gold", "platinum", "emerald", "sapphire", "ruby", "diamond", "obsidian", "legendary"];

function Oath({ name, note, onSworn }: { name: string; note?: string; onSworn: () => void }) {
  const [words, setWords] = useState("");
  const [sealed, setSealed] = useState(false);
  const [error, setError] = useState("");
  const ok = words.trim().toUpperCase().replace(/\s+/g, " ") === "I SWEAR";

  async function swear() {
    if (!ok) return;
    try {
      await api.oath(words);
      setSealed(true);
      confetti(["#ffd24a", "#fff2b8", "#ffffff", "#c99a1e"]);
      window.setTimeout(onSworn, 2600);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save. Try again."); }
  }

  return (
    <div className={`fr fr-oath${sealed ? " sealed" : ""}`} role="dialog" aria-modal="true" aria-labelledby="oath-h">
      <div className="fr-sky" aria-hidden="true" />
      <div className="oath">
        <div className="oath-crest" aria-hidden="true"><RankIcon rank="legendary" className="ru-crest" /></div>
        {note ? (
          <div className="oath-warn" role="alert"><b>⚠️ {note}</b><span>Honor means you do it first, then tick it. Swear again to carry on.</span></div>
        ) : <p className="oath-kicker">Before you begin, {name}</p>}
        <h1 id="oath-h">The Oath of Honor</h1>
        <p className="oath-lead">Honor only means something if it's true.</p>
        <ol className="oath-rules">
          <li><span><b>Do it first, then tick it.</b> Only mark a task <u>after</u> you have completed it.</span></li>
          <li><span><b>Never tick what you didn't do.</b> Not even "I'll do it later".</span></li>
          <li><span><b>Missed one? Say so.</b> Use ⋯ to excuse it with an honest reason.</span></li>
          <li><span><b>Your word is your Honor.</b> Your parents trust what you mark.</span></li>
        </ol>
        <div className="oath-box">
          <p className="oath-words">"I swear on my <b>Honor</b> that I will only mark my tasks after I complete them, and that I will always be honest."</p>
          {!sealed ? (
            <form onSubmit={(e) => { e.preventDefault(); swear(); }}>
              <label className="oath-label" htmlFor="oath-in">Type <b>I SWEAR</b> to take the oath</label>
              <input id="oath-in" className={`oath-input${ok ? " ok" : ""}`} autoComplete="off" autoCapitalize="characters" spellCheck={false}
                maxLength={20} placeholder="Type here" value={words} onChange={(e) => { setWords(e.target.value); setError(""); }} />
              <button className="oath-btn" disabled={!ok}>I swear on my Honor</button>
              {error && <p className="err">{error}</p>}
            </form>
          ) : (
            <div className="oath-seal" role="status">
              <span className="seal" aria-hidden="true"><RankIcon rank="gold" className="ru-crest" /></span>
              <b>Sworn.</b> Your word is your Honor.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const CARDS = [
  {
    key: "tasks", title: "Tick your tasks", art: (
      <div className="tour-tasks" aria-hidden="true">
        {["Fajr", "Yaseen Sharif", "17 push-ups"].map((t, i) => (
          <div key={t} className={`tour-task${i < 2 ? " done" : ""}`}><span className="tour-box">{i < 2 ? "✓" : ""}</span>{t}</div>
        ))}
      </div>
    ),
    text: <>Every day, tick each task <b>after</b> you do it. You have until <b>11:59 PM</b>. Finish them all and your Honor arrives at midnight.</>,
  },
  {
    key: "ranks", title: "Climb the ranks", art: (
      <div className="tour-ranks" aria-hidden="true">{RANKS.map((r, i) => <span key={r} style={{ animationDelay: `${i * 0.08}s` }}><RankIcon rank={r} className="ru-crest" /></span>)}</div>
    ),
    text: <>Every Honor is a level: <b>I, II, III…</b> Climb from Bronze to Obsidian, then take the Legendary quest. Each rank brings more game time, new frames and themes.</>,
  },
  {
    key: "gems", title: "Earn gems", art: (
      <div className="tour-gems" aria-hidden="true"><Gem size={64} /><Medal icon="star" tier="gold" size={56} /><Gem size={44} /></div>
    ),
    text: <>Finish every task for <b>+20 gems</b>. New levels, new ranks and achievements give more. Spend them in your Profile's shop.</>,
  },
  {
    key: "streak", title: "Keep the fire burning", art: (
      <div className="tour-streak" aria-hidden="true"><Brazier size={80} /></div>
    ),
    text: <>Finish your tasks day after day to keep your streak lit, and open your <b>streak chest</b> for gems every day. Higher ranks get bigger chests.</>,
  },
  {
    key: "excuse", title: "Honest, always", art: (
      <div className="tour-excuse" aria-hidden="true">
        <div className="tour-task"><span className="tour-box" />Fajr<span className="tour-dots">⋯</span></div>
        <div className="tour-menu">🛡️ Excuse this task…</div>
      </div>
    ),
    text: <>Sick or travelling? Tap <b>⋯</b> next to a task and give an honest reason. That's what Honor means.</>,
  },
];

function Tour({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const last = i === CARDS.length - 1;
  const c = CARDS[i];
  const startX = useRef<number | null>(null);
  return (
    <div className="fr fr-tour" role="dialog" aria-modal="true" aria-label="Welcome tour"
      onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (startX.current === null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        if (dx < -50 && !last) setI(i + 1);
        if (dx > 50 && i > 0) setI(i - 1);
        startX.current = null;
      }}>
      <div className="fr-sky" aria-hidden="true" />
      <div className="tour">
        <button className="tour-skip" onClick={onDone}>Skip tour</button>
        <div className="tour-card" key={c.key}>
          <div className="tour-art">{c.art}</div>
          <h2>{c.title}</h2>
          <p>{c.text}</p>
        </div>
        <div className="tour-dots" role="tablist" aria-label="Tour steps">
          {CARDS.map((x, n) => <button key={x.key} role="tab" aria-selected={n === i} aria-label={`Step ${n + 1}`} className={n === i ? "on" : ""} onClick={() => setI(n)} />)}
        </div>
        <div className="tour-nav">
          {i > 0 ? <button className="tour-back" onClick={() => setI(i - 1)}>Back</button> : <span />}
          <button className="tour-next" onClick={() => (last ? onDone() : setI(i + 1))}>{last ? "Bismillah, let's go!" : "Next"}</button>
        </div>
      </div>
    </div>
  );
}

export default function FirstRun() {
  const [p, setP] = useState<Profile | null>(null);
  const changes = useChangeCounter();
  useEffect(() => { api.profile().then(setP).catch(() => undefined); }, [changes]);
  if (!p) return null;
  if (!p.oath) return <Oath name={p.member.name} note={p.oath_note} onSworn={() => setP({ ...p, oath: true, oath_note: "" })} />;
  if (!p.toured && !p.oath_note) return <Tour onDone={() => { setP({ ...p, toured: true }); api.toured().catch(() => undefined); }} />;
  return null;
}
