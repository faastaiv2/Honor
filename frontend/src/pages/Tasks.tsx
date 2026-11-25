import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type TaskDef } from "../api";
import { notifyChanged, useToast } from "../lib/events";

const msg = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong");
const days = (n: number) => (n === 1 ? "day" : `${n} days`);

interface Draft { label: string; group: string; hasNum: boolean; num: string; step: string; every: string; fitness: boolean; nextDay: boolean }

const fromTask = (t: TaskDef): Draft => ({
  label: t.label.replace("{n}", "#"), group: t.group, hasNum: t.number_today !== null,
  num: String(t.number_today ?? 10), step: String(t.step || 1), every: String(t.every), fitness: t.fitness, nextDay: t.next_day,
});
/** "#" in the name marks where the number goes ("# push-ups"); without one the number goes first. */
const labelOut = (d: Draft) => (d.hasNum ? d.label.replace("#", "{n}") : d.label.replace("#", "").replace(/\s+/g, " ").trim());
const EMPTY: Draft = { label: "", group: "Ibadah", hasNum: false, num: "10", step: "1", every: "1", fitness: false, nextDay: false };

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
          <input required autoFocus maxLength={110} value={d.label} onChange={(e) => set({ ...d, label: e.target.value })} placeholder={d.hasNum ? "e.g. # push-ups" : "e.g. Fajr"} />
          {d.hasNum && <span className="field-hint"># shows where the number goes</span>}
        </label>
        <label className="field"><span className="field-label">Group</span>
          <input list="tk-groups" required maxLength={40} value={d.group} onChange={(e) => set({ ...d, group: e.target.value })} />
          <datalist id="tk-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
        </label>
      </div>

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
        ? { label: labelOut(d), group: d.group, fitness: d.fitness, next_day: d.nextDay, number_today: Number(d.num), step: Number(d.step), every: Number(d.every) }
        : { label: labelOut(d), group: d.group, fitness: d.fitness, next_day: d.nextDay, clear_number: t.number_today !== null });
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

export default function Tasks() {
  const [tasks, setTasks] = useState<TaskDef[] | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useToast();
  const [adding, setAdding] = useState(false);
  const [nt, setNt] = useState<Draft>(EMPTY);

  const reload = useCallback(() => { api.tasks().then(setTasks).catch((e) => setError(msg(e))); }, []);
  useEffect(reload, [reload]);
  const saved = (s?: string) => { setError(""); if (s) setToast(s); reload(); notifyChanged(); };
  const groups = [...new Set((tasks ?? []).map((t) => t.group))];

  async function add(e: FormEvent) {
    e.preventDefault();
    try {
      await api.addTask({ label: labelOut(nt), group: nt.group, fitness: nt.fitness, next_day: nt.nextDay,
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

      <div className="tk-groups">
        {tasks && groups.map((g) => {
          const inGroup = tasks.filter((t) => t.group === g);
          return (
            <section key={g} className="tk-group">
              <h3>{g} <span className="tk-count">{inGroup.length}</span></h3>
              <ul>
                {inGroup.map((t) => {
                  const i = tasks.indexOf(t);
                  return <TaskRow key={`${t.key}${t.label}${t.number_today}${t.step}${t.every}${t.group}${t.fitness}${t.next_day}`} t={t}
                    first={i === 0} last={i === tasks.length - 1} groups={groups} onSaved={saved} onError={setError} />;
                })}
              </ul>
            </section>
          );
        })}
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
