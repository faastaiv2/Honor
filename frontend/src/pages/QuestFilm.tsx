import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Gem from "../lib/Gem";
import GemReward from "../lib/GemReward";
import Medal from "../lib/Medal";
import RankIcon from "../lib/RankIcon";
import { notifyChanged } from "../lib/events";
import { Particles } from "../lib/particles";
import { playQuestMusic, preloadQuestMusic, stopQuestMusic } from "../lib/questMusic";
import { preloadCrack } from "../lib/questMusic";
import { preloadSound, scheduleSound } from "../lib/sounds";

/**
 * The film for the greatest choice in the app: giving up Obsidian to start the Legendary quest.
 * A prologue and seven acts (about 35 seconds) with the quest music, then the "To Be a Legend" achievement.
 */
const PURPLE = ["#b69cff", "#7d5fd0", "#e3d8ff", "#ffffff"];
const GOLDS = ["#ffd24a", "#fff2b8", "#c99a1e", "#ffffff", "#ff9f1a"];
const BRONZE = ["#e0a466", "#f6c896", "#b0703a", "#fff1dc"];
const TITLE = "THE LEGENDARY QUEST";

export default function QuestFilm({ name, onClose, preview = false }: { name: string; onClose: () => void; preview?: boolean }) {
  const [act, setAct] = useState(0);
  const [needTap, setNeedTap] = useState(false);
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

  // The music: fades in with the film, plays on through the award, fades out when it closes.
  useEffect(() => {
    let live = true;
    playQuestMusic().then((ok) => {
      if (!live) return;
      if (!ok) preloadQuestMusic().then((m) => live && m && setNeedTap(true)); // the browser blocked sound: offer a tap
    });
    return () => { live = false; stopQuestMusic(1500); };
  }, []);

  useEffect(() => {
    if (reduced) { setAct(7); setStage("medal"); return; }
    const e = engine.current!;
    const ts: number[] = [];
    const at = (ms: number, fn: () => void) => ts.push(window.setTimeout(fn, ms));
    const quake = (n: number) => { setShake(n); at(650, () => setShake(0)); };
    void preloadCrack();
    void preloadSound("quest-thunder");

    // Prologue (0s): darkness, slow stars, two lines.
    e.burst("star", 160, ["#ffffff", "#e3d8ff"]);
    at(1500, () => e.burst("star", 120, ["#ffffff", "#c8b8ff"]));
    // Act 1 (4.5s): the summit. Obsidian rises over the mountain.
    at(4500, () => { setAct(1); e.burst("star", 200, ["#ffffff", "#e3d8ff"]); e.emit("ember", 14, 4500, PURPLE); });
    at(5600, () => e.burst("ring", 36, PURPLE));
    // Act 2 (9s): the choice. The storm gathers; lightning cracks the crest.
    at(9000, () => setAct(2));
    [9200, 9900, 10500, 11000, 11500, 11900, 12300, 12600].forEach((t) => at(t, () => e.lightning()));
    const t0 = performance.now(), elapsed = () => performance.now() - t0;
    [9200, 11500].forEach((t) => void scheduleSound("quest-thunder", t, elapsed)); // the first strike and the biggest (+ the parent's timing)
    void scheduleSound("quest-crack", 13000, elapsed);
    at(10200, () => quake(1));
    at(11800, () => quake(1));
    // Act 3 (13s): it shatters.
    at(13000, () => { setAct(3); quake(2); e.burst("ring", 60, PURPLE); e.burst("sparkle", 320, PURPLE); e.burst("firework", 140, PURPLE, { x: e.cx, y: e.cy }); });
    at(13300, () => e.burst("ring", 60, ["#ffffff", "#b69cff"]));
    // Act 4 (15.2s): the fall. Bronze I rises from the embers.
    at(15200, () => { setAct(4); e.emit("ember", 34, 4000, BRONZE); e.burst("crystal", 60, PURPLE); });
    at(16400, () => e.burst("ring", 30, BRONZE));
    // Act 5 (19.6s): the road. Fifty levels of light climb to the Legendary crest.
    at(19600, () => { setAct(5); e.emit("gold", 120, 4600, GOLDS); e.emit("streak", 3, 4600, ["#fff2b8"]); });
    // Act 6 (24.6s): the ascension. The crest descends in a storm of gold.
    at(24600, () => { setAct(6); quake(1); e.burst("ring", 60, GOLDS); e.burst("sparkle", 260, GOLDS); e.emit("gold", 160, 3600, GOLDS); });
    at(25400, () => e.burst("ring", 60, ["#ffffff", "#ffd24a"]));
    // Act 7 (28.6s): the oath. The title, gold fire and fireworks.
    at(28600, () => { setAct(7); quake(2); e.burst("sparkle", 360, GOLDS); e.burst("ring", 60, GOLDS); e.emit("confetti", 140, 5600, GOLDS); });
    for (let i = 0; i < 16; i++) at(28800 + i * 340, () => e.firework(i % 3 ? GOLDS : ["#ffffff", "#b69cff", "#ffd24a"]));
    at(35000, () => setStage("medal"));
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
      <div className="qf-rays" aria-hidden="true" />
      <svg className="qf-peak" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 120 L60 70 L95 88 L150 40 L200 6 L250 40 L300 82 L340 60 L400 96 V120 Z" />
        <path className="qf-peak-snow" d="M178 22 L200 6 L222 22 L212 20 L204 28 L196 20 Z" />
      </svg>
      {preview && <p className="film-preview">Preview only · nothing changes</p>}
      {needTap && (
        <button className="qf-sound" onClick={() => { void playQuestMusic().then((ok) => ok && setNeedTap(false)); }}>🔊 Tap for music</button>
      )}

      {stage === "film" && (
        <div className="qf-stage" aria-live="polite">
          <div className="qf-crest qf-obsidian" aria-hidden="true">
            <span className="qf-half left"><RankIcon rank="obsidian" className="ru-crest" /></span>
            <span className="qf-half right"><RankIcon rank="obsidian" className="ru-crest" /></span>
            <svg className="qf-cracks" viewBox="0 0 100 100"><path d="M50 8 L46 30 L55 42 L44 58 L52 72 L48 94" /><path d="M46 30 L30 36 M55 42 L72 46 M44 58 L28 66" /></svg>
          </div>
          <div className="qf-crest qf-bronze" aria-hidden="true"><RankIcon rank="bronze" className="ru-crest" /></div>
          <div className="qf-crest qf-legend" aria-hidden="true"><RankIcon rank="legendary" className="ru-crest" /></div>

          <p className="qf-pro p1">Some choose comfort.</p>
          <p className="qf-pro p2">A few choose <b>legend</b>.</p>
          <div className="qf-levels" aria-hidden="true">
            {["I", "V", "X", "XV", "XX", "XXV", "XXX", "XXXV", "XL", "XLV", "L"].map((n, i) => (
              <span key={n} style={{ bottom: `${6 + i * 7.2}%`, fontSize: `${30 - i * 1.7}px`, animationDelay: `${0.3 + i * 0.32}s` }}>{n}</span>
            ))}
          </div>
          <p className="qf-line l1">{name}, you stand at the summit: <b>Obsidian · XLIX</b></p>
          <p className="qf-line l2">…and you give it all up.</p>
          <p className="qf-line l3">Back to <b>Bronze I</b>.</p>
          <p className="qf-line l5">Fifty levels. Every task. Every bonus. <b>Every day.</b></p>
          <p className="qf-line l4">The road to Legend begins.</p>
          <div className="qf-title" aria-label={TITLE}>
            {TITLE.split("").map((ch, i) => <span key={i} style={{ animationDelay: `${0.25 + i * 0.07}s` }}>{ch === " " ? " " : ch}</span>)}
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

      {stage === "gems" && <GemReward amount={reward} chest jewel="#ffd24a" title={preview ? "To Be a Legend · preview" : "To Be a Legend"} onDone={onClose} />}
    </div>
  );
}
