import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Gem from "../lib/Gem";
import GemReward from "../lib/GemReward";
import Medal from "../lib/Medal";
import RankIcon from "../lib/RankIcon";
import { notifyChanged } from "../lib/events";
import { Particles } from "../lib/particles";

/**
 * The film for the greatest choice in the app: giving up Obsidian to start the Legendary quest.
 * Five acts (about 15 seconds), then the "To Be a Legend" achievement and its 500 gems.
 */
const PURPLE = ["#b69cff", "#7d5fd0", "#e3d8ff", "#ffffff"];
const GOLDS = ["#ffd24a", "#fff2b8", "#c99a1e", "#ffffff", "#ff9f1a"];
const BRONZE = ["#e0a466", "#f6c896", "#b0703a", "#fff1dc"];
const TITLE = "THE LEGENDARY QUEST";

export default function QuestFilm({ name, onClose, preview = false }: { name: string; onClose: () => void; preview?: boolean }) {
  const [act, setAct] = useState(1);
  const [stage, setStage] = useState<"film" | "medal" | "gems">("film");
  const [shake, setShake] = useState(0);
  const [reward, setReward] = useState(500);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Particles | null>(null);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const e = new Particles(c);
    engine.current = e;
    const onResize = () => e.resize();
    window.addEventListener("resize", onResize);
    if (!reduced) e.start();
    return () => { e.stop(); window.removeEventListener("resize", onResize); };
  }, [reduced]);

  useEffect(() => {
    if (reduced) { setAct(5); setStage("medal"); return; }
    const e = engine.current!;
    const ts: number[] = [];
    const at = (ms: number, fn: () => void) => ts.push(window.setTimeout(fn, ms));
    const quake = (n: number) => { setShake(n); at(650, () => setShake(0)); };

    // Act 1: the summit. Obsidian glows in a dark sky.
    e.burst("star", 240, ["#ffffff", "#e3d8ff"]);
    e.emit("ember", 14, 3000, PURPLE);
    // Act 2: the choice. Lightning cracks the crest and it shatters.
    at(3000, () => setAct(2));
    [3100, 3500, 3800, 4200, 4500].forEach((t) => at(t, () => e.lightning()));
    at(3600, () => quake(1));
    at(4800, () => { setAct(3); quake(2); e.burst("ring", 48, PURPLE); e.burst("sparkle", 260, PURPLE); e.burst("firework", 120, PURPLE, { x: e.cx, y: e.cy }); });
    at(5100, () => e.burst("ring", 48, ["#ffffff", "#b69cff"]));
    // Act 3: the fall. Back to Bronze I.
    at(6300, () => { setAct(4); e.emit("ember", 30, 2400, BRONZE); });
    // Act 4: the road. A path of light to the Legendary crest.
    at(8700, () => { setAct(5); e.emit("gold", 150, 2200, GOLDS); e.emit("streak", 3, 2200, ["#fff2b8"]); });
    // Act 5: the oath. The title, gold fire and fireworks.
    at(11100, () => { setAct(6); quake(2); e.burst("sparkle", 320, GOLDS); e.burst("ring", 48, GOLDS); e.emit("confetti", 120, 3200, GOLDS); });
    for (let i = 0; i < 10; i++) at(11300 + i * 330, () => e.firework(GOLDS));
    at(15000, () => setStage("medal"));
    return () => ts.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (stage === "medal") engine.current?.burst("sparkle", 160, GOLDS);
  }, [stage]);

  async function claim() {
    if (preview) { setStage("gems"); return; }
    try {
      const data = await api.claimAchievement("quest");
      const q = data.items.find((x) => x.key === "quest");
      if (q) setReward(q.gems);
      notifyChanged();
    } catch { /* already collected: still show the moment */ }
    setStage("gems");
  }

  return (
    <div className={`rankup qf qf-act-${act} qf-${stage}${shake ? ` shake-${shake}` : ""}`} role="dialog" aria-modal="true" aria-label="The Legendary quest begins">
      <div className="qf-sky" />
      <div className="qf-road" aria-hidden="true" />
      <div className="qf-beam" aria-hidden="true" />
      <canvas ref={canvas} className="ru-canvas" />
      <div className="ru-flash qf-flash" />
      {preview && <p className="film-preview">Preview only · nothing changes</p>}

      {stage === "film" && (
        <div className="qf-stage" aria-live="polite">
          <div className="qf-crest qf-obsidian" aria-hidden="true">
            <span className="qf-half left"><RankIcon rank="obsidian" className="ru-crest" /></span>
            <span className="qf-half right"><RankIcon rank="obsidian" className="ru-crest" /></span>
            <svg className="qf-cracks" viewBox="0 0 100 100"><path d="M50 8 L46 30 L55 42 L44 58 L52 72 L48 94" /><path d="M46 30 L30 36 M55 42 L72 46 M44 58 L28 66" /></svg>
          </div>
          <div className="qf-crest qf-bronze" aria-hidden="true"><RankIcon rank="bronze" className="ru-crest" /></div>
          <div className="qf-crest qf-legend" aria-hidden="true"><RankIcon rank="legendary" className="ru-crest" /></div>

          <p className="qf-line l1">{name}, you stand at the summit: <b>Obsidian · XLIX</b></p>
          <p className="qf-line l2">…and you give it all up.</p>
          <p className="qf-line l3">Back to <b>Bronze I</b>.</p>
          <p className="qf-line l4">The road to Legend begins.</p>
          <div className="qf-title" aria-label={TITLE}>
            {TITLE.split("").map((ch, i) => <span key={i} style={{ animationDelay: `${11.2 + i * 0.06}s` }}>{ch === " " ? " " : ch}</span>)}
          </div>
          <p className="qf-oath">Every task · every bonus · every day · until <b>L</b></p>
        </div>
      )}

      {stage === "medal" && (
        <div className="qf-award">
          <p className="qf-award-kicker">Achievement unlocked</p>
          <div className="qf-medal"><Medal icon="crest:legendary" tier="legend" size={150} /></div>
          <h2>To Be a Legend</h2>
          <p className="qf-award-text">You gave up Obsidian and chose the hardest road. The greatest achievement of all.</p>
          <button className="ru-collect qf-claim" onClick={claim}>
            <span className="ru-collect-gem"><Gem size={34} /></span>
            <span className="ru-collect-text"><b>Claim {reward} gems</b><small>The biggest reward in Honor</small></span>
            <span className="ru-collect-shine" aria-hidden="true" />
          </button>
        </div>
      )}

      {stage === "gems" && <GemReward amount={reward} chest title={preview ? "To Be a Legend · preview" : "To Be a Legend"} onDone={onClose} />}
    </div>
  );
}
