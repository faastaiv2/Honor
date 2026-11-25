import { api, type MusicInfo } from "../api";

/**
 * The Legendary quest music: the parent uploads it in Admin; it is fetched once, kept as a local file in the
 * browser, and played during the quest film with a fade in and a fade out.
 */
let loading: Promise<{ url: string; info: MusicInfo } | null> | null = null;
let audio: HTMLAudioElement | null = null;
let fader = 0;

/** Start downloading early (when the quest screen opens) so the music is ready the moment the film starts. */
export function preloadQuestMusic(): Promise<{ url: string; info: MusicInfo } | null> {
  if (!loading) {
    loading = api.musicInfo()
      .then(async (info) => (info.has ? { url: await api.musicUrl(), info } : null))
      .catch(() => { loading = null; return null; });
  }
  return loading;
}

/** Forget the cached file (after the parent uploads a new one). */
export function resetQuestMusic() { stopQuestMusic(0); loading = null; }

function fadeTo(target: number, ms: number, then?: () => void) {
  window.clearInterval(fader);
  const a = audio;
  if (!a) return;
  const from = a.volume, steps = Math.max(1, Math.round(ms / 50));
  let i = 0;
  fader = window.setInterval(() => {
    i++;
    a.volume = Math.max(0, Math.min(1, from + (target - from) * (i / steps)));
    if (i >= steps) { window.clearInterval(fader); then?.(); }
  }, 50);
}

/** Play from the parent's chosen start. Resolves false if there is no music or the browser blocked sound. */
export async function playQuestMusic(): Promise<boolean> {
  const m = await preloadQuestMusic();
  if (!m) return false;
  stopQuestMusic(0);
  const a = new Audio(m.url);
  audio = a;
  a.volume = 0;
  a.currentTime = m.info.start;
  try { await a.play(); } catch { audio = null; return false; }
  fadeTo(m.info.volume / 100, 2500);
  return true;
}

export function stopQuestMusic(ms = 1800) {
  const a = audio;
  if (!a) return;
  if (ms <= 0) { window.clearInterval(fader); a.pause(); audio = null; return; }
  fadeTo(0, ms, () => { a.pause(); if (audio === a) audio = null; });
}

export function isQuestMusicPlaying() { return !!audio && !audio.paused; }

/* ---- The crack: one sound the parent uploads, played the moment the Obsidian crest breaks. ---- */
let crackLoading: Promise<{ url: string; info: MusicInfo } | null> | null = null;

export function preloadCrack(): Promise<{ url: string; info: MusicInfo } | null> {
  if (!crackLoading) {
    crackLoading = api.musicInfo("quest-crack")
      .then(async (info) => (info.has ? { url: await api.musicUrl("quest-crack"), info } : null))
      .catch(() => { crackLoading = null; return null; });
  }
  return crackLoading;
}

export function resetCrack() { crackLoading = null; }

export async function playCrack(): Promise<boolean> {
  const m = await preloadCrack();
  if (!m) return false;
  const a = new Audio(m.url);
  a.volume = m.info.volume / 100;
  a.currentTime = m.info.start;
  try { await a.play(); return true; } catch { return false; }
}
