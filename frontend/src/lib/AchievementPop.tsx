import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import Gem from "./Gem";
import Medal from "./Medal";
import { playSound } from "./sounds";

export interface NewAchievement { key: string; name: string; icon: string; tier: string; gems: number }

/** "Achievement unlocked!": a small card drops in from the top, the medal pops and shines, the sound plays. */
export default function AchievementPop({ items, onDone }: { items: NewAchievement[]; onDone: () => void }) {
  const a = items[0];
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    void playSound("achievement");
    const t1 = window.setTimeout(() => setLeaving(true), 5200);
    const t2 = window.setTimeout(onDone, 5700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!a) return null;
  const close = () => { setLeaving(true); window.setTimeout(onDone, 400); };
  return createPortal(
    <div className={`ach-pop${leaving ? " out" : ""}`} role="status" aria-live="polite">
      <span className="ach-pop-medal" aria-hidden="true"><i className="ach-pop-shine" /><Medal icon={a.icon} tier={a.tier} size={54} /></span>
      <span className="ach-pop-text">
        <small>Achievement unlocked!</small>
        <b>{a.name}</b>
        <span className="ach-pop-gems">+{a.gems} <Gem />{items.length > 1 ? <em> · +{items.length - 1} more</em> : null}</span>
      </span>
      <Link to="/achievements" className="ach-pop-go" onClick={close}>Collect</Link>
      <button className="ach-pop-x" aria-label="Close" onClick={close}>×</button>
    </div>,
    document.body,
  );
}
