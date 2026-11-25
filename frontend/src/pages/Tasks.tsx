import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type Period, type PeriodIn, type TaskDef } from "../api";
import { fmt } from "../lib/dates";
import { notifyChanged, useToast } from "../lib/events";

const msg = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong");
const days = (n: number) => (n === 1 ? "day" : `${n} days`);

interface Draft { notBefore: string; numLast?: boolean; label: string; group: string; hasNum: boolean; num: string; step: string; every: string; fitness: boolean; nextDay: boolean }

const fromTask = (t: TaskDef): Draft => ({
  // The name box holds only the words; the number is set separately and goes before them
  // (or after, if the task was written that way, like "Read pages {n}").
  label: t.label.replace("{n}", "").replace(/\s+/g, " ").trim(), numLast: t.label.trim().endsWith("{n}") && !t.label.trim().startsWith("{n}"),
  group: t.group, hasNum: t.number_today !== null, notBefore: t.not_before ?? "",
  num: String(t.number_today ?? 10), step: String(t.step || 1), every: String(t.every), fitness: t.fitness, nextDay: t.next_day,
});
/** "#" in the name marks where the number goes ("# push-ups"); without one the number goes first. */
const words = (d: Draft) => d.label.replace(/\{n\}|#/g, "").replace(/\s+/g, " ").trim();
const labelOut = (d: Draft) => (d.hasNum ? (d.numLast ? `${words(d)} {n}` : `{n} ${words(d)}`) : words(d));
const shownAs = (d: Draft) => (d.hasNum ? (d.numLast ? `${words(d)} ${Number(d.num) || 0}` : `${Number(d.num) || 0} ${words(d)}`) : words(d));
const EMPTY: Draft = { notBefore: "", label: "", group: "Ibadah", hasNum: false, num: "10", step: "1", every: "1", fitness: false, nextDay: false };

/** A yes/no choice shown as a tappable card. */
function Toggle({ on, set, icon, title, text }: { on: boolean; set: (v: boolean) => void; icon: string; title: string; text: string }) {
  return (
    <button type="button" className={`tk-toggle${on ? " on" : ""}`} aria-pressed={on} onClick={() => set(!on)}>
      <span className="tk-toggle-ico">{icon}</span>
      <span><b>{title}</b><small>{text}</small></span>
      <span className="tk-switch" aria-hidden="true"><i /></span>
    </button>
  );
}

/** The editor used both for a new task and for changing one. */
function Editor({ d, set, groups, onSubmit, submit, children }: { d: Draft; set: (d: Draft) => void; groups: string[]; onSubmit: (e: FormEvent) => void; submit: string; children?: React.ReactNode }) {
  const n = Number(d.num) || 0, step = Number(d.step) || 0, every = Math.max(1, Number(d.every) || 1);
  return (
    <form className="tk-editor" onSubmit={onSubmit}>
      <div className="tk-two">
        <label className="field"><span className="field-label">Task name</span>
          <input required autoFocus maxLength={110} value={d.label} onChange={(e) => set({ ...d, label: e.target.value })} placeholder={d.hasNum ? "e.g. push-ups (just the words)" : "e.g. Fajr"} />
          {d.hasNum && <span className="field-hint">Just the words. Set the number below.</span>}
        </label>
        <label className="field"><span className="field-label">Group</span>
          <input list="tk-groups" required maxLength={40} value={d.group} onChange={(e) => set({ ...d, group: e.target.value })} />
          <datalist id="tk-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
        </label>
      </div>

      <p className="tk-shown">Members will see: <b>{shownAs(d) || "…"}</b></p>
      <Toggle on={d.hasNum} set={(v) => set({ ...d, hasNum: v })} icon="🔢" title="It has a number that grows" text="Like 10 push-ups, then 11, then 12…" />
      {d.hasNum && (
        <div className="tk-sentence">
          <span>Today it's</span>
          <input type="number" min={0} aria-label="Number today" value={d.num} onChange={(e) => set({ ...d, num: e.target.value })} />
          <span>, then add</span>
          <input type="number" aria-label="Increase by" value={d.step} onChange={(e) => set({ ...d, step: e.target.value })} />
          <span>every</span>
          <input type="number" min={1} aria-label="Every how many days" value={d.every} onChange={(e) => set({ ...d, every: e.target.value })} />
          <span>{every === 1 ? "day" : "days"}.</span>
          <p className="tk-preview">
            {[0, every, every * 2, every * 3].map((k, i) => (
              <span key={k}><small>{i === 0 ? "Today" : k === 1 ? "Tomorrow" : `In ${k} days`}</small><b>{n + step * i}</b></span>
            ))}
          </p>
        </div>
      )}
      <Toggle on={d.fitness} set={(v) => set({ ...d, fitness: v })} icon="🤒" title="Excused on sick days" text="Skipped when a member writes a reason (like exercise)" />
      <Toggle on={d.nextDay} set={(v) => set({ ...d, nextDay: v })} icon="🌙" title="Done at night, counts for the next day" text="Like Surah Mulk: tonight's reading counts for tomorrow" />
      <div className={`tk-toggle tk-time${d.notBefore ? " on" : ""}`}>
        <span className="tk-toggle-ico">🕛</span>
        <span><b>Not before a time</b><small>Members can't tick it earlier in the day. Trying means swearing the oath again.</small></span>
        <span className="tk-time-in">
          <input type="time" aria-label="Earliest time" value={d.notBefore} onChange={(e) => set({ ...d, notBefore: e.target.value })} />
          {d.notBefore && <button type="button" className="link" onClick={() => set({ ...d, notBefore: "" })}>Clear</button>}
        </span>
      </div>
      <div className="tk-actions">
        <button className="primary">{submit}</button>
        {children}
      </div>
    </form>
  );
}

function TaskRow({ t, first, last, groups, onSaved, onError }: { t: TaskDef; first: boolean; last: boolean; groups: string[]; onSaved: (s?: string) => void; onError: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const [d, setD] = useState<Draft>(() => fromTask(t));
  const [sure, setSure] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await api.editTask(t.key, d.hasNum
        ? { label: labelOut(d), group: d.group, fitness: d.fitness, next_day: d.nextDay, not_before: d.notBefore, number_today: Number(d.num), step: Number(d.step), every: Number(d.every) }
        : { label: labelOut(d), group: d.group, fitness: d.fitness, next_day: d.nextDay, not_before: d.notBefore, clear_number: t.number_today !== null });
      setOpen(false);
      onSaved("Task saved");
    } catch (err) { onError(msg(err)); }
  }
  const act = async (fn: () => Promise<unknown>, ok?: string) => { try { await fn(); onSaved(ok); } catch (err) { onError(msg(err)); } };

  return (
    <li className={`tk-row${open ? " open" : ""}`}>
      <div className="tk-line">
        <div className="tk-move">
          <button aria-label={`Move ${t.shown_today} up`} disabled={first} onClick={() => act(() => api.editTask(t.key, { move: -1 }))}>▲</button>
          <button aria-label={`Move ${t.shown_today} down`} disabled={last} onClick={() => act(() => api.editTask(t.key, { move: 1 }))}>▼</button>
        </div>
        <button className="tk-main" onClick={() => { setOpen((x) => !x); setSure(false); setD(fromTask(t)); }} aria-expanded={open}>
          <b>{t.shown_today}</b>
          <span className="tk-tags">
            {t.number_today !== null && t.step !== 0 && <span className="tk-tag grow">↗ {t.step > 0 ? "+" : ""}{t.step} every {days(t.every)} · tomorrow {t.shown_tomorrow.match(/\d+/)?.[0] ?? ""}</span>}
            {t.number_today !== null && t.step === 0 && <span className="tk-tag">Fixed number</span>}
            {t.fitness && <span className="tk-tag sick">🤒 Sick-day excused</span>}
            {t.next_day && <span className="tk-tag night">🌙 Counts next day</span>}
            {t.not_before && <span className="tk-tag">🕛 Not before {t.not_before}</span>}
          </span>
        </button>
        <button className="tk-edit" onClick={() => { setOpen((x) => !x); setSure(false); setD(fromTask(t)); }}>{open ? "Close" : "Edit"}</button>
      </div>
      {open && (
        <Editor d={d} set={setD} groups={groups} onSubmit={save} submit="Save task">
          <button type="button" onClick={() => setOpen(false)}>Cancel</button>
          <button type="button" className="danger tk-remove" onClick={() => (sure ? act(() => api.deleteTask(t.key), "Task removed") : setSure(true))}>
            {sure ? "Tap again to remove" : "Remove task"}
          </button>
        </Editor>
      )}
    </li>
  );
}

