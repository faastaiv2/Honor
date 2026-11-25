import { useEffect, useState } from "react";

/** Fired after any change to ticks or Honor, so every panel refreshes its numbers. */
const CHANGED = "honor:changed";

export const notifyChanged = () => window.dispatchEvent(new Event(CHANGED));

/** A number that goes up on every change; put it in an effect's dependencies to refetch. */
export function useChangeCounter(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const on = () => setN((x) => x + 1);
    window.addEventListener(CHANGED, on);
    window.addEventListener("focus", on);
    return () => { window.removeEventListener(CHANGED, on); window.removeEventListener("focus", on); };
  }, []);
  return n;
}

export function useToast(): [string, (s: string) => void] {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  return [msg, setMsg];
}
