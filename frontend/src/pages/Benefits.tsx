import { useEffect, useState } from "react";
import { api, type Profile, type Tier, type TodayInfo } from "../api";
import Avatar from "../lib/Avatar";
import { useAuth } from "../auth";
import { RankBadge } from "./Welcome";

const ROMAN: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
const roman = (n: number) => ROMAN.reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v; } return s; }, "");

function Perk({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="perk">
      <span className="perk-ico" aria-hidden="true">{icon}</span>
      <div><b>{title}</b><p>{text}</p></div>
    </div>
  );
}

function Unlocks({ tier, profile }: { tier: Tier; profile: Profile | null }) {
  if (!profile) return null;
  const frame = profile.frames.find((f) => f.tier?.key === tier.key);
  const theme = profile.themes.find((t) => t.tier?.key === tier.key);
  if (!frame && !theme) return null;
  return (
    <div className="unlocks">
      {frame && <span className="unlock"><Avatar avatar={profile.member.avatar} color={tier.color} frame={frame.key} size={36} /> {frame.name} frame</span>}
      {theme && <span className="unlock"><span className="swatch-dot" style={{ background: tier.color }} /> {theme.name} theme</span>}
    </div>
  );
}

export default function Benefits({ info }: { info: TodayInfo | null }) {
  const { viewer } = useAuth();
  const [p, setP] = useState<Profile | null>(null);
  const isMember = viewer?.kind === "member";
  useEffect(() => { if (isMember) api.profile().then(setP).catch(() => undefined); }, [isMember]);

  const tiers = (info?.tiers ?? []).filter((t) => t.key !== "low");
  const current = p?.tier;
  const curIdx = current ? tiers.findIndex((t) => t.key === current.key) : -1;
  const next = curIdx >= 0 ? tiers[curIdx + 1] : undefined;
  const gems = info?.gems;
  const taskCount = info?.task_count ?? 17;

  return (
    <div className="benefits">
      {isMember && p && current && (
        <section className="bn-now" style={{ ["--tc" as string]: current.color }}>
          <div className="bn-now-head">
            <RankBadge color={current.color} label={p.label} size={84} />
            <div>
              <p className="bn-kicker">Your benefits now</p>
              <h1>{current.emoji} {current.name}</h1>
              <p className="bn-range">Levels {current.range}</p>
            </div>
          </div>
          <div className="perk-grid">
            <Perk icon="🎮" title="Game / YouTube time" text={current.games} />
            <Perk icon="🔁" title="Make-ups" text={current.benefits === "None" ? "No make-ups yet. Reach 🥈 Silver to make up a missed task the next day." : current.benefits} />
            <Perk icon="💎" title="Gems" text={`${gems?.per_task ?? 5} gems for every task, +${gems?.per_level ?? 10} for each new level.`} />
          </div>
          <Unlocks tier={current} profile={p} />
        </section>
      )}

      {isMember && p && (next || p.next_level_reward) && (
        <section className="bn-next">
          <h2>Next rewards</h2>
          <div className="bn-next-grid">
            {p.next_level_reward && (
              <div className="bn-card">
                <span className="bn-card-ico">⬆️</span>
                <b>Next level: {p.next_level_reward.level}</b>
                <p>+{p.next_level_reward.gems} 💎 the first time you reach it</p>
              </div>
            )}
            {next && next.key !== "legendary" && (
              <div className="bn-card next-rank" style={{ ["--tc" as string]: next.color }}>
                <span className="bn-card-ico">{next.emoji}</span>
                <b>{next.name} at level {next.min ? roman(next.min) : ""}</b>
                <p>{p.next ? `${p.next.needed} more level${p.next.needed === 1 ? "" : "s"} to go` : ""}</p>
                <p>🎮 {next.games}</p>
                <p>🔁 {next.benefits}</p>
                <p>💎 +{(gems?.per_rank ?? 50) + (gems?.per_level ?? 10)} gems on arrival</p>
                <Unlocks tier={next} profile={p} />
              </div>
            )}
            {(next?.key === "legendary" || p.can_start_quest) && (
              <div className="bn-card next-rank legend-card">
                <span className="bn-card-ico">👑</span>
                <b>Legendary</b>
                <p>Reached only through the Legendary quest from 🔮 Obsidian: start again from I and finish every task and bonus, every day, until L.</p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="card bn-ladder">
        <h2>All ranks</h2>
        <ol className="ladder">
          {[...tiers].reverse().map((t) => {
            const idx = tiers.indexOf(t);
            const state = curIdx < 0 ? "" : idx < curIdx ? "done" : idx === curIdx ? "here" : "ahead";
            return (
              <li key={t.key} className={`rung ${state}`} style={{ ["--tc" as string]: t.color }}>
                <span className="rung-badge">{t.emoji}</span>
                <div className="rung-body">
                  <div className="rung-head"><b>{t.name}</b><span>{t.range}</span>{state === "here" && <em>You are here</em>}{state === "done" && <em className="ok">✓</em>}{state === "ahead" && <em className="lock">🔒</em>}</div>
                  <p>🎮 {t.games}</p>
                  <p>🔁 {t.benefits}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="card">
        <h2>How Honor works</h2>
        <div className="rules">
          <div><b>+1 Honor</b><p>Tick the honor pledge and finish all {taskCount} daily tasks.</p></div>
          <div><b>+1 Bonus</b><p>Complete the day's 300× dhikr. It cannot be made up later.</p></div>
          <div><b>−1 Honor cut 👺</b><p>{(info?.rules.cut_misses ?? 1) <= 1 ? "A weekday ends with any task not completed (and no excuse)." : `A weekday ends with ${info?.rules.cut_misses} or more tasks missed.`} Tasks made up in time count as done.</p></div>
          <div><b>Excused days</b><p>Write a reason on the day (sick, injury): exercise tasks are excused and nothing is cut.</p></div>
          <div><b>Weekends (Fri &amp; Sat)</b><p>Games and YouTube allowed. Tasks are optional: earn, never lose.</p></div>
          <div><b>👑 Legendary</b><p>From 🔮 Obsidian, give up the title, restart at I and finish every task and bonus every day until L. Missing tasks 3 weekdays in a row loses it for good.</p></div>
        </div>
        <p className="note">Weeks run Sunday to Saturday. Days change at midnight{info ? `, ${info.rules.timezone} time` : ""}.</p>
      </section>
    </div>
  );
}
