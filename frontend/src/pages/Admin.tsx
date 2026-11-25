import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type Adjustment, type AdminMember, type BoardRow, type Settings } from "../api";
import Avatar from "../lib/Avatar";
import { notifyChanged, useToast } from "../lib/events";

const msg = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong");

const ZONES = ["Asia/Riyadh", "Asia/Dubai", "Asia/Qatar", "Asia/Kuwait", "Asia/Bahrain", "Asia/Karachi", "Asia/Kolkata",
  "Asia/Dhaka", "Africa/Cairo", "Europe/Istanbul", "Europe/London", "America/New_York", "America/Chicago",
  "America/Los_Angeles", "America/Toronto", "Australia/Sydney", "UTC"];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function MemberRow({ m, row, onDone, onError }: { m: AdminMember; row?: BoardRow; onDone: (s: string) => void; onError: (s: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(m.name);
  const [base, setBase] = useState(String(m.base_honor));
  const [pin, setPin] = useState("");
  const [sure, setSure] = useState(false);
  const color = row?.tier.color ?? "#7d8a96";

  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await api.editMember(m.id, { name, base_honor: Number(base), ...(pin ? { pin } : {}) });
      setPin("");
      setEditing(false);
      onDone(`Saved ${name}`);
    } catch (err) { onError(msg(err)); }
  }
  async function remove() {
    if (!sure) { setSure(true); return; }
    try { await api.deleteMember(m.id); onDone(`Removed ${m.name}`); } catch (err) { onError(msg(err)); }
  }

  return (
    <li className="mem">
      <div className="mem-line">
        <Avatar avatar={m.avatar} color={color} size={42} />
        <div className="mem-name">
          <b>{m.name}</b>
          <span className="note" style={{ margin: 0 }}>
            {row ? `${row.tier.emoji} ${row.tier.name} · ${row.label}` : `Starting level ${m.base_honor}`}
            {m.has_pin ? "" : " · no PIN yet"}
          </span>
        </div>
        <button onClick={() => { setEditing((x) => !x); setSure(false); }}>{editing ? "Close" : "Edit"}</button>
      </div>
      {editing && (
        <form className="mem-edit" onSubmit={save}>
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} /></Field>
          <Field label="Starting level" hint="Their level before the app started counting">
            <input type="number" value={base} onChange={(e) => setBase(e.target.value)} />
          </Field>
          <Field label="New PIN" hint="Leave empty to keep the current PIN">
            <input inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} maxLength={8} placeholder="4–8 digits" />
          </Field>
          <div className="row">
            <button className="primary">Save</button>
            <button type="button" className="danger" onClick={remove}>{sure ? "Tap again to remove for good" : "Remove member"}</button>
          </div>
        </form>
      )}
    </li>
  );
}

function ImportSheet({ members, onDone, onError }: { members: AdminMember[]; onDone: (s: string) => void; onError: (s: string) => void }) {
  const [text, setText] = useState("");
  const [found, setFound] = useState<{ letters: string[]; first: string | null; last: string | null; days: number } | null>(null);
  const [map, setMap] = useState<Record<string, string>>({});
  const [range, setRange] = useState({ start: "", end: "" });
  const [result, setResult] = useState("");

  async function read() {
    try {
      const p = await api.importPreview(text);
      setFound(p);
      setRange({ start: p.first ?? "", end: p.last ?? "" });
      setResult("");
    } catch (e) { onError(msg(e)); }
  }
  async function run(e: FormEvent) {
    e.preventDefault();
    try {
      const r = await api.importSheet(text, range.start, range.end, Object.fromEntries(Object.entries(map).filter(([, v]) => v)));
      setResult(`Imported ${r.entries} entries from ${r.days} days.${r.unknown_initials.length ? ` Skipped: ${r.unknown_initials.join(", ")}` : ""}`);
      onDone("Import finished");
    } catch (err) { onError(msg(err)); }
  }

  return (
    <div>
      <p className="note">Copy the rows from your old Google Sheet and paste them here.</p>
      <textarea aria-label="Rows copied from the sheet" value={text} onChange={(e) => { setText(e.target.value); setFound(null); }} />
      <div className="row" style={{ marginTop: 8 }}><button onClick={read} disabled={!text.trim()}>Read the sheet</button></div>
      {found && (found.days === 0 ? <p className="err">No dated rows found. Copy whole rows, including the date column.</p> : (
        <form onSubmit={run}>
          <p className="note">Found {found.days} days. Who is each letter in the sheet?</p>
          <div className="map-grid">
            {found.letters.map((l) => (
              <Field key={l} label={`“${l}” is`}>
                <select value={map[l] ?? ""} onChange={(e) => setMap({ ...map, [l]: e.target.value })}>
                  <option value="">Skip</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>
            ))}
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <Field label="From"><input type="date" required value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} /></Field>
            <Field label="To"><input type="date" required value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} /></Field>
          </div>
          <button className="primary" style={{ marginTop: 8 }}>Import</button>
          {result && <p className="note">{result}</p>}
        </form>
      ))}
    </div>
  );
}

