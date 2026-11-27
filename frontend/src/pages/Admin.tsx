import HelpMessages from "./HelpMessages";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import RankIcon from "../lib/RankIcon";
import { api, ApiError, type AdminMember, type BoardRow, type Settings } from "../api";
import Gem from "../lib/Gem";
import Avatar from "../lib/Avatar";
import type { TodayInfo } from "../api";
import { fmt } from "../lib/dates";
import { notifyChanged, useToast } from "../lib/events";
import Guard from "../lib/Guard";

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

/** The member's gem balance, with give / take / set. */
function GemEditor({ m, gems, onDone, onError }: { m: AdminMember; gems?: number; onDone: (s: string) => void; onError: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  const go = async (kind: "give" | "take" | "set") => {
    if (busy || (kind !== "set" && !n) || amount === "") return;
    setBusy(true);
    try {
      const r = await api.changeGems(m.id, kind === "set" ? { balance: n, note } : { delta: kind === "give" ? n : -n, note });
      setAmount(""); setNote(""); setOpen(false);
      onDone(r.delta === 0 ? `${m.name} already has ${r.balance} gems`
        : `${r.delta > 0 ? "Gave" : "Took"} ${Math.abs(r.delta)} gems ${r.delta > 0 ? "to" : "from"} ${m.name} · now ${r.balance}`);
    } catch (err) { onError(msg(err)); } finally { setBusy(false); }
  };
  return (
    <div className={`ad-gems${open ? " open" : ""}`}>
      <button type="button" className="ad-gems-head" onClick={() => setOpen((x) => !x)} aria-expanded={open}>
        <Gem /> <b>{gems ?? "…"}</b> <span>gems</span><i>{open ? "Close" : "Give / take"}</i>
      </button>
      {open && (
        <div className="ad-gems-body">
          <input inputMode="numeric" placeholder="How many?" value={amount} aria-label="Gems"
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 6))} />
          <input placeholder="Reason (optional)" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} aria-label="Reason" />
          <div className="ad-gems-btns">
            <button type="button" className="give" disabled={busy || !n} onClick={() => go("give")}>+ Give</button>
            <button type="button" className="take" disabled={busy || !n} onClick={() => go("take")}>− Take</button>
            <button type="button" disabled={busy || amount === ""} onClick={() => go("set")}>Set balance to {amount === "" ? "…" : n}</button>
          </div>
          <p className="field-hint">Taking never goes below 0.</p>
        </div>
      )}
    </div>
  );
}

