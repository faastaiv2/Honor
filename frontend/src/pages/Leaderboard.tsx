import { useEffect, useState } from "react";
import { api, type Board, type BoardRow, type TodayInfo } from "../api";
import Avatar from "../lib/Avatar";
import { daysLeftLabel, groupByTier } from "../lib/board";
import { useChangeCounter } from "../lib/events";

type Tab = "top" | "week";

function Row({ r, score }: { r: BoardRow; score: string }) {
  return (
    <li className={`lb-row${r.is_me ? " me" : ""}`}>
      <Avatar avatar={r.member.avatar} color={r.tier.color} />
      <span className="lb-name">{r.is_me ? "Me" : r.member.name}</span>
      <span className="lb-medal" title={r.tier.name}>{r.tier.emoji}</span>
      <span className="lb-score">{score}</span>
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
      <h2 id="lb-h" className="lb-title">Top Honor</h2>
      {board && (
        <div className="lb-week">
          <b>Week {board.week.number}</b>
          <span>{days > 0 ? <><em>{days}</em>{daysLeftLabel(days).slice(String(days).length)}</> : daysLeftLabel(days)}</span>
        </div>
      )}

      {!board ? <p className="note">Loading…</p> : board.rows.length === 0 ? <p className="note">No members yet.</p> : tab === "top" ? (
        sections.map(({ tier: t, rows }) => (
          <div className="lb-sec" key={t.key} style={{ ["--tc" as string]: t.color }}>
            <div className="lb-bar">
              <span>{t.name}</span>
              <small>Best<br />{rows[0].label}</small>
            </div>
            <ol>{rows.map((r) => <Row key={r.member.id} r={r} score={r.label} />)}</ol>
          </div>
        ))
      ) : (
        <div className="lb-sec" style={{ ["--tc" as string]: "#0b4a3a" }}>
          <div className="lb-bar">
            <span>This Week</span>
            <small>Honor<br />gained</small>
          </div>
          <ol>
            {board.weekly.map((w) => {
              const r = byId.get(w.member_id)!;
              return <Row key={w.member_id} r={r} score={`${w.week_delta > 0 ? "+" : ""}${w.week_delta}`} />;
            })}
          </ol>
        </div>
      )}

      <div className="lb-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "top"} className={tab === "top" ? "on" : ""} onClick={() => setTab("top")}>Top Honor</button>
        <button role="tab" aria-selected={tab === "week"} className={tab === "week" ? "on" : ""} onClick={() => setTab("week")}>This Week</button>
      </div>
    </section>
  );
}
