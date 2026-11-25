import type { TodayInfo } from "../api";

export default function Rules({ info }: { info: TodayInfo | null }) {
  const tiers = (info?.tiers ?? []).filter((t) => t.key !== "low");
  return (
    <section className="card">
      <h2>How Honor works</h2>
      <div className="rules">
        <div><b>+1 Honor received</b><p>Tick the honor pledge and finish all 17 daily tasks.</p></div>
        <div><b>+1 Bonus</b><p>Complete the day's 300× dhikr (after the 99 Names, 1000× Astaghfar). On weekdays it needs the pledge ticked. It cannot be made up later.</p></div>
        <div><b>−1 Honor cut 👺</b><p>{(info?.rules.cut_misses ?? 1) <= 1 ? "A weekday ends with any task not completed (and no excuse)." : `A weekday ends with ${info?.rules.cut_misses} or more tasks missed and no excuse.`} Tasks made up later, as your rank allows, count as completed.</p></div>
        <div><b>Excused days</b><p>Write a reason on the day (sick, injury): fitness tasks are excused and no Honor is cut.</p></div>
        <div><b>Weekends (Fri &amp; Sat)</b><p>Games and YouTube allowed. Tasks are optional: you can still earn, never lose.</p></div>
        <div><b>💎 Gems</b><p>Every task ticked gives {info?.gems.per_task ?? 5} gems. Each new level gives {info?.gems.per_level ?? 10}, and each new rank {info?.gems.per_rank ?? 50} more. Spend them in your Profile's shop.</p></div>
        <div><b>Making up tasks</b><p>Higher ranks may tick missed tasks after the day, as their benefits say. Tasks ticked on the day can't be changed afterwards.</p></div>
      </div>

      <h3 style={{ marginTop: 24 }}>Ranks</h3>
      <div className="scroll">
        <table className="tier-table">
          <thead><tr><th>Honor tier</th><th>Ranks</th><th>Game / YouTube</th><th>Benefits</th></tr></thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.key} style={{ background: `color-mix(in srgb, ${t.color} 10%, transparent)` }}>
                <td>{t.emoji} {t.name}</td><td>{t.range}</td><td>{t.games}</td><td>{t.benefits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="legend-box">
        <h3>👑 Legendary</h3>
        <p>Without it, the highest rank is 🖤 Obsidian (XLIX).</p>
        <p>To earn 👑 Legendary, an 🖤 Obsidian member gives up the title and starts again from 🥉 Bronze (I), then must do <b>all tasks in a row without missing a single day or a single Bonus Honor</b> until reaching L. One missed day ends the quest.</p>
        <p>The only way to lose 👑 Legendary Honor is to not complete tasks for 3 days in a row (weekdays). Then you are demoted to 🖤 Obsidian and can never receive 👑 Legendary again.</p>
      </div>
      <p className="note">Weeks run Sunday to Saturday. Days change at midnight{info ? `, ${info.rules.timezone} time` : ""}.</p>
    </section>
  );
}
