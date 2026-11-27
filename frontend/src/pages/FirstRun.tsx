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
  if (p.resolved?.length) return <ResolvedPop item={p.resolved[0]} onDone={() => { const r = p.resolved![0]; setP({ ...p, resolved: p.resolved!.slice(1) }); api.feedbackSeen(r.id).catch(() => undefined); }} />;
  if (p.new_likes) return <LikesPop likes={p.new_likes} onDone={() => { setP({ ...p, new_likes: null }); api.likesSeen().catch(() => undefined); }} />;
  if (p.avatar_nudge && !p.member.shamed) return <AvatarNudge name={p.member.name} onDone={() => { setP({ ...p, avatar_nudge: false }); api.avatarNudgeSeen().catch(() => undefined); }} />;
  return null;
}

/** Waits until nothing else is on screen (a raid, Shaytan, a reward, the volume check…) for a few seconds. */
function useCalm(on: boolean) {
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    if (!on) { setCalm(false); return; }
    let n = 0;
    const t = window.setInterval(() => {
      n = document.querySelector('[aria-modal="true"]') ? 0 : n + 1;
      if (n >= 3) { setCalm(true); clearInterval(t); }
    }, 1000);
    return () => clearInterval(t);
  }, [on]);
  return calm;
}

/** The admin resolved one of this member's Help messages: "added because of you!", then what changed. */
function ResolvedPop({ item, onDone }: { item: NonNullable<Profile["resolved"]>[number]; onDone: () => void }) {
  const nav = useNavigate();
  const calm = useCalm(true);
  const [open, setOpen] = useState(false);
  if (!calm) return null;
  const bug = item.kind === "bug";
  return createPortal(
    <div className="avn" role="dialog" aria-modal="true" aria-labelledby="rs-h">
      <div className={`avn-card rs-card${open ? " open" : ""}`}>
        {!open ? <>
          <div className="rs-gift" aria-hidden="true"><span>🎁</span>{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }}>✨</i>)}</div>
          <h2 id="rs-h">{bug ? "Fixed" : "Added"}, because of you! 💛</h2>
          <p className="rs-quote">You {bug ? "reported" : "asked for"}: “{item.text}”</p>
          <div className="avn-btns"><button className="primary" autoFocus onClick={() => { setOpen(true); confetti(["#ffd24a", "#4aa8ff", "#ff7aa8", "#7ad86a"]); }}>👀 See what's {bug ? "fixed" : "added"}!</button></div>
        </> : <>
          <p className="rs-big" aria-hidden="true">{bug ? "🔧" : "🎉"}</p>
          <h2 id="rs-h">{item.reply || (bug ? "It works now. Thanks for telling us!" : "It's in the app now. Go and try it!")}</h2>
          <p>Thank you for helping make Honor better 🌟</p>
          <div className="avn-btns">
            {item.link ? <button className="primary" autoFocus onClick={() => { onDone(); nav(item.link!); }}>👉 Take me there!</button>
              : <button className="primary" autoFocus onClick={onDone}>Awesome!</button>}
            {item.link && <button onClick={onDone}>Later</button>}
          </div>
        </>}
      </div>
    </div>,
    document.body,
  );
}

/** Back in the app and people liked your new picture (or your win): who, how many, and a little confetti. */
function LikesPop({ likes, onDone }: { likes: NonNullable<Profile["new_likes"]>; onDone: () => void }) {
  const calm = useCalm(true);
  useEffect(() => { if (calm) confetti(["#ff4d6d", "#ffd24a", "#ffffff", "#ff8fa3"]); }, [calm]);
  if (!calm) return null;
  const others = likes.count - likes.names.length;
  const who = likes.names.length === 1 ? <b>{likes.names[0]}</b> : <><b>{likes.names[0]}</b>{others > 0 ? ", " : " and "}<b>{likes.names[1]}</b></>;
  return createPortal(
    <div className="avn" role="dialog" aria-modal="true" aria-labelledby="lk-h">
      <div className="avn-card lk-card">
        <div className="lk-hearts" aria-hidden="true">
          <span className="lk-big">❤️</span>
          {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }}>{i % 3 ? "❤️" : "💖"}</i>)}
          <b className="lk-num">{likes.count}</b>
        </div>
        <h2 id="lk-h">{who}{others > 0 && <> + {others} other{others === 1 ? "" : "s"}</>} liked {likes.what}!</h2>
        <p>The family loves it 🥰</p>
        <div className="avn-btns"><button className="primary" autoFocus onClick={onDone}>Let's go! 🎉</button></div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * The admin sent "Don't forget to set your avatar!" from the Members page. "Show me where" opens the Avatar
 * shop and points at the pictures; "Maybe later" closes it (the admin can send it again).
 */
function AvatarNudge({ name, onDone }: { name: string; onDone: () => void }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const calm = useCalm(!pathname.startsWith("/profile"));
  if (!calm || pathname.startsWith("/profile")) return null;
  const later = onDone;
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
          <button className="primary" autoFocus onClick={() => { onDone(); nav("/profile?pick=1"); }}>👉 Show me where</button>
          <button onClick={later}>Maybe later</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
