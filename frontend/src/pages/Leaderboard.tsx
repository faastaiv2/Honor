import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Board, type BoardRow, type TodayInfo } from "../api";
import Avatar from "../lib/Avatar";
import { daysLeftLabel, groupByTier } from "../lib/board";
import { useChangeCounter } from "../lib/events";

type Tab = "top" | "week";

function Row({ r, score, sub }: { r: BoardRow; score: string; sub?: string }) {
  return (
    <li className={`lb-row${r.is_me ? " me" : ""}${r.legendary ? " legend" : ""}`} style={{ ["--tc" as string]: r.tier.color }}>
      <Avatar avatar={r.member.avatar} code={r.member.code} color={r.tier.color} />
      <span className="lb-name">
        {r.is_me ? "Me" : r.member.name}
        <span className="lb-medal" title={r.tier.name}>{r.tier.emoji}</span>
        {r.quest.active && <span className="lb-tag">Quest day {r.quest.days + 1}</span>}
      </span>
      <span className="lb-score">{score}{sub && <small>{sub}</small>}</span>
    </li>
  );
}

export default function Leaderboard({ info }: { info: TodayInfo | null }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [tab, setTab] = useState<Tab>("top");
  const changes = useChangeCounter();
  useEffect(() => { api.leaderboard().then(setBoard).catch(() => undefined); }, [changes]);

  const sections = board && info ? groupByTier(board.rows, info.tiers) : [];
  const byId = new Map(board?.rows.map((r) => [r.member.id, r]));
  const days = board?.week.days_left ?? 0;

  return (
    <section className="card lb" aria-labelledby="lb-h">
      <div className="lb-head">
        <h2 id="lb-h">Top Honor <Link to="/rules" className="lb-info" aria-label="How Honor works">i</Link></h2>
        <p className="lb-sub">Family board</p>
        {board && (
          <div className="lb-week">
            <b>Week {board.week.number}</b>
            <span>{days > 0 && <em>{days}</em>}{days > 0 ? daysLeftLabel(days).slice(String(days).length) : daysLeftLabel(days)}</span>
          </div>
        )}
      </div>

      {!board ? <p className="note">Loading…</p> : tab === "top" ? (
        sections.map(({ tier: t, rows }) => (
          <div className="lb-sec" key={t.key} style={{ ["--tc" as string]: t.color }}>
            <div className="lb-bar">
              <span>{t.emoji} {t.name}</span>
              <small>Ranks<br />{t.range}</small>
            </div>
            <ol>{rows.map((r) => <Row key={r.member.id} r={r} score={r.label} sub={r.today.delta > 0 ? `+${r.today.delta} today` : undefined} />)}</ol>
          </div>
        ))
      ) : (
        <div className="lb-sec" style={{ ["--tc" as string]: "#0b4a3a" }}>
          <div className="lb-bar"><span>This week</span><small>Honor<br />gained</small></div>
          <ol>
            {board.weekly.map((w, i) => {
              const r = byId.get(w.member_id)!;
              return <Row key={w.member_id} r={r} score={`${w.week_delta > 0 ? "+" : ""}${w.week_delta}`} sub={i < 3 && w.week_delta > 0 ? ["🥇 1st", "🥈 2nd", "🥉 3rd"][i] : undefined} />;
            })}
          </ol>
        </div>
      )}

      <div className="lb-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "top"} className={tab === "top" ? "on" : ""} onClick={() => setTab("top")}>Top Honor 🏅</button>
        <button role="tab" aria-selected={tab === "week"} className={tab === "week" ? "on" : ""} onClick={() => setTab("week")}>This Week 📅</button>
      </div>
    </section>
  );
}
