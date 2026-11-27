import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import Gem from "./Gem";

/**
 * The welcome tour, on the real pages: it goes to each page, lights up one spot and explains it in a little
 * speech bubble (Next / Back / Skip). It ends by showing how to pick your picture in the Profile shop.
 */
interface Step { path: string; target: string; title: string; text: ReactNode }

const STEPS: Step[] = [
  { path: "/", target: ".welcome-card .wc-avatar", title: "This is you 👋",
    text: <>Your picture, your rank crest and your level. Climb from Member to Bronze and all the way to Legendary.</> },
  { path: "/", target: ".goal", title: "Your daily goal",
    text: <>Tick the Honor pledge and finish <b>every task</b>: your Honor goes up at midnight. As you climb, tasks get a little harder and new ones appear.</> },
  { path: "/", target: "label.task:not(.pledge)", title: "Tick it after you do it",
    text: <>Do the task first, then tick it. That's your word. Sick or travelling? Tap <b>⋯</b> and give an honest reason.</> },
  { path: "/", target: ".wm-btn", title: "Daily treasure map 🗺️",
    text: <>Finish your tasks and collect a stop each day: <b>+5, +10 … +30 <Gem /></b>, and a mystery chest on Day 7. A new map every Sunday.</> },
  { path: "/leaderboard", target: ".floors .floor", title: "Leaderboard 🏆",
    text: <>Everyone's rank, floor by floor. Fall below Member and you land on the <b>Pillar of Shame</b>.</> },
  { path: "/achievements", target: ".ach-hero", title: "Achievements 🏅",
    text: <>Win medals for streaks, perfect days and more. Each one gives gems, and some unlock pictures and themes.</> },
  { path: "/news", target: ".news-head", title: "Community 🏘️",
    text: <>News from the family, new pictures and tournament winners. Tap ❤️ to like a post.</> },
  { path: "/events", target: ".ev", title: "Events 🎨",
    text: <>Art tournaments: make something, send a photo, and the best three win gems.</> },
  { path: "/profile", target: ".av-tabs", title: "Set your picture 🖼️",
    text: <>This is your <b>Avatar</b> shop. In <b>Pictures</b>, tap one to try it on, then press <b>Wear it</b>. <b>Frames</b> and <b>Themes</b> change your look too. A red dot means something new!</> },
  { path: "/ranks", target: ".bx-hero", title: "Ranks ⭐",
    text: <>What every rank gives you, and the tasks at each rank: game time, make-ups, gems and new looks. Bismillah, let's go!</> },
];

type Box = { top: number; left: number; width: number; height: number };

export default function GuidedTour({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const nav = useNavigate();
  const { pathname } = useLocation();
  const bubble = useRef<HTMLDivElement>(null);
  const lastScroll = useRef(0);
  const [bh, setBh] = useState(160);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  // While the tour runs, pages don't scroll themselves (the Leaderboard's "finding you" animation).
  useEffect(() => {
    document.documentElement.dataset.tour = "on";
    return () => { delete document.documentElement.dataset.tour; };
  }, []);

  // Go to the step's page, wait for its spot to appear, scroll it into view.
  useEffect(() => {
    if (pathname !== step.path) { nav(step.path); return; }
    let tries = 0, alive = true;
    setBox(null);
    const find = () => {
      if (!alive) return;
      const el = document.querySelector(step.target);
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
      if (++tries < 30) window.setTimeout(find, 150);
    };
    find();
    return () => { alive = false; };
  }, [i, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the light on the spot while the page scrolls or moves.
  useEffect(() => {
    let raf = 0;
    const track = () => {
      const el = pathname === step.path ? document.querySelector(step.target) : null;
      if (el) {
        const r = el.getBoundingClientRect();
        // Scrolled away (by a finger or the page itself)? Bring the spot back, so the tour is never lost.
        if ((r.bottom < 40 || r.top > window.innerHeight - 40) && performance.now() - lastScroll.current > 1200) {
          lastScroll.current = performance.now();
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        setBox((b) => (b && Math.abs(b.top - r.top) < .5 && Math.abs(b.left - r.left) < .5 && Math.abs(b.width - r.width) < .5 && Math.abs(b.height - r.height) < .5)
          ? b : { top: r.top, left: r.left, width: r.width, height: r.height });
      }
      raf = requestAnimationFrame(track);
    };
    raf = requestAnimationFrame(track);
    return () => cancelAnimationFrame(raf);
  }, [i, pathname, step]);
  useLayoutEffect(() => { if (bubble.current) setBh(bubble.current.offsetHeight); }, [i, box?.width]);

  const finish = () => { nav("/"); onDone(); };
  const pad = 8, vw = window.innerWidth, vh = window.innerHeight;
  const spot = box ? { top: box.top - pad, left: box.left - pad, width: box.width + pad * 2, height: Math.min(box.height + pad * 2, vh * .6) } : null;
  // The bubble goes below the spot when there's room, otherwise above; never off the screen.
  const bw = Math.min(340, vw - 24);
  let bTop = vh / 2 - bh / 2, bLeft = (vw - bw) / 2, arrow: "up" | "down" | null = null;
  if (spot) {
    const below = spot.top + spot.height + 14, above = spot.top - 14 - bh;
    if (below + bh < vh - 8) { bTop = below; arrow = "up"; } else if (above > 8) { bTop = above; arrow = "down"; } else { bTop = Math.max(8, vh - bh - 12); }
    bLeft = Math.min(Math.max(12, spot.left + spot.width / 2 - bw / 2), vw - bw - 12);
  }
  const arrowX = spot ? Math.min(Math.max(spot.left + spot.width / 2 - bLeft, 22), bw - 22) : bw / 2;

  return createPortal(
    <div className="gt" role="dialog" aria-modal="true" aria-label="Welcome tour">
      <div className="gt-shade" style={spot ? { top: spot.top, left: spot.left, width: spot.width, height: spot.height } : { top: vh / 2, left: vw / 2, width: 0, height: 0 }} />
      <div ref={bubble} className={`gt-bubble${arrow ? ` ${arrow}` : ""}`} style={{ top: bTop, left: bLeft, width: bw, ["--ax" as string]: `${arrowX}px` }} key={i}>
        <div className="gt-head"><b>{step.title}</b><small>{i + 1} / {STEPS.length}</small></div>
        <p>{step.text}</p>
        <div className="gt-nav">
          <button className="gt-skip" onClick={finish}>Skip tour</button>
          <span>
            {i > 0 && <button className="gt-back" onClick={() => setI(i - 1)}>Back</button>}
            <button className="gt-next" onClick={() => (last ? finish() : setI(i + 1))}>{last ? "Let's go!" : "Next"}</button>
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
