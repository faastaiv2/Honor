import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type DayView, type SignInMember, type TaskItem } from "../api";
import { useAuth } from "../auth";
import { addDays, fmt } from "../lib/dates";
import { notifyChanged, useToast } from "../lib/events";

function allKeys(v: DayView): string[] {
  const keys = v.groups.flatMap((g) => g.tasks.filter((t) => t.done).map((t) => t.key));
  if (v.pledge?.done) keys.push("gate");
  if (v.bonus.done) keys.push("bonus");
  return keys;
}

function withToggled(v: DayView, key: string, on: boolean): DayView {
  const flip = (t: TaskItem) => (t.key === key ? { ...t, done: on } : t);
  return {
    ...v,
    pledge: v.pledge ? flip(v.pledge) : null,
    groups: v.groups.map((g) => ({ ...g, tasks: g.tasks.map(flip) })),
    bonus: key === "bonus" ? { ...v.bonus, done: on } : v.bonus,
  };
}

export default function Today() {
  const { viewer } = useAuth();
  const [members, setMembers] = useState<SignInMember[]>([]);
  const [memberId, setMemberId] = useState<string | null>(viewer?.is_admin ? null : viewer?.id ?? null);
  const [date, setDate] = useState<string | undefined>(undefined);
  const [view, setView] = useState<DayView | null>(null);
  const [excuse, setExcuse] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useToast();
  const saving = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    if (!viewer?.is_admin) return;
    api.signInList().then((ms) => { setMembers(ms); setMemberId((cur) => cur ?? ms[0]?.id ?? null); }).catch(() => undefined);
  }, [viewer]);

  const load = useCallback(() => {
    if (!memberId) return;
    api.day(memberId, date).then((v) => { setView(v); setExcuse(v.excuse); setError(""); })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load the day"));
  }, [memberId, date]);
  useEffect(load, [load]);

  function save(next: DayView, nextExcuse: string) {
    // One save at a time, in order, so quick taps never overwrite each other.
    saving.current = saving.current.then(() =>
      api.saveDay(next.member.id, next.date, allKeys(next), nextExcuse)
        .then((saved) => { setView((cur) => (cur && cur.date === saved.date && cur.member.id === saved.member.id ? { ...cur, score: saved.score } : cur)); notifyChanged(); return saved; })
        .catch((e) => { setError(e instanceof ApiError ? e.message : "Could not save. Check your connection."); load(); }));
    return saving.current;
  }

  function toggle(key: string, on: boolean) {
    if (!view) return;
    const next = withToggled(view, key, on);
    setView(next);
    save(next, excuse).then((saved) => {
      const s = (saved as DayView | undefined)?.score;
      if (on && s && s.done === s.of && s.gain) setToast("All tasks done — Honor received! 🏆");
    });
  }

  if (!memberId) return <section className="card"><h2>Daily tasks</h2><p className="note">Add members in Admin to start.</p></section>;
  if (!view) return <section className="card"><h2>Daily tasks</h2><p className={error ? "err" : "note"}>{error || "Loading…"}</p></section>;

  const today = view.today;
  const s = view.score;
  const isToday = view.date === today;
  const row = (t: TaskItem, cls = "", label: React.ReactNode = t.label, extra?: React.ReactNode) => (
    <label key={t.key} className={`task ${cls}${t.done ? " done" : ""}`}>
      <input type="checkbox" checked={t.done} disabled={!view.editable} onChange={(e) => toggle(t.key, e.target.checked)} />
      <span>{label}</span>{extra}
    </label>
  );

  return (
    <section className={`card${view.editable ? "" : " locked"}`} aria-labelledby="tasks-h">
      <h2 id="tasks-h">Daily tasks{viewer?.is_admin ? "" : ` · ${view.member.name}`}</h2>
      {viewer?.is_admin && (
        <div className="chips" role="group" aria-label="Member">
          {members.map((m) => (
            <button key={m.id} className={`chip${m.id === memberId ? " on" : ""}`} onClick={() => setMemberId(m.id)}>{m.name}</button>
          ))}
        </div>
      )}
      <div className="daynav">
        <button aria-label="Previous day" onClick={() => setDate(addDays(view.date, -1))}>‹</button>
        <b>{isToday ? "Today · " : view.date === addDays(today, -1) ? "Yesterday · " : ""}{fmt(view.date, { weekday: "short", day: "numeric", month: "short" })}</b>
        <button aria-label="Next day" disabled={view.date >= today} onClick={() => setDate(addDays(view.date, 1))}>›</button>
      </div>
      <div className="score">
        <div className="big">{s.done}/{s.of}</div>
        <div style={{ flex: 1 }}>
          <p>
            {s.delta > 0 ? "+" : ""}{s.delta} Honor {isToday ? "so far" : "this day"}
            {s.excused ? " · excused" : ""}{view.weekend ? " · weekend, optional" : s.cut ? " · Honor cut 👺" : ""}
            {view.before_scoring ? " · before scoring started" : ""}
          </p>
          <div className="meter"><i style={{ width: `${s.of ? (s.done / s.of) * 100 : 0}%` }} /></div>
        </div>
      </div>
      {view.pledge ? row(view.pledge, "gate") : <p className="note" style={{ margin: "0 0 6px" }}>🎮 Weekend: games and YouTube allowed.</p>}
      {view.groups.map((g) => (
        <div key={g.name}>
          <div className="grp">{g.name}{g.name === "Fitness" && s.excused ? " · excused" : ""}</div>
          {g.tasks.map((t) => row(t))}
        </div>
      ))}
      <div className="grp">Bonus</div>
      {row({ key: "bonus", label: "", done: view.bonus.done }, "bonus",
        <>{view.bonus.count} <span className="ar">{view.bonus.dhikr}</span></>, <em>+1 Honor</em>)}
      <form className="row" style={{ marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); save(view, excuse.trim()).then(() => { setToast(excuse.trim() ? "Excuse saved" : "Excuse cleared"); load(); }); }}>
        <input className="grow" placeholder="Excused today? Reason (sick, knee pain…)" maxLength={120} value={excuse}
          disabled={!view.editable} onChange={(e) => setExcuse(e.target.value)} aria-label="Reason for being excused" />
        <button disabled={!view.editable}>Save reason</button>
      </form>
      {!view.editable && <p className="note">This day is locked. Only a parent can change older days.</p>}
      {error && <p className="err" role="alert">{error}</p>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </section>
  );
}
