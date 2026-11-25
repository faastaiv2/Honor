import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type Achievement, type Achievements as AchievementsData } from "../api";
import Gem from "../lib/Gem";
import Medal from "../lib/Medal";
import { confetti } from "../lib/confetti";
import { notifyChanged, useToast } from "../lib/events";

const TIER_NAME: Record<string, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold", legend: "Legend" };

function Card({ a, onClaim }: { a: Achievement; onClaim: (a: Achievement) => void }) {
  const ready = a.unlocked && !a.claimed;
  const pct = Math.round((a.progress / a.goal) * 100);
  return (
    <li className={`ach ${a.claimed ? "done" : ready ? "ready" : "locked"} t-${a.tier}`}>
      <Medal icon={a.icon} tier={a.tier} locked={!a.unlocked} size={64} />
      <div className="ach-body">
        <div className="ach-top"><b>{a.name}</b><span className={`ach-tier t-${a.tier}`}>{TIER_NAME[a.tier]}</span></div>
        <p>{a.text}</p>
        {!a.unlocked && a.goal > 1 && (
          <div className="ach-prog"><div className="ach-bar"><i style={{ width: `${pct}%` }} /></div><small>{a.progress}/{a.goal}</small></div>
        )}
        <div className="ach-foot">
          {a.claimed ? <span className="ach-got">Collected ✓</span>
            : ready ? <button className="ach-claim" onClick={() => onClaim(a)}>Collect +{a.gems} <Gem /></button>
            : <span className="ach-reward">+{a.gems} <Gem /></span>}
        </div>
      </div>
    </li>
  );
}

export default function Achievements() {
  const [data, setData] = useState<AchievementsData | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useToast();
  const [filter, setFilter] = useState<"all" | "ready" | "done" | "todo">("all");

  const load = useCallback(() => { api.achievements().then(setData).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load")); }, []);
  useEffect(load, [load]);

  async function claim(a: Achievement) {
    try {
      setData(await api.claimAchievement(a.key));
      setToast(`${a.name}: +${a.gems} gems!`);
      confetti(a.tier === "gold" || a.tier === "legend" ? ["#ffd24a", "#fff2b8", "#ffffff", "#c070ff"] : ["#7fd6ff", "#ffffff", "#ffd24a"]);
      notifyChanged();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Could not collect"); }
  }
  async function claimAll() {
    for (const a of data?.items.filter((x) => x.unlocked && !x.claimed) ?? []) await claim(a);
  }

  if (!data) return <section className="card"><p className={error ? "err" : "note"}>{error || "Loading…"}</p></section>;
  const ready = data.items.filter((a) => a.unlocked && !a.claimed);
  const shown = data.items.filter((a) => filter === "all" || (filter === "ready" ? a.unlocked && !a.claimed : filter === "done" ? a.claimed : !a.unlocked));
  const groups = [...new Set(shown.map((a) => a.group))];
  const earned = data.items.filter((a) => a.claimed).reduce((n, a) => n + a.gems, 0);

  return (
    <div className="achs">
      <section className="ach-hero">
        <div className="ach-hero-medals" aria-hidden="true">
          <Medal icon="star" tier="bronze" size={44} /><Medal icon="flame" tier="gold" size={58} /><Medal icon="crest:legendary" tier="legend" size={44} />
        </div>
        <div>
          <h1>Achievements</h1>
          <p><b>{data.unlocked}</b> of {data.total} unlocked · <Gem /> {earned} collected</p>
          <div className="ach-bar big"><i style={{ width: `${(data.unlocked / data.total) * 100}%` }} /></div>
        </div>
        {ready.length > 0 && <button className="ru-collect ach-all" onClick={claimAll}>
          <span className="ru-collect-gem"><Gem size={30} /></span>
          <span className="ru-collect-text"><b>Collect all</b><small>{ready.length} ready · +{ready.reduce((n, a) => n + a.gems, 0)} gems</small></span>
          <span className="ru-collect-shine" aria-hidden="true" />
        </button>}
      </section>

      <div className="seg ach-filter" role="tablist">
        {([["all", "All"], ["ready", `Ready${ready.length ? ` (${ready.length})` : ""}`], ["todo", "To do"], ["done", "Collected"]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      {shown.length === 0 && <p className="note">Nothing here yet.</p>}
      {groups.map((g) => (
        <section key={g} className="ach-group">
          <h2>{g}</h2>
          <ul className="ach-grid">{shown.filter((a) => a.group === g).map((a) => <Card key={a.key} a={a} onClaim={claim} />)}</ul>
        </section>
      ))}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
