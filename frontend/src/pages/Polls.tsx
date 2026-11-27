import { useState } from "react";
import { api, ApiError, type PollItem, type Polls as PollsData } from "../api";
import { confetti } from "../lib/confetti";
import { notifyChanged } from "../lib/events";

function Bars({ p }: { p: PollItem }) {
  const counts = p.counts ?? [];
  const total = counts.reduce((a, b) => a + b, 0);
  const top = Math.max(0, ...counts);
  return (
    <ul className="pl-bars">
      {p.options.map((o, i) => {
        const pct = total ? Math.round((counts[i] / total) * 100) : 0;
        return (
          <li key={i} className={`${p.mine?.includes(i) ? "mine" : ""}${counts[i] === top && top > 0 ? " lead" : ""}`}>
            <div className="pl-bar-fill" style={{ width: `${pct}%` }} />
            <span className="pl-bar-text">{p.mine?.includes(i) && <b aria-label="Your answer">✓ </b>}{o}</span>
            <span className="pl-bar-n">{pct}% <small>({counts[i]})</small></span>
            {p.who && p.who[i]?.length > 0 && <small className="pl-who">{p.who[i].join(", ")}</small>}
          </li>
        );
      })}
    </ul>
  );
}

function MemberPoll({ p, onVote }: { p: PollItem; onVote: (choices: number[]) => Promise<void> }) {
  const [picks, setPicks] = useState<number[]>(p.mine ?? []);
  const [changing, setChanging] = useState(false);
  const voted = p.mine !== null && !changing;
  if (voted || p.closed) {
    return (
      <>
        {p.counts ? <Bars p={p} /> : <p className="note">{p.mine ? "Thanks for answering! The results are kept private." : "This poll is closed."}</p>}
        {!p.closed && p.mine && <button className="pl-link" onClick={() => { setPicks(p.mine ?? []); setChanging(true); }}>Change my answer</button>}
      </>
    );
  }
  const toggle = (i: number) => setPicks((cur) => p.multi ? (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]) : [i]);
  return (
    <>
      <p className="note pl-hint">{p.multi ? "Pick as many as you like" : "Pick one"}{p.anonymous ? " · Anonymous: nobody sees what you picked" : ""}</p>
      <div className="pl-opts" role={p.multi ? "group" : "radiogroup"}>
        {p.options.map((o, i) => (
          <button key={i} role={p.multi ? "checkbox" : "radio"} aria-checked={picks.includes(i)} className={picks.includes(i) ? "on" : ""}
            onClick={() => p.multi ? toggle(i) : void onVote([i]).then(() => setChanging(false))}>
            <span className="pl-dot" aria-hidden="true">{picks.includes(i) ? "✓" : ""}</span>{o}
          </button>
        ))}
      </div>
      {p.multi && <button className="primary" disabled={!picks.length} onClick={() => void onVote(picks).then(() => setChanging(false))}>Send my answer</button>}
      {changing && <button className="pl-link" onClick={() => setChanging(false)}>Keep my answer</button>}
    </>
  );
}

function NewPoll({ onMade, onCancel }: { onMade: (d: PollsData) => void; onCancel?: () => void }) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", ""]);
  const [multi, setMulti] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [error, setError] = useState("");
  const send = async () => {
    try {
      onMade(await api.addPoll({ question: q, options: opts.filter((o) => o.trim()), multi, anonymous, show_results: showResults }));
      setQ(""); setOpts(["", ""]); setMulti(false); setAnonymous(false); setShowResults(true); setError("");
      notifyChanged();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Could not post the poll"); }
  };
  return (
    <form className="card pl-new" onSubmit={(e) => { e.preventDefault(); void send(); }}>
      <h3>📊 Ask the family a poll</h3>
      <label>Question<input value={q} maxLength={200} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Where shall we go on Sunday?" required /></label>
      <div className="pl-new-opts">
        {opts.map((o, i) => (
          <div key={i} className="pl-new-opt">
            <input value={o} maxLength={100} placeholder={`Answer ${i + 1}`} aria-label={`Answer ${i + 1}`}
              onChange={(e) => setOpts(opts.map((x, j) => j === i ? e.target.value : x))} />
            {opts.length > 2 && <button type="button" aria-label={`Remove answer ${i + 1}`} onClick={() => setOpts(opts.filter((_, j) => j !== i))}>✕</button>}
          </div>
        ))}
        {opts.length < 8 && <button type="button" className="pl-link" onClick={() => setOpts([...opts, ""])}>+ Add an answer</button>}
      </div>
      <div className="pl-toggles">
        <label><input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} /> Can pick more than one</label>
        <label><input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> Anonymous (you won't see who picked what)</label>
        <label><input type="checkbox" checked={showResults} onChange={(e) => setShowResults(e.target.checked)} /> Members see the results after answering</label>
      </div>
      {error && <p className="err">{error}</p>}
      <div className="row">
        <button className="primary" disabled={!q.trim() || opts.filter((o) => o.trim()).length < 2}>Post the poll</button>
        {onCancel && <button type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

/** A poll in the Community feed: members answer it right there; the admin sees the results and who picked what. */
export function PollCard({ p, admin, onChange }: { p: PollItem; admin: boolean; onChange: (d: PollsData) => void }) {
  const [error, setError] = useState("");
  const vote = async (choices: number[]) => {
    try {
      const first = p.mine === null;
      onChange(await api.votePoll(p.id, choices)); notifyChanged();
      if (first) confetti();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Could not send your answer"); }
  };
  const close = async () => onChange(await api.closePoll(p.id, !p.closed));
  const remove = async () => { if (confirm("Delete this poll and its answers?")) onChange(await api.deletePoll(p.id)); };
  return (
    <article className={`cm-post k-poll pl-card${p.closed ? " closed" : ""}${!admin && !p.closed && p.mine === null ? " waiting" : ""}`}>
      <header className="cm-head">
        <span className="cm-parent" style={{ width: 42, height: 42, fontSize: 22 }} aria-hidden="true">📊</span>
        <span className="cm-by"><b>Poll{p.closed ? " · closed" : ""}</b>
          <small>{new Date(p.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })} · {p.voters} {p.voters === 1 ? "answer" : "answers"}{p.anonymous ? " · Anonymous" : ""}</small></span>
        {!admin && !p.closed && p.mine === null && <span className="news-new">Answer me!</span>}
      </header>
      <div className="cm-body">
        <p className="cm-text big">{p.question}</p>
        {admin ? <Bars p={p} /> : <MemberPoll p={p} onVote={vote} />}
        {error && <p className="err">{error}</p>}
      </div>
      {admin && (
        <footer className="cm-foot"><span className="news-tools">
          <button onClick={() => void close()}>{p.closed ? "🔓 Open again" : "🔒 Close"}</button>
          <button className="danger" onClick={() => void remove()}>Delete</button>
        </span></footer>
      )}
    </article>
  );
}

export { NewPoll, MemberPoll, Bars };
