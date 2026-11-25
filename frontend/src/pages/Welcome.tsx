import { useEffect, useRef, useState } from "react";
import RankIcon from "../lib/RankIcon";
import Gem from "../lib/Gem";
import Brazier from "../lib/Brazier";
import GemReward from "../lib/GemReward";
import Medal from "../lib/Medal";
import { Link } from "react-router-dom";
import { api, type DayView, type Profile, type TodayInfo } from "../api";
import Avatar from "../lib/Avatar";
import { confetti } from "../lib/confetti";
import { useChangeCounter } from "../lib/events";
import RankUp from "./RankUp";

/** A gem-shaped badge in the rank's colour with the level inside. */
export function RankBadge({ color, label, size = 56 }: { color: string; label: string; size?: number }) {
  const id = `g${color.replace("#", "")}`;
  return (
    <svg className="rank-badge" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset=".35" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity=".85" />
        </linearGradient>
      </defs>
      <polygon points="50,4 92,27 92,73 50,96 8,73 8,27" fill={`url(#${id})`} stroke="#fff" strokeWidth="5" />
      <polygon points="50,14 82,32 50,50 18,32" fill="#fff" opacity=".22" />
      <text x="50" y="62" textAnchor="middle" fontSize={label.length > 4 ? 22 : 28} fontFamily="Marcellus, Georgia, serif" fill="#fff">{label}</text>
    </svg>
  );
}

function Ring({ done, of }: { done: number; of: number }) {
  const r = 52, c = 2 * Math.PI * r, pct = of ? done / of : 0;
  return (
    <svg className="ring" viewBox="0 0 120 120" role="img" aria-label={`${done} of ${of} tasks done today`}>
      <circle cx="60" cy="60" r={r} className="ring-bg" />
      <circle cx="60" cy="60" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      <text x="60" y="58" textAnchor="middle" className="ring-num">{done}/{of}</text>
      <text x="60" y="78" textAnchor="middle" className="ring-sub">tasks</text>
    </svg>
  );
}

/** The daily streak chest. */
function Chest({ open }: { open: boolean }) {
  return (
    <svg className={`chest${open ? " open" : ""}`} viewBox="0 0 64 56" aria-hidden="true">
      <defs>
        <linearGradient id="chest-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b8742e" /><stop offset="1" stopColor="#7a4518" /></linearGradient>
        <linearGradient id="chest-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff2b8" /><stop offset=".5" stopColor="#e0aa20" /><stop offset="1" stopColor="#8a6100" /></linearGradient>
      </defs>
      {open && <g className="chest-glow"><circle cx="32" cy="24" r="20" fill="#ffe58a" opacity=".55" /><path d="M24 26 L32 8 L40 26 Z M14 24 L20 12 L26 24 Z M38 24 L44 12 L50 24 Z" fill="#9fe8ff" opacity=".9" /></g>}
      <rect x="8" y="26" width="48" height="26" rx="4" fill="url(#chest-w)" stroke="#4a2a0e" strokeWidth="1.4" />
      <path d={open ? "M8 26 L12 8 H52 L56 26 Z" : "M8 26 C8 12 56 12 56 26 Z"} fill="url(#chest-w)" stroke="#4a2a0e" strokeWidth="1.4" className="chest-lid" />
      <path d="M8 34 H56 M8 46 H56" stroke="url(#chest-g)" strokeWidth="3" />
      <rect x="27" y="30" width="10" height="12" rx="2" fill="url(#chest-g)" stroke="#5a3a00" strokeWidth="1" />
      <circle cx="32" cy="35" r="1.6" fill="#4a2a0e" /><path d="M32 36 V39" stroke="#4a2a0e" strokeWidth="1.4" />
    </svg>
  );
}

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

function WeekStrip({ days }: { days: Profile["week_days"] }) {
  return (
    <ol className="wk" aria-label="This week">
      {days.map((d, i) => (
        <li key={d.date} className={`wk-day ${d.state}${d.today ? " today" : ""}`} title={`${d.date}: ${d.state}`}>
          <span className="wk-dot">{d.state === "done" ? "✓" : d.state === "missed" ? "✕" : d.state === "rest" ? "·" : d.state === "excused" ? "~" : ""}</span>
          <small>{DAY_LETTERS[i]}</small>
        </li>
      ))}
    </ol>
  );
}

function cheer(done: number, of: number, weekend: boolean): string {
  if (of && done >= of) return "All done! MashaAllah, Honor earned today 🌟";
  if (weekend && done === 0) return "It's the weekend: tasks are optional, but a full day still earns +20 gems.";
  if (done === 0) return "Bismillah! Tick your first task to start the day.";
  if (done / of < 0.5) return "Good start! Finish them all for +20 gems.";
  if (of - done <= 3) return `Almost there! Just ${of - done} more to go.`;
  return "Great progress, keep it up!";
}

