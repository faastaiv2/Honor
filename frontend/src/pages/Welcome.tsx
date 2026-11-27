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
import { notifyChanged, useChangeCounter } from "../lib/events";
import RankUp from "./RankUp";
import GoblinRaid from "../lib/GoblinRaid";
import GodfatherReveal from "../lib/GodfatherReveal";
import AchievementPop, { type NewAchievement } from "../lib/AchievementPop";
import WeeklyMap, { MapButton } from "../lib/WeeklyMap";
import ShaytanScene, { ShaytanCheer, ShaytanCut } from "../lib/Shaytan";
import GobiSplat from "../lib/GobiSplat";
import SoundGate from "../lib/SoundGate";

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
  const raidShown = useRef(false);
  const [raid, setRaid] = useState<number | null>(null);
  const [cheering, setCheering] = useState(false); // Shaytan cheers the fall before the goblins come
  const [godfather, setGodfather] = useState(false);
  const [newAch, setNewAch] = useState<NewAchievement[]>([]);
  const [mapOpen, setMapOpen] = useState(false);
  const [splat, setSplat] = useState<string[]>([]);
  const splatShown = useRef(false);
  const wantMap = useRef(false);
  useEffect(() => {  // finishing the day opens the map at today's stop
    const ask = () => { wantMap.current = true; };
    window.addEventListener("honor:open-map", ask);
    return () => window.removeEventListener("honor:open-map", ask);
  }, []);
  useEffect(() => {
    if (wantMap.current && p?.daily.available) { wantMap.current = false; setMapOpen(true); }
  }, [p]);
  const gfShown = useRef(false);
  const [place, setPlace] = useState<{ rank: number; of: number; ahead: string | null; gap: number } | null>(null);
  async function claim() {
    try {
      const before = p?.gems.balance ?? 0;
      const gems = p?.daily.gems ?? 0, dayN = (p?.daily.step ?? 0) + 1;
      const np = await api.claimDaily();
      setClaimMsg("");
      setMapOpen(false);
      setReward({ amount: gems, from: before, title: dayN === 7 ? "Mystery chest · Day 7" : `Treasure map · Day ${dayN}`, chest: dayN === 7, jewel: np.tier.color });
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
      // Fell onto the Pillar of Shame: the goblins come.
      if (np.raid && !raidShown.current) { raidShown.current = true; setRaid(np.raid.stolen); setCheering(true); }
      // Hit by a gobi: the cauliflower splats on the screen (10 seconds), once.
      if (np.gobi_splat?.length && !splatShown.current) {
        splatShown.current = true;
        setSplat(np.gobi_splat);
        api.gobiSeen().catch(() => undefined);
      }
      // A reward for refusing Shaytan: the gem rain, with the reason.
      if (np.shaytan?.show === "reward") {
        const s = np.shaytan;
        api.shaytanSeen(s.id, "reward").catch(() => undefined);
        setReward({ amount: s.gems, from: Math.max(0, np.gems.balance - s.gems), title: "🛡️ You refused Shaytan's offer!", chest: false });
      }
      // Named a Godfather by the admin: their show, once.
      if (np.godfather?.is && !np.godfather.seen && !gfShown.current) { gfShown.current = true; setGodfather(true); }
      // A newly earned achievement: a small pop-up with its sound, once per achievement on this device.
      const achKey = `honor.achSeen.${memberId}`;
      let seenAch: string[] = [];
      try { seenAch = JSON.parse(localStorage.getItem(achKey) || "[]"); } catch { /* private mode */ }
      const fresh = (np.achievements_new ?? []).filter((a) => !seenAch.includes(a.key) && !(a.key === "godfather" && np.godfather?.is && !np.godfather.seen));
      if (fresh.length) {
        setNewAch(fresh);
        try { localStorage.setItem(achKey, JSON.stringify([...seenAch, ...fresh.map((a) => a.key)].slice(-200))); } catch { /* private mode */ }
      }
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
      <MapButton daily={p.daily} onClick={() => setMapOpen(true)} />
      {mapOpen && <WeeklyMap daily={p.daily} onOpen={claim} onClose={() => setMapOpen(false)} />}
      <div className="wc-top">
        <div className="wc-avatar">
          <Avatar avatar={p.member.avatar} color={t.color} frame={p.member.frame} size={96} />
          <span className="wc-crest"><RankIcon rank={t.key} size={46} /><b>{p.label}</b></span>
        </div>
        <div className="wc-hello">
          <p className="wc-salam">As-salāmu ʿalaykum · {hello}</p>
          <h1>Welcome, {p.member.name}!</h1>
          {!!p.gobi_today?.length && (
            <p className="wc-taken gobi-note" role="status">🥦 Splat! {p.gobi_today.join(", ")} hit you with a gobi today</p>
          )}
          {!!p.taken_today?.length && (
            <p className="wc-taken" role="status">💸 Taken from you today: {p.taken_today.map((x) => `${x.name} −${x.gems}`).join(" · ")}</p>
          )}
          <div className="wc-titles">
            <p className="wc-title"><RankIcon rank={t.key} /> {t.key === "member" ? "Member" : t.key === "low" ? "On the Pillar of Shame" : `${t.name} member`}</p>
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
      {splat.length > 0 && <SoundGate icon="🥦"><GobiSplat by={splat} onDone={() => setSplat([])} /></SoundGate>}
      {p?.shaytan?.show === "offer" && !godfather && raid === null && !rankUp && !reward && (() => { const s = p.shaytan!; return (
        <SoundGate icon="😈"><ShaytanScene name={p.member.name} offer={s.show === "offer" ? s.offer : 50} ladder={s.show === "offer" ? s.ladder : undefined}
          onAnswer={async (accept, refusals) => { await api.answerShaytan(s.id, accept, refusals).catch(() => undefined); }}
          onDone={() => { api.profile().then(setP).catch(() => undefined); notifyChanged(); }} /></SoundGate>); })()}
      {p?.shaytan?.show === "cut" && !rankUp && !reward && (() => { const s = p.shaytan!; return (
        <SoundGate icon="😈"><ShaytanCut levels={s.show === "cut" ? s.levels : 1}
          onDone={() => { api.shaytanSeen(s.id, "cut").then(() => api.profile()).then(setP).catch(() => undefined); notifyChanged(); }} /></SoundGate>); })()}
      {newAch.length > 0 && !godfather && raid === null && !rankUp && !reward && <AchievementPop items={newAch} onDone={() => setNewAch([])} />}
      {godfather && p && <SoundGate icon="🎩"><GodfatherReveal name={p.member.name} avatar={p.member.avatar}
        onCollect={async () => { await api.claimAchievement("godfather").catch(() => undefined); setP(await api.profile()); notifyChanged(); }}
        onDone={(wear) => {
          setGodfather(false);
          api.godfatherSeen().catch(() => undefined);
          if (wear) api.saveProfile({ frame: "godfather" }).then((np) => { setP(np); notifyChanged(); }).catch(() => undefined);
        }} /></SoundGate>}
      {raid !== null && p && <SoundGate icon="😈">{cheering
        ? <ShaytanCheer name={p.member.name} onDone={() => setCheering(false)} />
        : <GoblinRaid stolen={raid} from={p.gems.balance + raid}
          onDone={() => { setRaid(null); api.raidSeen().then(setP).catch(() => undefined); }} />}</SoundGate>}
      {rankUp && <SoundGate icon="🏆"><RankUp tier={rankUp.tier} name={p.member.name} profile={p} reward={rankUp.reward} onClose={() => { setRankUp(null); api.celebrated().then(setP).catch(() => undefined); }} /></SoundGate>}
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
