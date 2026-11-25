import { useEffect, useRef, useState } from "react";
import type { Profile, Tier } from "../api";
import Avatar from "../lib/Avatar";
import { Particles } from "../lib/particles";

/** Rank order: the higher the rank, the bigger the show. */
const ORDER = ["bronze", "silver", "gold", "platinum", "emerald", "sapphire", "ruby", "diamond", "obsidian", "legendary"];
/** Every rank is a 10-second film in four acts; Legendary is a 15-second epic in five. */
const FILM = 10000, EPIC = 15000;
const ACTS = [0, 2500, 5000, 7500]; // 1 scene · 2 the emblem forms · 3 the reveal · 4 the celebration

type Engine = Particles;
type At = (ms: number, fn: () => void) => void;
type Shake = (n: number) => void;

/** What happens in each rank's film, beyond the act changes. Times are from the start of the film. */
const SCRIPTS: Record<string, (e: Engine, c: string[], at: At, shake: Shake) => void> = {
  // A forge: embers rise, three hammer strikes shape the badge.
  bronze: (e, c, at, shake) => {
    e.burst("star", 60, ["#ffd9a8"]); e.emit("ember", 22, FILM, ["#ff9a3c", "#ffcf7a", "#e0a466"]);
    [2700, 3500, 4300].forEach((t, i) => at(t, () => { e.burst("firework", 50 + i * 20, ["#ffb347", "#ffe0a0", "#fff"], { x: e.cx, y: e.cy + 40 }); shake(1); }));
    at(5000, () => { e.burst("sparkle", 120, c); e.burst("ring", 48, c); });
    at(7500, () => e.emit("confetti", 45, 2500, c));
  },
  // A moonlit night: soft snow, silver mist gathers into the badge.
  silver: (e, c, at) => {
    e.burst("star", 170, ["#ffffff", "#dfe6ee"]); e.emit("crystal", 6, FILM, ["#ffffff", "#dfe6ee"]);
    at(2500, () => e.emit("gold", 70, 2400, c));
    at(5000, () => { e.burst("sparkle", 150, c); e.burst("ring", 48, c); e.burst("streak", 2, ["#fff"]); });
    at(7500, () => { e.emit("confetti", 50, 2500, c); e.emit("streak", 1.2, 2500, ["#fff"]); });
  },
  // Sunrise: the sun climbs, gold coins rain, fireworks.
  gold: (e, c, at) => {
    e.burst("star", 90, ["#fff6d8"]);
    at(2500, () => e.emit("coin", 14, 2500, ["#ffd34d", "#f0c040", "#ffe58a"]));
    at(5000, () => { e.burst("sparkle", 180, c); e.burst("ring", 48, c); e.firework(c); });
    at(5600, () => e.firework(c));
    at(7500, () => { e.emit("coin", 30, 2500, ["#ffd34d", "#f0c040"]); e.emit("confetti", 55, 2500, c); });
    [7700, 8400, 9100].forEach((t) => at(t, () => e.firework(c)));
  },
  // Frost: a snowstorm, ice shards lock together.
  platinum: (e, c, at) => {
    e.emit("crystal", 16, FILM, ["#ffffff", "#dff4fa", "#9fd3e0"]);
    at(2500, () => e.burst("shard", 45, c));
    at(3700, () => e.burst("shard", 45, c));
    at(5000, () => { e.burst("ring", 48, ["#fff", "#cfefff"]); e.burst("sparkle", 170, c); });
    at(7500, () => { e.emit("confetti", 55, 2500, c); e.burst("ring", 48, c); });
    [8000, 8800].forEach((t) => at(t, () => e.firework(c)));
  },
  // A garden: petals drift, a whirl of leaves opens like a flower.
  emerald: (e, c, at) => {
    e.emit("petal", 12, FILM, ["#c8f5df", "#7fe0b0", "#ffe3ef"]);
    at(2500, () => e.burst("leaf", 70, c));
    at(3600, () => e.burst("leaf", 70, c));
    at(5000, () => { e.burst("sparkle", 180, c); e.burst("ring", 48, c); });
    at(7500, () => { e.emit("petal", 40, 2500, c); e.emit("confetti", 45, 2500, c); });
    [7800, 8500, 9200].forEach((t) => at(t, () => e.firework(c)));
  },
  // The ocean at night: rising bubbles, shooting stars, a star-tide pulls in.
  sapphire: (e, c, at) => {
    e.burst("star", 220, ["#ffffff", "#dbe8ff"]); e.emit("bubble", 12, FILM, ["#bfe0ff", "#7fb0ff"]);
    e.emit("streak", 1.4, FILM, ["#ffffff", "#bcd6ff"]);
    at(2500, () => e.emit("gold", 90, 2400, c));
    at(5000, () => { e.burst("sparkle", 200, c); e.burst("ring", 48, c); });
    at(7500, () => e.emit("confetti", 50, 2500, c));
    [7600, 8100, 8600, 9100, 9500].forEach((t) => at(t, () => e.firework(c)));
  },
  // Fire: an ember storm, rings of flame, the ground shakes.
  ruby: (e, c, at, shake) => {
    e.emit("ember", 55, FILM, ["#ff5a36", "#ffb36b", "#ff8fa8"]);
    [2600, 3500, 4400].forEach((t) => at(t, () => { e.burst("ring", 48, ["#ff5a36", "#ffb36b"]); shake(1); }));
    at(5000, () => { e.burst("sparkle", 220, c); shake(2); });
    at(7500, () => e.emit("confetti", 65, 2500, c));
    [7600, 8000, 8400, 8800, 9200, 9600].forEach((t) => at(t, () => e.firework(c)));
  },
  // A crystal cave: glints, shards fly in twice, a rainbow explosion.
  diamond: (e, c, at, shake) => {
    e.burst("star", 160, ["#ffffff", "#e6f8ff"]); e.emit("crystal", 9, FILM, c);
    at(2500, () => e.burst("shard", 60, c));
    at(3800, () => { e.burst("shard", 70, c); shake(1); });
    at(5000, () => { e.burst("sparkle", 260, c); e.burst("ring", 48, c); shake(2); });
    at(5400, () => e.burst("ring", 48, ["#ffe9a8", "#f0d9ff"]));
    at(7500, () => e.emit("confetti", 70, 2500, c));
    [7600, 7950, 8300, 8650, 9000, 9350, 9700].forEach((t) => at(t, () => e.firework(c)));
  },
  // The void: a lightning storm, a vortex swallows the light, the badge bursts out of the dark.
  obsidian: (e, c, at, shake) => {
    e.burst("star", 200, ["#e3d8ff", "#ffffff"]);
    for (let i = 0; i < 14; i++) at(200 + i * 340 + (i % 3) * 90, () => e.lightning());
    at(2500, () => e.emit("gold", 160, 2400, c));
    at(4300, () => shake(2));
    at(5000, () => { e.burst("shard", 80, c); e.burst("sparkle", 280, [...c, "#ffd24a"]); e.burst("ring", 48, ["#b69cff", "#ffd24a"]); shake(2); });
    at(7500, () => e.emit("confetti", 75, 2500, [...c, "#ffd24a"]));
    for (let i = 0; i < 8; i++) at(7600 + i * 300, () => e.firework([...c, "#ffd24a", "#ffffff"]));
    [7800, 8700, 9500].forEach((t) => at(t, () => e.lightning()));
  },
};