type Mode = "normal" | "off" | "less";

/** Set up a special period: name, dates, and what happens to each task. */
function PeriodEditor({ tasks, initial, onSave, onCancel, onDelete }: { tasks: TaskDef[]; initial?: Period; onSave: (p: PeriodIn) => Promise<void>; onCancel: () => void; onDelete?: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState(initial?.name ?? "Ramadan");
  const [start, setStart] = useState(initial?.start ?? today);
  const [end, setEnd] = useState(initial?.end ?? today);
  const [modes, setModes] = useState<Record<string, Mode>>(() => Object.fromEntries(tasks.map((t) => [t.key,
    initial?.off.includes(t.key) ? "off" : initial && t.key in initial.numbers ? "less" : "normal"])));
  const [nums, setNums] = useState<Record<string, string>>(() => Object.fromEntries(tasks.map((t) => [t.key,
    String(initial?.numbers[t.key] ?? Math.max(1, Math.round((t.number_today ?? 2) / 2)))])));
  const [sure, setSure] = useState(false);
  const groups = [...new Set(tasks.map((t) => t.group))];
  const setAll = (keys: string[], m: Mode) => setModes((x) => ({ ...x, ...Object.fromEntries(keys.map((k) => [k, m])) }));
  const off = tasks.filter((t) => modes[t.key] === "off").length, less = tasks.filter((t) => modes[t.key] === "less").length;
  const days = Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1);

  async function submit(e: FormEvent) {
    e.preventDefault();
    await onSave({ name: name.trim(), start, end, off: tasks.filter((t) => modes[t.key] === "off").map((t) => t.key),
      numbers: Object.fromEntries(tasks.filter((t) => modes[t.key] === "less").map((t) => [t.key, Number(nums[t.key]) || 0])) });
  }

  return (
    <form className="tk-editor pd-editor" onSubmit={submit}>
      <div className="pd-top">
        <label className="field"><span className="field-label">Name</span><input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramadan" /></label>
        <label className="field"><span className="field-label">From</span><input type="date" required value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label className="field"><span className="field-label">To</span><input type="date" required min={start} value={end} onChange={(e) => setEnd(e.target.value)} /></label>
      </div>
      <p className="note" style={{ margin: 0 }}>{days} day{days === 1 ? "" : "s"} · {off} paused · {less} lighter. Everything is back to normal the day after.</p>
      <div className="pd-quick">
        <span>Quick:</span>
        <button type="button" onClick={() => setAll(tasks.filter((t) => t.fitness).map((t) => t.key), "off")}>Pause all fitness</button>
        <button type="button" onClick={() => setAll(tasks.filter((t) => t.number_today !== null).map((t) => t.key), "less")}>Halve all numbers</button>
        <button type="button" onClick={() => setAll(tasks.map((t) => t.key), "normal")}>Reset</button>
      </div>
      {groups.map((g) => (
        <div key={g} className="pd-group">
          <h4>{g}</h4>
          {tasks.filter((t) => t.group === g).map((t) => (
            <div key={t.key} className={`pd-row ${modes[t.key]}`}>
              <span className="pd-name">{t.shown_today}</span>
              <div className="pd-seg" role="radiogroup" aria-label={`During ${name || "the period"}: ${t.shown_today}`}>
                <button type="button" role="radio" aria-checked={modes[t.key] === "normal"} className={modes[t.key] === "normal" ? "on" : ""} onClick={() => setAll([t.key], "normal")}>Normal</button>
                {t.number_today !== null && <button type="button" role="radio" aria-checked={modes[t.key] === "less"} className={modes[t.key] === "less" ? "on" : ""} onClick={() => setAll([t.key], "less")}>Lighter</button>}
                <button type="button" role="radio" aria-checked={modes[t.key] === "off"} className={modes[t.key] === "off" ? "on" : ""} onClick={() => setAll([t.key], "off")}>Off</button>
              </div>
              {modes[t.key] === "less" && (
                <label className="pd-num">only <input type="number" min={0} value={nums[t.key]} onChange={(e) => setNums({ ...nums, [t.key]: e.target.value })} aria-label={`Number for ${t.shown_today}`} /></label>
              )}
            </div>
          ))}
        </div>
      ))}
      <div className="tk-actions">
        <button className="primary">{initial ? "Save period" : "Add period"}</button>
        <button type="button" onClick={onCancel}>Cancel</button>
        {onDelete && <button type="button" className="danger tk-remove" onClick={() => (sure ? onDelete() : setSure(true))}>{sure ? "Tap again to delete" : "Delete period"}</button>}
      </div>
    </form>
  );
}