function MemberCard({ m, row, gems, onDone, onChanged, onError }: { m: AdminMember; row?: BoardRow; gems?: number; onDone: (s: string) => void; onChanged: () => void; onError: (s: string) => void }) {
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
        <GemEditor m={m} gems={gems} onDone={onDone} onError={onError} />
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
          {!m.has_pin && <span className="warn" title="They choose their own 4-digit PIN when they first sign in">New · chooses own PIN</span>}
          {m.godfather && <span className="gf-badge" title="Godfather: can wear the Godfather frame">🎩 Godfather</span>}
          {m.early_ticks > 0 && <span className="warn" title="Tried to tick a task before its time and had to swear the oath again">⚠️ Ticked early {m.early_ticks}×</span>}
        </div>
        {!m.avatar && m.has_pin && (
          <button className={`ad-nudge${m.avatar_nudge ? " sent" : ""}`} disabled={m.avatar_nudge} onClick={async () => {
            try { await api.avatarNudge(m.id); onDone(`Reminder sent to ${m.name} 📣`); } catch (err) { onError(msg(err)); }
          }}>{m.avatar_nudge ? "✓ Avatar reminder sent · waiting for them to see it" : "📣 Remind to set their avatar"}</button>
        )}
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
          <label className="gf-toggle">
            <input type="checkbox" checked={m.godfather} onChange={async (e) => {
              const on = e.target.checked;
              try { await api.editMember(m.id, { godfather: on }); onDone(on ? `🎩 ${m.name} is a Godfather` : `${m.name} is no longer a Godfather`); } catch (err) { onError(msg(err)); }
            }} />
            <span><b>🎩 Godfather</b><small>Only Godfathers can wear the Godfather frame. Turning this off takes the frame off.</small></span>
          </label>
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
  const [nm, setNm] = useState({ name: "", pin: "", base: "0" });
  async function add(e: FormEvent) {
    e.preventDefault();
    try {
      await api.addMember({ name: nm.name.trim(), base_honor: Number(nm.base), ...(nm.pin ? { pin: nm.pin } : {}) });
      onAdded(`${nm.name.trim()} added`);
      setNm({ name: "", pin: "", base: "0" });
      setOpen(false);
    } catch (err) { onError(msg(err)); }
  }
  if (!open) return <button className="ad-member ad-add" onClick={() => setOpen(true)}><span>＋</span>Add a member</button>;
  return (
    <form className="ad-member ad-form" onSubmit={add}>
      <h3>New member</h3>
      <Field label="Name"><input required autoFocus maxLength={80} value={nm.name} onChange={(e) => setNm({ ...nm, name: e.target.value })} /></Field>
      <div className="ad-two">
        <Field label="PIN (optional)" hint="Leave empty: they choose their own 4-digit PIN the first time">
          <input inputMode="numeric" minLength={4} maxLength={8} value={nm.pin} onChange={(e) => setNm({ ...nm, pin: e.target.value.replace(/\D/g, "") })} />
        </Field>
        <Field label="Starting level" hint="0 = Member, where everyone new starts">
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

/** When Honor starts counting: a date, and a button to start again from today. */
function StartDate({ settings, today, onSave }: { settings: Settings; today: string; onSave: (d: string) => void }) {
  const [pick, setPick] = useState(settings.score_from);
  const [sure, setSure] = useState(false);
  const nice = (iso: string) => fmt(iso, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const days = Math.round((Date.parse(today) - Date.parse(settings.score_from)) / 86400000) + 1;
  return (
    <section className="card sd">
      <h2>Start date</h2>
      <p className="sd-now">{days > 0
        ? <>The program started on <b>{nice(settings.score_from)}</b> · today is day {days}.</>
        : <>The program starts on <b>{nice(settings.score_from)}</b> · not started yet. Until then members can only preview their tasks.</>}</p>
      {!sure ? (
        <>
          <button className="sd-today" onClick={() => setSure(true)} disabled={settings.score_from === today}>▶ Start from today</button>
          <div className="sd-pick">
            <input type="date" aria-label="Start date" value={pick} onChange={(e) => setPick(e.target.value)} />
            <button disabled={!pick || pick === settings.score_from} onClick={() => onSave(pick)}>Set this date</button>
          </div>
          <p className="field-hint">Days before the start date don't count for Honor, cuts or streaks. Week 1 is the week it starts.</p>
        </>
      ) : (
        <div className="sd-ask" role="alertdialog" aria-label="Start from today">
          <p><b>Start Honor again from today, {nice(today)}?</b></p>
          <ul>
            <li>Week 1 and Day 1 start today.</li>
            <li>Days before today stop counting: each member goes back to their starting level plus the +/− you've given.</li>
            <li>Ticks, gems already collected, purchases and achievements stay.</li>
          </ul>
          <div className="ad-actions">
            <button className="primary" onClick={() => { setSure(false); onSave(today); }}>Yes, start from today</button>
            <button onClick={() => setSure(false)}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function Admin({ info }: { info?: TodayInfo | null }) {
  const [members, setMembers] = useState<AdminMember[] | null>(null);
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [gems, setGems] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useToast();
  const [pw, setPw] = useState({ current: "", next: "" });

  const reload = useCallback(() => {
    api.members().then(setMembers).catch((e) => setError(msg(e)));
    api.leaderboard().then((b) => setRows(b.rows)).catch(() => undefined);
    api.adminGems().then(setGems).catch(() => undefined);
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
            {members?.map((m) => <Guard key={`${m.id}${m.name}${m.base_honor}${m.has_pin}${m.godfather}`} name={`Member ${m.name}`}><MemberCard m={m} row={rowOf(m.id)} gems={gems[m.id]} onDone={done} onChanged={quiet} onError={setError} /></Guard>)}
            <AddMember onAdded={done} onError={setError} />
          </div>
        </section>

        <aside className="ad-side">
          <Guard name="Help messages"><HelpMessages /></Guard>
          <Guard name="Start date">{settings && info && <StartDate settings={settings} today={info.today} onSave={async (d) => {
            try { setSettings(await api.saveSettings({ ...settings, score_from: d })); done(d === info.today ? "Honor starts from today" : "Start date saved"); }
            catch (err) { setError(msg(err)); }
          }} />}</Guard>

          <section className="card">
            <h2>Settings</h2>
            {settings ? (
              <form className="ad-form" onSubmit={run(() => api.saveSettings(settings), "Settings saved")}>
                <Field label="Time zone" hint="A new day starts at midnight here">
                  <select value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}>
                    {zones.map((z) => <option key={z} value={z}>{z.replace("_", " ")}</option>)}
                  </select>
                </Field>
                <button className="primary">Save settings</button>
              </form>
            ) : <p className="note">Loading…</p>}
          </section>


          <section className="card">
            <h2>🎬 Animations</h2>
            <p className="note">Rank-up films, the Legendary quest, chests and rewards, and their sounds, are on the Animations tab.</p>
            <Link className="an-link" to="/animations">Open Animations →</Link>
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

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
