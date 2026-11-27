import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Avatar from "./Avatar";
import Gem from "./Gem";
import { playSound } from "./sounds";

/**
 * "You are a Godfather": the screen goes black, a gold Greek-key ring draws itself around the member's picture,
 * the gold "G" crest drops into place, gold dust falls, and the Godfather achievement (113 gems) is offered.
 */
export default function GodfatherReveal({ name, avatar, onCollect, onDone, preview = false }: {
  name: string; avatar?: string; onCollect?: () => Promise<void>; onDone: (wear: boolean) => void; preview?: boolean;
}) {
  const [stage, setStage] = useState(0); // 0 dark, 1 ring, 2 crest + title, 3 reward
  const [busy, setBusy] = useState(false);
  const [collected, setCollected] = useState(false);
  useEffect(() => {
    playSound("godfather", false);
    const t = [setTimeout(() => setStage(1), 300), setTimeout(() => setStage(2), 1700), setTimeout(() => setStage(3), 3000)];
    return () => t.forEach(clearTimeout);
  }, []);
  const collect = async () => {
    if (busy) return;
    setBusy(true);
    try { if (!preview) await onCollect?.(); setCollected(true); playSound("collect", false); } finally { setBusy(false); }
  };
  const dust = Array.from({ length: 26 }, (_, i) => i);
  return createPortal(
    <div className={`gfr s${stage}`} role="dialog" aria-modal="true" aria-label="You are a Godfather">
      <div className="gfr-dust" aria-hidden="true">
        {dust.map((i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 9) * .45}s`, animationDuration: `${4 + (i % 5)}s` }} />)}
      </div>
      <div className="gfr-stage">
        <div className="gfr-face"><Avatar avatar={avatar} color="#ffffff" frame="godfather" size={150} /></div>
        <p className="gfr-kicker">By decree of the family</p>
        <h2 className="gfr-title">{preview ? "Preview" : name}, you are a <b>Godfather</b></h2>
        <p className="gfr-sub">The Godfather frame is yours alone.</p>
        <div className="gfr-reward">
          <span className="gfr-medal">G</span>
          <span><b>The Godfather</b><small>Achievement unlocked</small></span>
          {collected
            ? <span className="gfr-got">+113 <Gem /></span>
            : <button className="gfr-collect" onClick={collect} disabled={busy}>Collect 113 <Gem /></button>}
        </div>
        <div className="gfr-btns">
          <button className="gfr-close wear" onClick={() => onDone(true)}>Wear it with honor</button>
          {!collected && <button className="gfr-close" onClick={() => onDone(false)}>Later</button>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