const PALETTE: Record<string, string[]> = {
  bronze: ["#e0a466", "#b0703a", "#fff1dc"], silver: ["#f4f6f8", "#b9c4ce", "#8a97a3"], gold: ["#ffe58a", "#f0c040", "#d4a017", "#fff"],
  platinum: ["#e8f6fa", "#9fd3e0", "#ffffff"], emerald: ["#7fe0b0", "#1e9e6a", "#c8f5df"], sapphire: ["#7fb0ff", "#1f5fbf", "#dbe8ff", "#fff"],
  ruby: ["#ff8fa8", "#c0294a", "#ffb36b", "#ff5a36"], diamond: ["#b9f2ff", "#f0d9ff", "#ffffff", "#c9e7ff", "#ffe9a8"],
  obsidian: ["#b69cff", "#7d5fd0", "#e3d8ff", "#3a2c52"], legendary: ["#ffd24a", "#fff2b8", "#c99a1e", "#ffffff", "#ff9f1a"],
};

export interface RankUpProps {
  tier: Tier;
  name: string;
  profile: Profile | null; // for the unlocked frame/theme previews and the gem total
  reward: number; // gems received for the climb
  onClose: () => void;
}

function Emblem({ tier }: { tier: Tier }) {
  return (
    <div className="ru-emblem">
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
        <defs>
          <linearGradient id="ru-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".7" />
            <stop offset=".4" stopColor={tier.color} />
            <stop offset="1" stopColor={tier.color} stopOpacity=".8" />
          </linearGradient>
        </defs>
        <polygon points="50,3 93,26 93,74 50,97 7,74 7,26" fill="url(#ru-g)" stroke="#fff" strokeWidth="4" />
        <polygon points="50,12 84,31 50,50 16,31" fill="#fff" opacity=".25" />
      </svg>
      <span className="ru-emoji">{tier.emoji}</span>
      <span className="ru-shine" />
    </div>
  );
}

