import { useEffect, useRef, useState } from "react";
import { api, type BoardRow, type TodayInfo } from "../api";
import { useChangeCounter } from "../lib/events";
import { ladderLayout } from "../lib/ladder";

function Ladder({ rows, info }: { rows: BoardRow[]; info: TodayInfo | null }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { w: W, h: H } = size;
  if (!info || !W || !H) return <div className="fig" ref={box} />;
  const { lo, hi, bands } = ladderLayout(rows.map((r) => r.honor), info.tiers);
  const pad = 16, narrow = W < 520, lw = narrow ? 40 : 150;
  const y = (v: number) => pad + ((hi - v) / (hi - lo)) * (H - 2 * pad);
  const x0 = lw + 20, x1 = W - 24, n = rows.length;
  return (
    <div className="fig" ref={box}>
      <svg role="img" aria-label="Honor tower showing each member's level">
        {bands.map((b, i) => {
          const y1 = y(b.top), y2 = y(b.bottom);
          return (
            <g key={b.tier.name}>
              <rect x={0} y={y1} width={W} height={y2 - y1} fill={b.tier.color} opacity={i % 2 ? 0.13 : 0.07} />
              <line x1={0} x2={W} y1={y2} y2={y2} stroke={b.tier.color} opacity={0.35} />
              {y2 - y1 > 22 && <text x={8} y={(y1 + y2) / 2 + 5} fontSize={14} fill="currentColor" opacity={0.8}>{b.tier.emoji}{narrow ? "" : ` ${b.tier.name}`}</text>}
            </g>
          );
        })}
        {rows.map((r, i) => {
          const x = n > 1 ? x0 + ((x1 - x0) * i) / (n - 1) : (x0 + x1) / 2;
          const yy = y(r.honor);
          return (
            <g key={r.member.id}>
              <line x1={x} x2={x} y1={yy + 16} y2={H - pad} stroke={r.tier.color} strokeWidth={3} opacity={0.25} strokeLinecap="round" />
              <circle cx={x} cy={yy} r={16} fill={r.tier.color} stroke="#fff" strokeWidth={2} />
              <text x={x} y={yy + 5} textAnchor="middle" fontSize={13} fontWeight={800} fill="#fff">{r.member.code}</text>
              {!narrow && <text x={x} y={yy - 24} textAnchor="middle" fontSize={13} fill="currentColor">{r.member.name} · {r.level}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function Leaderboard({ info }: { info: TodayInfo | null }) {
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const changes = useChangeCounter();
  useEffect(() => { api.leaderboard().then(setRows).catch(() => setRows([])); }, [changes]);
  // The tower reads right to left: highest Honor on the right.
  const tower = rows ? [...rows].reverse() : [];
  return (
    <section className="card" aria-labelledby="lb-h">
      <h2 id="lb-h">Leaderboard</h2>
      {rows === null ? <p className="note">Loading…</p> : (
        <>
          <Ladder rows={tower} info={info} />
          <ol className="rank">
            {rows.map((r) => {
              const lo = r.tier.min ?? Math.min(r.honor, 0);
              const pct = r.tier.next ? Math.min(100, Math.max(0, ((r.honor - lo) / (r.tier.next.min - lo)) * 100)) : 100;
              return (
                <li key={r.member.id}>
                  <span className="n">{r.rank}</span>
                  <div>
                    <div className="nm">{r.member.name}</div>
                    <div className="tier">
                      {r.tier.emoji} {r.tier.name}{r.tier.next ? ` · ${r.tier.next.needed} to ${r.tier.next.emoji}` : ""} · today {r.today.done}/{r.today.of}
                    </div>
                    <div className="meter"><i style={{ width: `${pct}%`, background: r.tier.color }} /></div>
                  </div>
                  <div className="lv">{r.level}<small>{r.today.delta > 0 ? `+${r.today.delta} today` : " "}</small></div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
