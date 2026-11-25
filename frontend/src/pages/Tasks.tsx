import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type TaskDef } from "../api";
import { notifyChanged, useToast } from "../lib/events";

const msg = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong");

function TaskRow({ t, first, last, groups, onSaved, onError }: { t: TaskDef; first: boolean; last: boolean; groups: string[]; onSaved: (s?: string) => void; onError: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(t.label.replace("{n}", "").trim());
  const [group, setGroup] = useState(t.group);
  const [hasNum, setHasNum] = useState(t.number_today !== null);
  const [num, setNum] = useState(String(t.number_today ?? 0));
  const [step, setStep] = useState(String(t.step));
  const [every, setEvery] = useState(String(t.every));
  const [fitness, setFitness] = useState(t.fitness);
  const [sure, setSure] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      const lbl = hasNum && !t.label.includes("{n}") ? label : hasNum ? t.label.replace(t.label.replace("{n}", "").trim(), label) : label;
      await api.editTask(t.key, hasNum
        ? { label: lbl, group, fitness, number_today: Number(num), step: Number(step), every: Number(every) }
        : { label, group, fitness, clear_number: t.number_today !== null });
      setOpen(false);
      onSaved("Task saved");
    } catch (err) { onError(msg(err)); }
  }
  const act = async (fn: () => Promise<unknown>, ok?: string) => { try { await fn(); onSaved(ok); } catch (err) { onError(msg(err)); } };

  return (
    <li className="task-def">
      <div className="task-def-line">
        <span className="task-def-move">
          <button aria-label="Move up" disabled={first} onClick={() => act(() => api.editTask(t.key, { move: -1 }))}>↑</button>
          <button aria-label="Move down" disabled={last} onClick={() => act(() => api.editTask(t.key, { move: 1 }))}>↓</button>
        </span>
        <div className="task-def-text">
          <b>{t.shown_today}</b>
          <span className="note" style={{ margin: 0 }}>
            {t.number_today !== null && t.step !== 0
              ? `${t.step > 0 ? "+" : ""}${t.step} every ${t.every === 1 ? "day" : `${t.every} days`} · tomorrow: ${t.shown_tomorrow}`
              : t.number_today !== null ? "Number stays the same" : "No number"}
            {t.fitness ? " · excused on sick days" : ""}
          </span>
        </div>
        <button onClick={() => { setOpen((x) => !x); setSure(false); }}>{open ? "Close" : "Edit"}</button>
      </div>
      {open && (
        <form className="task-def-edit" onSubmit={save}>
          <label className="field"><span className="field-label">Task name</span>
            <input required maxLength={110} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. jumping jacks" />
          </label>
          <label className="field"><span className="field-label">Group</span>
            <input list="task-groups" required maxLength={40} value={group} onChange={(e) => setGroup(e.target.value)} />
          </label>
          <label className="check"><input type="checkbox" checked={hasNum} onChange={(e) => setHasNum(e.target.checked)} /> This task has a number that grows</label>
          {hasNum && (
            <div className="num-grid">
              <label className="field"><span className="field-label">Number today</span><input type="number" min={0} value={num} onChange={(e) => setNum(e.target.value)} /></label>
              <label className="field"><span className="field-label">Increase by</span><input type="number" value={step} onChange={(e) => setStep(e.target.value)} /></label>
              <label className="field"><span className="field-label">Every … days</span><input type="number" min={1} value={every} onChange={(e) => setEvery(e.target.value)} /></label>
              <p className="note num-preview">Tomorrow: <b>{Number(num) + (Number(every) === 1 ? Number(step) : 0)}</b>{Number(every) > 1 ? ` · in ${every} days: ${Number(num) + Number(step)}` : ""}</p>
            </div>
          )}
          <label className="check"><input type="checkbox" checked={fitness} onChange={(e) => setFitness(e.target.checked)} /> Excused on sick days (like exercise)</label>
          <div className="row">
            <button className="primary">Save</button>
            <button type="button" className="danger" onClick={() => (sure ? act(() => api.deleteTask(t.key), "Task removed") : setSure(true))}>{sure ? "Tap again to remove" : "Remove task"}</button>
          </div>
        </form>
      )}
      {groups.length > 0 && <datalist id="task-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>}
    </li>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState<TaskDef[] | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useToast();
  const [nt, setNt] = useState({ label: "", group: "Ibadah", hasNum: false, num: "10", step: "1", every: "1", fitness: false });

  const reload = useCallback(() => { api.tasks().then(setTasks).catch((e) => setError(msg(e))); }, []);
  useEffect(reload, [reload]);
  const saved = (s?: string) => { setError(""); if (s) setToast(s); reload(); notifyChanged(); };
  const groups = [...new Set((tasks ?? []).map((t) => t.group))];

  async function add(e: FormEvent) {
    e.preventDefault();
    try {
      await api.addTask({ label: nt.label, group: nt.group, fitness: nt.fitness, number_today: nt.hasNum ? Number(nt.num) : null, step: nt.hasNum ? Number(nt.step) : 0, every: Number(nt.every) || 1 });
      setNt({ ...nt, label: "" });
      saved("Task added");
    } catch (err) { setError(msg(err)); }
  }

  return (
    <div className="admin">
      {error && <p className="err banner" role="alert">{error}</p>}
      <section className="card" style={{ gridColumn: "1 / -1" }}>
        <h2>Daily tasks</h2>
        <p className="note">Everyone sees these every day. Numbers grow by themselves: set how much and how often. Changes count from today.</p>
        {!tasks ? <p className="note">Loading…</p> : groups.map((g) => {
          const inGroup = tasks.filter((t) => t.group === g);
          return (
            <div key={g}>
              <div className="grp">{g}</div>
              <ul className="task-defs">
                {inGroup.map((t) => {
                  const i = tasks.indexOf(t);
                  return <TaskRow key={`${t.key}${t.label}${t.number_today}${t.step}${t.every}${t.group}${t.fitness}`} t={t} first={i === 0} last={i === tasks.length - 1} groups={groups} onSaved={saved} onError={setError} />;
                })}
              </ul>
            </div>
          );
        })}
      </section>
      <section className="card">
        <h2>Add a task</h2>
        <form className="add-form" onSubmit={add}>
          <label className="field"><span className="field-label">Task name</span><input required maxLength={110} value={nt.label} onChange={(e) => setNt({ ...nt, label: e.target.value })} placeholder="e.g. squats" /></label>
          <label className="field"><span className="field-label">Group</span><input list="task-groups" required maxLength={40} value={nt.group} onChange={(e) => setNt({ ...nt, group: e.target.value })} /></label>
          <label className="check"><input type="checkbox" checked={nt.hasNum} onChange={(e) => setNt({ ...nt, hasNum: e.target.checked })} /> Has a number that grows</label>
          {nt.hasNum && (
            <div className="num-grid">
              <label className="field"><span className="field-label">Start at</span><input type="number" min={0} value={nt.num} onChange={(e) => setNt({ ...nt, num: e.target.value })} /></label>
              <label className="field"><span className="field-label">Increase by</span><input type="number" value={nt.step} onChange={(e) => setNt({ ...nt, step: e.target.value })} /></label>
              <label className="field"><span className="field-label">Every … days</span><input type="number" min={1} value={nt.every} onChange={(e) => setNt({ ...nt, every: e.target.value })} /></label>
            </div>
          )}
          <label className="check"><input type="checkbox" checked={nt.fitness} onChange={(e) => setNt({ ...nt, fitness: e.target.checked })} /> Excused on sick days</label>
          <button className="primary">Add task</button>
        </form>
      </section>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
