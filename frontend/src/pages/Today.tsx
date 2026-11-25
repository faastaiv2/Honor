import { useCallback, useEffect, useRef, useState } from "react";
import RankIcon from "../lib/RankIcon";
import Gem from "../lib/Gem";
import Brazier from "../lib/Brazier";
import { api, ApiError, type DayView, type SignInMember, type TaskItem, type TodayInfo } from "../api";
import { useAuth } from "../auth";
import { addDays, fmt } from "../lib/dates";
import { confetti } from "../lib/confetti";
import { notifyChanged, useToast } from "../lib/events";

function doneKeys(v: DayView): string[] {
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

function Perks({ view, canAct, onQuest }: { view: DayView; canAct: boolean; onQuest: () => void }) {
  const st = view.status;
  const [sure, setSure] = useState(false);
  return (
    <div className="perks" style={{ ["--tc" as string]: st.tier.color }}>
      <div className="perks-top">
        <span className="perks-medal"><RankIcon rank={st.tier.key} size={52} /></span>
        <div>
          <b>{st.tier.name} · {st.label}</b>
          <div className="note" style={{ margin: 0 }}>
            {st.next ? <>{st.next.needed} more to <RankIcon rank={st.next.name} /> {st.next.name}</> : st.legendary ? "The highest honor" : st.tier.key === "obsidian" ? "XLIX is the top without the Legendary quest" : ""}
          </div>
        </div>
      </div>
      <p><span aria-hidden="true">🎮</span> {st.tier.games}</p>
      <p><span aria-hidden="true">🎁</span> {st.tier.benefits}</p>
      {st.quest.active && <p className="quest"><RankIcon rank="legendary" /> Legendary quest, day {st.quest.days + 1}: finish every task <b>and</b> the bonus every day until L.</p>}
      {st.quest.broken_on && !st.quest.active && st.tier.key !== "bronze" && <p className="note">The last Legendary quest ended on {fmt(st.quest.broken_on, { day: "numeric", month: "short" })}.</p>}
      {st.banned && <p className="note">Legendary Honor was lost and cannot be received again.</p>}
      {st.can_start_quest && canAct && (
        <div className="quest">
          <p style={{ margin: "0 0 8px" }}><RankIcon rank="legendary" /> <b>Legendary quest.</b> Give up <RankIcon rank={st.tier.key} /> {st.tier.name}, start again from <RankIcon rank="bronze" /> Bronze I, and finish <b>every task and every bonus, every day</b> until L. One missed day ends the quest.</p>
          <button className="primary" onClick={() => (sure ? onQuest() : setSure(true))}>{sure ? "Yes, give up my Obsidian title and start" : "Start the Legendary quest"}</button>
          {sure && <button className="link" onClick={() => setSure(false)}>Not now</button>}
        </div>
      )}
    </div>
  );
}

export default function Today({ info }: { info: TodayInfo | null }) {
  const perTask = info?.gems.per_task ?? 1, fullDay = info?.gems.full_day ?? 20;
  const { viewer } = useAuth();
  const [members, setMembers] = useState<SignInMember[]>([]);
  const [memberId, setMemberId] = useState<string | null>(viewer?.is_admin ? null : viewer?.id ?? null);
  const [date, setDate] = useState<string | undefined>(undefined);
  const [view, setView] = useState<DayView | null>(null);
  const [excuse, setExcuse] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useToast();
  const [pops, setPops] = useState<Record<string, number>>({});
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

  function save(next: DayView, nextExcuse: string): Promise<DayView | undefined> {
    // One save at a time, in order, so quick taps never overwrite each other.
    const p = saving.current.then(() =>
      api.saveDay(next.member.id, next.date, doneKeys(next), nextExcuse)
        .then((saved) => { setView(saved); notifyChanged(); return saved; })
        .catch((e) => { setError(e instanceof ApiError ? e.message : "Could not save. Check your connection."); load(); return undefined; }));
    saving.current = p;
    return p;
  }

  function toggle(key: string, on: boolean) {
    if (!view) return;
    setError("");
    const next = withToggled(view, key, on);
    setView(next);
    if (on && key !== "gate") {
      const id = Date.now();
      setPops((p) => ({ ...p, [key]: id }));
      setTimeout(() => setPops((p) => (p[key] === id ? Object.fromEntries(Object.entries(p).filter(([k]) => k !== key)) : p)), 900);
    }
    save(next, excuse).then((saved) => {
      const s = saved?.score;
      if (on && s && s.done === s.of && s.gain) { setToast("All tasks done! Your Honor arrives at midnight 🌙"); confetti(); }
      else if (on && saved?.mode === "makeup") setToast("Made up ✔");
    });
  }

  if (!memberId) return <section className="card"><h2>Daily tasks</h2><p className="note">Add members in Admin to start.</p></section>;
  if (!view) return <section className="card"><h2>Daily tasks</h2><p className={error ? "err" : "note"}>{error || "Loading…"}</p></section>;

  const today = view.today;
  const s = view.score;
  const isToday = view.date === today;
  const makeup = view.mode === "makeup";
  const isMe = viewer?.kind === "member" && viewer.id === view.member.id;

  const canTick = (t: TaskItem, isBonus = false) => {
    if (isBonus && !t.done && !s.gain) return false; // the bonus opens once every task is done
    if (view.mode === "open" || view.mode === "admin") return true;
    if (!makeup) return false;
    if (isBonus) return false;
    if (t.done) return !!t.late || t.key === "gate";
    return t.key === "gate" || view.makeup_left > 0;
  };
  const row = (t: TaskItem, cls = "", label: React.ReactNode = t.label, extra?: React.ReactNode, isBonus = false) => (
    <label key={t.key} className={`task ${cls}${t.done ? " done" : ""}${canTick(t, isBonus) ? "" : " off"}`}>
      <input type="checkbox" checked={t.done} disabled={!canTick(t, isBonus)} onChange={(e) => toggle(t.key, e.target.checked)} />
      <span>{label}</span>{t.late && <i className="late">made up</i>}
      {t.next_day && <i className={`night${t.counted_today ? " ok" : ""}`} title="Read at night: it counts for the next day">
        🌙 for tomorrow · {t.counted_today ? "last night's counted ✓" : "not read last night"}</i>}
      {extra}
      {pops[t.key] && <span className="gem-pop" key={pops[t.key]} aria-hidden="true">+{perTask} <Gem /></span>}
    </label>
  );

  return (
    <section className={`card${view.editable ? "" : " locked"}`} aria-labelledby="tasks-h">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 id="tasks-h" style={{ marginBottom: 0 }}>Daily tasks{viewer?.is_admin ? "" : ` · ${view.member.name}`}</h2>
      </div>
      {viewer?.is_admin && (
        <div className="chips" role="group" aria-label="Member" style={{ marginTop: 12 }}>
          {members.map((m) => (
            <button key={m.id} className={`chip${m.id === memberId ? " on" : ""}`} onClick={() => setMemberId(m.id)}>{m.name}</button>
          ))}
        </div>
      )}
      <div className="daynav" style={{ marginTop: 12 }}>
        <button aria-label="Previous day" onClick={() => setDate(addDays(view.date, -1))}>‹</button>
        <b>{isToday ? "Today · " : view.date === addDays(today, -1) ? "Yesterday · " : ""}{fmt(view.date, { weekday: "short", day: "numeric", month: "short" })}</b>
        <button aria-label="Next day" disabled={view.date >= today} onClick={() => setDate(addDays(view.date, 1))}>›</button>
      </div>
      <div className="score">
        <div className="big">{s.done}/{s.of}</div>
        <div style={{ flex: 1 }}>
          <p>
            {s.delta > 0 ? "+" : ""}{s.delta} Honor {isToday ? (s.delta > 0 ? "· arrives at midnight 🌙" : "so far · tick until 11:59 PM") : "this day"}
            {s.excused ? " · excused" : ""}{view.weekend ? " · weekend, optional" : s.cut ? " · Honor cut 👺" : ""}
            {view.before_scoring ? " · before scoring started" : ""}
          </p>
          <div className="meter"><i style={{ width: `${s.of ? (s.done / s.of) * 100 : 0}%` }} /></div>
        </div>
      </div>
      {isToday && !view.weekend && (
        <div className={`goal${s.gain ? " won" : ""}`}>
          <span className="goal-title">{s.gain ? "Day complete! MashaAllah 🌟" : `Finish all ${s.of} to win:`}</span>
          <span className="goal-chip">🌙 +1 Honor at midnight</span>
          <span className="goal-chip gem">+{fullDay} <Gem /></span>
          <span className="goal-chip">🔓 Bonus · +1 Honor</span>
          <span className="goal-chip"><Brazier lit={s.gain > 0} /> Streak &amp; chest</span>
        </div>
      )}
      {makeup && (
        <p className="banner">🔁 <b>Make-up:</b> {view.makeup_left > 0 ? `you can still tick ${view.makeup_left} missed task${view.makeup_left === 1 ? "" : "s"} for this day.` : "no make-ups left for this day."} The bonus cannot be made up.</p>
      )}
      {view.pledge ? row(view.pledge, "gate") : <p className="note" style={{ margin: "0 0 6px" }}>🎮 Weekend: games and YouTube allowed.</p>}
      <div className="task-groups">
      {view.groups.map((g) => (
        <div key={g.name} className="task-group">
          {g.name !== "Learning & home" && <div className="grp">{g.name}{g.name === "Fitness" && s.excused ? " · excused" : ""}</div>}
          {g.tasks.map((t) => row(t))}
        </div>
      ))}
      </div>
      <div className="grp">Bonus{!s.gain && !view.bonus.done ? " · 🔒 finish every task first" : ""}</div>
      {row({ key: "bonus", label: "", done: view.bonus.done }, "bonus",
        <>{view.bonus.count} <span className="ar">{view.bonus.dhikr}</span></>, <em>+1 Honor</em>, true)}
      <form className="row" style={{ marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); save(view, excuse.trim()).then((ok) => ok && setToast(excuse.trim() ? "Excuse saved" : "Excuse cleared")); }}>
        <input className="grow" placeholder="Excused today? Reason (sick, knee pain…)" maxLength={120} value={excuse}
          disabled={!view.excuse_editable} onChange={(e) => setExcuse(e.target.value)} aria-label="Reason for being excused" />
        <button disabled={!view.excuse_editable}>Save reason</button>
      </form>
      {view.mode === "locked" && <p className="note">This day is locked. {view.date < today ? "Your rank does not allow making it up now; a parent can still change it." : ""}</p>}
      {error && <p className="err" role="alert">{error}</p>}
      <Perks view={view} canAct={isMe || !!viewer?.is_admin}
        onQuest={async () => { try { await api.startQuest(view.member.id); notifyChanged(); load(); setToast("The Legendary quest has begun 👑"); } catch (e) { setError(e instanceof ApiError ? e.message : "Could not start"); } }} />
      {toast && <div className="toast" role="status">{toast}</div>}
    </section>
  );
}
