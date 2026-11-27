import { useEffect, useMemo, useState } from "react";
import { api, ApiError, type AdminMember, type FriendPerson, type FriendQuest } from "../api";
import { useAuth } from "../auth";
import Avatar from "../lib/Avatar";
import Gem from "../lib/Gem";
import { confetti } from "../lib/confetti";
import { notifyChanged } from "../lib/events";

/**
 * 🤝 Friends quest. Members are put in pairs. Each pair reads the dhikr together and seals their count in an
 * envelope (a blind bid: nobody sees another pair's number). When the admin opens the envelopes, the biggest
 * count wins 1st prize, then 2nd, then 3rd, and both friends in a pair get the gems.
 */
const MEDAL = ["🥇", "🥈", "🥉"];
const place = (n: number | null) => (n ? MEDAL[n - 1] ?? `#${n}` : "—");
const msg = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong");

function Pair({ people, size = 40 }: { people: FriendPerson[]; size?: number }) {
  return (
    <span className="fq-pair">
      {people.map((p, i) => (
        <span key={p.id} className="fq-friend" style={{ zIndex: people.length - i }}>
          <Avatar avatar={p.avatar} color="#7c5cff" size={size} />
        </span>
      ))}
      <b>{people.map((p) => p.name).join(" & ")}</b>
    </span>
  );
}

function closesIn(iso: string | null) {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "closed";
  const h = Math.floor(ms / 3_600_000), d = Math.floor(h / 24);
  return d >= 1 ? `closes in ${d} day${d === 1 ? "" : "s"}` : h >= 1 ? `closes in ${h} h` : `closes in ${Math.max(1, Math.round(ms / 60000))} min`;
}

function Prizes({ q }: { q: FriendQuest }) {
  return (
    <div className="fq-prizes">
      {q.prizes.map((g, i) => <span key={i} className={`fq-prize p${i + 1}`}>{MEDAL[i] ?? `#${i + 1}`} <b>+{g}</b> <Gem /> <small>each</small></span>)}
    </div>
  );
}

