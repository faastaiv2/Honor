import { useEffect, useState } from "react";
import { api, type Profile } from "../api";
import RankIcon from "../lib/RankIcon";
import { confetti } from "../lib/confetti";
import { useChangeCounter } from "../lib/events";
import GuidedTour from "../lib/GuidedTour";

/**
 * The first time a member signs in: the Oath of Honor (they type I SWEAR), then a short welcome tour.
 * The server remembers both, so they show once on any device.
 */


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

export default function FirstRun() {
  const [p, setP] = useState<Profile | null>(null);
  const changes = useChangeCounter();
  useEffect(() => { api.profile().then(setP).catch(() => undefined); }, [changes]);
  if (!p) return null;
  if (!p.oath) return <Oath name={p.member.name} note={p.oath_note} onSworn={() => setP({ ...p, oath: true, oath_note: "" })} />;
  if (!p.toured && !p.oath_note) return <GuidedTour onDone={() => { setP({ ...p, toured: true }); api.toured().catch(() => undefined); }} />;
  return null;
}