export default function Welcome({ info }: { info: TodayInfo | null }) {
  const [p, setP] = useState<Profile | null>(null);
  const [day, setDay] = useState<DayView | null>(null);
  const [levelUp, setLevelUp] = useState<{ label: string; gems: number; rank?: string } | null>(null);
  const [rankUp, setRankUp] = useState<{ tier: Profile["tier"]; reward: number } | null>(null);
  const changes = useChangeCounter();
  const memberId = info?.viewer.id;
  const prev = useRef<Profile | null>(null);
  const [claimMsg, setClaimMsg] = useState("");
  const [reward, setReward] = useState<{ amount: number; from: number; title: string; chest: boolean; jewel?: string; win?: string } | null>(null);
  const winShown = useRef<string | null>(null);
  const [place, setPlace] = useState<{ rank: number; of: number; ahead: string | null; gap: number } | null>(null);
  async function claim() {
    try {
      const before = p?.gems.balance ?? 0;
      const np = await api.claimDaily();
      setClaimMsg("");
      setReward({ amount: np.daily.gems, from: before, title: `${np.tier.name} streak chest`, chest: true, jewel: np.tier.color });
      prev.current = np;
      setP(np);
    } catch (e) { setClaimMsg(e instanceof Error ? e.message : "Could not open the chest"); }
  }

  useEffect(() => {
    if (!memberId) return;
    api.profile().then((np) => {
      const old = prev.current;
      // A new rank gets its own show, once, on whichever device opens next (the server remembers).
      const climbedRank = !!np.celebrate;
      if (np.celebrate) {
        const tier = info?.tiers.find((x) => x.key === np.celebrate!.tier) ?? np.tier;
        setRankUp({ tier, reward: np.celebrate.reward });
      }
      // A new level within the same rank: the smaller celebration.
      const key = `honor.seen.${memberId}`;
      let seen = NaN;
      try { seen = Number(localStorage.getItem(key)); } catch { /* private mode */ }
      if (!climbedRank && old && np.level > old.level && !(np.level <= seen)) {
        setLevelUp({ label: np.label, gems: old.next_level_reward?.gems ?? 0 });
        confetti([np.tier.color, "#ffffff", "#f1d48a"]);
      }
      try { localStorage.setItem(key, String(np.level)); } catch { /* private mode */ }
      prev.current = np;
      setP(np);
      // An art tournament prize not celebrated yet.
      if (np.event_win && winShown.current !== np.event_win.id) {
        winShown.current = np.event_win.id;
        const w = np.event_win, place = ["", "🥇 1st place", "🥈 2nd place", "🥉 3rd place"][w.place];
        setReward({ amount: w.gems, from: Math.max(0, np.gems.balance - w.gems), title: `${place} · Art Tournament`, chest: true, jewel: "#ffd24a", win: w.id });
      }
    }).catch(() => undefined);
    api.day(memberId).then(setDay).catch(() => undefined);
    api.leaderboard().then((b) => {
      const me = b.rows.find((r) => r.is_me);
      if (!me) return;
      const above = [...b.rows].filter((r) => r.rank < me.rank).sort((x, y) => y.rank - x.rank)[0];
      setPlace({ rank: me.rank, of: b.rows.length, ahead: above ? (above.member.name) : null, gap: above ? above.level - me.level : 0 });
    }).catch(() => undefined);
  }, [memberId, changes, info?.tiers.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p) return <section className="welcome-card skeleton" aria-busy="true" />;
  const t = p.tier;
  const nextMin = info?.tiers.find((x) => x.name === p.next?.name)?.min ?? null;
  const pct = p.legendary || !p.next || nextMin === null || t.min === null ? 100
    : Math.max(6, Math.min(100, ((p.level - t.min) / (nextMin - t.min)) * 100));
  const done = day?.score.done ?? 0, of = day?.score.of ?? 17;
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <section className="welcome-card" style={{ ["--tc" as string]: t.color }} aria-label="Your status">
      <div className="wc-top">
        <div className="wc-avatar">
          <Avatar avatar={p.member.avatar} color={t.color} frame={p.member.frame} size={96} />
          <span className="wc-crest"><RankIcon rank={t.key} size={46} /><b>{p.label}</b></span>
        </div>
        <div className="wc-hello">
          <p className="wc-salam">As-salāmu ʿalaykum · {hello}</p>
          <h1>Welcome, {p.member.name}!</h1>
          <div className="wc-titles">
            <p className="wc-title"><RankIcon rank={t.key} /> {t.name} member</p>
            {place && (
              <Link to="/leaderboard" className={`wc-place p${Math.min(place.rank, 4)}`} title="Your place on the leaderboard">
                <b>#{place.rank}</b><span>of {place.of}</span>
              </Link>
            )}
          </div>
          {place && <p className="wc-place-note">{place.rank === 1 ? "You're top of the family! 🏆"
            : place.gap > 0 ? `${place.gap} level${place.gap === 1 ? "" : "s"} behind ${place.ahead}` : `Level with ${place.ahead}`}</p>}
        </div>
        <div className="wc-ring"><Ring done={done} of={of} /></div>
      </div>

      <div className="wc-stats">
        <div className="stat"><span className="stat-ico"><Brazier lit={p.streak > 0} /></span><b>{p.streak}</b><small>day streak</small></div>
        <Link to="/profile" className="stat"><span className="stat-ico"><Gem /></span><b>{p.gems.balance}</b><small>gems</small></Link>
        <div className="stat"><span className="stat-ico">⚡</span><b>+{p.gems.today}</b><small>gems today</small></div>
        <div className="stat"><span className="stat-ico">📈</span><b>{p.week_delta > 0 ? "+" : ""}{p.week_delta}</b><small>Honor this week</small></div>
      </div>

      <div className="wc-row">
        <div className="wc-week">
          <div className="wc-week-head"><span>This week</span><b>{p.week_days.filter((d) => d.state === "done").length}/7 days</b></div>
          <WeekStrip days={p.week_days} />
        </div>
        <div className={`wc-chest${p.daily.available ? " ready" : ""}`}>
          <Chest open={p.daily.claimed_today} />
          <div className="wc-chest-text">
            <b>Streak chest</b>
            <small>{p.daily.claimed_today ? "Opened today ✓ Come back tomorrow"
              : p.daily.available ? <>Your {t.name} chest holds +{p.daily.gems} <Gem /></>
              : <>Finish today's tasks to light your streak · +{p.daily.gems} <Gem /> a day at {t.name}</>}</small>
          </div>
          {p.daily.available && <button className="wc-claim" onClick={claim}>Open</button>}
        </div>
      </div>
      {claimMsg && <p className="wc-claimed" role="status">{claimMsg}</p>}
      {p.achievements_ready > 0 && (
        <Link to="/achievements" className="wc-ach">
          <Medal icon="star" tier="gold" size={34} />
          <span><b>{p.achievements_ready} achievement{p.achievements_ready === 1 ? "" : "s"} ready!</b><small>Tap to collect your gems</small></span>
          <span className="wc-ach-go">›</span>
        </Link>
      )}

      {p.pending > 0 && <p className="wc-pending">🌙 <b>+{p.pending} Honor</b> on its way — it arrives at midnight.</p>}

      <div className="wc-progress">
        <div className="wc-progress-head">
          <span><RankIcon rank={t.key} /> {t.name}</span>
          <span>{p.next ? <><RankIcon rank={p.next.name} /> {p.next.name}</> : p.legendary ? <><RankIcon rank="legendary" /> Legendary</> : <><RankIcon rank="obsidian" /> Top of the climb</>}</span>
        </div>
        <div className="fat-bar"><i style={{ width: `${pct}%` }} /></div>
        <p className="wc-note">
          {p.next ? <>{p.next.needed} more level{p.next.needed === 1 ? "" : "s"} to {p.next.name}</> : p.can_start_quest ? <>You can start the <RankIcon rank="legendary" /> Legendary quest below</> : <>MashaAllah, keep it shining</>}
          {p.next_level_reward && <> · <b>+{p.next_level_reward.gems} <Gem /></b> at level {p.next_level_reward.level}</>}
        </p>
      </div>
      <p className="wc-cheer">{cheer(done, of, !!day?.weekend)}</p>

      {reward && <GemReward amount={reward.amount} from={reward.from} title={reward.title} chest={reward.chest} jewel={reward.jewel} sound={reward.win ? "event-win" : undefined}
        onDone={() => { if (reward.win) api.winSeen(reward.win).catch(() => undefined); setReward(null); }} />}
      {rankUp && <RankUp tier={rankUp.tier} name={p.member.name} profile={p} reward={rankUp.reward} onClose={() => { setRankUp(null); api.celebrated().then(setP).catch(() => undefined); }} />}
      {levelUp && (
        <div className="levelup" role="dialog" aria-modal="true" aria-label="Level up" onClick={() => setLevelUp(null)}>
          <div className="levelup-card" onClick={(e) => e.stopPropagation()}>
            <RankBadge color={t.color} label={levelUp.label} size={110} />
            <h2>Level up!</h2>
            {levelUp.rank && <p className="levelup-rank">New rank: {levelUp.rank} — new frame and theme unlocked!</p>}
            {levelUp.gems > 0 && <p className="levelup-gems">+{levelUp.gems} <Gem /></p>}
            <button className="primary" onClick={() => {
              if (levelUp.gems > 0 && p) setReward({ amount: levelUp.gems, from: Math.max(0, p.gems.balance - levelUp.gems), title: `Level ${levelUp.label}`, chest: false });
              setLevelUp(null);
            }}>Awesome! 🎉</button>
          </div>
        </div>
      )}
    </section>
  );
}
