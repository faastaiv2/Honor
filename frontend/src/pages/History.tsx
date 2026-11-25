import { useEffect, useState } from "react";
import { api, type History } from "../api";
import { fmt } from "../lib/dates";
import { useChangeCounter } from "../lib/events";

export default function HistoryPage() {
  const [h, setH] = useState<History | null>(null);
  const changes = useChangeCounter();
  useEffect(() => { api.history(14).then(setH).catch(() => undefined); }, [changes]);
  return (
    <section className="card">
      <h2>Last 14 days</h2>
      {!h ? <p className="note">Loading…</p> : (
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                {h.dates.map((d) => <th key={d.date} className={d.weekend ? "we" : ""}>{fmt(d.date, { weekday: "narrow" })}<br />{fmt(d.date, { day: "numeric" })}</th>)}
              </tr>
            </thead>
            <tbody>
              {h.rows.map((r) => (
                <tr key={r.member.id}>
                  <td><b>{r.member.name}</b></td>
                  {r.cells.map((c, i) => (
                    <td key={i} className={c.state}>
                      {c.state === "pre" ? "·" : c.state === "open" ? (c.delta ? `+${c.delta}` : `${c.done}/${c.of}`)
                        : c.state === "pos" ? `+${c.delta}` : c.state === "neg" ? "−1" : c.state === "rest" ? "rest" : c.state === "excused" ? "ex" : "0"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="note">Honor change per day. “rest” = weekend, “ex” = excused, “·” = before scoring started (carried over from the sheet), amber = today, still open.</p>
    </section>
  );
}
