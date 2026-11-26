import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Cauliflower } from "./GobiGame";
import { playSound, preloadSound } from "./sounds";

/**
 * For the person who was hit: a cauliflower flies at the screen and SPLATS on it. Mushy bits stick to the
 * "glass" and slowly drip down, then it all wipes away. Lasts 10 seconds and closes by itself.
 */
const LENGTH = 10_000;

export default function GobiSplat({ by, onDone }: { by: string[]; onDone: () => void }) {
  const [phase, setPhase] = useState<"wait" | "fly" | "splat" | "fade">("wait");
  useEffect(() => {
    // Get the splat sound ready first (at most a second and a half), so it lands exactly with the cauliflower.
    let live = true;
    const t: number[] = [];
    const go = () => {
      if (!live || t.length) return;
      setPhase("fly");
      t.push(
        window.setTimeout(() => { setPhase("splat"); void playSound("gobi-splat"); }, 850),
        window.setTimeout(() => setPhase("fade"), LENGTH - 1200),
        window.setTimeout(onDone, LENGTH),
      );
    };
    preloadSound("gobi-splat").finally(go);
    const fallback = window.setTimeout(go, 1500);
    return () => { live = false; clearTimeout(fallback); t.forEach(clearTimeout); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const who = by.length > 2 ? `${by.slice(0, -1).join(", ")} and ${by[by.length - 1]}` : by.join(" and ");
  return createPortal(
    <div className={`gs gs-${phase}`} role="alert" aria-label={`${who} hit you with a gobi`}>
      {phase === "fly" && (
        <svg className="gs-fly" viewBox="-60 -60 120 120" aria-hidden="true"><Cauliflower size={56} /></svg>
      )}
      {(phase === "splat" || phase === "fade") && <>
        <svg className="gs-mush" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <radialGradient id="gs-m" cx="45%" cy="40%"><stop offset="0" stopColor="#fffdf2" /><stop offset=".6" stopColor="#f6edcf" /><stop offset="1" stopColor="#e2d4a6" /></radialGradient>
          </defs>
          {/* the big splat */}
          <path className="gs-blob" fill="url(#gs-m)" stroke="#d8c890" strokeWidth="2"
            d="M200 70 C230 60 240 100 262 92 C292 80 300 120 322 128 C356 140 330 172 346 192 C366 220 330 236 334 262 C338 296 296 292 282 318
               C266 346 238 322 214 340 C188 358 170 326 146 330 C112 336 112 300 90 290 C58 276 82 246 66 226 C46 198 80 186 76 160
               C72 128 108 130 120 108 C134 82 168 100 182 84 C188 76 194 72 200 70Z" />
          {/* florets stuck in the mush */}
          {[[170, 160, 22], [222, 150, 26], [196, 200, 30], [150, 220, 20], [250, 214, 22], [210, 258, 20], [270, 170, 16], [130, 180, 14]].map(([x, y, r], i) => (
            <g key={i} className="gs-floret" style={{ animationDelay: `${i * 30}ms` }}>
              <circle cx={x} cy={y} r={r} fill="#fffbea" stroke="#e0d2a0" strokeWidth="1.5" />
              <circle cx={x - r * .3} cy={y - r * .3} r={r * .35} fill="#fff" opacity=".7" />
            </g>
          ))}
          {/* a couple of green leaf bits */}
          <path d="M120 120 q-30 -10 -24 -36 q20 6 24 36z M300 300 q30 6 30 30 q-24 -2 -30 -30z" fill="#4caf50" stroke="#2e7d32" strokeWidth="1.5" className="gs-floret" />
          {/* flying chunks */}
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2, d = 150 + (i % 4) * 30;
            return <circle key={i} className="gs-chunk" cx="200" cy="200" r={6 + (i % 3) * 4} fill={i % 3 ? "#fffbea" : "#f1e7c4"}
              style={{ ["--x" as string]: `${Math.cos(a) * d}px`, ["--y" as string]: `${Math.sin(a) * d}px` }} />;
          })}
          {/* drips sliding down */}
          {[[150, 300], [205, 330], [262, 310], [300, 250], [104, 270]].map(([x, y], i) => (
            <path key={i} className="gs-drip" style={{ animationDelay: `${1 + i * 0.5}s` }} d={`M${x - 6} ${y} q6 -8 12 0 v40 a6 6 0 0 1 -12 0z`} fill="#f4ead0" stroke="#dccb94" strokeWidth="1" />
          ))}
        </svg>
        <div className="gs-text">
          <b>SPLAT! 🥦</b>
          <span>{who} hit you with a gobi!</span>
          <small>Finish all your tasks to get off the Pillar of Shame.</small>
        </div>
      </>}
    </div>,
    document.body,
  );
}
