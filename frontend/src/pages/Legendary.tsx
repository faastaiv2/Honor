import { useEffect, useState } from "react";
import { api, ApiError, type QuestInfo, type Settings, type TaskDef } from "../api";
import { useAuth } from "../auth";
import Avatar from "../lib/Avatar";
import Gem from "../lib/Gem";
import RankIcon from "../lib/RankIcon";
import { fmt } from "../lib/dates";
import { notifyChanged } from "../lib/events";
import { preloadCrack, preloadQuestMusic } from "../lib/questMusic";
import { preloadSound } from "../lib/sounds";
import QuestFilm from "./QuestFilm";

const RULES: [string, string][] = [
  ["⬇️", "Give up your 🔮 Obsidian title and start again at Bronze I."],
  ["✅", "Finish every task and the quest bonus, every single day."],
  ["⚠️", "One missed day ends the quest. You keep climbing normally, capped at XLIX."],
  ["👑", "Reach L and you become Legendary, the highest honor of all."],
];

/** "Give up Obsidian?" — the last check before the quest starts. */
function QuestConfirm({ tier, onYes, onNo }: { tier: { key: string; name: string }; onYes: () => void; onNo: () => void }) {
  return (
    <div className="qc" role="dialog" aria-modal="true" aria-labelledby="qc-title">
      <div className="qc-sky" aria-hidden="true" />
      <div className="qc-card">
        <div className="qc-crests" aria-hidden="true">
          <span className="qc-from"><RankIcon rank={tier.key} className="ru-crest" /></span>
          <span className="qc-arrow">→</span>
          <span className="qc-to"><RankIcon rank="bronze" className="ru-crest" /></span>
          <span className="qc-arrow">→</span>
          <span className="qc-goal"><RankIcon rank="legendary" className="ru-crest" /></span>
        </div>
        <p className="qc-kicker">The Legendary quest</p>
        <h2 id="qc-title">Give up {tier.name}?</h2>
        <ul className="qc-rules">
          <li><span>⬇️</span><span>Your {tier.name} title is gone. You start again at <b>Bronze I</b>.</span></li>
          <li><span>✅</span><span>Finish <b>every task and the bonus, every day</b>, all the way to L.</span></li>
          <li><span>⚠️</span><span><b>One missed day</b> ends the quest.</span></li>
          <li><span>👑</span><span>Reach L and you become <b>Legendary</b>, the highest honor.</span></li>
        </ul>
        <button className="qc-yes" onClick={onYes}>Yes, give up my {tier.name} title and start</button>
        <button className="qc-no" onClick={onNo}>Not now</button>
      </div>
    </div>
  );
}

function MyQuest({ info, onStart }: { info: QuestInfo; onStart: () => void }) {
  const me = info.me;
  if (!me) return null;
  const st = me.status;
  const pct = Math.max(0, Math.min(100, Math.round((me.level / me.goal) * 100)));
  if (st.legendary) return (
    <div className="lq-me lq-done"><RankIcon rank="legendary" size={56} /><div><b>You are Legendary 👑</b><p>The highest honor. Keep finishing your weekdays to hold on to it.</p></div></div>
  );
  if (st.banned) return <div className="lq-me lq-lost"><span aria-hidden="true">💔</span><div><b>Legendary Honor was lost</b><p>It cannot be received again.</p></div></div>;
  if (st.quest.active) return (
    <div className="lq-me lq-on">
      <div className="lq-me-top"><RankIcon rank={st.tier.key} size={44} /><div><b>On the quest · day {st.quest.days + 1}</b><p>{st.quest.days} perfect {st.quest.days === 1 ? "day" : "days"} so far. Don't miss one!</p></div></div>
      <div className="lq-track" role="progressbar" aria-valuemin={0} aria-valuemax={me.goal} aria-valuenow={me.level} aria-label="Quest progress">
        <div className="lq-track-fill" style={{ width: `${pct}%` }} />
        <span className="lq-track-crown" aria-hidden="true">👑</span>
      </div>
      <p className="lq-track-text"><b>{st.label}</b> of L · {Math.max(0, me.goal - me.level)} to go</p>
    </div>
  );
  if (st.can_start_quest) return (
    <div className="lq-me lq-ready">
      <div className="lq-me-top"><RankIcon rank="obsidian" size={44} /><div><b>You are ready.</b><p>You've reached 🔮 Obsidian. The quest is yours to take.</p></div></div>
      <button className="lq-start" onClick={onStart}>👑 Start the Legendary quest</button>
    </div>
  );
  const toObs = Math.max(0, Math.min(100, Math.round((Math.max(0, me.level) / 49) * 100)));
  return (
    <div className="lq-me lq-locked">
      <div className="lq-me-top"><span className="lq-lock" aria-hidden="true">🔒</span><div><b>Locked until 🔮 Obsidian</b><p>Reach XLIX to unlock the quest. You're at {st.label}.</p></div></div>
      <div className="lq-track"><div className="lq-track-fill" style={{ width: `${toObs}%` }} /></div>
    </div>
  );
}

