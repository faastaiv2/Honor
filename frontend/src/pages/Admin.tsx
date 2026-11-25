import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type Adjustment, type AdminAccount, type AdminMember, type Settings } from "../api";
import { useAuth } from "../auth";
import { notifyChanged, useToast } from "../lib/events";

const msg = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong");

function MemberRow({ m, onDone, onError }: { m: AdminMember; onDone: (s: string) => void; onError: (s: string) => void }) {
  const [name, setName] = useState(m.name);
  const [code, setCode] = useState(m.code);
  const [base, setBase] = useState(String(m.base_honor));
  const [pin, setPin] = useState("");
  const [sure, setSure] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await api.editMember(m.id, { name, code, base_honor: Number(base), ...(pin ? { pin } : {}) });
      setPin("");
      onDone(`Saved ${name}`);
    } catch (err) { onError(msg(err)); }
  }
  async function remove() {
    if (!sure) { setSure(true); return; }
    try { await api.deleteMember(m.id); onDone(`Removed ${m.name}`); } catch (err) { onError(msg(err)); }
  }
  return (
    <form className="row" onSubmit={save} style={{ borderTop: "1px solid var(--line)", paddingTop: 8 }}>
      <input className="grow" aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
      <input aria-label="Initials" value={code} onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z]/g, ""))} required maxLength={3} style={{ width: 72 }} />
      <label className="row" style={{ gap: 6 }}>Base <input type="number" value={base} onChange={(e) => setBase(e.target.value)} /></label>
      <input aria-label="New PIN" inputMode="numeric" placeholder={m.has_pin ? "New PIN" : "Set PIN"} value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} maxLength={8} style={{ width: 110 }} />
      <button>Save</button>
      <button type="button" onClick={remove}>{sure ? "Tap again: deletes all their days" : "Remove"}</button>
    </form>
  );
}

