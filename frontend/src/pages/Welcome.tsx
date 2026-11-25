import { useEffect, useRef, useState } from "react";
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

function cheer(done: number, of: number, weekend: boolean): string {
  if (of && done >= of) return "All done! MashaAllah, Honor earned today 🌟";
  if (weekend && done === 0) return "It's the weekend: tasks are optional, but every one still earns gems.";
  if (done === 0) return "Bismillah! Tick your first task to start earning gems.";
  if (done / of < 0.5) return "Good start! Keep going, every task is +5 💎.";
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
    }).catch(() => undefined);
    api.day(memberId).then(setDay).catch(() => undefined);
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
          <span className="wc-badge"><RankBadge color={t.color} label={p.label} size={50} /></span>
        </div>
        <div className="wc-hello">
          <p className="wc-salam">As-salāmu ʿalaykum · {hello}</p>
          <h1>Welcome, {p.member.name}!</h1>
          <p className="wc-title">{t.emoji} {t.name} member</p>
        </div>
        <div className="wc-ring"><Ring done={done} of={of} /></div>
      </div>

      <div className="wc-stats">
        <div className="stat"><span className="stat-ico">🔥</span><b>{p.streak}</b><small>day streak</small></div>
        <Link to="/profile" className="stat"><span className="stat-ico">💎</span><b>{p.gems.balance}</b><small>gems</small></Link>
        <div className="stat"><span className="stat-ico">⚡</span><b>+{p.gems.today}</b><small>gems today</small></div>
        <div className="stat"><span className="stat-ico">📈</span><b>{p.week_delta > 0 ? "+" : ""}{p.week_delta}</b><small>Honor this week</small></div>
      </div>

      {p.pending > 0 && <p className="wc-pending">🌙 <b>+{p.pending} Honor</b> on its way — it arrives at midnight.</p>}

      <div className="wc-progress">
        <div className="wc-progress-head">
          <span>{t.emoji} {t.name}</span>
          <span>{p.next ? `${p.next.emoji} ${p.next.name}` : p.legendary ? "👑 Legendary" : "🔮 Top of the climb"}</span>
        </div>
        <div className="fat-bar"><i style={{ width: `${pct}%` }} /></div>
        <p className="wc-note">
          {p.next ? <>{p.next.needed} more level{p.next.needed === 1 ? "" : "s"} to {p.next.name}</> : p.can_start_quest ? <>You can start the 👑 Legendary quest below</> : <>MashaAllah, keep it shining</>}
          {p.next_level_reward && <> · <b>+{p.next_level_reward.gems} 💎</b> at level {p.next_level_reward.level}</>}
        </p>
      </div>
      <p className="wc-cheer">{cheer(done, of, !!day?.weekend)}</p>

      {rankUp && <RankUp tier={rankUp.tier} name={p.member.name} profile={p} reward={rankUp.reward} onClose={() => { setRankUp(null); api.celebrated().then(setP).catch(() => undefined); }} />}
      {levelUp && (
        <div className="levelup" role="dialog" aria-modal="true" aria-label="Level up" onClick={() => setLevelUp(null)}>
          <div className="levelup-card" onClick={(e) => e.stopPropagation()}>
            <RankBadge color={t.color} label={levelUp.label} size={110} />
            <h2>Level up!</h2>
            {levelUp.rank && <p className="levelup-rank">New rank: {levelUp.rank} — new frame and theme unlocked!</p>}
            {levelUp.gems > 0 && <p className="levelup-gems">+{levelUp.gems} 💎</p>}
            <button className="primary" onClick={() => setLevelUp(null)}>Awesome! 🎉</button>
          </div>
        </div>
      )}
    </section>
  );
}
