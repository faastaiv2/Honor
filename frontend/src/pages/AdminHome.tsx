import { useCallback, useEffect, useState } from "react";
import { api, type BoardRow, type TodayInfo } from "../api";
import Avatar from "../lib/Avatar";
import RankIcon from "../lib/RankIcon";
import { useChangeCounter } from "../lib/events";
import Today from "./Today";

/** The admin's home: every member as a short row; tap one to open their tasks for the day. */
export default function AdminHome({ info }: { info: TodayInfo | null }) {
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const changes = useChangeCounter();
  const load = useCallback(() => { api.leaderboard().then((b) => setRows(b.rows)).catch(() => undefined); }, []);
  useEffect(load, [load, changes]);

  if (!rows) return <section className="card"><p className="note">Loading…</p></section>;
  if (rows.length === 0) return <section className="card"><h2>Today</h2><p className="note">No members yet. Add them in the Admin tab.</p></section>;
  const done = rows.filter((r) => r.today.of > 0 && r.today.done >= r.today.of).length;

  return (
    <section className="card ah">
      <div className="ah-head">
        <h2>Today</h2>
        <span className="ah-sum">{done} of {rows.length} finished</span>
      </div>
      <ul className="ah-list">
        {rows.map((r) => {
          const isOpen = open === r.member.id;
          const pct = r.today.of ? Math.round((r.today.done / r.today.of) * 100) : 0;
          const finished = r.today.of > 0 && r.today.done >= r.today.of;
          return (
            <li key={r.member.id} className={`ah-item${isOpen ? " open" : ""}`} style={{ ["--tc" as string]: r.tier.color }}>
              <button className="ah-row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.member.id)}>
                <Avatar avatar={r.member.avatar} color={r.tier.color} frame={r.member.frame} size={40} />
                <span className="ah-name">
                  <b>{r.member.name}</b>
                  <small><RankIcon rank={r.tier.key} /> {r.tier.name} · {r.label}{r.excused_today?.length ? ` · ${r.excused_today.length} excused` : ""}</small>
                </span>
                <span className="ah-prog">
                  <span className="ah-bar"><i style={{ width: `${pct}%` }} /></span>
                  <b className={finished ? "ok" : ""}>{r.today.done}/{r.today.of}{finished ? " ✓" : ""}</b>
                </span>
                {r.pending > 0 && <span className="ah-pending" title="Honor arriving at midnight">🌙 +{r.pending}</span>}
                <span className="ah-chev" aria-hidden="true">›</span>
              </button>
              {isOpen && <div className="ah-body"><Today info={info} member={r.member.id} /></div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
