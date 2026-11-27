import { useEffect, useState } from "react";
import { api, ApiError, type FeedbackItem } from "../api";
import { notifyChanged } from "../lib/events";

const PAGES: Record<string, string> = { "/": "Today", "/leaderboard": "Leaderboard", "/achievements": "Achievements", "/news": "Community",
  "/events": "Events", "/profile": "Avatar", "/benefits": "Benefits" };

/** The admin's Inbox: feature requests and bug reports from the Help button. */
export default function Inbox() {
  const [items, setItems] = useState<FeedbackItem[] | null>(null);
  const [filter, setFilter] = useState<"open" | "feature" | "bug" | "done">("open");
  const [error, setError] = useState("");
  const load = () => api.feedback().then((r) => {
    setItems(r.items);
    if (r.unread) api.feedbackRead().then(notifyChanged).catch(() => undefined);
  }).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load"));
  useEffect(() => { void load(); }, []);

  const [resolving, setResolving] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const mark = async (f: FeedbackItem, note?: string) => { await api.markFeedback(f.id, !f.done, note).catch(() => undefined); setResolving(null); setReply(""); void load(); };
  const remove = async (f: FeedbackItem) => { if (!confirm("Delete this message?")) return; await api.deleteFeedback(f.id).catch(() => undefined); void load(); };
  const shown = (items ?? []).filter((f) => filter === "done" ? f.done : !f.done && (filter === "open" || f.kind === filter));
  const n = (fn: (f: FeedbackItem) => boolean) => (items ?? []).filter(fn).length;

  return (
    <section className="inbox">
      <h2>📬 Inbox</h2>
      <p className="note">Feature requests and bug reports from the Help button.</p>
      <div className="ax-filters" role="tablist">
        {([["open", "All open", n((f) => !f.done)], ["feature", "💡 Features", n((f) => !f.done && f.kind === "feature")],
          ["bug", "🐞 Bugs", n((f) => !f.done && f.kind === "bug")], ["done", "✓ Done", n((f) => f.done)]] as const).map(([k, l, c]) => (
          <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{l} <small>{c}</small></button>
        ))}
      </div>
      {error && <p className="err">{error}</p>}
      {items === null ? <p className="note">Loading…</p> : shown.length === 0 ? (
        <div className="card news-empty"><span>📭</span><p>{filter === "done" ? "Nothing marked done yet." : "No messages. All quiet!"}</p></div>
      ) : (
        <ul className="inbox-list">
          {shown.map((f) => (
            <li key={f.id} className={`inbox-item ${f.kind}${f.done ? " done" : ""}${!f.read ? " new" : ""}`}>
              <span className="inbox-ico" aria-hidden="true">{f.kind === "bug" ? "🐞" : "💡"}</span>
              <div className="inbox-body">
                <div className="inbox-top">
                  <b>{f.name || "Someone"}</b>
                  <span className={`inbox-tag ${f.kind}`}>{f.kind === "bug" ? "Bug" : "Feature"}</span>
                  {!f.read && <span className="news-new">New</span>}
                  <small>{new Date(f.created_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}{f.page ? ` · on ${PAGES[f.page] ?? f.page}` : ""}</small>
                </div>
                <p>{f.text}</p>
                {f.done && f.reply && <p className="inbox-reply">✓ {f.reply}</p>}
                {resolving === f.id ? (
                  <form className="inbox-resolve" onSubmit={(e) => { e.preventDefault(); void mark(f, reply); }}>
                    <label>What did you {f.kind === "bug" ? "fix" : "add"}? <small>{f.name} sees this in a “because of you!” pop-up</small>
                      <input autoFocus maxLength={500} value={reply} onChange={(e) => setReply(e.target.value)}
                        placeholder={f.kind === "bug" ? "e.g. The map opens properly now" : "e.g. Added a pet you can look after!"} /></label>
                    <div className="inbox-tools"><button className="primary">✓ Done, tell {f.name || "them"}</button><button type="button" onClick={() => setResolving(null)}>Cancel</button></div>
                  </form>
                ) : (
                  <div className="inbox-tools">
                    <button onClick={() => (f.done ? mark(f) : (setResolving(f.id), setReply("")))}>{f.done ? "↩ Reopen" : "✓ Mark done"}</button>
                    <button className="danger" onClick={() => remove(f)}>Delete</button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