function Periods({ tasks, onError, onSaved }: { tasks: TaskDef[]; onError: (s: string) => void; onSaved: (s: string) => void }) {
  const [list, setList] = useState<Period[] | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const reload = useCallback(() => { api.periods().then(setList).catch((e) => onError(msg(e))); }, [onError]);
  useEffect(reload, [reload]);
  const today = new Date().toISOString().slice(0, 10);
  const label = (k: string) => tasks.find((t) => t.key === k)?.label.replace("{n}", "").trim() ?? k;
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); setEditing(null); reload(); onSaved(ok); } catch (e) { onError(msg(e)); } };

  return (
    <section className="tk-group pd">
      <div className="pd-head">
        <div><h3>Special periods</h3><p className="note">Pause tasks or make them lighter for a while, like in Ramadan or on a trip.</p></div>
        {editing === null && <button onClick={() => setEditing("new")}>＋ Add period</button>}
      </div>
      {editing === "new" && <PeriodEditor tasks={tasks} onCancel={() => setEditing(null)} onSave={(b) => run(() => api.addPeriod(b), `${b.name} added`)} />}
      {list?.length === 0 && editing !== "new" && <p className="note">No special periods. Every task runs as normal.</p>}
      <ul className="pd-list">
        {list?.map((p) => {
          const state = today < p.start ? "coming" : today > p.end ? "over" : "now";
          return editing === p.id ? (
            <li key={p.id}><PeriodEditor tasks={tasks} initial={p} onCancel={() => setEditing(null)}
              onSave={(b) => run(() => api.editPeriod(p.id, b), "Period saved")} onDelete={() => run(() => api.deletePeriod(p.id), "Period deleted")} /></li>
          ) : (
            <li key={p.id} className={`pd-item ${state}`}>
              <div>
                <b>{p.name}</b> <span className={`pd-state ${state}`}>{state === "now" ? "On now" : state === "coming" ? "Coming" : "Over"}</span>
                <p className="note" style={{ margin: "2px 0 0" }}>{fmt(p.start, { day: "numeric", month: "short" })} – {fmt(p.end, { day: "numeric", month: "short", year: "numeric" })}</p>
                <div className="tk-tags" style={{ marginTop: 6 }}>
                  {p.off.map((k) => <span key={k} className="tk-tag sick">Off · {label(k)}</span>)}
                  {Object.entries(p.numbers).map(([k, n]) => <span key={k} className="tk-tag grow">{label(k)} → {n}</span>)}
                </div>
              </div>
              <button className="tk-edit" onClick={() => setEditing(p.id)}>Edit</button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState<TaskDef[] | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useToast();
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [nt, setNt] = useState<Draft>(EMPTY);

  const reload = useCallback(() => { api.tasks().then(setTasks).catch((e) => setError(msg(e))); }, []);
  useEffect(reload, [reload]);
  const saved = (s?: string) => { setError(""); if (s) setToast(s); reload(); notifyChanged(); };
  const groups = [...new Set((tasks ?? []).map((t) => t.group))];

  async function add(e: FormEvent) {
    e.preventDefault();
    try {
      await api.addTask({ label: labelOut(nt), group: nt.group, fitness: nt.fitness, next_day: nt.nextDay, not_before: nt.notBefore || null,
        number_today: nt.hasNum ? Number(nt.num) : null, step: nt.hasNum ? Number(nt.step) : 0, every: Number(nt.every) || 1 });
      setNt({ ...EMPTY, group: nt.group });
      setAdding(false);
      saved("Task added");
    } catch (err) { setError(msg(err)); }
  }

  const growing = (tasks ?? []).filter((t) => t.number_today !== null && t.step !== 0).length;

  return (
    <div className="tk">
      <header className="tk-head">
        <div>
          <h2>Daily tasks</h2>
          <p className="note">{tasks ? `${tasks.length} tasks · ${growing} grow by themselves · changes count from today` : "Loading…"}</p>
        </div>
        {!adding && <button className="primary" onClick={() => { setAdding(true); setNt({ ...EMPTY, group: groups[0] ?? "Ibadah" }); }}>＋ Add task</button>}
      </header>
      {error && <p className="err banner" role="alert">{error}</p>}

      {adding && (
        <section className="tk-group tk-new">
          <h3>New task</h3>
          <Editor d={nt} set={setNt} groups={groups} onSubmit={add} submit="Add task">
            <button type="button" onClick={() => setAdding(false)}>Cancel</button>
          </Editor>
        </section>
      )}

      {tasks && <Periods tasks={tasks} onError={setError} onSaved={(m) => saved(m)} />}

      <div className="tk-groups">
        {tasks && groups.map((g) => {
          const inGroup = tasks.filter((t) => t.group === g);
          return (
            <section key={g} className="tk-group">
              <h3>{g} <span className="tk-count">{inGroup.length}</span></h3>
              <ul>
                {inGroup.map((t) => {
                  const i = tasks.indexOf(t);
                  return <TaskRow key={`${t.key}${t.label}${t.number_today}${t.step}${t.every}${t.group}${t.fitness}${t.next_day}${t.not_before}`} t={t}
                    first={i === 0} last={i === tasks.length - 1} groups={groups} onSaved={saved} onError={setError} />;
                })}
              </ul>
            </section>
          );
        })}
      </div>
      <section className="tk-reset">
        {!resetting ? (
          <button onClick={() => setResetting(true)}>↺ Reset tasks to the original list</button>
        ) : (
          <div className="tk-reset-ask" role="alertdialog" aria-label="Reset tasks">
            <p><b>Put every task back as it was in the original sheet?</b> Names, groups, order and growing numbers go back to the start
              (numbers continue where they'd be today). Tasks you added are removed. Members' past ticks are kept.</p>
            <div className="tk-actions">
              <button className="danger" onClick={async () => {
                try { setTasks(await api.resetTasks()); setResetting(false); saved("Tasks reset to the original list"); }
                catch (e) { setError(msg(e)); }
              }}>Yes, reset all tasks</button>
              <button onClick={() => setResetting(false)}>Cancel</button>
            </div>
          </div>
        )}
      </section>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
