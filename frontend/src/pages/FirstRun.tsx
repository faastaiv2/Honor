import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import Avatar from "../lib/Avatar";
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
  if (!p.member.shamed && !((p.member.own_avatar ?? p.member.avatar) || "")) return <AvatarNudge id={p.member.id} name={p.member.name} />;
  return null;
}

/** "Maybe later" hides the reminder until tomorrow. */
const laterKey = (id: string) => `honor.avatarLater.${id}`;
const today = () => new Date().toLocaleDateString("en-CA");

/**
 * Signed in but still the plain picture: a friendly reminder to choose one, with "Show me where" (opens the
 * Avatar shop and points at the pictures) or "Maybe later" (asks again tomorrow). Waits for any other big
 * animation or pop-up on the screen to finish first.
 */
function AvatarNudge({ id, name }: { id: string; name: string }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [snoozed, setSnoozed] = useState(() => { try { return localStorage.getItem(laterKey(id)) === today(); } catch { return false; } });
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (snoozed || pathname.startsWith("/profile")) { setShow(false); return; }
    let calm = 0;
    const t = window.setInterval(() => {
      // Something else is on screen (a raid, Shaytan, a reward, the volume check…): wait for it to finish.
      calm = document.querySelector('[aria-modal="true"]') ? 0 : calm + 1;
      if (calm >= 3) { setShow(true); clearInterval(t); }
    }, 1000);
    return () => clearInterval(t);
  }, [snoozed, pathname]);
  if (!show || snoozed || pathname.startsWith("/profile")) return null;
  const later = () => { try { localStorage.setItem(laterKey(id), today()); } catch { /* private mode */ } setSnoozed(true); };
  return createPortal(
    <div className="avn" role="dialog" aria-modal="true" aria-labelledby="avn-h">
      <div className="avn-card">
        <div className="avn-faces" aria-hidden="true">
          {["lion", "unicorn", "owl", "fox", "dolphin"].map((a, i) => <span key={a} style={{ ["--i" as string]: i }}><Avatar avatar={a} color="#ffffff" size={40} /></span>)}
          <span className="avn-me"><Avatar avatar="" color="#ffffff" size={64} /><i>?</i></span>
        </div>
        <h2 id="avn-h">Don't forget to set your avatar!</h2>
        <p>{name}, you're still the plain picture 👤. Pick one so everyone can see it's you on the Leaderboard and in Community.</p>
        <div className="avn-btns">
          <button className="primary" autoFocus onClick={() => { setShow(false); nav("/profile?pick=1"); }}>👉 Show me where</button>
          <button onClick={later}>Maybe later</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
