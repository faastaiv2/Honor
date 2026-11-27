import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type ArtEvent, type ArtEventIn, type EventEntry, type EventsInfo } from "../api";
import { useAuth } from "../auth";
import Avatar from "../lib/Avatar";
import Gem from "../lib/Gem";
import { fmt } from "../lib/dates";
import { notifyChanged, useChangeCounter, useToast } from "../lib/events";
import { useSearchParams } from "react-router-dom";
import Friends from "./Friends";

/**
 * Events: art tournaments. The admin posts one any time in the week and chooses when submissions open and close
 * (they can span days). While it's open every member can send one picture of their art; parents pick 1st, 2nd and 3rd.
 */

const PLACE = { 1: { name: "1st", medal: "🥇", cls: "gold" }, 2: { name: "2nd", medal: "🥈", cls: "silver" }, 3: { name: "3rd", medal: "🥉", cls: "bronze" } } as const;
const urls = new Map<string, Promise<string>>();
const artUrl = (id: string) => { if (!urls.has(id)) urls.set(id, api.artUrl(id)); return urls.get(id)!; };

/** Ready-made banners: a gradient and a picture. "custom" is an uploaded photo. */
export const BANNERS: Record<string, { name: string; bg: string; art: string }> = {
  sunset: { name: "Sunset", bg: "radial-gradient(circle at 15% 20%, #ffffff40, transparent 45%), linear-gradient(135deg, #ff9a3c, #e0479a 60%, #8a2fd0)", art: "🎨" },
  ocean: { name: "Ocean", bg: "radial-gradient(circle at 80% 10%, #ffffff44, transparent 40%), linear-gradient(135deg, #1fb6d6, #2f5fd0 60%, #1b2a7a)", art: "🖌️" },
  forest: { name: "Forest", bg: "radial-gradient(circle at 20% 80%, #ffffff30, transparent 45%), linear-gradient(135deg, #7bd36a, #1f9a5b 55%, #0d4f3c)", art: "🌳" },
  royal: { name: "Royal", bg: "radial-gradient(circle at 50% 0%, #ffe9a066, transparent 50%), linear-gradient(135deg, #6a2fc0, #3b1a7a 60%, #c99a2e)", art: "👑" },
  night: { name: "Starry night", bg: "radial-gradient(2px 2px at 20% 30%, #fff, transparent), radial-gradient(2px 2px at 70% 20%, #fff, transparent), radial-gradient(1.5px 1.5px at 40% 70%, #fff, transparent), radial-gradient(1.5px 1.5px at 85% 60%, #fff, transparent), linear-gradient(160deg, #1a2350, #0b0f2a 70%)", art: "🌙" },
  rainbow: { name: "Rainbow", bg: "linear-gradient(120deg, #ff5f6d, #ffc371 22%, #f9f871 38%, #6ee7a8 54%, #4fc3f7 70%, #9b6bff 86%)", art: "🌈" },
};
const banners = new Map<string, Promise<string>>();
function useBannerBg(ev: ArtEvent | null | undefined): { bg: string; art: string | null } {
  const [img, setImg] = useState<string | null>(null);
  const key = ev?.banner_image ? `${ev.id}:${ev.banner}` : "";
  useEffect(() => {
    if (!key || !ev) { setImg(null); return; }
    let live = true;
    if (!banners.has(key)) banners.set(key, api.bannerUrl(ev.id));
    banners.get(key)!.then((u) => live && setImg(u)).catch(() => undefined);
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (ev?.banner === "custom" && img) return { bg: `linear-gradient(180deg, #0002, #000a), url(${img}) center/cover`, art: null };
  const b = BANNERS[ev?.banner ?? "sunset"] ?? BANNERS.sunset;
  return { bg: b.bg, art: b.art };
}
/** "14:30" → "2:30 PM" */
export function ampm(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
const oneDay = (ev: { open_day?: string; day: string }) => !ev.open_day || ev.open_day === ev.day;
const allDay = (ev: ArtEvent) => oneDay(ev) && ev.opens === "00:00" && ev.closes === "23:59";
const dayName = (d: string, today?: string) => (d === today ? "Today" : fmt(d, { weekday: "short", day: "numeric", month: "short" }));
/** When art can be sent: "All day", "9:00 AM – 6:00 PM", or across days "Fri 27 Nov 4:00 PM → Sat 28 Nov 8:00 PM". */
const hours = (ev: ArtEvent, today?: string) => (allDay(ev) ? "All day" : oneDay(ev) ? `${ampm(ev.opens)} – ${ampm(ev.closes)}`
  : `${dayName(ev.open_day, today)} ${ampm(ev.opens)} → ${dayName(ev.day, today)} ${ampm(ev.closes)}`);
/** "today at 4:00 PM" / "Friday 27 Nov at 4:00 PM": when submissions open. */
const opensWhen = (ev: ArtEvent, today: string) => `${ev.open_day === today ? "today" : fmt(ev.open_day, { weekday: "long", day: "numeric", month: "short" })}${ev.opens === "00:00" ? "" : ` at ${ampm(ev.opens)}`}`;
const closesWhen = (ev: ArtEvent, today: string) => `${ev.day === today ? "" : `${fmt(ev.day, { weekday: "long" })} `}${ev.closes === "23:59" ? (ev.day === today ? "midnight" : "night") : ampm(ev.closes)}`;

/** A strip of the next three weeks to tap a day, with a date box for anything else. */
function DayPick({ value, onChange, min, label, today }: { value: string; onChange: (d: string) => void; min?: string; label: string; today: string }) {
  return (
    <>
      <div className="ev-days" role="radiogroup" aria-label={label}>
        {Array.from({ length: 21 }, (_, i) => {
          const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() + i);
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          if (min && iso < min) return null;
          return (
            <button type="button" key={iso} role="radio" aria-checked={value === iso} className={`ev-day${value === iso ? " on" : ""}${d.getDay() === 6 ? " sat" : ""}`} onClick={() => onChange(iso)}>
              <small>{i === 0 ? "Today" : d.toLocaleDateString(undefined, { weekday: "short" })}</small>
              <b>{d.getDate()}</b>
              <small>{d.toLocaleDateString(undefined, { month: "short" })}</small>
            </button>
          );
        })}
      </div>
      <label className="ev-other-day">Other date: <input type="date" min={min} value={value} onChange={(e) => e.target.value && onChange(e.target.value)} aria-label={`${label}: other date`} /></label>
    </>
  );
}

function Art({ id, alt, className = "" }: { id: string; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { let live = true; artUrl(id).then((u) => live && setSrc(u)).catch(() => undefined); return () => { live = false; }; }, [id]);
  return src ? <img className={`art ${className}`} src={src} alt={alt} /> : <span className={`art art-wait ${className}`} aria-label={alt} />;
}

/** Shrink a photo on the phone before sending (longest side 1280 px, JPEG). */
async function shrink(file: File): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file);
  });
  const k = Math.min(1, 1280 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.82);
}