export default function Admin() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [adjs, setAdjs] = useState<Adjustment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useToast();

  const reload = useCallback(() => {
    api.members().then(setMembers).catch((e) => setError(msg(e)));
    api.leaderboard().then((b) => setRows(b.rows)).catch(() => undefined);
    api.adjustments().then(setAdjs).catch(() => undefined);
    api.settings().then(setSettings).catch(() => undefined);
  }, []);
  useEffect(reload, [reload]);

  const done = (s: string) => { setError(""); setToast(s); reload(); notifyChanged(); };
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "?";
  const rowOf = (id: string) => rows.find((r) => r.member.id === id);

  const [nm, setNm] = useState({ name: "", pin: "", base: "1" });
  const [adj, setAdj] = useState({ member: "", delta: 1, note: "" });
  const [pw, setPw] = useState({ current: "", next: "" });

  const run = (fn: () => Promise<unknown>, ok: string) => async (e: FormEvent) => {
    e.preventDefault();
    try { await fn(); done(ok); } catch (err) { setError(msg(err)); }
  };
  const zones = settings && !ZONES.includes(settings.timezone) ? [settings.timezone, ...ZONES] : ZONES;

  return (
    <div className="admin">
      {error && <p className="err banner" role="alert">{error}</p>}

      <section className="card">
        <h2>Members</h2>
        {members.length === 0 && <p className="note">No members yet. Add the first one below.</p>}
        <ul className="mem-list">
          {members.map((m) => <MemberRow key={`${m.id}${m.name}${m.base_honor}${m.has_pin}`} m={m} row={rowOf(m.id)} onDone={done} onError={setError} />)}
        </ul>
        <h3>Add a member</h3>
        <form className="add-form" onSubmit={run(async () => {
          await api.addMember({ name: nm.name.trim(), base_honor: Number(nm.base), pin: nm.pin });
          setNm({ name: "", pin: "", base: "1" });
        }, "Member added")}>
          <Field label="Name"><input required maxLength={80} value={nm.name} onChange={(e) => setNm({ ...nm, name: e.target.value })} /></Field>
          <Field label="PIN" hint="4–8 digits they type to sign in">
            <input required inputMode="numeric" minLength={4} maxLength={8} value={nm.pin} onChange={(e) => setNm({ ...nm, pin: e.target.value.replace(/\D/g, "") })} />
          </Field>
          <Field label="Starting level" hint="1 for someone new">
            <input type="number" value={nm.base} onChange={(e) => setNm({ ...nm, base: e.target.value })} />
          </Field>
          <button className="primary">Add member</button>
        </form>
      </section>

      <section className="card">
        <h2>Give or take Honor</h2>
        <form className="add-form" onSubmit={run(async () => {
          await api.addAdjustment(adj.member || members[0]?.id, adj.delta, adj.note);
          setAdj({ ...adj, note: "" });
        }, "Honor updated")}>
          <Field label="Member">
            <select value={adj.member || members[0]?.id || ""} onChange={(e) => setAdj({ ...adj, member: e.target.value })}>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Amount">
            <span className="stepper">
              <button type="button" aria-label="Less" onClick={() => setAdj({ ...adj, delta: adj.delta - 1 || -1 })}>−</button>
              <b>{adj.delta > 0 ? `+${adj.delta}` : adj.delta}</b>
              <button type="button" aria-label="More" onClick={() => setAdj({ ...adj, delta: adj.delta + 1 || 1 })}>+</button>
            </span>
          </Field>
          <Field label="Reason"><input maxLength={200} placeholder="Helped a lot today" value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} /></Field>
          <button className="primary" disabled={!members.length}>Apply</button>
        </form>
        {adjs.length > 0 && (
          <ul className="adj-list">
            {adjs.slice(0, 10).map((a) => (
              <li key={a.id}>
                <span><b className={a.delta > 0 ? "pos" : "neg"}>{a.delta > 0 ? "+" : ""}{a.delta}</b> {nameOf(a.member_id)}{a.note ? ` — ${a.note}` : ""}</span>
                <button onClick={async () => { try { await api.deleteAdjustment(a.id); done("Undone"); } catch (e) { setError(msg(e)); } }}>Undo</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Settings</h2>
        {settings && (
          <form className="add-form" onSubmit={run(() => api.saveSettings(settings), "Settings saved")}>
            <Field label="Time zone" hint="A new day starts at midnight here">
              <select value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}>
                {zones.map((z) => <option key={z} value={z}>{z.replace("_", " ")}</option>)}
              </select>
            </Field>
            <details className="more">
              <summary>More settings</summary>
              <Field label="Honor cut when this many tasks are missed"><input type="number" min={1} max={17} value={settings.cut_misses} onChange={(e) => setSettings({ ...settings, cut_misses: Number(e.target.value) })} /></Field>
              <Field label="Scoring started on" hint="Days before this are not counted"><input type="date" value={settings.score_from} onChange={(e) => setSettings({ ...settings, score_from: e.target.value })} /></Field>
            </details>
            <button className="primary">Save</button>
          </form>
        )}
      </section>

      <section className="card">
        <details className="more">
          <summary><h2 style={{ display: "inline" }}>Import from the old spreadsheet</h2></summary>
          <ImportSheet members={members} onDone={done} onError={setError} />
        </details>
      </section>

      <section className="card">
        <details className="more">
          <summary><h2 style={{ display: "inline" }}>Change your password</h2></summary>
          <form className="add-form" onSubmit={run(async () => { await api.changePassword(pw.current, pw.next); setPw({ current: "", next: "" }); }, "Password changed")}>
            <Field label="Current password"><input type="password" autoComplete="current-password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
            <Field label="New password" hint="At least 10 characters"><input type="password" autoComplete="new-password" minLength={10} required value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
            <button className="primary">Change password</button>
          </form>
        </details>
      </section>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
