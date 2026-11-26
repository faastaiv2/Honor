import { api, type MusicInfo, type SoundKey } from "../api";

/**
 * Sounds the parent uploads on the Animations page. Each slot has a file (kept in the family's database),
 * a section (start → end), a volume and an offset. Music (a whole film) fades in and out; the others play once.
 *
 * To play exactly when an animation starts, every sound that is set is downloaded and decoded ahead of time
 * (warmSounds, right after sign-in) and played through the Web Audio API, which starts instantly and cuts
 * the chosen section to the millisecond. Browsers only allow sound after the person has touched the page,
 * so the first tap or key press anywhere unlocks it (unlockAudio).
 */
let infos: Promise<Partial<Record<SoundKey, MusicInfo>>> | null = null;
const buffers = new Map<SoundKey, Promise<AudioBuffer | null>>();
const music = new Map<SoundKey, { src: AudioBufferSourceNode; gain: GainNode }>();
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch { ctx = null; }
  return ctx;
}

/** Called on the first tap / key press: browsers keep sound off until the person interacts with the page. */
export function unlockAudio() {
  const c = audio();
  if (!c) return;
  if (c.state !== "running") void c.resume().catch(() => undefined);
  try {  // iOS also wants a (silent) sound started inside the tap
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, 22050);
    src.connect(c.destination);
    src.start(0);
  } catch { /* ignore */ }
}
if (typeof window !== "undefined") {
  const once = () => { unlockAudio(); };
  for (const ev of ["pointerdown", "keydown", "touchend"]) window.addEventListener(ev, once, { passive: true });
}

function allInfo() {
  if (!infos) infos = api.soundsInfo().catch(() => { infos = null; return {}; });
  return infos;
}

async function load(key: SoundKey): Promise<AudioBuffer | null> {
  const c = audio();
  if (!c) return null;
  const url = await api.musicUrl(key);
  const bytes = await (await fetch(url)).arrayBuffer();
  URL.revokeObjectURL(url);
  return await new Promise<AudioBuffer>((ok, bad) => { c.decodeAudioData(bytes, ok, bad); });
}

/** Download and decode a sound now so it plays on time. Resolves to its settings, or null if it isn't set. */
export async function preloadSound(key: SoundKey): Promise<{ buffer: AudioBuffer; info: MusicInfo } | null> {
  const info = (await allInfo())[key];
  if (!info?.has) return null;
  if (!buffers.has(key)) buffers.set(key, load(key).catch(() => { buffers.delete(key); return null; }));
  const buffer = await buffers.get(key)!;
  return buffer ? { buffer, info } : null;
}

/** Get every sound the parent has set ready in the background: short effects first, then the music. */
export async function warmSounds() {
  const all = await allInfo();
  const keys = (Object.keys(all) as SoundKey[]).filter((k) => all[k]?.has);
  const isMusic = (k: SoundKey) => k === "quest-music" || k === "goblins" || k.startsWith("rankup-music");
  for (const k of [...keys.filter((k) => !isMusic(k)), ...keys.filter(isMusic)]) await preloadSound(k);
}

/** The first of these sounds that the parent has set (e.g. this rank's music, else the general one). */
export async function firstSet(keys: SoundKey[]): Promise<SoundKey | null> {
  const all = await allInfo();
  return keys.find((k) => all[k]?.has) ?? null;
}

/** After an upload or a change: fetch fresh next time. */
export function resetSounds(key?: SoundKey) {
  infos = null;
  if (key) buffers.delete(key); else buffers.clear();
}

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

/** How much later (+) or earlier (-) than its usual moment the parent wants this sound, in ms. */
export async function soundOffset(key: SoundKey): Promise<number> {
  return (await allInfo())[key]?.offset_ms ?? 0;
}

/** Sound can play right now (the browser has let it, after a tap). A sound that can't play on time is skipped,
 * because the browser would otherwise hold it and play it late, at the first tap. */
