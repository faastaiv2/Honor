import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type SignInMember } from "../api";
import { useAuth } from "../auth";

export default function SignIn() {
  const { signIn } = useAuth();
  const [members, setMembers] = useState<SignInMember[] | null>(null);
  const [pick, setPick] = useState<SignInMember | null>(null);
  const [pin, setPin] = useState("");
  const [parent, setParent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.signInList().then(setMembers).catch(() => setMembers([])); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = parent ? await api.adminLogin(email, password) : await api.memberLogin(pick!.id, pin);
      signIn(r.token, r.viewer);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server. Try again.");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="hero band" style={{ paddingBottom: "clamp(20px,3.5vw,44px)" }}>
        <div className="wrap"><h1>Honor <span>🏆</span></h1><p className="sub">Mark your deeds. Climb the ranks.</p></div>
      </header>
      <main className="band">
        <form className="card signin" onSubmit={submit}>
          {parent ? (
            <>
              <h2>Parent sign-in</h2>
              <label className="note" htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%" }} />
              <label className="note" htmlFor="pw">Password</label>
              <input id="pw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%" }} />
              <div className="row" style={{ marginTop: 16 }}>
                <button className="primary" disabled={busy}>Sign in</button>
                <button type="button" className="link" onClick={() => { setParent(false); setError(""); }}>I'm a member</button>
              </div>
            </>
          ) : (
            <>
              <h2>Who are you?</h2>
              {members === null && <p className="note">Loading…</p>}
              {members?.length === 0 && <p className="note">No members yet. A parent signs in first and adds everyone.</p>}
              <div className="chips">
                {members?.map((m) => (
                  <button type="button" key={m.id} className={`chip${pick?.id === m.id ? " on" : ""}`} disabled={!m.has_pin}
                    title={m.has_pin ? undefined : "Ask a parent to set your PIN"} onClick={() => { setPick(m); setPin(""); setError(""); }}>
                    {m.name}
                  </button>
                ))}
              </div>
              {pick && (
                <>
                  <label className="note" htmlFor="pin">{pick.name}, type your PIN</label>
                  <input id="pin" className="pin" inputMode="numeric" autoComplete="off" maxLength={8} required autoFocus
                    value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
                  <div className="row" style={{ marginTop: 16 }}><button className="primary" disabled={busy || pin.length < 4}>Sign in</button></div>
                </>
              )}
              <p className="note"><button type="button" className="link" onClick={() => { setParent(true); setError(""); }}>Parent sign-in</button></p>
            </>
          )}
          {error && <p className="err" role="alert">{error}</p>}
        </form>
      </main>
    </>
  );
}
