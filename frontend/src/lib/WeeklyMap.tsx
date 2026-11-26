import { createPortal } from "react-dom";
import Gem from "./Gem";
import type { Profile } from "../api";
import { fmt } from "./dates";

/**
 * The weekly treasure map: the daily reward. Seven stops along a winding trail: days 1–6 are piles of gems
 * (+5, +10 … +30), day 7 is a mystery chest. Opened stops are ticked, today's stop glows, the rest wait.
 * A new map starts every Sunday.
 */
const LAST = 7;

/** A small heap of gems; a bigger heap for a bigger day. */
function GemPile({ n }: { n: number }) {
  const spots = [[20, 26], [12, 26], [28, 26], [16, 19], [24, 19], [20, 12]].slice(0, Math.min(6, n));
  return (
    <svg viewBox="0 0 40 34" className="wm-pile" aria-hidden="true">
      <ellipse cx="20" cy="31" rx="14" ry="2.6" fill="#0002" />
      {spots.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path d="M0 -6 L5.5 -1.5 L0 6 L-5.5 -1.5Z" fill={["#4ab0ff", "#7fd0ff", "#2f7bff"][i % 3]} stroke="#1450a0" strokeWidth=".8" />
          <path d="M0 -6 L2.6 -1.5 L0 -0.4 L-2.6 -1.5Z" fill="#fff" opacity=".6" />
        </g>
      ))}
    </svg>
  );
}
const STOPS: [number, number][] = [[14, 84], [36, 70], [22, 50], [46, 38], [72, 50], [62, 22], [86, 12]];

function MiniChest({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 40 34" className={`wm-chest${open ? " open" : ""}`} aria-hidden="true">
      <rect x="4" y="15" width="32" height="16" rx="2" fill="#8a4a1e" stroke="#4a2208" strokeWidth="1.4" />
      <rect x="8" y="15" width="4" height="16" fill="#f0b820" /><rect x="28" y="15" width="4" height="16" fill="#f0b820" />
      <g className="wm-lid"><path d="M3 16 V10 Q20 -1 37 10 V16Z" fill="#a85a26" stroke="#4a2208" strokeWidth="1.4" /><rect x="3" y="14" width="34" height="3" fill="#f0b820" /></g>
      <rect x="17" y="13" width="6" height="7" rx="1.2" fill="#ffd34a" stroke="#7a4a00" strokeWidth=".8" />
    </svg>
  );
}

export function MapButton({ daily, onClick }: { daily: Profile["daily"]; onClick: () => void }) {
  const done = daily.step >= daily.map.length;
  return (
    <button className={`wm-btn${daily.available ? " ready" : ""}`} onClick={onClick} aria-label="Weekly treasure map">
      <span className="wm-btn-ico" aria-hidden="true">🗺️</span>
      <span className="wm-btn-dots" aria-hidden="true">{daily.map.map((s, i) => <i key={s.day} className={s.done ? "done" : i === daily.step ? "now" : ""} />)}</span>
      <small>{done ? "Map complete!" : daily.available ? (daily.step + 1 === LAST ? <>Day 7 · Mystery chest</> : <>Day {daily.step + 1} · +{daily.gems} <Gem /></>)
        : daily.claimed_today ? "Come back tomorrow" : `Day ${daily.step + 1}`}</small>
    </button>
  );
}

export default function WeeklyMap({ daily, onOpen, onClose }: { daily: Profile["daily"]; onOpen: () => void; onClose: () => void }) {
  const path = STOPS.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  const done = daily.step >= daily.map.length;
  return createPortal(
    <div className="wm" role="dialog" aria-modal="true" aria-label="Weekly treasure map" onClick={onClose}>
      <div className="wm-card" onClick={(e) => e.stopPropagation()}>
        <button className="wm-x" aria-label="Close" onClick={onClose}>×</button>
        <h2>🗺️ Weekly treasure map</h2>
        <p className="wm-sub">Your daily reward: finish your tasks and collect one stop a day. Each day holds 5 more gems than the last, and Day 7 is a mystery chest.</p>
        <div className="wm-board">
          <svg className="wm-trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d={path} fill="none" stroke="#8a6a3a" strokeWidth="1.6" strokeDasharray="2.4 2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="wm-compass" aria-hidden="true">🧭</span>
          {daily.map.map((s, i) => {
            const now = i === daily.step && !done;
            const state = s.done ? "done" : now ? (daily.available ? "ready" : "now") : "later";
            return (
              <div key={s.day} className={`wm-stop ${state}`} style={{ left: `${STOPS[i][0]}%`, top: `${STOPS[i][1]}%` }}>
                {state === "ready"
                  ? <button className={`wm-node${s.day === LAST ? " chest" : ""}`} onClick={onOpen} aria-label={s.day === LAST ? "Open the mystery chest" : `Collect day ${s.day}: ${s.gems} gems`}>
                      {s.day === LAST ? <MiniChest open={false} /> : <GemPile n={s.day} />}</button>
                  : <span className={`wm-node${s.day === LAST ? " chest" : ""}`}>{s.done ? <span className="wm-tick">✓</span> : s.day === LAST ? <MiniChest open={false} /> : <GemPile n={s.day} />}</span>}
                <b>Day {s.day}</b>
                <small>{s.day === LAST ? (s.done ? <>+{s.gems} <Gem /></> : "? ? ?") : <>+{s.gems} <Gem /></>}</small>
                {i === 6 && <span className="wm-x-mark" aria-hidden="true">✕</span>}
              </div>
            );
          })}
        </div>
        <p className="wm-foot">
          {done ? "You collected the whole map this week! 🎉" : daily.available
            ? (daily.step + 1 === LAST ? <>Today: the <b>mystery chest</b> · tap it to open</> : <>Today: <b>+{daily.gems}</b> <Gem /> · tap the gems to collect</>)
            : daily.claimed_today ? "Today's reward is collected ✓ Come back tomorrow for the next stop."
            : "Finish all of today's tasks, then collect today's stop."}
          <br /><span className="wm-reset">A new map starts on {fmt(daily.resets, { weekday: "long", day: "numeric", month: "short" })}.</span>
        </p>
      </div>
    </div>,
    document.body,
  );
}