/** The admin's quest controls: the prize, gems per perfect day, and how hard each task is on the quest. */
function QuestAdmin({ info, reload }: { info: QuestInfo; reload: () => void }) {
  const [cfg, setCfg] = useState<Settings | null>(null);
  const [tasks, setTasks] = useState<TaskDef[] | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [add, setAdd] = useState({ label: "", group: "Ibadah", number: "" });
  useEffect(() => { api.settings().then(setCfg).catch(() => undefined); api.tasks().then(setTasks).catch(() => undefined); }, []);
  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(""), 2000); };
  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : "Could not save");
  const saveCfg = async () => {
    if (!cfg) return;
    try { setCfg(await api.saveSettings({ legendary_gems: cfg.legendary_gems, quest_day_gems: cfg.quest_day_gems })); flash("Saved ✓"); reload(); } catch (e) { fail(e); }
  };
  const edit = async (t: TaskDef, body: Parameters<typeof api.editTask>[1]) => {
    try {
      const n = await api.editTask(t.key, body);
      setTasks((cur) => cur?.map((x) => x.key === t.key ? n : x) ?? null); flash("Saved ✓"); reload(); setError("");
    } catch (e) { fail(e); }
  };
  const addTask = async () => {
    const num = add.number.trim() === "" ? null : Number(add.number);
    const label = num !== null && !add.label.includes("{n}") ? `{n} ${add.label}` : add.label;
    try {
      await api.addTask({ label, group: add.group, fitness: add.group === "Fitness", next_day: false, number_today: num, min_rank: "legendary" });
      setTasks(await api.tasks()); setAdd({ label: "", group: add.group, number: "" }); flash("Added ✓"); reload();
    } catch (e) { fail(e); }
  };
  const groups = [...new Set((tasks ?? []).map((t) => t.group))];
  const start = async (id: string, name: string) => {
    if (!confirm(`Start the Legendary quest for ${name}? They give up Obsidian and restart at Bronze I.`)) return;
    try { await api.startQuest(id); notifyChanged(); reload(); } catch (e) { fail(e); }
  };

  return (
    <>
      <div className="card lq-admin">
        <h3>💰 Rewards</h3>
        {cfg ? (
          <div className="lq-rates">
            <label><span><RankIcon rank="legendary" /> Prize for reaching Legendary</span>
              <span className="lq-num"><input type="number" min={0} max={100000} value={cfg.legendary_gems} onChange={(e) => setCfg({ ...cfg, legendary_gems: Number(e.target.value) })} /><Gem /></span></label>
            <label><span>✨ Gems for each perfect quest day</span>
              <span className="lq-num"><input type="number" min={0} max={10000} value={cfg.quest_day_gems} onChange={(e) => setCfg({ ...cfg, quest_day_gems: Number(e.target.value) })} /><Gem /></span></label>
            <button className="primary" onClick={() => void saveCfg()}>Save rewards</button>
          </div>
        ) : <p className="note">Loading…</p>}
      </div>

      <div className="card lq-admin">
        <h3>💪 How hard the quest is</h3>
        <p className="note">On the quest, tasks are set as for the 👑 Legendary rank. Type a number to set a task's own number on the quest (leave empty to use the Legendary rank's number). Tick “Quest only” for tasks that only appear on the quest and once Legendary.</p>
        {tasks === null ? <p className="note">Loading…</p> : (
          <div className="lq-table" role="table" aria-label="Quest tasks">
            <div className="lq-row lq-head" role="row"><span role="columnheader">Task</span><span role="columnheader">Normal at 👑</span><span role="columnheader">On the quest</span><span role="columnheader">Quest only</span></div>
            {tasks.map((t) => {
              const leg = t.by_rank.find((r) => r.rank === "legendary")?.label ?? t.shown_today;
              const hasNumber = t.label.includes("{n}") && t.number_today !== null;
              return (
                <div key={t.key + (t.quest_number ?? "")} className={`lq-row${t.min_rank === "legendary" ? " only" : ""}`} role="row">
                  <span role="cell"><b>{t.on_quest}</b><small>{t.group}</small></span>
                  <span role="cell" className="lq-norm">{hasNumber ? leg : "—"}</span>
                  <span role="cell">{hasNumber ? (
                    <input type="number" min={0} aria-label={`${t.label.replace("{n}", "")} number on the quest`} placeholder="Same"
                      defaultValue={t.quest_number ?? ""}
                      onBlur={(e) => { const v = e.target.value.trim(); const next = v === "" ? -1 : Number(v); if (next !== (t.quest_number ?? -1)) void edit(t, { quest_number: next }); }} />
                  ) : <small className="note">No number</small>}</span>
                  <span role="cell"><input type="checkbox" aria-label={`Quest only: ${t.label.replace("{n}", "")}`} checked={t.min_rank === "legendary"}
                    onChange={(e) => void edit(t, { min_rank: e.target.checked ? "legendary" : "" })} /></span>
                </div>
              );
            })}
            <div className="lq-row" role="row"><span role="cell"><b>👑 Quest bonus</b><small>The day's dhikr, +1 Honor</small></span><span role="cell" className="lq-norm">—</span><span role="cell"><small className="note">Only on the quest</small></span><span role="cell">✓</span></div>
          </div>
        )}
        <form className="lq-add" onSubmit={(e) => { e.preventDefault(); void addTask(); }}>
          <b>➕ Add a quest-only task</b>
          <input placeholder="e.g. pages of Quran" value={add.label} maxLength={80} onChange={(e) => setAdd({ ...add, label: e.target.value })} aria-label="Task" required />
          <input type="number" min={0} placeholder="Number (optional)" value={add.number} onChange={(e) => setAdd({ ...add, number: e.target.value })} aria-label="Number" />
          <select value={add.group} onChange={(e) => setAdd({ ...add, group: e.target.value })} aria-label="Group">
            {(groups.length ? groups : ["Ibadah", "Fitness"]).map((g) => <option key={g}>{g}</option>)}
          </select>
          <button className="primary" disabled={!add.label.trim()}>Add</button>
        </form>
        {error && <p className="err">{error}</p>}
        {msg && <p className="lq-saved" role="status">{msg}</p>}
      </div>

      {info.people.some((p) => p.state === "ready") && (
        <div className="card lq-admin">
          <h3>🔮 Ready for the quest</h3>
          <ul className="lq-ready-list">
            {info.people.filter((p) => p.state === "ready").map((p) => (
              <li key={p.id}><Avatar avatar={p.avatar} color="#8b5cf6" size={32} /> <b>{p.name}</b>
                <button onClick={() => void start(p.id, p.name)}>Start their quest</button></li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/** 👑 The Legendary quest: what it is, the prize, the tasks on the quest, and who is on it. */
export default function Legendary() {
  const { viewer } = useAuth();
  const admin = !!viewer?.is_admin;
  const [info, setInfo] = useState<QuestInfo | null>(null);
  const [error, setError] = useState("");
  const [sure, setSure] = useState(false);
  const [film, setFilm] = useState(false);
  const load = () => { api.questInfo().then(setInfo).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load")); };
  useEffect(load, []);
  const startMine = async () => {
    if (!viewer) return;
    setSure(false);
    try { await api.startQuest(viewer.id); setFilm(true); load(); } catch (e) { setError(e instanceof ApiError ? e.message : "Could not start"); }
  };
  const groups = info ? [...new Set(info.tasks.map((t) => t.group))] : [];
  const onQuest = info?.people.filter((p) => p.state === "quest") ?? [];
  const legends = info?.people.filter((p) => p.state === "legendary") ?? [];

  return (
    <section className="lq">
      <div className="lq-hero">
        <div className="lq-rays" aria-hidden="true" />
        <RankIcon rank="legendary" size={84} className="lq-crest" />
        <h2>The Legendary Quest</h2>
        <p>The road from 🔮 Obsidian to 👑 Legendary. No missed days.</p>
        {info && (
          <div className="lq-prizes">
            <span><b>+{info.prize}</b> <Gem /> for reaching Legendary</span>
            {info.day_gems > 0 && <span><b>+{info.day_gems}</b> <Gem /> every perfect quest day</span>}
          </div>
        )}
      </div>
      {error && <p className="err">{error}</p>}
      {!info ? <p className="note">Loading…</p> : (
        <>
          {!admin && <MyQuest info={info} onStart={() => { setSure(true); void preloadQuestMusic(); void preloadCrack(); void preloadSound("quest-thunder"); }} />}
          {admin && <QuestAdmin info={info} reload={load} />}

          <div className="card lq-rules">
            <h3>📜 The rules</h3>
            <ul>{RULES.map(([i, t]) => <li key={t}><span aria-hidden="true">{i}</span>{t}</li>)}</ul>
          </div>

          <div className="card lq-tasks">
            <h3>⚔️ Every day on the quest</h3>
            {groups.map((g) => (
              <div key={g} className="lq-tgroup">
                <small>{g}</small>
                <ul>{info.tasks.filter((t) => t.group === g).map((t) => <li key={t.key}>{t.label}{t.quest_only && <em className="lq-only">Quest only</em>}</li>)}</ul>
              </div>
            ))}
            <div className="lq-tgroup"><small>Bonus</small><ul><li>👑 The day's quest bonus dhikr <em className="lq-only">Quest only</em></li></ul></div>
          </div>

          <div className="card lq-hall">
            <h3>🏛️ Hall of Legends</h3>
            {legends.length === 0 && onQuest.length === 0 ? <p className="note">Nobody yet. Who will be the first?</p> : (
              <ul>
                {legends.map((p) => <li key={p.id} className="leg"><Avatar avatar={p.avatar} color="#d4a017" size={40} /><b>{p.name}</b><span>👑 Legendary{p.since ? ` since ${fmt(p.since, { day: "numeric", month: "short" })}` : ""}</span></li>)}
                {onQuest.map((p) => <li key={p.id}><Avatar avatar={p.avatar} color="#8b5cf6" size={40} /><b>{p.name}</b><span>⚔️ On the quest · day {p.days + 1} · level {p.level} of {info.goal}</span></li>)}
              </ul>
            )}
          </div>
        </>
      )}
      {sure && info?.me && <QuestConfirm tier={info.me.status.tier} onYes={() => void startMine()} onNo={() => setSure(false)} />}
      {film && viewer && <QuestFilm name={viewer.name} onClose={() => { setFilm(false); notifyChanged(); }} />}
    </section>
  );
}
