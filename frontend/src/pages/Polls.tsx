import { useEffect, useState } from "react";
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

function NewPoll({ onMade }: { onMade: (d: PollsData) => void }) {
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
      <h3>📊 Ask the family</h3>
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
      <button className="primary" disabled={!q.trim() || opts.filter((o) => o.trim()).length < 2}>Post the poll</button>
    </form>
  );
}

/** Polls and surveys: the admin asks, the family answers. */
export default function Polls({ admin }: { admin: boolean }) {
  const [data, setData] = useState<PollsData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api.polls().then(setData).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load the polls")); }, []);
  const vote = async (id: string, choices: number[]) => {
    try {
      const first = data?.items.find((x) => x.id === id)?.mine === null;
      setData(await api.votePoll(id, choices)); notifyChanged();
      if (first) confetti();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Could not send your answer"); }
  };
  const close = async (p: PollItem) => setData(await api.closePoll(p.id, !p.closed));
  const remove = async (p: PollItem) => { if (confirm("Delete this poll and its answers?")) setData(await api.deletePoll(p.id)); };
  const open = data?.items.filter((p) => !p.closed) ?? [];
  const closed = data?.items.filter((p) => p.closed) ?? [];

  const card = (p: PollItem) => (
    <li key={p.id} className={`card pl-card${p.closed ? " closed" : ""}${!admin && !p.closed && p.mine === null ? " waiting" : ""}`}>
      <div className="pl-top">
        <span className="pl-ico" aria-hidden="true">{p.closed ? "🔒" : "📊"}</span>
        <h3>{p.question}</h3>
        {!admin && !p.closed && p.mine === null && <span className="news-new">New</span>}
      </div>
      <small className="note">
        {new Date(p.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })} · {p.voters} {p.voters === 1 ? "answer" : "answers"}
        {p.multi ? " · Many answers" : ""}{p.anonymous ? " · Anonymous" : ""}{admin && !p.show_results ? " · Results private" : ""}
      </small>
      {admin ? <Bars p={p} /> : <MemberPoll p={p} onVote={(c) => vote(p.id, c)} />}
      {admin && (
        <div className="pl-admin">
          <button onClick={() => void close(p)}>{p.closed ? "🔓 Open again" : "🔒 Close the poll"}</button>
          <button className="danger" onClick={() => void remove(p)}>🗑 Delete</button>
        </div>
      )}
    </li>
  );

  return (
    <section className="polls">
      <h2>📊 Polls</h2>
      <p className="note">{admin ? "Ask the family a question. They answer in their Polls tab." : "Questions from the family. Your answer helps decide!"}</p>
      {admin && <NewPoll onMade={setData} />}
      {error && <p className="err">{error}</p>}
      {data === null ? <p className="note">Loading…</p> : data.items.length === 0 ? (
        <div className="card news-empty"><span>🗳️</span><p>{admin ? "No polls yet. Ask your first question above!" : "No polls right now. Check back soon!"}</p></div>
      ) : (
        <>
          {open.length > 0 && <ul className="pl-list">{open.map(card)}</ul>}
          {closed.length > 0 && <><h3 className="pl-sub">Closed</h3><ul className="pl-list">{closed.map(card)}</ul></>}
        </>
      )}
    </section>
  );
}
