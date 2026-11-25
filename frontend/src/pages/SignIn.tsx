import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, type SignInMember } from "../api";
import { useAuth } from "../auth";
import Avatar from "../lib/Avatar";

/** An eight-pointed star (two overlapping squares), the medallion at the top of the arch. */
function Star({ size = 64 }: { size?: number }) {
  return (
    <svg className="medallion" width={size} height={size} viewBox="-50 -50 100 100" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round">
        <rect x="-30" y="-30" width="60" height="60" />
        <rect x="-30" y="-30" width="60" height="60" transform="rotate(45)" />
        <circle r="17" />
      </g>
      <circle r="6" fill="currentColor" />
    </svg>
  );
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0", "go"];

/** The main page signs members in; /admin shows only the parent (admin) sign-in. */
export default function SignIn({ admin = false }: { admin?: boolean }) {
  const { signIn } = useAuth();
  const [members, setMembers] = useState<SignInMember[] | null>(null);
  const [pick, setPick] = useState<SignInMember | null>(null);
  const [pin, setPin] = useState("");
  const parent = admin;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!admin) api.signInList().then(setMembers).catch(() => setMembers([]));
  }, [admin]);

  const fail = (err: unknown) => setError(err instanceof ApiError ? err.message : "Could not reach the server. Try again.");

  const submitPin = useCallback(async (value: string) => {
    if (!pick || value.length < 4 || busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.memberLogin(pick.id, value);
      signIn(r.token, r.viewer);
    } catch (err) {
      fail(err);
      setPin("");
    } finally {
      setBusy(false);
    }
  }, [pick, busy, signIn]);

  const press = useCallback((k: string) => {
    setError("");
    if (k === "del") setPin((p) => p.slice(0, -1));
    else if (k === "go") submitPin(pin);
    else setPin((p) => (p.length < 8 ? p + k : p));
  }, [pin, submitPin]);

  // Typing on a keyboard works too.
  useEffect(() => {
    if (!pick || parent) return;
    const on = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("del");
      else if (e.key === "Enter") press("go");
      else if (e.key === "Escape") { setPick(null); setPin(""); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [pick, parent, press]);

  async function submitParent(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api.adminLogin(email, password);
      signIn(r.token, r.viewer);
    } catch (err) { fail(err); } finally { setBusy(false); }
  }

  return (
    <main className="welcome">
      {!admin && <Link to="/admin" className="corner-login">Login</Link>}
      {admin && <Link to="/" className="corner-login">← Home</Link>}
      <div className="arch">
        <div className="arch-inner">
          <Star />
          <h1>Honor</h1>
          <p className="ar arch-ar">شَرَف</p>
          <p className="arch-tag">Mark your deeds. Climb the ranks.</p>

          {parent ? (
            <form className="parent-form" onSubmit={submitParent}>
              <h2>Admin sign-in</h2>
              <label className="field"><span className="field-label">Email</span>
                <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="field"><span className="field-label">Password</span>
                <input id="pw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
              <button className="primary wide" disabled={busy}>Sign in</button>
            </form>
          ) : !pick ? (
            <>
              <h2>Who are you?</h2>
              {members === null && <p className="note">Loading…</p>}
              {members?.length === 0 && <p className="note">No members yet. A parent signs in first and adds everyone.</p>}
              <div className="who-grid">
                {members?.map((m) => (
                  <button key={m.id} className="who-tile" disabled={!m.has_pin} title={m.has_pin ? undefined : "Ask a parent to set your PIN"}
                    onClick={() => { setPick(m); setPin(""); setError(""); }}>
                    <Avatar avatar={m.avatar} color="#0b4a3a" frame={m.frame} size={54} />
                    <span>{m.name}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="pin-step">
              <Avatar avatar={pick.avatar} color="#0b4a3a" frame={pick.frame} size={64} />
              <h2>As-salāmu ʿalaykum, {pick.name}</h2>
              <p className="note">Type your PIN</p>
              <div className={`pin-dots${error ? " shake" : ""}`} aria-label={`${pin.length} digits entered`}>
                {Array.from({ length: Math.max(4, pin.length) }, (_, i) => <i key={i} className={i < pin.length ? "on" : ""} />)}
              </div>
              <div className="keypad">
                {KEYS.map((k) => (
                  <button key={k} type="button" className={k === "go" ? "go" : ""} disabled={busy || (k === "go" && pin.length < 4)}
                    aria-label={k === "del" ? "Delete" : k === "go" ? "Sign in" : k} onClick={() => press(k)}>
                    {k === "del" ? "⌫" : k === "go" ? "✓" : k}
                  </button>
                ))}
              </div>
              <button type="button" className="link" onClick={() => { setPick(null); setPin(""); setError(""); }}>← Not {pick.name}?</button>
            </div>
          )}

          {error && <p className="err" role="alert">{error}</p>}
        </div>
      </div>
    </main>
  );
}