export default function Admin() {
  const { viewer } = useAuth();
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [adjs, setAdjs] = useState<Adjustment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useToast();

  const reload = useCallback(() => {
    api.members().then(setMembers).catch((e) => setError(msg(e)));
    api.adjustments().then(setAdjs).catch(() => undefined);
    api.settings().then(setSettings).catch(() => undefined);
    api.admins().then(setAdmins).catch(() => undefined);
  }, []);
  useEffect(reload, [reload]);

  const done = (s: string) => { setError(""); setToast(s); reload(); notifyChanged(); };
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "?";

  // forms
  const [nm, setNm] = useState({ name: "", code: "", base: "1", pin: "" });
  const [adj, setAdj] = useState({ member: "", delta: "1", note: "" });
  const [imp, setImp] = useState({ text: "", start: "", end: "" });
  const [importResult, setImportResult] = useState("");
  const [na, setNa] = useState({ email: "", name: "", password: "" });
  const [pw, setPw] = useState({ current: "", next: "" });

  const run = (fn: () => Promise<unknown>, ok: string) => async (e: FormEvent) => {
    e.preventDefault();
    try { await fn(); done(ok); } catch (err) { setError(msg(err)); }
  };

  return (
    <section className="card">
      <h2>Admin</h2>
      {error && <p className="err" role="alert">{error}</p>}

      <h3>Members</h3>
      <p className="note">Initials must match the sheet (S, H, Q, A, Am, Z, Si, B) for imports. Base = their Honor level on the day before scoring starts. PINs are 4–8 digits.</p>
      {members.map((m) => <MemberRow key={m.id + m.name + m.base_honor + m.has_pin} m={m} onDone={done} onError={setError} />)}
      <form className="row" style={{ marginTop: 12 }} onSubmit={run(async () => {
        await api.addMember({ name: nm.name, code: nm.code, base_honor: Number(nm.base), ...(nm.pin ? { pin: nm.pin } : {}) });
        setNm({ name: "", code: "", base: "1", pin: "" });
      }, "Member added")}>
        <input className="grow" placeholder="New member name" required value={nm.name} onChange={(e) => setNm({ ...nm, name: e.target.value })} />
        <input placeholder="Initials" required maxLength={3} style={{ width: 90 }} value={nm.code} onChange={(e) => setNm({ ...nm, code: e.target.value.replace(/[^A-Za-z]/g, "") })} />
        <label className="row" style={{ gap: 6 }}>Base <input type="number" value={nm.base} onChange={(e) => setNm({ ...nm, base: e.target.value })} /></label>
        <input placeholder="PIN" inputMode="numeric" maxLength={8} style={{ width: 90 }} value={nm.pin} onChange={(e) => setNm({ ...nm, pin: e.target.value.replace(/\D/g, "") })} />
        <button className="primary">Add member</button>
      </form>

      <h3>Adjust Honor</h3>
      <form className="row" onSubmit={run(async () => {
        await api.addAdjustment(adj.member || members[0]?.id, Number(adj.delta), adj.note);
        setAdj({ ...adj, note: "" });
      }, "Honor adjusted")}>
        <select className="grow" aria-label="Member" value={adj.member || members[0]?.id || ""} onChange={(e) => setAdj({ ...adj, member: e.target.value })}>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input type="number" aria-label="Change" value={adj.delta} onChange={(e) => setAdj({ ...adj, delta: e.target.value })} />
        <input className="grow" placeholder="Reason" maxLength={200} value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} />
        <button className="primary">Apply</button>
      </form>
      {adjs.slice(0, 20).map((a) => (
        <div key={a.id} className="row note" style={{ justifyContent: "space-between" }}>
          <span>{nameOf(a.member_id)} {a.delta > 0 ? "+" : ""}{a.delta} — {a.note || "no reason"} ({a.created_at.slice(0, 10)}, {a.created_by})</span>
          <button onClick={async () => { try { await api.deleteAdjustment(a.id); done("Adjustment undone"); } catch (e) { setError(msg(e)); } }}>Undo</button>
        </div>
      ))}

      <h3>Import from the spreadsheet</h3>
      <p className="note">In your sheet, select the rows (header rows are fine), copy, and paste here. Only days between the two dates are imported; existing entries for those days are replaced.</p>
      <form onSubmit={async (e) => {
        e.preventDefault();
        try {
          const r = await api.importSheet(imp.text, imp.start, imp.end);
          setImportResult(`Imported ${r.entries} entries over ${r.days} days.${r.unknown_initials.length ? ` Unknown initials: ${r.unknown_initials.join(", ")}` : ""}`);
          done("Import finished");
        } catch (err) { setError(msg(err)); }
      }}>
        <textarea aria-label="Pasted sheet rows" required value={imp.text} onChange={(e) => setImp({ ...imp, text: e.target.value })} />
        <div className="row" style={{ marginTop: 8 }}>
          <label className="row" style={{ gap: 6 }}>From <input type="date" required value={imp.start} onChange={(e) => setImp({ ...imp, start: e.target.value })} /></label>
          <label className="row" style={{ gap: 6 }}>To <input type="date" required value={imp.end} onChange={(e) => setImp({ ...imp, end: e.target.value })} /></label>
          <button className="primary">Import</button>
        </div>
        {importResult && <p className="note">{importResult}</p>}
      </form>

      <h3>Settings</h3>
      {settings && (
        <form className="row" onSubmit={run(() => api.saveSettings(settings), "Settings saved")}>
          <label className="row" style={{ gap: 6 }}>Time zone <input value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} placeholder="Asia/Riyadh" /></label>
          <label className="row" style={{ gap: 6 }}>Cut when missed ≥ <input type="number" min={1} max={17} value={settings.cut_misses} onChange={(e) => setSettings({ ...settings, cut_misses: Number(e.target.value) })} /></label>
          <label className="row" style={{ gap: 6 }}>Scoring starts <input type="date" value={settings.score_from} onChange={(e) => setSettings({ ...settings, score_from: e.target.value })} /></label>
          <button className="primary">Save</button>
        </form>
      )}

      <h3>Parents</h3>
      {admins.map((a) => (
        <div key={a.id} className="row note" style={{ justifyContent: "space-between" }}>
          <span>{a.name} · {a.email}</span>
          {a.id !== viewer?.id && <button onClick={async () => { try { await api.removeAdmin(a.id); done("Parent removed"); } catch (e) { setError(msg(e)); } }}>Remove</button>}
        </div>
      ))}
      <form className="row" style={{ marginTop: 8 }} onSubmit={run(async () => { await api.addAdmin(na.email, na.name, na.password); setNa({ email: "", name: "", password: "" }); }, "Parent added")}>
        <input className="grow" type="email" placeholder="Email" required value={na.email} onChange={(e) => setNa({ ...na, email: e.target.value })} />
        <input className="grow" placeholder="Name" required value={na.name} onChange={(e) => setNa({ ...na, name: e.target.value })} />
        <input className="grow" type="password" placeholder="Password (10+ characters)" minLength={10} required autoComplete="new-password" value={na.password} onChange={(e) => setNa({ ...na, password: e.target.value })} />
        <button>Add parent</button>
      </form>

      <h3>Your password</h3>
      <form className="row" onSubmit={run(async () => { await api.changePassword(pw.current, pw.next); setPw({ current: "", next: "" }); }, "Password changed")}>
        <input className="grow" type="password" placeholder="Current password" autoComplete="current-password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
        <input className="grow" type="password" placeholder="New password (10+ characters)" autoComplete="new-password" minLength={10} required value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
        <button>Change</button>
      </form>
      {toast && <div className="toast" role="status">{toast}</div>}
    </section>
  );
}