/** Time left until a moment on a day ("23:59" means the very end of the day). Ticks every second. */
/** How far the board's clock (its time zone) is from this device's, from the server's "today" and "HH:MM". */
const boardSkew = (today: string, clock: string) =>
  Math.round((new Date(`${today}T${clock}:00`).getTime() - Date.now()) / 900_000) * 900_000;

function Countdown({ day, at = "00:00", label = "Time until the tournament opens", onEnd, className = "", skew = 0 }: {
  day: string; at?: string; label?: string; onEnd?: () => void; className?: string; skew?: number;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const target = new Date(`${day}T${at === "23:59" ? "23:59:59" : `${at}:00`}`).getTime();
  const left = Math.max(0, target - (now + skew));
  const ended = left === 0;
  useEffect(() => { if (ended) onEnd?.(); }, [ended]); // eslint-disable-line react-hooks/exhaustive-deps
  const d = Math.floor(left / 86_400_000), h = Math.floor((left % 86_400_000) / 3_600_000),
    m = Math.floor((left % 3_600_000) / 60_000), s = Math.floor((left % 60_000) / 1000);
  const two = (n: number) => String(n).padStart(2, "0");
  return (
    <div className={`ev-count ${className}`} role="timer" aria-label={label}>
      {d > 0 && <span><b>{d}</b><small>{d === 1 ? "day" : "days"}</small></span>}
      <span><b>{d > 0 ? h : two(h)}</b><small>hours</small></span><span><b>{two(m)}</b><small>mins</small></span>
      {d === 0 && <span><b>{two(s)}</b><small>secs</small></span>}
    </div>
  );
}

function Podium({ entries }: { entries: EventEntry[] }) {
  const at = (p: number) => entries.find((e) => e.place === p);
  return (
    <div className="podium">
      {[2, 1, 3].map((p) => {
        const e = at(p), pl = PLACE[p as 1 | 2 | 3];
        return (
          <div key={p} className={`pod pod-${pl.cls}`}>
            {e ? <>
              <Art id={e.id} alt={e.title || `${e.member.name}'s art`} className="pod-art" />
              <b>{e.member.name}</b>
              {e.title && <small>“{e.title}”</small>}
            </> : <span className="pod-empty">—</span>}
            <div className="pod-step"><span className="pod-medal">{pl.medal}</span>{pl.name}{e && <em>+{e.gems} <Gem /></em>}</div>
          </div>
        );
      })}
    </div>
  );
}

function EventEditor({ data, ev, onSaved, onCancel, onError }: {
  data: EventsInfo; ev?: ArtEvent; onSaved: (d: EventsInfo, msg: string) => void; onCancel: () => void; onError: (s: string) => void;
}) {
  const [f, setF] = useState<ArtEventIn>(() => ev ? {
    day: ev.day, open_day: ev.open_day || ev.day, title: ev.title, prompt: ev.prompt, opens: ev.opens, closes: ev.closes,
    prize1: ev.prizes["1"], prize2: ev.prizes["2"], prize3: ev.prizes["3"], fee: ev.fee, banner: ev.banner,
  } : (() => {
    // Post it now; by default art can be sent all of Friday and Saturday (the Friday before the suggested Saturday).
    const fri = new Date(`${data.suggested_day}T12:00:00`); fri.setDate(fri.getDate() - 1);
    const friIso = `${fri.getFullYear()}-${String(fri.getMonth() + 1).padStart(2, "0")}-${String(fri.getDate()).padStart(2, "0")}`;
    return { day: data.suggested_day, open_day: friIso < data.today ? data.today : friIso, title: "Art Tournament", prompt: "", opens: "00:00", closes: "23:59",
      prize1: 100, prize2: 50, prize3: 25, fee: 0, banner: "sunset" };
  })());
  const [upload, setUpload] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const upFile = useRef<HTMLInputElement>(null);
  const set = <K extends keyof ArtEventIn>(k: K, v: ArtEventIn[K]) => setF((o) => ({ ...o, [k]: v }));
  const num = (v: string) => Math.max(0, Math.floor(Number(v) || 0));
  const custom = f.banner === "custom";
  const previewBg = custom
    ? (upload ? `linear-gradient(180deg, #0002, #000a), url(${upload}) center/cover` : (BANNERS.sunset.bg))
    : (BANNERS[f.banner] ?? BANNERS.sunset).bg;
  const hasCustom = !!upload || (ev?.banner === "custom" && ev.banner_image);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (`${f.day} ${f.closes}` <= `${f.open_day} ${f.opens}`) { onError("It must close after it opens"); return; }
    if (custom && !hasCustom) { onError("Upload a banner picture or choose a ready-made one"); return; }
    setBusy(true);
    try {
      const body: ArtEventIn = { ...f, banner_image: custom ? upload : null };
      const d = ev ? await api.editEvent(ev.id, body) : await api.createEvent(body);
      onSaved(d, ev ? "Event updated ✓" : `${f.title} is set for ${fmt(f.day, { weekday: "long", day: "numeric", month: "short" })}`);
    } catch (err) { onError(err instanceof ApiError ? err.message : "Could not save"); }
    finally { setBusy(false); }
  }

  return (
    <form className="ad-form ev-editor" onSubmit={save}>
      <div className="ev-ed-preview" style={{ background: previewBg }}>
        {!custom && <span aria-hidden="true">{BANNERS[f.banner]?.art}</span>}
        <div><small>{oneDay(f) ? `${fmt(f.day, { weekday: "long", day: "numeric", month: "short" })} · ${f.opens === "00:00" && f.closes === "23:59" ? "All day" : `${ampm(f.opens)} – ${ampm(f.closes)}`}`
          : `${dayName(f.open_day, data.today)} ${ampm(f.opens)} → ${dayName(f.day, data.today)} ${ampm(f.closes)}`}</small><b>{f.title || "Art Tournament"}</b></div>
      </div>
      <div className="ad-two">
        <label className="field"><span className="field-label">Name</span><input required maxLength={80} value={f.title} onChange={(e) => set("title", e.target.value)} /></label>
      </div>
      <p className="field-hint ev-post-note">📣 The kids see the theme as soon as you create it, so post it early in the week. Art can only be sent between the times below: Friday to Saturday unless you change it.</p>
      <div className="field">
        <span className="field-label">📬 Submissions open · {fmt(f.open_day, { weekday: "long", day: "numeric", month: "long" })}</span>
        <DayPick value={f.open_day} today={data.today} label="Day submissions open" min={ev ? undefined : data.today}
          onChange={(d) => setF((o) => ({ ...o, open_day: d, day: o.day < d ? d : o.day }))} />
        <label className="field ev-time"><span className="field-label">at</span><input type="time" required value={f.opens} onChange={(e) => set("opens", e.target.value)} aria-label="Opens at" /></label>
      </div>
      <div className="field">
        <span className="field-label">🏁 Submissions close · {fmt(f.day, { weekday: "long", day: "numeric", month: "long" })}</span>
        <DayPick value={f.day} today={data.today} label="Day submissions close" min={f.open_day} onChange={(d) => set("day", d)} />
        <label className="field ev-time"><span className="field-label">at</span><input type="time" required value={f.closes} onChange={(e) => set("closes", e.target.value)} aria-label="Closes at" /></label>
      </div>
      <p className={`ev-tz${f.day === data.today && f.closes <= data.clock ? " over" : ""}`}>
        {f.day === data.today && f.closes <= data.clock
          ? <>⚠️ It's already {ampm(data.clock)} now ({data.timezone} time), so this would close straight away. Pick a later closing time or another day. If {ampm(data.clock)} is the wrong time, change the time zone in Admin → Settings.</>
          : <>🕐 Times are in {data.timezone} time · it's {ampm(data.clock)} now</>}
      </p>
      <label className="field"><span className="field-label">Theme for the kids (optional)</span>
        <input maxLength={200} placeholder="e.g. Draw your favourite animal" value={f.prompt} onChange={(e) => set("prompt", e.target.value)} /></label>

      <fieldset className="ev-fs">
        <legend>Prizes</legend>
        <div className="ev-prize-in">
          <label className="gold"><span>🥇 1st</span><input type="number" min={0} max={10000} inputMode="numeric" value={f.prize1} onChange={(e) => set("prize1", num(e.target.value))} /><Gem /></label>
          <label className="silver"><span>🥈 2nd</span><input type="number" min={0} max={10000} inputMode="numeric" value={f.prize2} onChange={(e) => set("prize2", num(e.target.value))} /><Gem /></label>
          <label className="bronze"><span>🥉 3rd</span><input type="number" min={0} max={10000} inputMode="numeric" value={f.prize3} onChange={(e) => set("prize3", num(e.target.value))} /><Gem /></label>
        </div>
      </fieldset>

      <fieldset className="ev-fs">
        <legend>Entry fee</legend>
        <div className="ev-fee-in">
          <label><input type="number" min={0} max={5000} inputMode="numeric" value={f.fee} onChange={(e) => set("fee", num(e.target.value))} /><Gem /></label>
          <span className="field-hint">{f.fee === 0 ? "Free to enter" : `Each child pays ${f.fee} gems to enter. Refunded if you delete the event.`}</span>
        </div>
      </fieldset>

      <fieldset className="ev-fs">
        <legend>Banner</legend>
        <div className="ev-banners" role="radiogroup" aria-label="Banner">
          {data.banners.map((k) => (
            <button type="button" key={k} role="radio" aria-checked={f.banner === k} className={`ev-bn${f.banner === k ? " on" : ""}`}
              style={{ background: BANNERS[k]?.bg }} onClick={() => set("banner", k)}>
              <span aria-hidden="true">{BANNERS[k]?.art}</span><small>{BANNERS[k]?.name ?? k}</small>
            </button>
          ))}
          <button type="button" role="radio" aria-checked={custom} className={`ev-bn ev-bn-up${custom ? " on" : ""}`}
            style={upload ? { background: `url(${upload}) center/cover` } : undefined}
            onClick={() => { set("banner", "custom"); if (!hasCustom) upFile.current?.click(); }}>
            <span aria-hidden="true">📷</span><small>{hasCustom ? "Your picture" : "Upload your own"}</small>
          </button>
        </div>
        {custom && <button type="button" className="ev-link" onClick={() => upFile.current?.click()}>{hasCustom ? "Change picture" : "Choose a picture"}</button>}
        <input ref={upFile} type="file" accept="image/*" hidden onChange={async (e) => {
          const file = e.target.files?.[0]; e.currentTarget.value = "";
          if (!file) return;
          try { setUpload(await shrink(file)); set("banner", "custom"); } catch { onError("That picture could not be opened"); }
        }} />
      </fieldset>

      <div className="ad-actions">
        <button className="primary" disabled={busy}>{busy ? "Saving…" : ev ? "Save changes" : "Create event"}</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

async function removeEvent(ev: ArtEvent, entries: number, onDone: (d: EventsInfo, m: string) => void, onError: (s: string) => void) {
  const warn = entries > 0
    ? `Delete “${ev.title}”?\n\nIt has ${entries} entr${entries === 1 ? "y" : "ies"}. The art will be deleted, entry fees given back and any prizes taken back.`
    : `Delete “${ev.title}”?`;
  if (!window.confirm(warn)) return;
  try { onDone(await api.deleteEvent(ev.id), "Event deleted"); } catch (err) { onError(err instanceof ApiError ? err.message : "Could not delete"); }
}

function EventsAdmin({ data, editing, setEditing, onDone, onError }: {
  data: EventsInfo; editing: string | null; setEditing: (id: string | null) => void;
  onDone: (d: EventsInfo, msg: string) => void; onError: (s: string) => void;
}) {
  const saved = (d: EventsInfo, m: string) => { setEditing(null); onDone(d, m); };
  return (
    <section className="card ev-admin">
      <div className="ev-head"><h2>Tournaments</h2>{editing !== "new" && <button className="primary" onClick={() => setEditing("new")}>＋ Create event</button>}</div>
      {editing === "new" && <EventEditor data={data} onSaved={saved} onCancel={() => setEditing(null)} onError={onError} />}
      {data.upcoming.length > 0 ? (
        <ul className="ev-up">
          {data.upcoming.map((u) => editing === u.id ? (
            <li key={u.id} className="ev-up-edit"><EventEditor data={data} ev={u} onSaved={saved} onCancel={() => setEditing(null)} onError={onError} /></li>
          ) : (
            <li key={u.id}>
              <span className="ev-up-sw" style={{ background: u.banner === "custom" ? "#888" : BANNERS[u.banner]?.bg }} aria-hidden="true">{u.banner === "custom" ? "📷" : BANNERS[u.banner]?.art}</span>
              <span className="ev-up-txt">
                <b>{u.title}</b>
                <small>{oneDay(u) ? `${fmt(u.day, { weekday: "short", day: "numeric", month: "short" })} · ` : ""}{hours(u, data.today)}{u.state === "open" ? " · taking art now" : ""}</small>
                <small>🥇{u.prizes["1"]} 🥈{u.prizes["2"]} 🥉{u.prizes["3"]} · {u.fee ? `Fee ${u.fee}` : "Free"}{u.prompt ? ` · ${u.prompt}` : ""}</small>
              </span>
              <span className="ev-up-btns">
                <button onClick={() => setEditing(u.id)}>Edit</button>
                <button className="danger" onClick={() => removeEvent(u, u.state === "open" ? data.current.length : 0, onDone, onError)}>Delete</button>
              </span>
            </li>
          ))}
        </ul>
      ) : editing !== "new" && <p className="note">No tournaments planned. Create one so the kids have something to look forward to!</p>}
    </section>
  );
}

function ArtEvents() {
  const { viewer } = useAuth();
  const isAdmin = !!viewer?.is_admin;
  const [data, setData] = useState<EventsInfo | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useToast();
  const [title, setTitle] = useState("");
  const [pic, setPic] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [judging, setJudging] = useState<string | null>(null); // the day being judged
  const [picks, setPicks] = useState<Record<number, string | undefined>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const load = useCallback(() => { api.events().then(setData).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load")); }, []);
  useEffect(load, [load]);

  async function choose(f?: File) {
    if (!f) return;
    try { setPic(await shrink(f)); setError(""); } catch { setError("That picture could not be opened"); }
  }
  async function send() {
    if (!pic) return;
    setBusy(true);
    try { setData(await api.submitArt(title, pic)); setPic(null); setTitle(""); setToast("Your art is in! Good luck 🎨"); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not send"); }
    finally { setBusy(false); }
  }
  async function award(day: string) {
    try {
      setData(await api.judge(day, picks[1], picks[2], picks[3]));
      setJudging(null); setPicks({}); setToast("Prizes awarded 🏆"); notifyChanged();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Could not award"); }
  }
  const pickFor = (id: string) => Number(Object.entries(picks).find(([, v]) => v === id)?.[0] ?? 0);
  function tapToJudge(id: string) {
    const have = pickFor(id);
    if (have) { setPicks({ ...picks, [have]: undefined }); return; }
    const free = [1, 2, 3].find((p) => !picks[p]);
    if (free) setPicks({ ...picks, [free]: id });
  }

  const hero = data ? (data.event ?? data.next) : null;
  const heroBg = useBannerBg(hero);
  if (!data) return <section className="card"><p className={error ? "err" : "note"}>{error || "Loading…"}</p></section>;
  const prizes = hero?.prizes ?? { "1": 100, "2": 50, "3": 25 };
  const fee = data.event?.fee ?? 0;
  const adminDone = (d: EventsInfo, m: string) => { setData(d); setToast(m); setError(""); notifyChanged(); };
  const gallery = (entries: EventEntry[], day: string, judgeable: boolean) => (
    <ul className="ev-gallery">
      {entries.map((e) => {
        const mark = judging === day ? pickFor(e.id) : e.place ?? 0;
        return (
          <li key={e.id} className={`ev-item${mark ? ` placed p${mark}` : ""}${judging === day ? " judging" : ""}`}>
            <button type="button" className="ev-pic" disabled={!(judgeable && judging === day)} onClick={() => tapToJudge(e.id)}
              aria-label={judging === day ? `Pick ${e.member.name}'s art` : e.title || `${e.member.name}'s art`}>
              <Art id={e.id} alt={e.title || `${e.member.name}'s art`} />
              {mark ? <span className="ev-badge">{PLACE[mark as 1 | 2 | 3].medal} {PLACE[mark as 1 | 2 | 3].name}</span> : null}
            </button>
            <div className="ev-cap"><Avatar avatar={e.member.avatar} color="#6b3e1d" size={26} /><b>{e.member.name}</b>{e.title && <small>“{e.title}”</small>}</div>
          </li>
        );
      })}
    </ul>
  );
  const judgeBar = (day: string, count: number) => isAdmin && count > 0 && (
    judging === day ? (
      <div className="ev-judge">
        <p>Tap pictures in order: <b>1st</b>, then <b>2nd</b>, then <b>3rd</b>. Tap again to take a pick back.</p>
        <div className="ad-actions">
          <button className="primary" disabled={!picks[1]} onClick={() => award(day)}>🏆 Award prizes</button>
          <button onClick={() => { setJudging(null); setPicks({}); }}>Cancel</button>
        </div>
      </div>
    ) : <button className="ev-judge-btn" onClick={() => { setJudging(day); setPicks({}); }}>⚖️ Pick the winners</button>
  );

  return (
    <div className="ev">
      {hero && (
      <section className={`ev-hero${data.open ? " live has-timer" : ""}${heroBg.art ? "" : " photo"}`} style={{ background: heroBg.bg }}>
        {heroBg.art && <div className="ev-hero-art" aria-hidden="true">{heroBg.art}</div>}
        <div>
          <p className="ev-kicker">{data.open ? `Open now · until ${closesWhen(data.event!, data.today)}` : `Opens ${opensWhen(hero, data.today)}${oneDay(hero) && !allDay(hero) ? ` · until ${ampm(hero.closes)}` : !oneDay(hero) ? ` · closes ${closesWhen(hero, data.today)}` : ""}`}</p>
          <h1>{hero.title}</h1>
          {hero.prompt ? <p className="ev-theme">Theme: <b>{hero.prompt}</b></p> : null}
          <p className="ev-sub">Make something beautiful, take a photo and send it in. The best three win gems!</p>
          <div className="ev-prizes">
            <span className="gold">🥇 1st <b>{prizes["1"]}</b> <Gem /></span>
            <span className="silver">🥈 2nd <b>{prizes["2"]}</b> <Gem /></span>
            <span className="bronze">🥉 3rd <b>{prizes["3"]}</b> <Gem /></span>
            {<span className="fee">{hero.fee ? <>🎟️ Entry <b>{hero.fee}</b> <Gem /></> : "🎟️ Free entry"}</span>}
          </div>
        </div>
        {data.open && data.event && <div className="ev-ends"><small>Ends in</small>
          <Countdown day={data.event.day} at={data.event.closes} label="Time left to enter" className="ev-count-hero" onEnd={load} skew={boardSkew(data.today, data.clock)} /></div>}
      </section>
      )}
      {error && <p className="err banner" role="alert">{error}</p>}
      {isAdmin && <EventsAdmin data={data} editing={editing} setEditing={setEditing} onDone={adminDone} onError={setError} />}

      {!data.open ? (
        <section className="card ev-closed">
          {data.next ? <>
            <h2>🔒 Opens {opensWhen(data.next, data.today)}</h2>
            <Countdown day={data.next.open_day} at={data.next.opens} skew={boardSkew(data.today, data.clock)} onEnd={load} />
            {!isAdmin && <button className="ev-enter" disabled>📷 Enter the tournament<small>Opens {opensWhen(data.next, data.today)}</small></button>}
            <p className="note">{data.next.prompt ? <>Get ready now: <b>{data.next.prompt}</b></> : <>Get your entry for {data.next.title} ready now.</>}</p>
          </> : <>
            <h2>🗓️ A new tournament is coming soon!</h2>
            <p className="note">{isAdmin ? "Create it above so the kids can see when it opens." : "Keep practising your art. The best three win gems!"}</p>
          </>}
        </section>
      ) : (
        <section className="card ev-open">
          {!isAdmin && (data.mine && !pic ? (
            <div className="ev-mine">
              <Art id={data.mine.id} alt="Your art" className="ev-mine-art" />
              <div>
                <h2>Your entry is in ✓</h2>
                {data.mine.title && <p>“{data.mine.title}”</p>}
                {!data.mine.place && <div className="ad-actions">
                  <button onClick={() => file.current?.click()}>Replace picture</button>
                  <button className="danger" onClick={async () => { try { setData(await api.withdrawArt()); } catch { /* */ } }}>Remove</button>
                </div>}
              </div>
            </div>
          ) : (
            <div className="ev-submit">
              <h2>📷 Enter the tournament</h2>
              {pic ? <img className="art ev-preview" src={pic} alt="Your picture" /> : (
                <button className="ev-drop" onClick={() => file.current?.click()}><span>📷</span><b>Take or choose a photo</b><small>of your art</small></button>
              )}
              <input className="ev-title" maxLength={80} placeholder="Give it a name (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
              <div className="ad-actions">
                <button className="primary" disabled={!pic || busy} onClick={send}>{busy ? "Sending…" : fee ? <>Submit my art · {fee} <Gem /></> : "Submit my art"}</button>
                {pic && <button onClick={() => setPic(null)}>Choose another</button>}
              </div>
              <p className="note">One picture each. You can replace it until {closesWhen(data.event!, data.today)}.{fee ? ` Entering costs ${fee} gems (paid once).` : ""}</p>
            </div>
          ))}
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { choose(e.target.files?.[0]); e.currentTarget.value = ""; }} />
          <div className="ev-head"><h2>Gallery so far</h2><span className="note">{data.current.length} entr{data.current.length === 1 ? "y" : "ies"}</span></div>
          {data.current.some((e) => e.place) && <Podium entries={data.current} />}
          {data.current.length === 0 ? <p className="note">No art yet. Be the first!</p> : gallery(data.current, data.event!.day, true)}
          {judgeBar(data.event!.day, data.current.length)}
        </section>
      )}

      <details className="card ev-rules" open={!isAdmin && !data.mine}>
        <summary><h2>📜 How to take part</h2></summary>
        <ol>
          <li><b>{hero?.prompt ? <>Make: {hero.prompt}</> : <>Make your entry for {hero?.title ?? "the tournament"}.</>}</b> It must be your own work.</li>
          <li><b>Wait for the tournament to open.</b> {hero ? <>Art can be sent from {opensWhen(hero, data.today)} until {closesWhen(hero, data.today)}.</> : "Watch this page for the next one."}</li>
          <li><b>Tap “Enter the tournament”</b>, take a photo of your art (or choose one), give it a name, and send it.{(hero?.fee ?? 0) > 0 ? <> Entering costs <b>{hero!.fee} gems</b>.</> : " It's free."}</li>
          <li><b>One picture each.</b> You can replace it until the tournament closes.</li>
        </ol>
        <p className="note">Be honest: only send art you made yourself. 🤝</p>
      </details>

      {data.past.map((t) => (
        <section key={t.day} className="card ev-past">
          {editing === t.id ? <EventEditor data={data} ev={t} onSaved={(d, m) => { setEditing(null); adminDone(d, m); }} onCancel={() => setEditing(null)} onError={setError} /> : <>
          <div className="ev-head"><h2>{t.title} · {fmt(t.day, { day: "numeric", month: "short" })}</h2><span className="note">{t.entries.length === 0 ? "No entries" : t.judged ? "Winners" : "Waiting for the judges"}</span></div>
          {isAdmin && <div className="ev-past-btns"><button onClick={() => setEditing(t.id)}>Edit</button><button className="danger" onClick={() => removeEvent(t, t.entries.length, adminDone, setError)}>Delete</button></div>}
          </>}
          {t.prompt && <p className="note" style={{ margin: "0 0 8px" }}>Theme: {t.prompt}</p>}
          {t.judged && <Podium entries={t.entries} />}
          <details className="ev-more" open={!t.judged || judging === t.day}>
            <summary>All {t.entries.length} entr{t.entries.length === 1 ? "y" : "ies"}</summary>
            {gallery(t.entries, t.day, true)}
          </details>
          {judgeBar(t.day, t.entries.length)}
        </section>
      ))}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}


/** Events: art tournaments, and the 🤝 Friends quest (the admin launches it when they choose). */
export default function Events() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "friends" ? "friends" : "art";
  const [friendsNew, setFriendsNew] = useState(0);
  const changes = useChangeCounter();
  useEffect(() => {
    api.friends().then((r) => setFriendsNew(r.items.filter((q) => q.mine && ((q.open && q.mine.count === null) || (q.closed && !q.mine.seen))).length)).catch(() => undefined);
  }, [changes]);
  return (
    <>
      <div className="ev-switch" role="tablist" aria-label="Events">
        <button role="tab" aria-selected={tab === "art"} className={tab === "art" ? "on" : ""} onClick={() => setParams({})}>🎨 Art tournaments</button>
        <button role="tab" aria-selected={tab === "friends"} className={tab === "friends" ? "on" : ""} onClick={() => setParams({ tab: "friends" })}>
          🤝 Friends quest{friendsNew > 0 && <i className="red-dot" aria-label="Something new" />}</button>
      </div>
      {tab === "friends" ? <Friends /> : <ArtEvents />}
    </>
  );
}
