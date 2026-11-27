import { useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { api, ApiError } from "../api";

/**
 * The Help button next to Sign out: request a feature or report a bug. It goes to the admin's Inbox.
 */
type Kind = "feature" | "bug";
const KINDS: Record<Kind, { icon: string; title: string; sub: string; ask: string; hint: string; thanks: string }> = {
  feature: { icon: "💡", title: "Request a feature", sub: "An idea to make Honor better",
    ask: "What would you like Honor to have?", hint: "e.g. A pet that grows when I finish my tasks", thanks: "Great idea! It's on its way to the admin 💡" },
  bug: { icon: "🐞", title: "Report a bug", sub: "Something isn't working right",
    ask: "What went wrong? What did you tap, and what happened?", hint: "e.g. I tapped Collect and the gems didn't arrive", thanks: "Thank you! The admin will take a look 🔧" },
};

export default function HelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="help-btn" onClick={() => setOpen(true)} aria-haspopup="dialog">❓ Help</button>
      {open && <HelpDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  const { pathname } = useLocation();
  const [kind, setKind] = useState<Kind | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const k = kind ? KINDS[kind] : null;

  async function submit() {
    if (!kind || text.trim().length < 3) return;
    setBusy(true); setError("");
    try { await api.sendFeedback(kind, text.trim(), pathname); setSent(true); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not send. Try again."); }
    finally { setBusy(false); }
  }

  return createPortal(
    <div className="help" role="dialog" aria-modal="true" aria-labelledby="help-h" onClick={onClose}>
      <div className="help-card" onClick={(e) => e.stopPropagation()}>
        <button className="help-x" onClick={onClose} aria-label="Close">✕</button>
        {sent && k ? (
          <div className="help-done">
            <span className="help-big" aria-hidden="true">✅</span>
            <h2 id="help-h">Sent!</h2>
            <p>{k.thanks}</p>
            <button className="primary" autoFocus onClick={onClose}>Done</button>
          </div>
        ) : !k ? (
          <>
            <h2 id="help-h">How can we help?</h2>
            <p className="help-sub">Your message goes straight to the admin.</p>
            <div className="help-opts">
              {(Object.keys(KINDS) as Kind[]).map((x) => (
                <button key={x} className={`help-opt ${x}`} onClick={() => setKind(x)}>
                  <span className="help-ico" aria-hidden="true">{KINDS[x].icon}</span>
                  <span><b>{KINDS[x].title}</b><small>{KINDS[x].sub}</small></span>
                  <i aria-hidden="true">›</i>
                </button>
              ))}
            </div>
          </>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            <button type="button" className="help-back" onClick={() => { setKind(null); setError(""); }}>‹ Back</button>
            <h2 id="help-h"><span aria-hidden="true">{k.icon}</span> {k.title}</h2>
            <label className="help-label" htmlFor="help-text">{k.ask}</label>
            <textarea id="help-text" autoFocus rows={5} maxLength={2000} placeholder={k.hint} value={text} onChange={(e) => setText(e.target.value)} />
            {error && <p className="err" role="alert">{error}</p>}
            <button className="primary wide" disabled={busy || text.trim().length < 3}>{busy ? "Sending…" : "Send to admin"}</button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
