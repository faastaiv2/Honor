import { useCallback, useEffect, useState, type FormEvent } from "react";
import RankIcon from "../lib/RankIcon";
import { api, ApiError, type AdminMember, type BoardRow, type Settings } from "../api";
import Avatar from "../lib/Avatar";
import type { Tier, TodayInfo } from "../api";
import RankUp from "./RankUp";
import QuestFilm from "./QuestFilm";
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

/** − level + : one tap changes Honor by one; tap the number to type an exact level. */
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
    <div className="ad-level">
      <button type="button" className="ad-step" aria-label={`One less Honor for ${m.name}`} disabled={busy} onClick={() => change(-1, "−1 by admin")}>−</button>
      {typing === null ? (
        <button type="button" className="ad-level-num" title="Tap to type an exact level" disabled={busy} onClick={() => setTyping(String(level))}>
          <span>{row?.label ?? level}</span><small>Level {level} · tap to type</small>
        </button>
      ) : (
        <form onSubmit={setExact} className="ad-level-form">
          <input type="number" inputMode="numeric" enterKeyHint="done" autoFocus aria-label={`Exact level for ${m.name}`} value={typing}
            onChange={(e) => setTyping(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setTyping(null)}
            onBlur={(e) => { if (!e.currentTarget.form?.contains(e.relatedTarget as Node)) setExact(); }} />
          <button className="primary" aria-label="Save level">✓</button>
        </form>
      )}
      <button type="button" className="ad-step" aria-label={`One more Honor for ${m.name}`} disabled={busy} onClick={() => change(1, "+1 by admin")}>+</button>
    </div>
  );
}

function MemberCard({ m, row, onDone, onChanged, onError }: { m: AdminMember; row?: BoardRow; onDone: (s: string) => void; onChanged: () => void; onError: (s: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(m.name);
  const [base, setBase] = useState(String(m.base_honor));
  const [pin, setPin] = useState("");
  const [sure, setSure] = useState(false);
  const color = row?.tier.color ?? "#7d8a96";
  const today = row?.today;
  const pct = today && today.of ? Math.round((today.done / today.of) * 100) : 0;
  const finished = !!today && today.of > 0 && today.done >= today.of;

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
    <article className="ad-member" style={{ ["--tc" as string]: color }}>
      <header className="ad-member-head">
        <Avatar avatar={m.avatar} color={color} size={52} />
        <div className="ad-member-name">
          <b>{m.name}</b>
          <span className="ad-rank">{row ? <><RankIcon rank={row.tier.key} /> {row.tier.name}</> : "New"}</span>
        </div>
        <button className={`ad-edit${editing ? " on" : ""}`} onClick={() => { setEditing((x) => !x); setSure(false); }} aria-expanded={editing}>
          {editing ? "Close" : "Edit"}
        </button>
      </header>

      {!editing && <>
        <LevelControl m={m} row={row} onChanged={onChanged} onError={onError} />
        <div className="ad-today">
          <div className="ad-today-top">
            <span>Today</span>
            <b className={finished ? "ok" : ""}>{today ? `${today.done}/${today.of}${finished ? " ✓" : ""}` : "—"}</b>
          </div>
          <div className="ad-bar"><i style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="ad-facts">
          <span title="Change in Honor this week">📈 {row ? `${row.week_delta > 0 ? "+" : ""}${row.week_delta} this week` : "—"}</span>
          {row && row.pending > 0 && <span title="Earned today, arrives at midnight">🌙 +{row.pending} at midnight</span>}
          {!m.has_pin && <span className="warn">No PIN yet</span>}
        </div>
        {!!row?.excused_today?.length && (
          <ul className="ad-excused" aria-label="Excused today">
            {row.excused_today.map((x) => <li key={x.task}>🛡️ <b>{x.task}</b> excused: {x.reason}</li>)}
          </ul>
        )}
      </>}

      {editing && (
        <form className="ad-form" onSubmit={save}>
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} /></Field>
          <div className="ad-two">
            <Field label="New PIN" hint="Empty keeps the old one">
              <input inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} maxLength={8} placeholder="4–8 digits" />
            </Field>
            <Field label="Starting level" hint="Before the app counted">
              <input type="number" value={base} onChange={(e) => setBase(e.target.value)} />
            </Field>
          </div>
          <p className="field-hint">To change today's level, close this and use − / +.</p>
          <div className="ad-actions">
            <button className="primary">Save changes</button>
            <button type="button" className="danger" onClick={remove}>{sure ? "Tap again to remove" : "Remove"}</button>
          </div>
        </form>
      )}
    </article>
  );
}

