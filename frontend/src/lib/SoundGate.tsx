import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { unlockAudio } from "./sounds";

/**
 * Before a big animation that starts on its own: "Turn your volume up!" with an OK button. Pressing OK is the tap
 * that lets the phone play sound, so the animation's sounds play on time. Then the animation runs.
 */
export default function SoundGate({ children, icon = "🎬" }: { children: ReactNode; icon?: string }) {
  const [ok, setOk] = useState(false);
  if (ok) return <>{children}</>;
  return createPortal(
    <div className="sg" role="dialog" aria-modal="true" aria-labelledby="sg-h">
      <div className="sg-card">
        <div className="sg-ico" aria-hidden="true">
          <span className="sg-speaker">🔊</span>
          <i className="w1" /><i className="w2" /><i className="w3" />
        </div>
        <h2 id="sg-h">Turn your volume up!</h2>
        <p>Something is about to happen… {icon}</p>
        <button className="sg-ok" autoFocus onClick={() => { unlockAudio(); setOk(true); }}>OK, I'm ready</button>
      </div>
    </div>,
    document.body,
  );
}
