import type React from "react";
import { useEffect, useRef, useState } from "react";
import RankIcon from "../lib/RankIcon";
import Gem from "../lib/Gem";
import Avatar from "../lib/Avatar";
import ThemePreview from "../lib/ThemePreview";
import { api, type Profile, type Tier, type TodayInfo } from "../api";
import { useAuth } from "../auth";

/**
 * Benefits: what every rank gives. Pick a rank to see its gems, daily chest, game time, make-ups,
 * frame and theme; then a table of every rank side by side, and how gems are earned.
 */

const ROMAN: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
const roman = (n: number) => ROMAN.reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v; } return s; }, "");

/** "20 mins / Sunday (after finishing tasks)" → ["20 mins / Sunday", "after finishing tasks"] */
function splitNote(s: string): [string, string] {
  const m = s.match(/^(.*?)\s*\((.*)\)\s*$/);
  return m ? [m[1], m[2]] : [s, ""];
}
const gameText = (t: Tier) => (/^0 mins/.test(t.games) ? ["No game time yet", "Reach Silver for your first game time"] : splitNote(t.games));
const makeUpText = (t: Tier) => (t.benefits === "None" ? ["No make-ups yet", "From Silver you can make up a missed task the next day"] : splitNote(t.benefits));
const romanRange = (t: Tier) => (t.key === "legendary" ? "Quest only" : t.min ? `${roman(t.min)}${t.max ? ` – ${roman(t.max)}` : "+"}` : t.range);

function Stat({ icon, big, label, note, tone = "" }: { icon: React.ReactNode; big: React.ReactNode; label: string; note?: string; tone?: string }) {
  return (
    <div className={`bx-stat ${tone}`}>
      <span className="bx-stat-ico" aria-hidden="true">{icon}</span>
      <div>
        <small>{label}</small>
        <b>{big}</b>
        {note && <p>{note}</p>}
      </div>
    </div>
  );
}