/** The envelopes open one by one, from last place up, then the winners stand on the podium. */
function Reveal({ q, onDone }: { q: FriendQuest; onDone: () => void }) {
  const ranked = q.teams.filter((t) => t.count !== null && t.place);
  const order = [...ranked].reverse();
  const [shown, setShown] = useState(0);
  const [podium, setPodium] = useState(false);
  useEffect(() => {
    if (shown < order.length) { const t = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 900 : 1500); return () => window.clearTimeout(t); }
    const t = window.setTimeout(() => { setPodium(true); confetti(["#ffd24a", "#7c5cff", "#4aa8ff", "#ff7aa8"]); }, 900);
    return () => window.clearTimeout(t);
  }, [shown, order.length]);
  const top = ranked.filter((t) => (t.place ?? 9) <= 3);
  return (
    <div className="fq-reveal" role="dialog" aria-modal="true" aria-labelledby="fq-rv-h">
      <div className="fq-rv-sky" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div>
      <div className="fq-rv-card">
        <p className="fq-kicker">🤝 {q.title}</p>
        <h2 id="fq-rv-h">{podium ? "The winners!" : "Opening the envelopes…"}</h2>
        {!podium ? (
          <ul className="fq-env-list">
            {order.map((t, i) => (
              <li key={t.id} className={`fq-env${i < shown ? " open" : ""}${t.mine ? " mine" : ""}`}>
                <span className="fq-env-box" aria-hidden="true"><span className="fq-env-flap" /><span className="fq-env-seal">✉️</span></span>
                <Pair people={t.members} size={30} />
                <span className="fq-env-count">{i < shown ? <><b>{t.count}</b> {place(t.place)}</> : "🔒"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="fq-podium">
            {[2, 1, 3].map((p) => {
              const teams = top.filter((t) => t.place === p);
              return (
                <div key={p} className={`fq-step s${p}`}>
                  {teams.map((t) => (
                    <div key={t.id} className={`fq-winner${t.mine ? " mine" : ""}`}>
                      <span className="fq-winner-faces">{t.members.map((m) => <Avatar key={m.id} avatar={m.avatar} color="#7c5cff" size={p === 1 ? 54 : 44} />)}</span>
                      <small>{t.members.map((m) => m.name).join(" & ")}</small>
                      <b>{t.count}</b>
                    </div>
                  ))}
                  <div className="fq-block"><span>{MEDAL[p - 1]}</span>{teams[0] && <small>+{teams[0].gems} <Gem /></small>}</div>
                </div>
              );
            })}
          </div>
        )}
        {podium && q.mine && (
          <p className="fq-you">{q.mine.place ? <>You and your friend came <b>{place(q.mine.place)} {q.mine.place === 1 ? "first" : q.mine.place === 2 ? "second" : q.mine.place === 3 ? "third" : `#${q.mine.place}`}</b>{q.mine.gems ? <> · +{q.mine.gems} <Gem /> each!</> : "."}</> : "Your pair didn't seal a count this time."}</p>
        )}
        {(podium || shown >= order.length) && <button className="primary" autoFocus onClick={onDone}>{podium ? "Alhamdulillah ✨" : "Skip"}</button>}
        {!podium && shown < order.length && <button className="fq-skip" onClick={() => setShown(order.length)}>Skip</button>}
      </div>
    </div>
  );
}

function MemberQuest({ q, onChange }: { q: FriendQuest; onChange: (q: FriendQuest) => void }) {
  const mine = q.mine!;
  const [val, setVal] = useState(mine.count !== null ? String(mine.count) : "");
  const [editing, setEditing] = useState(mine.count === null);
  const [error, setError] = useState("");
  const [sealing, setSealing] = useState(false);
  const seal = async () => {
    try {
      setSealing(true);
      const r = await api.friendBid(q.id, Number(val));
      window.setTimeout(() => { onChange(r); setEditing(false); setSealing(false); notifyChanged(); }, 900);
      setError("");
    } catch (e) { setError(msg(e)); setSealing(false); }
  };
  return (
    <article className={`card fq-card${q.closed ? " closed" : ""}`}>
      <header className="fq-head">
        <div><h3>{q.title}</h3>{q.dhikr && <p className="fq-dhikr">📿 Read together: <b>{q.dhikr}</b></p>}</div>
        <span className={`fq-state${q.open ? " on" : ""}`}>{q.closed ? "Results" : q.open ? closesIn(q.closes_at) || "Open" : "Waiting for results"}</span>
      </header>
      <Prizes q={q} />
      <div className="fq-team"><small>Your pair</small><Pair people={mine.members} /></div>
      {q.closed ? (
        <ol className="fq-results">
          {q.teams.map((t) => (
            <li key={t.id} className={t.mine ? "mine" : ""}><span className="fq-pl">{place(t.place)}</span><Pair people={t.members} size={28} />
              <span className="fq-n">{t.count ?? "—"}</span>{t.gems > 0 && <span className="fq-g">+{t.gems} <Gem /></span>}</li>
          ))}
        </ol>
      ) : !q.open ? <p className="note">The envelopes are closed. Wait for the admin to open them! 📬</p>
      : editing ? (
        <form className={`fq-bid${sealing ? " sealing" : ""}`} onSubmit={(e) => { e.preventDefault(); void seal(); }}>
          <label htmlFor={`fq-${q.id}`}>How many did you read together?</label>
          <div className="fq-bid-row">
            <input id={`fq-${q.id}`} type="number" min={0} inputMode="numeric" required value={val} onChange={(e) => setVal(e.target.value)} placeholder="0" />
            <button className="primary" disabled={val === "" || sealing}>🔒 Seal our count</button>
          </div>
          <p className="note">Sealed and secret: no other pair can see it. You can change it until the quest closes. Be honest — Allah sees all 🤍</p>
          <span className="fq-envelope-fly" aria-hidden="true">✉️</span>
        </form>
      ) : (
        <div className="fq-sealed">
          <span className="fq-sealed-env" aria-hidden="true">✉️<i>🔒</i></span>
          <div><b>Sealed: {mine.count}</b><small>{mine.entered_by ? `entered by ${mine.entered_by}` : ""}</small></div>
          <button onClick={() => setEditing(true)}>Change</button>
        </div>
      )}
      {!q.closed && (
        <div className="fq-others" aria-label={`${q.entered} of ${q.teams_total} pairs have sealed their count`}>
          {q.teams.map((t) => <span key={t.id} className={`fq-mini${t.entered ? " in" : ""}`} title={t.entered ? "Sealed" : "Not yet"}>{t.entered ? "✉️" : "⬜"}</span>)}
          <small>{q.entered} of {q.teams_total} pairs sealed</small>
        </div>
      )}
      {error && <p className="err">{error}</p>}
    </article>
  );
}

/** Pairs for a new quest: shuffle at random, then change any slot. */
function NewQuest({ people, onMade }: { people: AdminMember[]; onMade: () => void }) {
  const shuffle = () => {
    const ids = people.map((p) => p.id).sort(() => Math.random() - 0.5);
    const teams: string[][] = [];
    for (let i = 0; i + 1 < ids.length; i += 2) teams.push([ids[i], ids[i + 1]]);
    if (ids.length % 2) { if (teams.length) teams[teams.length - 1].push(ids[ids.length - 1]); else teams.push([ids[ids.length - 1]]); }
    return teams;
  };
  const [title, setTitle] = useState("Darood together");
  const [dhikr, setDhikr] = useState("Darood Sharif");
  const [prizes, setPrizes] = useState(["100", "60", "30"]);
  const [closes, setCloses] = useState("");
  const [when, setWhen] = useState<"now" | "later" | "hold">("now");
  const [opens, setOpens] = useState("");
  const [teams, setTeams] = useState<string[][]>(() => shuffle());
  const [error, setError] = useState("");
  useEffect(() => { setTeams(shuffle()); }, [people.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const name = (id: string) => people.find((p) => p.id === id)?.name ?? "?";
  const used = teams.flat();
  const swap = (ti: number, si: number, id: string) => setTeams((ts) => {
    const next = ts.map((t) => [...t]);
    const other = next.findIndex((t) => t.includes(id));
    if (other >= 0) next[other][next[other].indexOf(id)] = next[ti][si]; // swap places with whoever had them
    next[ti][si] = id;
    return next;
  });
  const left = people.filter((p) => !used.includes(p.id));
  const make = async () => {
    try {
      await api.addFriends({ title, dhikr, prizes: prizes.map((x) => Math.max(0, Number(x) || 0)),
        closes_at: closes ? new Date(closes).toISOString() : null, teams: teams.filter((t) => t.length),
        launch_now: when === "now", opens_at: when === "later" && opens ? new Date(opens).toISOString() : null });
      setError(""); onMade();
    } catch (e) { setError(msg(e)); }
  };
  return (
    <form className="card fq-new" onSubmit={(e) => { e.preventDefault(); void make(); }}>
      <h3>➕ New Friends quest</h3>
      <div className="fq-new-grid">
        <label>Name<input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} required /></label>
        <label>What to read together<input value={dhikr} maxLength={160} onChange={(e) => setDhikr(e.target.value)} placeholder="e.g. Darood Sharif" /></label>
        <label>Envelopes close (optional)<input type="datetime-local" value={closes} onChange={(e) => setCloses(e.target.value)} /></label>
      </div>
      <div className="fq-launch" role="radiogroup" aria-label="When it launches">
        <span>🚀 Launch:</span>
        {([["now", "Right now"], ["later", "At a time I choose"], ["hold", "Keep it ready, I'll launch it"]] as const).map(([k, l]) => (
          <label key={k} className={when === k ? "on" : ""}><input type="radio" name="fq-when" checked={when === k} onChange={() => setWhen(k)} /> {l}</label>
        ))}
        {when === "later" && <input type="datetime-local" required value={opens} onChange={(e) => setOpens(e.target.value)} aria-label="Launch time" />}
      </div>
      <div className="fq-new-prizes">
        <span>Prizes (each friend gets it):</span>
        {prizes.map((p, i) => (
          <label key={i} className="fq-new-prize">{MEDAL[i] ?? `#${i + 1}`}<input type="number" min={0} value={p} aria-label={`Prize for place ${i + 1}`}
            onChange={(e) => setPrizes(prizes.map((x, j) => j === i ? e.target.value : x))} /><Gem /></label>
        ))}
        {prizes.length < 6 && <button type="button" onClick={() => setPrizes([...prizes, "10"])}>+ place</button>}
        {prizes.length > 1 && <button type="button" onClick={() => setPrizes(prizes.slice(0, -1))}>− place</button>}
      </div>
      <div className="fq-new-teams">
        <div className="fq-new-teams-head"><b>Pairs</b><button type="button" onClick={() => setTeams(shuffle())}>🎲 Shuffle pairs</button></div>
        <div className="fq-new-team-list">
          {teams.map((t, ti) => (
            <div key={ti} className="fq-new-team">
              <span className="fq-new-n">{ti + 1}</span>
              {t.map((id, si) => (
                <select key={si} value={id} aria-label={`Pair ${ti + 1}, friend ${si + 1}`} onChange={(e) => swap(ti, si, e.target.value)}>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              ))}
              {t.length > 1 && <button type="button" aria-label={`Take ${name(t[t.length - 1])} out of pair ${ti + 1}`} onClick={() => setTeams(teams.map((x, j) => j === ti ? x.slice(0, -1) : x))}>✕</button>}
            </div>
          ))}
        </div>
        {left.length > 0 && <p className="note">Not in a pair: {left.map((p) => (
          <button key={p.id} type="button" className="fq-left" onClick={() => setTeams([...teams, [p.id]])}>+ {p.name}</button>))}</p>}
      </div>
      {error && <p className="err">{error}</p>}
      <button className="primary" disabled={!title.trim() || !teams.length}>{when === "now" ? "🚀 Launch the quest" : "💾 Save the quest"}</button>
    </form>
  );
}

function AdminQuest({ q, onChange }: { q: FriendQuest; onChange: () => void }) {
  const [error, setError] = useState("");
  const [rev, setRev] = useState<FriendQuest | null>(null);
  const open = async () => {
    if (!confirm(`Open the envelopes for “${q.title}”? The quest closes and the prizes are given.`)) return;
    try { setRev(await api.closeFriends(q.id)); notifyChanged(); } catch (e) { setError(msg(e)); }
  };
  const [at, setAt] = useState("");
  const launch = async (when: string | null) => {
    try { await api.launchFriends(q.id, when ? new Date(when).toISOString() : null); notifyChanged(); onChange(); } catch (e) { setError(msg(e)); }
  };
  const del = async () => { if (confirm("Delete this Friends quest?")) { try { await api.deleteFriends(q.id); onChange(); } catch (e) { setError(msg(e)); } } };
  return (
    <article className={`card fq-card${q.closed ? " closed" : ""}`}>
      <header className="fq-head">
        <div><h3>{q.title}</h3>{q.dhikr && <p className="fq-dhikr">📿 {q.dhikr}</p>}</div>
        <span className={`fq-state${q.open ? " on" : ""}${!q.launched && !q.closed ? " wait" : ""}`}>{q.closed ? "Closed" : !q.launched ? (q.opens_at ? `🚀 Launches ${new Date(q.opens_at).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : "Not launched yet") : q.open ? closesIn(q.closes_at) || "Open" : "Time's up: open the envelopes"}</span>
      </header>
      {!q.launched && !q.closed && (
        <div className="fq-launch-box">
          <p className="note" style={{ margin: 0 }}>Members can't see it yet. Launch it when you're ready:</p>
          <div className="row">
            <button className="primary" onClick={() => void launch(null)}>🚀 Launch now</button>
            <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} aria-label="Launch at" />
            <button disabled={!at} onClick={() => void launch(at)}>Set launch time</button>
          </div>
        </div>
      )}
      <Prizes q={q} />
      <ol className="fq-results">
        {q.teams.map((t) => (
          <li key={t.id}><span className="fq-pl">{q.closed ? place(t.place) : t.entered ? "✉️" : "⬜"}</span><Pair people={t.members} size={28} />
            <span className="fq-n">{t.count ?? "—"}</span>{t.gems > 0 && <span className="fq-g">+{t.gems} <Gem /></span>}</li>
        ))}
      </ol>
      {!q.closed && (
        <div className="row">
          {q.launched && <button className="primary" onClick={() => void open()}>📬 Open the envelopes &amp; give prizes</button>}
          <button className="danger" onClick={() => void del()}>Delete</button>
        </div>
      )}
      {error && <p className="err">{error}</p>}
      {rev && <Reveal q={rev} onDone={() => { setRev(null); onChange(); }} />}
    </article>
  );
}

export default function Friends() {
  const { viewer } = useAuth();
  const admin = !!viewer?.is_admin;
  const [items, setItems] = useState<FriendQuest[] | null>(null);
  const [people, setPeople] = useState<AdminMember[]>([]);
  const [error, setError] = useState("");
  const [making, setMaking] = useState(false);
  const [reveal, setReveal] = useState<FriendQuest | null>(null);
  const load = () => api.friends().then((r) => {
    setItems(r.items);
    if (!admin) setReveal((cur) => cur ?? r.items.find((q) => q.closed && q.mine && !q.mine.seen) ?? null);
  }).catch((e) => setError(msg(e)));
  useEffect(() => { void load(); if (admin) api.members().then((ms) => setPeople(ms.filter((m) => m.active))).catch(() => undefined); }, [admin]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = useMemo(() => (items ?? []).filter((q) => !q.closed), [items]);
  const past = useMemo(() => (items ?? []).filter((q) => q.closed), [items]);

  return (
    <section className="fq">
      <div className="fq-hero">
        <div className="fq-hero-art" aria-hidden="true"><span className="fq-h1">🧑</span><span className="fq-hh">🤝</span><span className="fq-h2">🧒</span><span className="fq-hb">📿</span></div>
        <h2>Friends Quest</h2>
        <p>Read together with your friend, seal your count in an envelope, and win gems together. Nobody sees the other envelopes until they're opened!</p>
      </div>
      {error && <p className="err">{error}</p>}
      {admin && (making ? <NewQuest people={people} onMade={() => { setMaking(false); void load(); notifyChanged(); }} />
        : <button className="primary fq-make" onClick={() => setMaking(true)}>➕ New Friends quest</button>)}
      {items === null ? <p className="note">Loading…</p> : items.length === 0 ? (
        <div className="card news-empty"><span>🤝</span><p>{admin ? "No Friends quest yet. Start one above!" : "No Friends quest right now. The admin will pair you up soon!"}</p></div>
      ) : (
        <>
          {open.map((q) => admin ? <AdminQuest key={q.id} q={q} onChange={() => void load()} />
            : <MemberQuest key={q.id + (q.mine?.count ?? "")} q={q} onChange={(n) => setItems((xs) => xs && xs.map((x) => x.id === n.id ? n : x))} />)}
          {past.length > 0 && <h3 className="fq-sub">Past quests</h3>}
          {past.map((q) => admin ? <AdminQuest key={q.id} q={q} onChange={() => void load()} /> : <MemberQuest key={q.id} q={q} onChange={() => undefined} />)}
        </>
      )}
      {reveal && <Reveal q={reveal} onDone={async () => { const id = reveal.id; setReveal(null); await api.friendsSeen(id).catch(() => undefined); notifyChanged(); void load(); }} />}
    </section>
  );
}
