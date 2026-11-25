import { api, type MusicInfo, type SoundKey } from "../api";

/**
 * Sounds the parent uploads on the Animations page. Each slot has a file (kept in the family's database),
 * a start point and a volume. Files are fetched once and kept in the browser for the visit.
 * Music (a whole film) fades in and out; the others play once.
 */
let infos: Promise<Partial<Record<SoundKey, MusicInfo>>> | null = null;
const files = new Map<SoundKey, Promise<string | null>>();
const music = new Map<SoundKey, { a: HTMLAudioElement; fader: number }>();

function allInfo() {
  if (!infos) infos = api.soundsInfo().catch(() => { infos = null; return {}; });
  return infos;
}

/** Start fetching a sound early so it plays on time. Resolves to its local URL and settings, or null. */
export async function preloadSound(key: SoundKey): Promise<{ url: string; info: MusicInfo } | null> {
  const info = (await allInfo())[key];
  if (!info?.has) return null;
  if (!files.has(key)) files.set(key, api.musicUrl(key).catch(() => { files.delete(key); return null; }));
  const url = await files.get(key)!;
  return url ? { url, info } : null;
}

/** After an upload or a change: fetch fresh next time. */
export function resetSounds(key?: SoundKey) {
  infos = null;
  if (key) files.delete(key); else files.clear();
}

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

/** How much later (+) or earlier (-) than its usual moment the parent wants this sound, in ms. */
export async function soundOffset(key: SoundKey): Promise<number> {
  return (await allInfo())[key]?.offset_ms ?? 0;
}

/** For films: play a sound at `baseMs` into the film (plus the parent's offset). `elapsed` = ms since the film began. */
export async function scheduleSound(key: SoundKey, baseMs: number, elapsed: () => number, music = false): Promise<void> {
  const m = await preloadSound(key);
  if (!m) return;
  const wait = baseMs + (m.info.offset_ms ?? 0) - elapsed();
  if (wait > 0) await sleep(wait);
  if (music) await playMusic(key, false); else await playSound(key, false);
}

/** Play a sound once (no wait if it isn't set). With `delayed`, waits for the parent's offset first. */
export async function playSound(key: SoundKey, delayed = true): Promise<boolean> {
  const m = await preloadSound(key);
  if (!m) return false;
  if (delayed && m.info.offset_ms > 0) await sleep(m.info.offset_ms);
  const a = new Audio(m.url);
  a.volume = m.info.volume / 100;
  a.currentTime = m.info.start;
  const end = m.info.end;
  if (end > m.info.start) {  // play just the chosen section
    a.addEventListener("timeupdate", () => { if (a.currentTime >= end) a.pause(); });
    window.setTimeout(() => a.pause(), (end - m.info.start) * 1000 + 150);
  }
  try { await a.play(); return true; } catch { return false; }
}

function fade(key: SoundKey, target: number, ms: number, then?: () => void) {
  const m = music.get(key);
  if (!m) return;
  window.clearInterval(m.fader);
  const from = m.a.volume, steps = Math.max(1, Math.round(ms / 50));
  let i = 0;
  m.fader = window.setInterval(() => {
    i++;
    m.a.volume = Math.max(0, Math.min(1, from + (target - from) * (i / steps)));
    if (i >= steps) { window.clearInterval(m.fader); then?.(); }
  }, 50);
}

/** Play music for a film: fades in. Resolves false if not set or the browser blocked sound. */
export async function playMusic(key: SoundKey, delayed = true): Promise<boolean> {
  const m = await preloadSound(key);
  if (!m) return false;
  if (delayed && m.info.offset_ms > 0) await sleep(m.info.offset_ms);
  stopMusic(key, 0);
  const a = new Audio(m.url);
  a.volume = 0;
  a.currentTime = m.info.start;
  const entry = { a, fader: 0 };
  music.set(key, entry);
  try { await a.play(); } catch { music.delete(key); return false; }
  const len = m.info.end > m.info.start ? m.info.end - m.info.start : 0;
  fade(key, m.info.volume / 100, Math.min(2500, len ? len * 300 : 2500));
  if (len) {  // the chosen section: fade out over its last 1.5 seconds
    const fadeOut = Math.min(1.5, len / 3);
    let ending = false;
    a.addEventListener("timeupdate", () => {
      if (!ending && music.get(key) === entry && a.currentTime >= m.info.end - fadeOut) { ending = true; stopMusic(key, fadeOut * 1000); }
    });
  }
  return true;
}

export function stopMusic(key: SoundKey, ms = 1800) {
  const m = music.get(key);
  if (!m) return;
  if (ms <= 0) { window.clearInterval(m.fader); m.a.pause(); music.delete(key); return; }
  fade(key, 0, ms, () => { m.a.pause(); if (music.get(key) === m) music.delete(key); });
}