function RankDetail({ t, state, needed, avatar }: { t: Tier; state: "done" | "here" | "ahead" | ""; needed?: number; avatar: string }) {
  const [games, gamesNote] = gameText(t);
  const [mu, muNote] = makeUpText(t);
  return (
    <article className={`bx-detail ${state}`} style={{ ["--tc" as string]: t.color }} key={t.key}>
      <div className="bx-detail-head">
        <span className="bx-detail-icon"><RankIcon rank={t.key} size={96} /></span>
        <div>
          <p className="bx-kicker">{state === "here" ? "Your rank" : state === "done" ? "Reached ✓" : state === "ahead" ? "🔒 Locked" : "Rank"}</p>
          <h2>{t.name}</h2>
          <p className="bx-levels">{t.key === "legendary" ? "Earned through the Legendary quest" : t.key === "member" ? "Level 0 · where everyone starts" : `Levels ${romanRange(t)}`}</p>
          {state === "ahead" && needed !== undefined && needed > 0 && <p className="bx-need">{needed} more level{needed === 1 ? "" : "s"} to unlock</p>}
        </div>
      </div>

      {t.key === "member" && <p className="bx-start">👋 Welcome! Finish every task for one day to reach <b>Bronze I</b>, your first rank, with its own crest, frame, theme and gems.</p>}
      <div className="bx-stats">
        {t.key !== "member" && <Stat tone="gem" icon={<Gem size={34} />} label="Arrival reward" big={<>+{t.gems ?? 0} <Gem /></>}
          note={t.achievement ? `Once, the first time you reach it. Plus the “${t.achievement.name}” achievement: +${t.achievement.gems} more` : "Once, the first time you reach it"} />}
        <Stat icon="🎮" label="Game / YouTube time" big={games} note={gamesNote} />
        <Stat icon="🔁" label="Make-ups" big={mu} note={muNote} />
      </div>

      {(t.frame || t.theme) && (
        <div className="bx-unlocks">
          <p className="bx-unlocks-title">Free unlocks</p>
          <div className="bx-unlock-row">
            {t.frame && (
              <div className="bx-unlock">
                <Avatar avatar={avatar} color={t.color} frame={t.frame.key} size={72} />
                <div><b>{t.frame.name}</b><small>Profile frame</small></div>
              </div>
            )}
            {t.theme && (
              <div className="bx-unlock">
                <ThemePreview k={t.theme.key} />
                <div><b>{t.theme.name}</b><small>App theme</small></div>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
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
  const [pick, setPick] = useState<string | null>(null);
  const shown = tiers.find((t) => t.key === pick) ?? (curIdx >= 0 ? tiers[curIdx] : tiers[0]);
  const shownIdx = shown ? tiers.indexOf(shown) : -1;
  const stateOf = (i: number): "done" | "here" | "ahead" | "" => (curIdx < 0 ? "" : i < curIdx ? "done" : i === curIdx ? "here" : "ahead");
  const level = p?.level ?? 0;
  const next = curIdx >= 0 ? tiers[curIdx + 1] : undefined;
  const gems = info?.gems;
  const taskCount = info?.task_count ?? 17;
  const avatar = p?.member.avatar || "lion";
  const strip = useRef<HTMLDivElement>(null);

  // Keep the chosen rank in view in the strip.
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>(".bx-chip.on")?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [shown?.key]);

  // Progress through the current rank's levels.
  const pct = current && next?.min && current.min ? Math.max(4, Math.min(100, Math.round(((level - current.min) / (next.min - current.min)) * 100))) : 100;

  if (!shown) return <section className="card"><p className="note">Loading…</p></section>;

  return (
    <div className="bx">
      <section className="bx-hero" style={{ ["--tc" as string]: current?.color ?? "#b06a2c" }}>
        <div className="bx-hero-glow" aria-hidden="true" />
        <div className="bx-hero-row">
          <span className="bx-hero-icon"><RankIcon rank={current?.key ?? "bronze"} size={110} /></span>
          <div className="bx-hero-txt">
            <p className="bx-kicker">{current ? "Your rank" : "Rank benefits"}</p>
            <h1>{current ? current.name : "Climb the ranks"}</h1>
            {current && p ? (
              <>
                <p className="bx-hero-sub">Level {p.label}{p.next ? ` · ${p.next.needed} more to ${p.next.name}` : ""}</p>
                {next && next.key !== "legendary" && (
                  <div className="bx-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress to ${next.name}`}>
                    <i style={{ width: `${pct}%` }} />
                    <span><RankIcon rank={next.key} size={26} /></span>
                  </div>
                )}
              </>
            ) : <p className="bx-hero-sub">Every rank gives more gems, a bigger daily chest, more game time and new looks.</p>}
          </div>
        </div>
        {current && (
          <div className="bx-hero-chips">
            <span>🎮 <b>{gameText(current)[0]}</b></span>
            <span>🔁 <b>{makeUpText(current)[0]}</b></span>
          </div>
        )}
      </section>

      <section className="card bx-pick">
        <div className="bx-pick-head">
          <h2>Rank rewards</h2>
          <div className="bx-arrows">
            <button aria-label="Previous rank" disabled={shownIdx <= 0} onClick={() => setPick(tiers[shownIdx - 1].key)}>‹</button>
            <button aria-label="Next rank" disabled={shownIdx >= tiers.length - 1} onClick={() => setPick(tiers[shownIdx + 1].key)}>›</button>
          </div>
        </div>
        <div className="bx-strip" ref={strip} role="tablist" aria-label="Ranks">
          {tiers.map((t, i) => (
            <button key={t.key} role="tab" aria-selected={t.key === shown.key} className={`bx-chip ${stateOf(i)}${t.key === shown.key ? " on" : ""}`}
              style={{ ["--tc" as string]: t.color }} onClick={() => setPick(t.key)}>
              <RankIcon rank={t.key} size={40} />
              <small>{t.name}</small>
              {stateOf(i) === "here" && <em>You</em>}
            </button>
          ))}
        </div>
        <RankDetail t={shown} state={stateOf(shownIdx)} needed={shown.min ? shown.min - level : undefined} avatar={avatar} />
      </section>

      <section className="card bx-table-card">
        <h2>All ranks at a glance</h2>
        <div className="bx-table-wrap">
          <table className="bx-table">
            <thead>
              <tr><th>Rank</th><th>Levels</th><th>Arrival</th><th>Game time</th></tr>
            </thead>
            <tbody>
              {[...tiers].reverse().map((t) => {
                const i = tiers.indexOf(t);
                return (
                  <tr key={t.key} className={`${stateOf(i)}${t.key === shown.key ? " on" : ""}`} style={{ ["--tc" as string]: t.color }} onClick={() => setPick(t.key)}>
                    <td><span className="bx-tr-rank"><RankIcon rank={t.key} size={28} /> <b>{t.name}</b>{stateOf(i) === "here" && <em>You</em>}</span></td>
                    <td>{romanRange(t)}</td>
                    <td className="num">+{t.gems ?? 0} <Gem /></td>
                    <td>{gameText(t)[0]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card bx-earn">
        <h2>Ways to earn gems</h2>
        <div className="bx-earn-grid">
          <div><span>✅</span><b>+{gems?.full_day ?? 20}</b><p>Finish every task in a day</p></div>
          <div><span>⬆️</span><b>+{gems?.per_level ?? 10}</b><p>Each new level, the first time</p></div>
          <div><span><RankIcon rank="gold" size={30} /></span><b>+10 to +1000</b><p>Each new rank, the first time</p></div>
          <div><span>🗺️</span><b>+5 to +35</b><p>Weekly treasure map: Day 1 +5, Day 2 +10 … Day 7 +35. A new map every Sunday</p></div>
          <div><span>🏅</span><b>Up to +500</b><p>Achievements</p></div>
          <div><span>🎨</span><b>Prizes</b><p>Win art tournaments in Events</p></div>
        </div>
      </section>

      <section className="card">
        <h2>How Honor works</h2>
        <div className="rules">
          <div><b>+1 Honor</b><p>Tick the honor pledge and finish all {taskCount} daily tasks.</p></div>
          <div><b>+1 Bonus</b><p>Complete the day's 300× dhikr after all your tasks. It cannot be made up later.</p></div>
          <div><b>−1 Honor cut 👺</b><p>{(info?.rules.cut_misses ?? 1) <= 1 ? "A weekday ends with any task not completed (and no excuse)." : `A weekday ends with ${info?.rules.cut_misses} or more tasks missed.`} Tasks made up in time count as done.</p></div>
          <div><b>Excused days</b><p>Write a reason on the day (sick, injury): exercise tasks are excused and nothing is cut.</p></div>
          <div><b>Weekends (Fri &amp; Sat)</b><p>Games and YouTube allowed. Tasks are optional: earn, never lose.</p></div>
          <div><b><RankIcon rank="legendary" /> Legendary</b><p>From <RankIcon rank="obsidian" /> Obsidian, give up the title, restart at I and finish every task and bonus every day until L. Missing tasks 3 weekdays in a row loses it for good.</p></div>
        </div>
        <p className="note">Weeks run Sunday to Saturday. Days change at midnight{info ? `, ${info.rules.timezone} time` : ""}.</p>
      </section>
    </div>
  );
}
