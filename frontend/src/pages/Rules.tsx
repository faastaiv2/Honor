import type { TodayInfo } from "../api";

const ROMAN: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
const roman = (n: number) => ROMAN.reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v; } return s; }, "");

export default function Rules({ info }: { info: TodayInfo | null }) {
  const tiers = info?.tiers ?? [];
  return (
    <section className="card">
      <h2>How Honor works</h2>
      <div className="rules">
        <div><b>+1 Honor received</b><p>Tick the honor pledge and finish all 17 daily tasks.</p></div>
        <div><b>+1 Bonus</b><p>Complete the day's 300× dhikr (after the 99 Names, 1000× Astaghfar). On weekdays it needs the pledge ticked.</p></div>
        <div><b>−1 Honor cut 👺</b><p>A weekday ends with {info?.rules.cut_misses ?? 5} or more tasks missed and no excuse.</p></div>
        <div><b>Excused days</b><p>Write a reason (sick, injury): fitness tasks are excused and no Honor is cut.</p></div>
        <div><b>Weekends (Fri &amp; Sat)</b><p>Games and YouTube allowed. Tasks are optional: you can still earn, never lose.</p></div>
        <div><b>Growing targets</b><p>Darood, pages, laps and exercises step up automatically each day, as in the sheet.</p></div>
      </div>
      <div className="tiers">
        {tiers.map((t, i) => {
          const next = tiers[i + 1]?.min;
          const range = t.min === null ? "0 and below" : `${roman(t.min)}${next ? `–${roman(next - 1)}` : "+"}`;
          return <span key={t.name}>{t.emoji} {t.name} · {range}</span>;
        })}
      </div>
      <p className="note">Members tick their own tasks for today and yesterday. Parents can change any day and adjust Honor.{info ? ` Days change at midnight, ${info.rules.timezone} time.` : ""}</p>
    </section>
  );
}
