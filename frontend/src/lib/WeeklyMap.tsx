import { createPortal } from "react-dom";
import Gem from "./Gem";
import type { Profile } from "../api";
import { fmt } from "./dates";

/**
 * The weekly treasure map: seven stops along a winding trail. The Nth chest opened this week holds 5 × N gems;
 * a new map starts every Sunday. Opened stops are ticked, today's stop glows, the rest wait under the fog.
 */
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
      <small>{done ? "Map complete!" : daily.available ? <>Day {daily.step + 1} · +{daily.gems} <Gem /></> : daily.claimed_today ? "Come back tomorrow" : `Day ${daily.step + 1}`}</small>
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
        <p className="wm-sub">Open one chest a day while your streak is alive. Each one holds 5 more gems than the last.</p>
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
                  ? <button className="wm-node" onClick={onOpen} aria-label={`Open day ${s.day}: ${s.gems} gems`}><MiniChest open={false} /></button>
                  : <span className="wm-node">{s.done ? <span className="wm-tick">✓</span> : <MiniChest open={false} />}</span>}
                <b>Day {s.day}</b>
                <small>+{s.gems} <Gem /></small>
                {i === 6 && <span className="wm-x-mark" aria-hidden="true">✕</span>}
              </div>
            );
          })}
        </div>
        <p className="wm-foot">
          {done ? "You opened every chest this week! 🎉" : daily.available ? <>Today's chest: <b>+{daily.gems}</b> <Gem /> · tap it to open</>
            : daily.claimed_today ? "Today's chest is open ✓ Come back tomorrow for the next one."
            : "Finish all of today's tasks to light your streak, then open today's chest."}
          <br /><span className="wm-reset">A new map starts on {fmt(daily.resets, { weekday: "long", day: "numeric", month: "short" })}.</span>
        </p>
      </div>
    </div>,
    document.body,
  );
}