/** Gold eight-pointed stars that draw themselves (Legendary, act 2). */
function DrawnPattern() {
  const stars = [];
  for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) {
    const cx = 60 + x * 120 + (y % 2) * 60, cy = 60 + y * 120;
    stars.push(<g key={`${x}-${y}`} transform={`translate(${cx} ${cy})`} style={{ animationDelay: `${(x + y) * 90}ms` }}>
      <rect x="-34" y="-34" width="68" height="68" /><rect x="-34" y="-34" width="68" height="68" transform="rotate(45)" /><circle r="18" />
    </g>);
  }
  return <svg className="ru-drawn" viewBox="0 0 760 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">{stars}</svg>;
}

export default function RankUp({ tier, name, profile, reward, onClose }: RankUpProps) {
  const idx = Math.max(0, ORDER.indexOf(tier.key));
  const lvl = idx + 1;
  const legendary = tier.key === "legendary";
  const colors = PALETTE[tier.key] ?? [tier.color, "#fff"];
  const [stage, setStage] = useState<"show" | "benefits" | "gems">("show");
  const [act, setAct] = useState(0);
  const [ready, setReady] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [shake, setShake] = useState(0);
  const [gemCount, setGemCount] = useState(0);
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

  // The film: act changes plus each rank's own script.
  const timers = useRef<number[]>([]);
  useEffect(() => {
    if (stage !== "show") return;
    if (reduced) { setReady(true); setAct(legendary ? 5 : 4); return; }
    const e = engine.current!;
    const ts = timers.current;
    const at: At = (ms, fn) => { ts.push(window.setTimeout(fn, ms)); };
    const doShake: Shake = (n) => { setShake(n); at(600, () => setShake(0)); };

    if (!legendary) {
      ACTS.forEach((t, i) => at(t, () => setAct(i + 1)));
      SCRIPTS[tier.key]?.(e, colors, at, doShake);
      at(FILM, () => setReady(true));
    } else {
      // Legendary: a 15-second show in five acts.
      setAct(1);
      e.burst("star", 260, ["#ffffff", "#ffe9a8"]);
      at(3000, () => setAct(2));
      at(6000, () => { setAct(3); e.emit("gold", 140, 3000, colors); });
      at(8600, () => e.burst("shard", 80, colors));
      at(9000, () => { setAct(4); doShake(2); e.burst("sparkle", 260, colors); });
      for (let i = 0; i < 9; i++) at(9400 + i * 180, () => e.burst("sparkle", 20, colors));
      at(12000, () => { setAct(5); e.emit("confetti", 120, 3000, colors); });
      for (let i = 0; i < 9; i++) at(12000 + i * 330, () => e.firework(colors));
      at(EPIC, () => setReady(true));
    }
    return () => { ts.forEach(clearTimeout); ts.length = 0; };
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Skip straight to the end of the film. */
  const skip = () => {
    timers.current.forEach(clearTimeout);
    timers.current.length = 0;
    engine.current?.calm();
    setShake(0);
    setAct(legendary ? 5 : 4);
    setReady(true);
  };

  // Gems count up, with gems flying out.
  useEffect(() => {
    if (stage !== "gems") return;
    if (reduced) { setGemCount(reward); return; }
    engine.current?.burst("gem", 60, ["#7fb0ff", "#b9f2ff", "#4dc3ff", "#ffffff"]);
    const start = performance.now(), len = 1400;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / len);
      setGemCount(Math.round(reward * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [stage, reward, reduced]);

  const frame = profile?.frames.find((f) => f.tier?.key === tier.key);
  const theme = profile?.themes.find((t) => t.tier?.key === tier.key);
  const letters = (legendary ? "LEGENDARY" : tier.name.toUpperCase()).split("");

  return (
    <div className={`rankup ru-${tier.key} lvl-${lvl}${legendary ? "" : " film"} act-${act}${skipped ? " skipped" : ""}${shake ? ` shake-${shake}` : ""}`}
      style={{ ["--tc" as string]: tier.color }} role="dialog" aria-modal="true" aria-label={`New rank: ${tier.name}`}>
      <div className="ru-bg" />
      <div className="ru-pattern" />
      {!legendary && <div className="ru-scene" aria-hidden="true"><i /><b /></div>}
      {lvl >= 3 && <div className="ru-rays" />}
      {lvl >= 8 && <div className="ru-prism" />}
      {lvl >= 6 && <div className="ru-beam" />}
      {legendary && <DrawnPattern />}
      {legendary && <div className="ru-arch" />}
      <div className="ru-rings">{Array.from({ length: Math.min(4, 2 + Math.floor(lvl / 4)) }, (_, i) => <i key={i} style={{ animationDelay: `${0.5 + i * 0.35}s` }} />)}</div>
      <div className="ru-flash" />
      <canvas ref={canvas} className="ru-canvas" />

      {stage === "show" && (
        <div className="ru-stage">
          {legendary && <div className="ru-crown" aria-hidden="true">👑</div>}
          {!legendary && <Emblem tier={tier} />}
          <p className="ru-kicker">{legendary ? "The highest honor" : "Rank up!"}</p>
          <h1 className="ru-name" aria-label={legendary ? "Legendary" : tier.name}>
            {letters.map((ch, i) => <span key={i} style={{ animationDelay: `${(legendary ? 9.2 : 5.15) + i * (legendary ? 0.16 : 0.08)}s` }}>{ch}</span>)}
          </h1>
          <p className="ru-who">{name} · {tier.range}</p>
          <button className={`ru-honor${ready ? " show" : ""}`} disabled={!ready} onClick={() => setStage("benefits")}>For Honor ⚔️</button>
          {!ready && <button className="ru-skip" onClick={() => { setSkipped(true); skip(); }}>Skip</button>}
        </div>
      )}

      {stage === "benefits" && (
        <div className="ru-panel">
          <p className="ru-kicker dark">Your new rank</p>
          <h2>{tier.emoji} {tier.name}</h2>
          <div className="ru-perks">
            <div><span>🎮</span><b>Game / YouTube</b><p>{tier.games}</p></div>
            <div><span>🔁</span><b>Benefits</b><p>{tier.benefits}</p></div>
          </div>
          {(frame || theme) && (
            <div className="ru-unlocks">
              <b>Unlocked</b>
              <div className="ru-unlock-row">
                {frame && <span className="unlock"><Avatar avatar={profile?.member.avatar} color={tier.color} frame={frame.key} size={44} /> {frame.name} frame</span>}
                {theme && <span className="unlock"><span className="swatch-dot" style={{ background: tier.color }} /> {theme.name} theme</span>}
              </div>
            </div>
          )}
          <button className="ru-honor show" onClick={() => setStage("gems")}>Collect rewards 💎</button>
        </div>
      )}

      {stage === "gems" && (
        <div className="ru-panel gems">
          <div className="ru-gem">💎</div>
          <div className="ru-gemcount">+{gemCount}</div>
          <p className="ru-kicker dark">gems for reaching {tier.name}</p>
          {profile && <p className="note">You now have {profile.gems.balance} 💎. Spend them in your Profile's shop.</p>}
          <button className="ru-honor show" onClick={onClose}>Awesome! 🎉</button>
        </div>
      )}
    </div>
  );
}
