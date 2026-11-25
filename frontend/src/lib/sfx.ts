/**
 * Sound effects made in code with the Web Audio API (no sound files): cracks, thunder, a glass shatter,
 * a deep boom, a whoosh and golden chimes. Used by the Legendary quest film, on top of the quest music.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): { c: AudioContext; out: GainNode } | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.6;
      // A limiter so stacked sounds (the shatter) never distort.
      const lim = ctx.createDynamicsCompressor();
      lim.threshold.value = -10; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.002; lim.release.value = 0.25;
      master.connect(lim).connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => undefined);
    return { c: ctx, out: master! };
  } catch { return null; }
}

/** Call from a tap so later sounds are allowed. */
export function unlockSfx() { audio(); }

function noise(c: AudioContext, seconds: number): AudioBufferSourceNode {
  const len = Math.max(1, Math.floor(c.sampleRate * seconds));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource();
  s.buffer = buf;
  return s;
}

function env(c: AudioContext, t: number, peak: number, attack: number, decay: number): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}

/** A sharp crack, like stone or ice splitting. */
export function crack(power = 1) {
  const a = audio(); if (!a) return;
  const { c, out } = a, t = c.currentTime;
  for (let i = 0; i < 3 + Math.round(power * 3); i++) {
    const at = t + i * (0.018 + Math.random() * 0.04);
    const n = noise(c, 0.12);
    const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1800 + Math.random() * 2500;
    const bp = c.createBiquadFilter(); bp.type = "peaking"; bp.frequency.value = 3200; bp.gain.value = 8;
    const g = env(c, at, 0.55 * power * (1 - i * 0.08), 0.002, 0.05 + Math.random() * 0.07);
    n.connect(hp).connect(bp).connect(g).connect(out);
    n.start(at); n.stop(at + 0.2);
  }
  // the low "creak" under it
  const o = c.createOscillator(); o.type = "sawtooth";
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.25);
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600;
  const g = env(c, t, 0.18 * power, 0.005, 0.25);
  o.connect(lp).connect(g).connect(out); o.start(t); o.stop(t + 0.35);
}

/** Thunder: a crack followed by a long rolling rumble. */
export function thunder(power = 1) {
  const a = audio(); if (!a) return;
  const { c, out } = a, t = c.currentTime;
  crack(0.6 * power);
  const n = noise(c, 3.2);
  const lp = c.createBiquadFilter(); lp.type = "lowpass";
  lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(120, t + 2.6);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.7 * power, t + 0.08);
  // a few rolls
  g.gain.exponentialRampToValueAtTime(0.25 * power, t + 0.6);
  g.gain.exponentialRampToValueAtTime(0.45 * power, t + 0.9);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 3.1);
  n.connect(lp).connect(g).connect(out); n.start(t); n.stop(t + 3.2);
}

/** A deep cinematic boom. */
export function boom(power = 1) {
  const a = audio(); if (!a) return;
  const { c, out } = a, t = c.currentTime;
  const o = c.createOscillator(); o.type = "sine";
  o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(28, t + 1.6);
  const g = env(c, t, 0.9 * power, 0.01, 1.8);
  o.connect(g).connect(out); o.start(t); o.stop(t + 2);
  const n = noise(c, 1.2);
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 300;
  const g2 = env(c, t, 0.5 * power, 0.005, 1.1);
  n.connect(lp).connect(g2).connect(out); n.start(t); n.stop(t + 1.3);
}

/** The crest shatters: a boom, a burst of cracks and glassy tinkles falling away. */
export function shatter() {
  const a = audio(); if (!a) return;
  const { c, out } = a, t = c.currentTime;
  boom(1);
  crack(1.4);
  const n = noise(c, 0.9);
  const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3000;
  const g = env(c, t, 0.45, 0.003, 0.8);
  n.connect(hp).connect(g).connect(out); n.start(t); n.stop(t + 0.9);
  for (let i = 0; i < 26; i++) {
    const at = t + 0.05 + Math.random() * 1.6;
    const o = c.createOscillator(); o.type = "sine";
    o.frequency.value = 2400 + Math.random() * 4200;
    const gg = env(c, at, 0.05 + Math.random() * 0.08, 0.002, 0.15 + Math.random() * 0.35);
    o.connect(gg).connect(out); o.start(at); o.stop(at + 0.6);
  }
}

/** A rising whoosh (the crest flying up or down). */
export function whoosh(seconds = 1.6, up = true) {
  const a = audio(); if (!a) return;
  const { c, out } = a, t = c.currentTime;
  const n = noise(c, seconds + 0.2);
  const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(up ? 300 : 2400, t); bp.frequency.exponentialRampToValueAtTime(up ? 2400 : 300, t + seconds);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + seconds * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  n.connect(bp).connect(g).connect(out); n.start(t); n.stop(t + seconds + 0.2);
}

/** Golden bells: a bright chord with shimmer. */
export function chime(notes = [523.25, 659.25, 783.99, 1046.5], gap = 0.09) {
  const a = audio(); if (!a) return;
  const { c, out } = a, t = c.currentTime;
  notes.forEach((f, i) => {
    const at = t + i * gap;
    [1, 2.76, 5.4].forEach((h, j) => {
      const o = c.createOscillator(); o.type = "sine"; o.frequency.value = f * h;
      const g = env(c, at, [0.16, 0.05, 0.02][j], 0.004, [2.4, 1.2, 0.6][j]);
      o.connect(g).connect(out); o.start(at); o.stop(at + 2.6);
    });
  });
}

/** One soft "ting" (a level lighting up). */
export function ting(f = 1318.5) { chime([f], 0); }
