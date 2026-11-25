import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Board, type BoardRow, type Tier, type TodayInfo } from "../api";
import Avatar from "../lib/Avatar";
import { daysLeftLabel } from "../lib/board";
import { useChangeCounter } from "../lib/events";

const ROMAN: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
const roman = (n: number): string => (n <= 0 ? (n === 0 ? "0" : "−" + roman(-n)) : ROMAN.reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v; } return s; }, ""));
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A level that ticks up from I to its value when `run` turns on. */
function TickingLevel({ row, run }: { row: BoardRow; run: boolean }) {
  const [n, setN] = useState(run ? 1 : row.level);
  useEffect(() => {
    if (!run || reduced() || row.legendary || row.level <= 1) { setN(row.level); return; }
    setN(1);
    const steps = Math.min(row.level, 24), id = setInterval(() => {
      setN((x) => { const nx = Math.min(row.level, x + Math.max(1, Math.round(row.level / steps))); if (nx >= row.level) clearInterval(id); return nx; });
    }, 45);
    return () => clearInterval(id);
  }, [run, row.level, row.legendary]);
  return <span className="lv2-num">{row.legendary ? "L" : roman(n)}</span>;
}

/** Ranks from the top (Legendary) down; Low Honor only when someone is there. */
function floorsOf(rows: BoardRow[], tiers: Tier[]) {
  return [...tiers].reverse()
    .filter((t) => t.key !== "low" || rows.some((r) => r.tier.key === "low"))
    .map((t) => ({ tier: t, rows: rows.filter((r) => r.tier.key === t.key) }));
}

export default function Leaderboard({ info, full = false }: { info: TodayInfo | null; full?: boolean }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [lit, setLit] = useState(-1); // the floor the tick-down has reached
  const [found, setFound] = useState(false);
  const [counting, setCounting] = useState(false);
  const floorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timer = useRef<number | undefined>(undefined);
  const changes = useChangeCounter();
  useEffect(() => { api.leaderboard().then(setBoard).catch(() => undefined); }, [changes]);

  const floors = board && info ? floorsOf(board.rows, info.tiers) : [];
  const meFloor = floors.findIndex((f) => f.rows.some((r) => r.is_me));
  const target = meFloor >= 0 ? meFloor : floors.reduce((last, f, i) => (f.rows.length ? i : last), 0);

  const play = useCallback(() => {
    window.clearInterval(timer.current);
    setFound(false);
    setCounting(false);
    if (!full || reduced()) { setLit(target); setFound(meFloor >= 0); setCounting(true); return; }
    let i = 0;
    setLit(0);
    timer.current = window.setInterval(() => {
      i += 1;
      if (i > target) {
        window.clearInterval(timer.current);
        setFound(meFloor >= 0);
        setCounting(true);
        return;
      }
      setLit(i);
      floorRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 280);
  }, [full, target, meFloor]);

  const ready = floors.length > 0;
  useEffect(() => { if (ready) play(); return () => window.clearInterval(timer.current); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const days = board?.week.days_left ?? 0;
  const scanning = lit >= 0 && lit < target && !found;
  const here = floors[Math.max(0, lit)]?.tier;

  return (
    <section className={`lb2${full ? " full" : ""}`} aria-labelledby="lb-h">
      <div className="lb2-head">
        <h2 id="lb-h">Leaderboard</h2>
        {board && <span className="lb2-week">Week {board.week.number} · {daysLeftLabel(days)}</span>}
      </div>
      {full && here && (
        <div className={`scanner${found ? " done" : ""}`} aria-live="polite">
          <span>
            {scanning || (!found && lit < target)
              ? <>🔎 Climbing down… <b style={{ color: here.color }}>{here.emoji} {here.name}</b></>
              : meFloor >= 0 ? <>🎯 Found you in <b>{floors[meFloor].tier.emoji} {floors[meFloor].tier.name}</b>!</> : <>🏁 Everyone's ranks</>}
          </span>
          <button className="link" onClick={play}>Show me again</button>
        </div>
      )}
      {!board ? <p className="note">Loading…</p> : board.rows.length === 0 ? <p className="note">No members yet.</p> : (
        <div className="floors">
          {floors.map((f, i) => (
            <div key={f.tier.key} ref={(el) => { floorRefs.current[i] = el; }}
              className={`floor${f.rows.length ? "" : " empty"}${i <= lit ? " passed" : ""}${i === lit ? " lit" : ""}`}
              style={{ ["--tc" as string]: f.tier.color }}>
              <div className="floor-head">
                <span className="floor-emblem" aria-hidden="true">{f.tier.emoji}</span>
                <div className="floor-name"><b>{f.tier.name}</b><small>{f.tier.range}</small></div>
                <span className="floor-count">{f.rows.length ? `${f.rows.length} ${f.rows.length === 1 ? "member" : "members"}` : "No one yet"}</span>
              </div>
              {f.rows.length > 0 && (
                <ol className="floor-rows">
                  {f.rows.map((r) => (
                    <li key={r.member.id} className={`p-row${r.is_me ? " me" : ""}${r.is_me && found ? " found" : ""}`}>
                      <span className="p-rank">#{r.rank}</span>
                      <Avatar avatar={r.member.avatar} color={r.tier.color} frame={r.member.frame} size={46} />
                      <span className="p-name">{r.is_me ? "You" : r.member.name}{r.quest.active && <small>👑 on the quest</small>}</span>
                      {r.is_me && found && <span className="you-bubble">That's you!</span>}
                      <TickingLevel row={r} run={counting} />
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