async function ready(c: AudioContext): Promise<boolean> {
  if (c.state === "running") return true;
  try { await Promise.race([c.resume(), new Promise((r) => window.setTimeout(r, 120))]); } catch { /* blocked */ }
  return (c.state as string) === "running";
}

/** Start a decoded sound: its chosen section, at its volume. Returns the nodes, or null if sound is blocked. */
function start(m: { buffer: AudioBuffer; info: MusicInfo }, volume: number) {
  const c = audio();
  if (!c || c.state !== "running") return null;
  const src = c.createBufferSource();
  src.buffer = m.buffer;
  const gain = c.createGain();
  gain.gain.value = volume;
  src.connect(gain).connect(c.destination);
  const from = Math.max(0, Math.min(m.info.start || 0, m.buffer.duration));
  const len = m.info.end > m.info.start ? Math.min(m.info.end, m.buffer.duration) - from : undefined;
  try { len !== undefined ? src.start(0, from, Math.max(0, len)) : src.start(0, from); } catch { return null; }
  return { src, gain, len: len ?? m.buffer.duration - from };
}

/** For films: play a sound at `baseMs` into the film (plus the parent's offset). `elapsed` = ms since the film began. */
export async function scheduleSound(key: SoundKey, baseMs: number, elapsed: () => number, isMusic = false): Promise<void> {
  const m = await preloadSound(key);
  if (!m) return;
  const wait = baseMs + (m.info.offset_ms ?? 0) - elapsed();
  if (wait > 0) await sleep(wait);
  if (isMusic) await playMusic(key, false); else await playSound(key, false);
}

/** Play a sound once (no wait if it isn't set). With `delayed`, waits for the parent's offset first. */
export async function playSound(key: SoundKey, delayed = true): Promise<boolean> {
  const m = await preloadSound(key);
  if (!m) return false;
  if (delayed && m.info.offset_ms > 0) await sleep(m.info.offset_ms);
  const c = audio();
  if (!c || !(await ready(c))) return false;
  return !!start(m, m.info.volume / 100);
}

/** Play music for a film: fades in, and out over the end of its section. Resolves false if not set. */
export async function playMusic(key: SoundKey, delayed = true): Promise<boolean> {
  const m = await preloadSound(key);
  if (!m) return false;
  if (delayed && m.info.offset_ms > 0) await sleep(m.info.offset_ms);
  stopMusic(key, 0);
  const c = audio();
  if (!c || !(await ready(c))) return false;
  const s = start(m, 0);
  if (!c || !s) return false;
  const vol = m.info.volume / 100, now = c.currentTime;
  const fadeIn = Math.min(2.5, s.len * 0.3);
  s.gain.gain.setValueAtTime(0, now);
  s.gain.gain.linearRampToValueAtTime(vol, now + fadeIn);
  if (m.info.end > m.info.start) {  // the chosen section: fade out over its last 1.5 seconds
    const fadeOut = Math.min(1.5, s.len / 3);
    s.gain.gain.setValueAtTime(vol, now + Math.max(fadeIn, s.len - fadeOut));
    s.gain.gain.linearRampToValueAtTime(0, now + s.len);
  }
  const entry = { src: s.src, gain: s.gain };
  music.set(key, entry);
  s.src.onended = () => { if (music.get(key) === entry) music.delete(key); };
  return true;
}

export function stopMusic(key: SoundKey, ms = 1800) {
  const m = music.get(key);
  const c = ctx;
  if (!m || !c) return;
  music.delete(key);
  const now = c.currentTime;
  if (ms <= 0) { try { m.src.stop(); } catch { /* already stopped */ } return; }
  m.gain.gain.cancelScheduledValues(now);
  m.gain.gain.setValueAtTime(m.gain.gain.value, now);
  m.gain.gain.linearRampToValueAtTime(0, now + ms / 1000);
  try { m.src.stop(now + ms / 1000 + 0.05); } catch { /* already stopped */ }
}
