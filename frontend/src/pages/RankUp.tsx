import { useEffect, useRef, useState } from "react";
import Gem from "../lib/Gem";
import GemReward from "../lib/GemReward";
import Brazier from "../lib/Brazier";
import type { Profile, Tier } from "../api";
import Avatar from "../lib/Avatar";
import RankIcon from "../lib/RankIcon";
import ThemePreview from "../lib/ThemePreview";
import { api } from "../api";
import { notifyChanged } from "../lib/events";
import { Particles } from "../lib/particles";
import { firstSet, playMusic, stopMusic } from "../lib/sounds";
import type { SoundKey } from "../api";

/** Rank order: the higher the rank, the bigger the show. */
const ORDER = ["bronze", "silver", "gold", "platinum", "emerald", "sapphire", "ruby", "diamond", "obsidian", "legendary"];
/** Every rank is a 10-second film in four acts; Legendary is a 15-second epic in five. */
const FILM = 10000, EPIC = 19000;
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
  // A silver night: soft snow, silver mist gathers into the badge.
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
      <RankIcon rank={tier.key} className="ru-crest" />
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
  // The rank-up music (set on the Animations page) plays through the whole show.
  useEffect(() => {
    let key: SoundKey | null = null, live = true;
    void firstSet([`rankup-music-${tier.key}` as SoundKey, "rankup-music"]).then((k) => {  // this rank's own music, else the general one
      if (!live || !k) return;
      key = k;
      void playMusic(k);
    });
    return () => { live = false; if (key) stopMusic(key, 1500); };
  }, [tier.key]);
  const idx = Math.max(0, ORDER.indexOf(tier.key));
  const lvl = idx + 1;
  const legendary = tier.key === "legendary";
  const colors = PALETTE[tier.key] ?? [tier.color, "#fff"];
  const [stage, setStage] = useState<"show" | "benefits" | "gems">("show");
  const [act, setAct] = useState(0);
  const [ready, setReady] = useState(false);
  const [shake, setShake] = useState(0);
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
      // Legendary: a 19-second show in five acts. The heartbeat in the dark · golden stars draw themselves and
      // pillars of light fall · the crown descends · a flash: the world turns gold ·
      // the celebration (fireworks). From act 4 on the background stays gold.
      setAct(1);
      e.burst("star", 260, ["#ffffff", "#ffe9a8"]);
      at(1800, () => e.burst("star", 120, ["#ffe9a8", "#ffd24a"]));
      at(3500, () => setAct(2));
      at(5200, () => e.emit("gold", 60, 1800, colors));
      at(7000, () => { setAct(3); e.emit("gold", 160, 3400, colors); });
      at(8600, () => doShake(1));
      at(9900, () => e.burst("shard", 90, colors));
      at(10500, () => { setAct(4); doShake(2); e.burst("sparkle", 300, colors); });
      for (let i = 0; i < 12; i++) at(10900 + i * 170, () => e.burst("sparkle", 22, colors));
      at(13500, () => { setAct(5); e.emit("confetti", 140, 3500, colors); });
      for (let i = 0; i < 14; i++) at(13500 + i * 360, () => e.firework(colors));
      at(EPIC, () => setReady(true));
    }
    return () => { ts.forEach(clearTimeout); ts.length = 0; };
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // The rewards appear one by one, each with a little sparkle.
  useEffect(() => {
    if (stage !== "benefits" || reduced) return;
    const ts = [150, 450, 750, 1050, 1200, 1500].map((t) => window.setTimeout(() => engine.current?.burst("sparkle", 26, colors), t + 250));
    return () => ts.forEach(clearTimeout);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps


  const frameKey = tier.key === "legendary" ? "crown" : tier.key;
  const frameName = profile?.frames.find((f) => f.key === frameKey)?.name ?? `${tier.name} frame`;
  const themeName = profile?.themes.find((t) => t.key === tier.key)?.name ?? `${tier.name} theme`;
  const [used, setUsed] = useState({ frame: false, theme: false });
  const use = async (kind: "frame" | "theme", key: string) => {
    try {
      await api.saveProfile({ [kind]: key });
      if (kind === "theme") document.documentElement.dataset.skin = key;
      setUsed((u) => ({ ...u, [kind]: true }));
      engine.current?.burst("sparkle", 60, colors);
      notifyChanged();
    } catch { /* keep the show going */ }
  };
  const letters = (legendary ? "LEGENDARY" : tier.name.toUpperCase()).split("");

  return (
    <div className={`rankup ru-${tier.key} lvl-${lvl}${legendary ? "" : " film"} act-${act}${shake ? ` shake-${shake}` : ""}`}
      style={{ ["--tc" as string]: tier.color }} role="dialog" aria-modal="true" aria-label={`New rank: ${tier.name}`}>
      <div className="ru-bg" />
      <div className="ru-pattern" />
      {!legendary && <div className="ru-scene" aria-hidden="true"><i /><b /></div>}
      {lvl >= 3 && <div className="ru-rays" />}
      {lvl >= 8 && <div className="ru-prism" />}
      {lvl >= 6 && <div className="ru-beam" />}
      {legendary && <DrawnPattern />}
      {legendary && <div className="ru-arch" />}
      {legendary && <div className="ru-goldsky" aria-hidden="true" />}
      {legendary && <div className="ru-pillars" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div>}
      <div className="ru-rings">{Array.from({ length: Math.min(4, 2 + Math.floor(lvl / 4)) }, (_, i) => <i key={i} style={{ animationDelay: `${0.5 + i * 0.35}s` }} />)}</div>
      <div className="ru-flash" />
      <canvas ref={canvas} className="ru-canvas" />
      {name === "Preview" && <p className="film-preview">Preview only · nothing changes</p>}

      {stage === "show" && (
        <div className="ru-stage">
          {legendary && (
            <div className="ru-crown-wrap" aria-hidden="true">
              <div className="ru-crown"><RankIcon rank="legendary" className="ru-crest" /></div>
            </div>
          )}
          {!legendary && <Emblem tier={tier} />}
          <p className="ru-kicker">{legendary ? "The highest honor" : "Rank up!"}</p>
          <h1 className="ru-name" aria-label={legendary ? "Legendary" : tier.name}>
            {letters.map((ch, i) => <span key={i} style={{ animationDelay: `${(legendary ? 10.8 : 5.15) + i * (legendary ? 0.16 : 0.08)}s` }}>{ch}</span>)}
          </h1>
          <p className="ru-who">{name} · {tier.range}</p>
          <button className={`ru-honor${ready ? " show" : ""}`} disabled={!ready} onClick={() => setStage("benefits")}>For Honor ⚔️</button>
        </div>
      )}

      {stage === "benefits" && (
        <div className="ru-panel ru-rewards">
          <div className="ru-rw-crest"><RankIcon rank={tier.key} size={92} /></div>
          <p className="ru-kicker dark">You reached</p>
          <h2>{tier.name}</h2>
          <p className="ru-rw-sub">Here's everything you unlocked</p>
          <div className="ru-rw-grid">
            <div className="ru-rw-card" style={{ animationDelay: "0.15s" }}>
              <span className="ru-rw-tag">New frame</span>
              <div className="ru-rw-show"><Avatar avatar={profile?.member.avatar} color={tier.color} frame={frameKey} size={70} /></div>
              <b>{frameName}</b>
              {profile && (used.frame ? <span className="ru-rw-used">Wearing it ✓</span>
                : <button className="ru-rw-use" onClick={() => use("frame", frameKey)}>Wear it</button>)}
            </div>
            <div className="ru-rw-card" style={{ animationDelay: "0.45s" }}>
              <span className="ru-rw-tag">New theme</span>
              <div className="ru-rw-show"><ThemePreview k={tier.key} /></div>
              <b>{themeName}</b>
              {profile && (used.theme ? <span className="ru-rw-used">Using it ✓</span>
                : <button className="ru-rw-use" onClick={() => use("theme", tier.key)}>Use it</button>)}
            </div>
            <div className="ru-rw-card wide" style={{ animationDelay: "0.75s" }}>
              <span className="ru-rw-ico">🎮</span>
              <div><span className="ru-rw-tag">Game &amp; YouTube time</span><b>{tier.games}</b></div>
            </div>
            <div className="ru-rw-card wide" style={{ animationDelay: "1.05s" }}>
              <span className="ru-rw-ico">🔁</span>
              <div><span className="ru-rw-tag">Make-ups</span><b>{tier.benefits === "None" ? "None yet" : tier.benefits}</b></div>
            </div>
            {(tier.daily ?? 0) > 0 && (
              <div className="ru-rw-card wide" style={{ animationDelay: "1.2s" }}>
                <span className="ru-rw-ico"><Brazier size={30} /></span>
                <div><span className="ru-rw-tag">Daily streak chest</span><b>+{tier.daily} gems every day your streak is alive</b></div>
              </div>
            )}
            <div className="ru-rw-card wide gems" style={{ animationDelay: "1.5s" }}>
              <span className="ru-rw-ico"><Gem size={34} /></span>
              <div><span className="ru-rw-tag">Gems</span><b>+{reward} gems for reaching {tier.name}</b></div>
            </div>
          </div>
          <button className="ru-collect" onClick={() => setStage("gems")}>
            <span className="ru-collect-gem"><Gem size={34} /></span>
            <span className="ru-collect-text"><b>Collect rewards</b><small>+{reward} gems waiting</small></span>
            <span className="ru-collect-shine" aria-hidden="true" />
          </button>
        </div>
      )}

      {stage === "gems" && (
        <GemReward amount={reward} chest gold={legendary} jewel={tier.color} title={`Reaching ${tier.name}`}
          from={profile ? Math.max(0, profile.gems.balance - reward) : undefined} onDone={onClose} />
      )}
    </div>
  );
}
