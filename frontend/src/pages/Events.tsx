import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type EventEntry, type EventsInfo } from "../api";
import { useAuth } from "../auth";
import Avatar from "../lib/Avatar";
import Gem from "../lib/Gem";
import { fmt } from "../lib/dates";
import { notifyChanged, useToast } from "../lib/events";

/**
 * Events: the Saturday Art Tournament. On Saturday every member can send one picture of their art;
 * parents pick 1st, 2nd and 3rd for 100, 50 and 25 gems.
 */

const PLACE = { 1: { name: "1st", medal: "🥇", cls: "gold" }, 2: { name: "2nd", medal: "🥈", cls: "silver" }, 3: { name: "3rd", medal: "🥉", cls: "bronze" } } as const;
const urls = new Map<string, Promise<string>>();
const artUrl = (id: string) => { if (!urls.has(id)) urls.set(id, api.artUrl(id)); return urls.get(id)!; };

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

function Countdown({ day }: { day: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const target = new Date(`${day}T00:00:00`).getTime();
  const left = Math.max(0, target - now);
  const d = Math.floor(left / 86_400_000), h = Math.floor((left % 86_400_000) / 3_600_000), m = Math.floor((left % 3_600_000) / 60_000);
  return (
    <div className="ev-count" aria-label="Time until the tournament opens">
      <span><b>{d}</b><small>days</small></span><span><b>{h}</b><small>hours</small></span><span><b>{m}</b><small>mins</small></span>
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

function CreateEvent({ data, onDone, onError }: { data: EventsInfo; onDone: (d: EventsInfo, msg: string) => void; onError: (s: string) => void }) {
  const [day, setDay] = useState(data.suggested_day);
  const [title, setTitle] = useState("Saturday Art Tournament");
  const [prompt, setPrompt] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <section className="card ev-admin">
      <div className="ev-head"><h2>Tournaments</h2>{!open && <button className="primary" onClick={() => setOpen(true)}>＋ Create event</button>}</div>
      {open && (
        <form className="ad-form" onSubmit={async (e) => {
          e.preventDefault();
          try { onDone(await api.createEvent(day, title, prompt), `${title} is set for ${fmt(day, { weekday: "long", day: "numeric", month: "short" })}`); setOpen(false); setPrompt(""); }
          catch (err) { onError(err instanceof ApiError ? err.message : "Could not create"); }
        }}>
          <div className="ad-two">
            <label className="field"><span className="field-label">Name</span><input required maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
            <label className="field"><span className="field-label">Day</span><input type="date" required min={data.today} value={day} onChange={(e) => setDay(e.target.value)} />
              <span className="field-hint">{new Date(`${day}T12:00:00`).getDay() === 6 ? "A Saturday ✓" : "Tip: Saturdays are tournament days"}</span></label>
          </div>
          <label className="field"><span className="field-label">Theme for the kids (optional)</span>
            <input maxLength={200} placeholder="e.g. Draw your favourite animal" value={prompt} onChange={(e) => setPrompt(e.target.value)} /></label>
          <div className="ad-actions"><button className="primary">Create event</button><button type="button" onClick={() => setOpen(false)}>Cancel</button></div>
        </form>
      )}
      {data.upcoming.length > 0 ? (
        <ul className="ev-up">
          {data.upcoming.map((u) => (
            <li key={u.id}>
              <span><b>{u.title}</b> · {fmt(u.day, { weekday: "short", day: "numeric", month: "short" })}{u.day === data.today ? " · on now" : ""}{u.prompt && <small>Theme: {u.prompt}</small>}</span>
              {u.day !== data.today && <button className="danger" onClick={async () => { try { onDone(await api.deleteEvent(u.id), "Event removed"); } catch (err) { onError(err instanceof ApiError ? err.message : "Could not remove"); } }}>Remove</button>}
            </li>
          ))}
        </ul>
      ) : !open && <p className="note">No tournaments planned. Create one so the kids have something to look forward to!</p>}
    </section>
  );
}

export default function Events() {
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

  if (!data) return <section className="card"><p className={error ? "err" : "note"}>{error || "Loading…"}</p></section>;
  const prizes = data.prizes;
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
      <section className={`ev-hero${data.open ? " live" : ""}`}>
        <div className="ev-hero-art" aria-hidden="true">🎨</div>
        <div>
          <p className="ev-kicker">{data.open ? "● Live today" : data.next ? `Next: ${fmt(data.next.day, { weekday: "long", day: "numeric", month: "short" })}` : "Art tournaments"}</p>
          <h1>{(data.event ?? data.next)?.title ?? "Art Tournament"}</h1>
          {(data.event ?? data.next)?.prompt ? <p className="ev-theme">Theme: <b>{(data.event ?? data.next)!.prompt}</b></p> : null}
          <p className="ev-sub">Make something beautiful, take a photo and send it in. The best three win gems!</p>
          <div className="ev-prizes">
            <span className="gold">🥇 1st <b>{prizes["1"]}</b> <Gem /></span>
            <span className="silver">🥈 2nd <b>{prizes["2"]}</b> <Gem /></span>
            <span className="bronze">🥉 3rd <b>{prizes["3"]}</b> <Gem /></span>
          </div>
        </div>
      </section>
      {error && <p className="err banner" role="alert">{error}</p>}
      {isAdmin && <CreateEvent data={data} onDone={(d, m) => { setData(d); setToast(m); setError(""); }} onError={setError} />}

      {!data.open ? (
        <section className="card ev-closed">
          {data.next ? <>
            <h2>🔒 Opens {fmt(data.next.day, { weekday: "long", day: "numeric", month: "short" })}</h2>
            <Countdown day={data.next.day} />
            <p className="note">Get your art ready: drawing, painting, calligraphy, a model… anything you made yourself.</p>
          </> : <>
            <h2>🔒 No tournament scheduled yet</h2>
            <p className="note">{isAdmin ? "Create one above." : "Ask your parents to set one up. Meanwhile, keep practising your art!"}</p>
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
              <h2>Send your art</h2>
              {pic ? <img className="art ev-preview" src={pic} alt="Your picture" /> : (
                <button className="ev-drop" onClick={() => file.current?.click()}><span>📷</span><b>Take or choose a photo</b><small>of your art</small></button>
              )}
              <input className="ev-title" maxLength={80} placeholder="Give it a name (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
              <div className="ad-actions">
                <button className="primary" disabled={!pic || busy} onClick={send}>{busy ? "Sending…" : "Submit my art"}</button>
                {pic && <button onClick={() => setPic(null)}>Choose another</button>}
              </div>
              <p className="note">One picture each. You can replace it until the end of Saturday.</p>
            </div>
          ))}
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { choose(e.target.files?.[0]); e.currentTarget.value = ""; }} />
          <div className="ev-head"><h2>Today's gallery</h2><span className="note">{data.current.length} entr{data.current.length === 1 ? "y" : "ies"}</span></div>
          {data.current.some((e) => e.place) && <Podium entries={data.current} />}
          {data.current.length === 0 ? <p className="note">No art yet. Be the first!</p> : gallery(data.current, data.today, true)}
          {judgeBar(data.today, data.current.length)}
        </section>
      )}

      {data.past.map((t) => (
        <section key={t.day} className="card ev-past">
          <div className="ev-head"><h2>{t.title} · {fmt(t.day, { day: "numeric", month: "short" })}</h2><span className="note">{t.entries.length === 0 ? "No entries" : t.judged ? "Winners" : "Waiting for the judges"}</span></div>
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
