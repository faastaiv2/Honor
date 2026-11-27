import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";

/**
 * The online dot. A member counts as online only while they are really using the app: the tab is in view AND they
 * touched, clicked, typed or scrolled in the last minute. Then a small ping goes out every 20 seconds.
 * A tab left open in the background, or a screen nobody touches, stops pinging and the dot goes out.
 */
const ACTIVE_MS = 60_000;
const EVERY_MS = 20_000;

export function startPresence(page: () => string): () => void {
  let lastTouch = Date.now();
  let lastPing = 0;
  const send = () => {
    if (document.visibilityState !== "visible" || Date.now() - lastTouch > ACTIVE_MS) return;
    lastPing = Date.now();
    void api.ping(page()).catch(() => undefined);
  };
  const touched = () => {
    const idle = Date.now() - lastTouch > ACTIVE_MS;
    lastTouch = Date.now();
    if (idle || Date.now() - lastPing > EVERY_MS) send(); // back after a break: show up at once
  };
  const evs = ["pointerdown", "keydown", "scroll", "touchstart", "wheel", "mousemove"] as const;
  let moveAt = 0;
  const onMove = () => { if (Date.now() - moveAt > 5000) { moveAt = Date.now(); touched(); } };
  for (const e of evs) window.addEventListener(e, e === "mousemove" ? onMove : touched, { passive: true, capture: true });
  const onVis = () => { if (document.visibilityState === "visible") touched(); };
  document.addEventListener("visibilitychange", onVis);
  send();
  const t = window.setInterval(send, EVERY_MS);
  return () => {
    window.clearInterval(t);
    for (const e of evs) window.removeEventListener(e, e === "mousemove" ? onMove : touched, { capture: true });
    document.removeEventListener("visibilitychange", onVis);
  };
}

export type Online = Record<string, { online: boolean; at: string | null; page: string }>;

/** The admin's live view of who is online (refreshed every 20 seconds). */
export function useOnline(enabled: boolean): Online {
  const [map, setMap] = useState<Online>({});
  useEffect(() => {
    if (!enabled) { setMap({}); return; }
    const get = () => { if (document.visibilityState === "visible") api.online().then(setMap).catch(() => undefined); };
    get();
    const t = window.setInterval(get, EVERY_MS);
    document.addEventListener("visibilitychange", get);
    return () => { window.clearInterval(t); document.removeEventListener("visibilitychange", get); };
  }, [enabled]);
  return map;
}

/** "just now", "5 min ago", "3 h ago", "2 days ago" */
export function lastSeen(at: string | null): string {
  if (!at) return "not yet";
  const s = (Date.now() - new Date(at).getTime()) / 1000;
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} days ago`;
}

export const OnlineContext = createContext<Online>({});
export const useOnlineMap = () => useContext(OnlineContext);