function AddMember({ onAdded, onError }: { onAdded: (s: string) => void; onError: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const [nm, setNm] = useState({ name: "", pin: "", base: "1" });
  async function add(e: FormEvent) {
    e.preventDefault();
    try {
      await api.addMember({ name: nm.name.trim(), base_honor: Number(nm.base), pin: nm.pin });
      onAdded(`${nm.name.trim()} added`);
      setNm({ name: "", pin: "", base: "1" });
      setOpen(false);
    } catch (err) { onError(msg(err)); }
  }
  if (!open) return <button className="ad-member ad-add" onClick={() => setOpen(true)}><span>＋</span>Add a member</button>;
  return (
    <form className="ad-member ad-form" onSubmit={add}>
      <h3>New member</h3>
      <Field label="Name"><input required autoFocus maxLength={80} value={nm.name} onChange={(e) => setNm({ ...nm, name: e.target.value })} /></Field>
      <div className="ad-two">
        <Field label="PIN" hint="4–8 digits to sign in">
          <input required inputMode="numeric" minLength={4} maxLength={8} value={nm.pin} onChange={(e) => setNm({ ...nm, pin: e.target.value.replace(/\D/g, "") })} />
        </Field>
        <Field label="Starting level" hint="1 for someone new">
          <input type="number" value={nm.base} onChange={(e) => setNm({ ...nm, base: e.target.value })} />
        </Field>
      </div>
      <div className="ad-actions">
        <button className="primary">Add member</button>
        <button type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

export default function Admin({ info }: { info?: TodayInfo | null }) {
  const [preview, setPreview] = useState<Tier | null>(null);
  const [questPreview, setQuestPreview] = useState(false);
  const [members, setMembers] = useState<AdminMember[] | null>(null);
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useToast();
  const [pw, setPw] = useState({ current: "", next: "" });

  const reload = useCallback(() => {
    api.members().then(setMembers).catch((e) => setError(msg(e)));
    api.leaderboard().then((b) => setRows(b.rows)).catch(() => undefined);
    api.settings().then(setSettings).catch(() => undefined);
  }, []);
  useEffect(reload, [reload]);

  const done = (s: string) => { setError(""); setToast(s); reload(); notifyChanged(); };
  const quiet = () => { setError(""); reload(); notifyChanged(); };
  const rowOf = (id: string) => rows.find((r) => r.member.id === id);
  const run = (fn: () => Promise<unknown>, ok: string) => async (e: FormEvent) => {
    e.preventDefault();
    try { await fn(); done(ok); } catch (err) { setError(msg(err)); }
  };
  const zones = settings && !ZONES.includes(settings.timezone) ? [settings.timezone, ...ZONES] : ZONES;

  const finished = rows.filter((r) => r.today.of > 0 && r.today.done >= r.today.of).length;
  const top = [...rows].sort((a, b) => b.week_delta - a.week_delta)[0];

  return (
    <div className="ad">
      {error && <p className="err banner" role="alert">{error}</p>}

      <section className="ad-glance" aria-label="At a glance">
        <div><b>{members?.length ?? "…"}</b><span>members</span></div>
        <div><b>{finished}/{rows.length}</b><span>finished today</span></div>
        <div><b>{top && top.week_delta > 0 ? top.member.name : "—"}</b><span>{top && top.week_delta > 0 ? `best this week · +${top.week_delta}` : "best this week"}</span></div>
      </section>

      <div className="ad-cols">
        <section className="ad-main" aria-labelledby="ad-members">
          <div className="ad-section-head">
            <h2 id="ad-members">Members</h2>
            <p className="note">Tap − or + to give or take one Honor. Tap the level to type an exact one.</p>
          </div>
          <div className="ad-members">
            {members?.map((m) => <MemberCard key={`${m.id}${m.name}${m.base_honor}${m.has_pin}`} m={m} row={rowOf(m.id)} onDone={done} onChanged={quiet} onError={setError} />)}
            <AddMember onAdded={done} onError={setError} />
          </div>
        </section>

        <aside className="ad-side">
          <section className="card">
            <h2>Settings</h2>
            {settings ? (
              <form className="ad-form" onSubmit={run(() => api.saveSettings(settings), "Settings saved")}>
                <Field label="Time zone" hint="A new day starts at midnight here">
                  <select value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}>
                    {zones.map((z) => <option key={z} value={z}>{z.replace("_", " ")}</option>)}
                  </select>
                </Field>
                <Field label="Scoring started on" hint="Days before this are not counted">
                  <input type="date" value={settings.score_from} onChange={(e) => setSettings({ ...settings, score_from: e.target.value })} />
                </Field>
                <button className="primary">Save settings</button>
              </form>
            ) : <p className="note">Loading…</p>}
          </section>

          <section className="card">
            <h2>Rank-up shows</h2>
            <p className="note">Watch what a member sees when they reach each rank.</p>
            <button className="ad-show ad-quest" style={{ ["--tc" as string]: "#b8860b" }} onClick={() => setQuestPreview(true)}>
              <RankIcon rank="legendary" size={28} />The Legendary quest begins
            </button>
            <div className="ad-shows">
              {(info?.tiers ?? []).filter((t) => t.key !== "low").map((t) => (
                <button key={t.key} className="ad-show" style={{ ["--tc" as string]: t.color }} onClick={() => setPreview(t)}>
                  <RankIcon rank={t.key} size={28} />{t.name}
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <details className="ad-details">
              <summary><h2>Your password</h2><span className="note">Change</span></summary>
              <form className="ad-form" onSubmit={run(async () => { await api.changePassword(pw.current, pw.next); setPw({ current: "", next: "" }); }, "Password changed")}>
                <Field label="Current password"><input type="password" autoComplete="current-password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
                <Field label="New password" hint="At least 10 characters"><input type="password" autoComplete="new-password" minLength={10} required value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
                <button className="primary">Change password</button>
              </form>
            </details>
          </section>
        </aside>
      </div>

      {preview && <RankUp tier={preview} name="Preview" profile={null} reward={(info?.gems.per_rank[preview.key] ?? 0) + (preview.key === "legendary" ? 0 : info?.gems.per_level ?? 10)} onClose={() => setPreview(null)} />}
      {questPreview && <QuestFilm name="Preview" onClose={() => setQuestPreview(false)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
