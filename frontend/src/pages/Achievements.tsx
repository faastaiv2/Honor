import Avatar from "../lib/Avatar";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type Achievement, type Achievements as AchievementsData } from "../api";
import Gem from "../lib/Gem";
import Medal from "../lib/Medal";
import ThemePreview from "../lib/ThemePreview";
import GemReward from "../lib/GemReward";
import { notifyChanged, useToast } from "../lib/events";

const TIER_NAME: Record<string, string> = { bronze: "Common", silver: "Rare", gold: "Epic", legend: "Legendary", godfather: "Godfather" };

const TIERS = ["bronze", "silver", "gold", "legend"] as const;
const GROUP_ICON: Record<string, string> = { Honor: "🛡️", Streaks: "🔥", "Perfect days": "✅", Worship: "🕌", Fitness: "💪", Ranks: "🏅", Events: "🎨", Treasure: "💎" };

function Card({ a, onClaim, focus = false }: { a: Achievement; onClaim: (a: Achievement) => void; focus?: boolean }) {
  const ready = a.unlocked && !a.claimed;
  const pct = Math.min(100, Math.round((a.progress / a.goal) * 100));
  return (
    <li id={`ach-${a.key}`} className={`ax-card ${a.claimed ? "done" : ready ? "ready" : "locked"} t-${a.tier}${focus ? " focus" : ""}`}>
      <span className="ax-glow" aria-hidden="true" />
      <div className="ax-medal"><Medal icon={a.icon} tier={a.tier} locked={!a.unlocked} size={60} />{a.claimed && <span className="ax-check" aria-label="Collected">✓</span>}</div>
      <div className="ax-body">
        <span className={`ax-tier t-${a.tier}`}>{TIER_NAME[a.tier]}</span>
        <b className="ax-name">{a.name}</b>
        <p className="ax-text">{a.text}</p>
        {a.theme && <p className="ax-unlock"><span className="ax-face theme"><ThemePreview k={a.theme.key} /></span><span>Unlocks the <b>{a.theme.name}</b> theme</span></p>}
        {a.picture && <p className="ax-unlock"><span className="ax-face"><Avatar avatar={a.picture.key} color="#8a5a2b" size={26} /></span><span>Unlocks the <b>{a.picture.name}</b> picture</span></p>}
        {!a.unlocked && a.goal > 1 && (
          <div className="ax-prog"><div className="ax-bar"><i style={{ width: `${pct}%` }} /></div><small>{a.progress}/{a.goal}</small></div>
        )}
        <div className="ax-foot">
          {a.claimed ? <span className="ax-got">Collected · +{a.gems} <Gem /></span>
            : ready ? <button className="ax-claim" onClick={() => onClaim(a)}>Collect +{a.gems} <Gem /></button>
            : <span className="ax-reward">+{a.gems} <Gem /></span>}
        </div>
      </div>
    </li>
  );
}

/** A ring that fills as you unlock more. */
function Ring({ pct }: { pct: number }) {
  const r = 46, c = 2 * Math.PI * r;
  return (
    <svg className="ax-ring" viewBox="0 0 110 110" aria-hidden="true">
      <defs><linearGradient id="axg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset="1" stopColor="#e8a317" /></linearGradient></defs>
      <circle cx="55" cy="55" r={r} className="ax-ring-track" />
      <circle cx="55" cy="55" r={r} className="ax-ring-fill" stroke="url(#axg)" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
    </svg>
  );
}

