import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type AdminMember, type BoardRow, type Settings } from "../api";
import Avatar from "../lib/Avatar";
import type { Tier, TodayInfo } from "../api";
import RankUp from "./RankUp";
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

function LevelControl({ m, row, onChanged, onError }: { m: AdminMember; row?: BoardRow; onChanged: () => void; onError: (s: string) => void }) {
  const level = row?.level ?? m.base_honor;
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState<string | null>(null);

  async function change(delta: number, note: string) {
    if (!delta || busy) return;
    setBusy(true);
    try { await api.addAdjustment(m.id, delta, note); onChanged(); } catch (e) { onError(msg(e)); } finally { setBusy(false); }
  }
  async function setExact(e?: FormEvent) {
    e?.preventDefault();
    if (typing === null) return;
    const target = Number(typing);
    setTyping(null);
    if (typing.trim() !== "" && Number.isFinite(target) && target !== level) await change(target - level, `Level set to ${target}`);
  }

  return (
    <span className="level-ctl">
      <button type="button" aria-label={`One less Honor for ${m.name}`} disabled={busy} onClick={() => change(-1, "−1 by admin")}>−</button>
      {typing === null ? (
        <button type="button" className="level-num" title="Tap to type an exact level" disabled={busy} onClick={() => setTyping(String(level))}>
          {row?.label ?? level}
        </button>
      ) : (
        <form onSubmit={setExact} className="level-form">
          <input className="level-input" type="number" inputMode="numeric" enterKeyHint="done" autoFocus aria-label={`Exact level for ${m.name}`} value={typing}
            onChange={(e) => setTyping(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setTyping(null)}
            onBlur={(e) => { if (!e.currentTarget.form?.contains(e.relatedTarget as Node)) setExact(); }} />
          <button className="level-ok" aria-label="Save level">✓</button>
        </form>
      )}
      <button type="button" aria-label={`One more Honor for ${m.name}`} disabled={busy} onClick={() => change(1, "+1 by admin")}>+</button>
    </span>
  );
}

function MemberRow({ m, row, onDone, onChanged, onError }: { m: AdminMember; row?: BoardRow; onDone: (s: string) => void; onChanged: () => void; onError: (s: string) => void }) {
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
            {row ? `${row.tier.emoji} ${row.tier.name}` : "New"}
            {m.has_pin ? "" : " · no PIN yet"}
          </span>
        </div>
        <LevelControl m={m} row={row} onChanged={onChanged} onError={onError} />
        <button onClick={() => { setEditing((x) => !x); setSure(false); }}>{editing ? "Close" : "Edit"}</button>
      </div>
      {editing && (
        <form className="mem-edit" onSubmit={save}>
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} /></Field>
          <Field label="Starting level" hint="Their level before the app started counting. To change today's level, use − / + instead">
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

export default function Admin({ info }: { info?: TodayInfo | null }) {
  const [preview, setPreview] = useState<Tier | null>(null);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useToast();

  const reload = useCallback(() => {
    api.members().then(setMembers).catch((e) => setError(msg(e)));
    api.leaderboard().then((b) => setRows(b.rows)).catch(() => undefined);
    api.settings().then(setSettings).catch(() => undefined);
  }, []);
  useEffect(reload, [reload]);

  const done = (s: string) => { setError(""); setToast(s); reload(); notifyChanged(); };
  const quiet = () => { setError(""); reload(); notifyChanged(); };
  const rowOf = (id: string) => rows.find((r) => r.member.id === id);

  const [nm, setNm] = useState({ name: "", pin: "", base: "1" });
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
          {members.map((m) => <MemberRow key={`${m.id}${m.name}${m.base_honor}${m.has_pin}`} m={m} row={rowOf(m.id)} onDone={done} onChanged={quiet} onError={setError} />)}
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
              <Field label="Scoring started on" hint="Days before this are not counted"><input type="date" value={settings.score_from} onChange={(e) => setSettings({ ...settings, score_from: e.target.value })} /></Field>
            </details>
            <button className="primary">Save</button>
          </form>
        )}
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
      <section className="card">
        <h2>Celebrations preview</h2>
        <p className="note">What members see when they reach a new rank. Each rank's show is bigger than the last.</p>
        <div className="chips">
          {(info?.tiers ?? []).filter((t) => t.key !== "low").map((t) => (
            <button key={t.key} className="chip" onClick={() => setPreview(t)}>{t.emoji} {t.name}</button>
          ))}
        </div>
      </section>
      {preview && <RankUp tier={preview} name="Preview" profile={null} reward={(info?.gems.per_rank ?? 50) + (info?.gems.per_level ?? 10)} onClose={() => setPreview(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