export default function Achievements() {
  const [data, setData] = useState<AchievementsData | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useToast();
  const [reward, setReward] = useState<{ amount: number; title: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "ready" | "done" | "todo">("all");
  const [tier, setTier] = useState<string>("all");
  // Opened from the shop (…/achievements?a=key): jump to that achievement and make it glow for a moment.
  const [focus, setFocus] = useState<string | null>(() => new URLSearchParams(window.location.search).get("a"));
  useEffect(() => {
    if (!focus || !data) return;
    const el = document.getElementById(`ach-${focus}`);
    if (el) window.setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    const t = window.setTimeout(() => setFocus(null), 4000);
    return () => clearTimeout(t);
  }, [focus, data]);

  const load = useCallback(() => { api.achievements().then(setData).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load")); }, []);
  useEffect(load, [load]);

  async function claim(a: Achievement, show = true): Promise<number> {
    try {
      setData(await api.claimAchievement(a.key));
      if (show) setReward({ amount: a.gems, title: `Achievement · ${a.name}` });
      notifyChanged();
      return a.gems;
    } catch (e) { setError(e instanceof ApiError ? e.message : "Could not collect"); return 0; }
  }
  async function claimAll() {
    const ready = data?.items.filter((x) => x.unlocked && !x.claimed) ?? [];
    let total = 0;
    for (const a of ready) total += await claim(a, false);
    if (total) setReward({ amount: total, title: `${ready.length} achievement${ready.length === 1 ? "" : "s"}` });
  }

  if (!data) return <section className="card"><p className={error ? "err" : "note"}>{error || "Loading…"}</p></section>;
  const ready = data.items.filter((a) => a.unlocked && !a.claimed);
  const shown = data.items.filter((a) => (tier === "all" || a.tier === tier) &&
    (filter === "all" || (filter === "ready" ? a.unlocked && !a.claimed : filter === "done" ? a.claimed : !a.unlocked)));
  const groups = [...new Set(shown.map((a) => a.group))];
  const earned = data.items.filter((a) => a.claimed).reduce((n, a) => n + a.gems, 0);
  const left = data.items.filter((a) => !a.claimed).reduce((n, a) => n + a.gems, 0);
  const pct = Math.round((data.unlocked / Math.max(1, data.total)) * 100);
  // The locked ones you're closest to.
  const close = data.items.filter((a) => !a.unlocked && a.goal > 1 && a.progress > 0)
    .sort((x, y) => y.progress / y.goal - x.progress / x.goal).slice(0, 3);
  const go = (key: string) => { setFilter("all"); setTier("all"); setFocus(key); };

  return (
    <div className="achs ax">
      <section className="ax-hero">
        <div className="ax-ring-wrap">
          <Ring pct={pct} />
          <span className="ax-ring-num"><b>{pct}%</b><small>{data.unlocked}/{data.total}</small></span>
        </div>
        <div className="ax-hero-main">
          <h1>Achievements</h1>
          <div className="ax-chips">
            <span className="ax-chip"><Gem /> <b>{earned}</b> collected</span>
            <span className="ax-chip"><Gem /> <b>{left}</b> still to win</span>
          </div>
          <div className="ax-tiers">
            {TIERS.map((t) => {
              const all = data.items.filter((a) => a.tier === t), got = all.filter((a) => a.unlocked).length;
              return all.length ? <button key={t} className={`ax-tierbtn t-${t}${tier === t ? " on" : ""}`} onClick={() => setTier(tier === t ? "all" : t)} aria-pressed={tier === t}>
                <Medal icon="star" tier={t} size={22} /><span>{TIER_NAME[t]}</span><b>{got}/{all.length}</b></button> : null;
            })}
          </div>
        </div>
        {ready.length > 0 && <button className="ru-collect ach-all ax-all" onClick={claimAll}>
          <span className="ru-collect-gem"><Gem size={30} /></span>
          <span className="ru-collect-text"><b>Collect all</b><small>{ready.length} ready · +{ready.reduce((n, a) => n + a.gems, 0)} gems</small></span>
          <span className="ru-collect-shine" aria-hidden="true" />
        </button>}
      </section>

      {close.length > 0 && filter !== "done" && (
        <section className="ax-close">
          <h2>🎯 Almost there</h2>
          <div className="ax-close-row">
            {close.map((a) => (
              <button key={a.key} className={`ax-mini t-${a.tier}`} onClick={() => go(a.key)}>
                <Medal icon={a.icon} tier={a.tier} locked size={40} />
                <span className="ax-mini-body"><b>{a.name}</b>
                  <span className="ax-bar"><i style={{ width: `${Math.round((a.progress / a.goal) * 100)}%` }} /></span>
                  <small>{a.goal - a.progress} to go · +{a.gems} <Gem /></small></span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="ax-filters" role="tablist">
        {([["all", "All"], ["ready", `✨ Ready${ready.length ? ` ${ready.length}` : ""}`], ["todo", "🔒 To do"], ["done", "✓ Collected"]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={filter === k} className={`${filter === k ? "on" : ""}${k === "ready" && ready.length ? " hot" : ""}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
        {tier !== "all" && <button className="ax-clear" onClick={() => setTier("all")}>{TIER_NAME[tier]} ✕</button>}
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      {shown.length === 0 && <p className="note">Nothing here yet.</p>}
      {groups.map((g) => {
        const inG = data.items.filter((a) => a.group === g), gotG = inG.filter((a) => a.unlocked).length;
        return (
          <section key={g} className="ax-group">
            <header className="ax-group-head">
              <h2><span aria-hidden="true">{GROUP_ICON[g] ?? "⭐"}</span> {g}</h2>
              <span className="ax-group-count">{gotG}/{inG.length}</span>
              <span className="ax-bar thin"><i style={{ width: `${(gotG / inG.length) * 100}%` }} /></span>
            </header>
            <ul className="ax-grid">{shown.filter((a) => a.group === g).map((a) => <Card key={a.key} a={a} focus={focus === a.key} onClaim={claim} />)}</ul>
          </section>
        );
      })}
      {reward && <GemReward amount={reward.amount} title={reward.title} sound="achievement" onDone={() => { setReward(null); setToast("Gems added to your wallet"); }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
