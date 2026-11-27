import { useEffect, useRef, useState } from "react";
import { api, ApiError, type News, type NewsIn } from "../api";
import { notifyChanged, useToast } from "../lib/events";
import Avatar from "../lib/Avatar";
import Gem from "../lib/Gem";
import Medal from "../lib/Medal";

/**
 * Community: the family's feed. Posts from the parents, and posts the app writes when something happens
 * (a new picture, a 1st place, a deal with Shaytan). Filter by kind, ❤️ posts (double-tap works too).
 */
type Look = { name: string; avatar: string; frame: string; parent?: boolean };
type Filter = "all" | "post" | "picture" | "win" | "achievement" | "shaytan";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" }, { key: "post", label: "📣 News" }, { key: "picture", label: "🖼️ Pictures" },
  { key: "win", label: "🥇 Winners" }, { key: "achievement", label: "🏅 Achievements" }, { key: "shaytan", label: "😈 Shaytan" },
];
const EMOJIS = ["📣", "🎉", "🏆", "📅", "🕌", "⚠️", "🎁", "❤️", "🌙", "⭐"];
const blank: NewsIn = { title: "", body: "", emoji: "📣", pinned: false };

function when(iso: string) {
  const d = new Date(iso), mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)} h ago`;
  const days = Math.floor(mins / 1440);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** A tournament picture (fetched with the sign-in, like on the Events page). */
function Art({ id, alt }: { id: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { let live = true; api.artUrl(id).then((u) => live && setSrc(u)).catch(() => undefined); return () => { live = false; }; }, [id]);
  return src ? <img className="cm-art" src={src} alt={alt} /> : <span className="cm-art wait" aria-label={alt} />;
}

function Face({ look, size }: { look: Look; size: number }) {
  return look.parent ? <span className="cm-parent" style={{ width: size, height: size, fontSize: size * 0.55 }} aria-hidden="true">👑</span>
    : <Avatar avatar={look.avatar} color="#ffffff" frame={look.frame} size={size} />;
}

function Likes({ n, onLike, burst }: { n: News & { liker_looks?: Look[] }; onLike: () => void; burst: boolean }) {
  const looks = n.liker_looks ?? [];
  return (
    <div className="cm-likes">
      <button className={`cm-like${n.liked ? " on" : ""}`} onClick={onLike} aria-pressed={n.liked} aria-label={n.liked ? "Unlike" : "Like"}>
        <span className={`cm-heart${burst ? " burst" : ""}`} aria-hidden="true">{n.liked ? "❤️" : "🤍"}</span>{n.likes > 0 ? <b>{n.likes}</b> : <span>Like</span>}
      </button>
      {looks.length > 0 && (
        <span className="cm-likers">
          <span className="cm-faces">{looks.slice(0, 5).map((l, i) => <span key={i} className="cm-face"><Face look={l} size={24} /></span>)}</span>
          <small>{looks.slice(0, 2).map((l) => l.name).join(", ")}{n.likes > 2 ? ` +${n.likes - 2}` : ""}</small>
        </span>
      )}
    </div>
  );
}

export default function NewsPage({ admin }: { admin: boolean }) {
  const [items, setItems] = useState<(News & { liker_looks?: Look[] })[] | null>(null);
  const [family, setFamily] = useState<Look[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState("");
  const [form, setForm] = useState<NewsIn>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [burst, setBurst] = useState<string | null>(null);
  const [toast, setToast] = useToast();
  const lastTap = useRef<{ id: string; t: number } | null>(null);

  const load = () => api.news().then((n) => {
    setItems(n.items);
    setFamily(n.family ?? []);
    if (!admin && n.unread > 0) api.newsSeen().then(notifyChanged).catch(() => undefined);
  }).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load the feed"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title.trim()) return;
    try {
      if (editing) await api.editNews(editing, form); else await api.addNews(form);
      setToast(editing ? "Post updated" : "Posted 📣");
      setForm(blank); setEditing(null); setOpen(false); setError("");
      load();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Could not save"); }
  };
  const edit = (n: News) => {
    setForm({ title: n.title, body: n.body, emoji: n.emoji, pinned: n.pinned });
    setEditing(n.id); setOpen(true); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const remove = async (n: News) => {
    if (!confirm(`Delete “${n.title}”?`)) return;
    await api.deleteNews(n.id).catch(() => undefined);
    setToast("Deleted"); load();
  };
  const like = async (n: News) => {
    if (!n.liked) { setBurst(n.id); window.setTimeout(() => setBurst((b) => (b === n.id ? null : b)), 700); }
    setItems((xs) => xs && xs.map((x) => x.id === n.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x));
    try { await api.likeNews(n.id); load(); } catch { load(); }
  };
  // "Left the kitten" posts: 👎 😤 😠 instead of ❤️ (one each; tap the same again to take it back).
  const react = async (n: News, r: string) => {
    setItems((xs) => xs && xs.map((x) => {
      if (x.id !== n.id) return x;
      const re = { ...(x.reactions ?? {}) };
      if (x.my_reaction) re[x.my_reaction] = Math.max(0, (re[x.my_reaction] ?? 1) - 1);
      const mine = x.my_reaction === r ? "" : r;
      if (mine) re[mine] = (re[mine] ?? 0) + 1;
      return { ...x, reactions: re, my_reaction: mine };
    }));
    try { await api.likeNews(n.id, r); load(); } catch { load(); }
  };
  // Double-tap a post to like it.
  const tap = (n: News) => {
    if (n.kind === "kitten") return;
    const now = Date.now(), l = lastTap.current;
    if (l && l.id === n.id && now - l.t < 350) { lastTap.current = null; if (!n.liked) void like(n); else { setBurst(n.id); window.setTimeout(() => setBurst(null), 700); } }
    else lastTap.current = { id: n.id, t: now };
  };
  const togglePin = async (n: News) => { await api.editNews(n.id, { pinned: !n.pinned }).catch(() => undefined); load(); };

  const shown = (items ?? []).filter((n) => filter === "all" || (n.kind || "post") === filter);
  const totalLikes = (items ?? []).reduce((s, n) => s + n.likes, 0);
  const count = (f: Filter) => (items ?? []).filter((n) => f === "all" || (n.kind || "post") === f).length;

  const author = (n: News & { member: News["member"] }) => {
    if ((n.kind === "picture" || n.kind === "win" || n.kind === "shaytan" || n.kind === "achievement" || n.kind === "kitten") && n.member) return { look: { name: n.member.name, avatar: n.member.avatar, frame: n.member.frame } as Look, name: n.member.name, tag: null };
    return { look: { name: n.author || "Admin", avatar: "", frame: "", parent: true } as Look, name: n.author || "Admin", tag: "Admin" };
  };

  return (
    <section className="cm">
      <div className="cm-hero">
        <div className="cm-hero-top">
          <h2>🏘️ Community</h2>
          <span className="cm-stats"><b>{items?.length ?? 0}</b> posts · <b>{totalLikes}</b> ❤️</span>
        </div>
        <div className="cm-family" aria-label="The family">
          {family.map((f, i) => <span key={i} className="cm-member" title={f.name} style={{ animationDelay: `${i * 60}ms` }}><Face look={f} size={44} /><small>{f.name}</small></span>)}
        </div>
      </div>

      {admin && !open && (
        <button className="cm-compose" onClick={() => { setForm(blank); setEditing(null); setOpen(true); }}>
          <span className="cm-parent" style={{ width: 40, height: 40, fontSize: 22 }} aria-hidden="true">👑</span>
          <span>What's new in the family?</span>
        </button>
      )}
      {admin && open && (
        <form className="card news-form cm-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="news-emojis" role="radiogroup" aria-label="Icon">
            {EMOJIS.map((em) => (
              <button type="button" key={em} role="radio" aria-checked={form.emoji === em}
                className={form.emoji === em ? "on" : ""} onClick={() => setForm({ ...form, emoji: em })}>{em}</button>
            ))}
          </div>
          <input autoFocus maxLength={120} placeholder="Title, e.g. Family trip on Sunday" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} aria-label="Title" />
          <textarea rows={4} maxLength={4000} placeholder="Details (optional)" value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })} aria-label="Details" />
          <label className="news-pin"><input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /> 📌 Pin to the top</label>
          <div className="row">
            <button className="primary" disabled={!form.title.trim()}>{editing ? "Save" : "Post"}</button>
            <button type="button" onClick={() => { setOpen(false); setEditing(null); setForm(blank); }}>Cancel</button>
          </div>
        </form>
      )}

      <div className="cm-filters" role="tablist" aria-label="Show">
        {FILTERS.filter((f) => f.key === "all" || count(f.key) > 0).map((f) => (
          <button key={f.key} role="tab" aria-selected={filter === f.key} className={filter === f.key ? "on" : ""} onClick={() => setFilter(f.key)}>
            {f.label} <small>{count(f.key)}</small>
          </button>
        ))}
      </div>
      {error && <p className="err">{error}</p>}

      {items === null ? <p className="note">Loading…</p> : shown.length === 0 ? (
        <div className="card news-empty"><span>📭</span><p>Nothing here yet.</p></div>
      ) : shown.map((n) => {
        const a = author(n);
        const kind = n.kind || "post";
        return (
          <article key={n.id} className={`cm-post k-${kind}${n.pinned ? " pinned" : ""}${n.new ? " fresh" : ""}`} onClick={() => tap(n)}>
            {burst === n.id && <span className="cm-bigheart" aria-hidden="true">❤️</span>}
            <header className="cm-head">
              <Face look={a.look} size={42} />
              <span className="cm-by">
                <b>{a.name}{a.tag && <em className="cm-tag">{a.tag}</em>}</b>
                <small>{when(n.created_at)}{kind !== "post" ? " · by Honor" : ""}</small>
              </span>
              {n.pinned && <span className="cm-pin">📌 Pinned</span>}
              {n.new && <span className="news-new">New</span>}
            </header>

            {kind === "picture" && n.member && (
              <div className="cm-body pic">
                <div className="cm-pic-stage"><Avatar avatar={n.data.avatar ?? n.member.avatar} color="#ffffff" frame={n.member.frame} size={120} /></div>
                <p className="cm-text">🖼️ <b>{n.member.name}</b>{n.data.picture ? <> is now the <b className="hl">{n.data.picture}</b>!</> : " has a new picture!"}</p>
              </div>
            )}
            {kind === "win" && n.member && (
              <div className="cm-body win">
                <p className="cm-text big">🥇 <b>{n.member.name}</b> won 1st place{n.data.event ? <> in <b>{n.data.event}</b></> : null}!</p>
                {n.data.entry_id && <figure className="cm-figure"><Art id={n.data.entry_id} alt={n.data.art || "The winning picture"} />
                  <figcaption>{n.data.art ? <>“{n.data.art}”</> : <span />}{n.data.gems ? <span className="cm-prize">+{n.data.gems} <Gem /></span> : null}</figcaption></figure>}
              </div>
            )}
            {kind === "achievement" && n.member && (
              <div className="cm-body achpost">
                <p className="cm-text big">🏅 <b>{n.member.name}</b> earned {(n.data.items?.length ?? 0) > 1 ? <>{n.data.items!.length} achievements</> : <b className="hl">{n.data.items?.[0]?.name}</b>}!</p>
                <ul className="cm-achs">
                  {(n.data.items ?? []).map((a) => (
                    <li key={a.key} className={`cm-ach t-${a.tier}`}>
                      <Medal icon={a.icon} tier={a.tier} size={52} />
                      <span><b>{a.name}</b><small>{a.tier_name} · +{a.gems} <Gem /></small></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {kind === "kitten" && (
              <div className="cm-body kitten">
                <div className="cm-desert" aria-hidden="true"><span className="cm-desert-sun" /><span>🌵</span><span className="cm-desert-cat">😿</span></div>
                <p className="cm-text big">{n.title}</p>
                {n.body && <p className="cm-text">{n.body}</p>}
              </div>
            )}
            {kind === "shaytan" && (
              <div className="cm-body shaytan">
                <p className="cm-text big">😈 {n.title}</p>
                {n.body && <p className="cm-text">{n.body}</p>}
              </div>
            )}
            {kind === "post" && (
              <div className="cm-body post">
                <p className="cm-text big"><span className="cm-emoji" aria-hidden="true">{n.emoji}</span> {n.title}</p>
                {n.body && <p className="cm-text">{n.body}</p>}
              </div>
            )}

            <footer className="cm-foot" onClick={(e) => e.stopPropagation()}>
              {kind === "kitten" ? (
                <span className="cm-reacts" role="group" aria-label="React">
                  {["👎", "😤", "😠"].map((r) => (
                    <button key={r} className={`cm-react${n.my_reaction === r ? " on" : ""}`} aria-pressed={n.my_reaction === r} onClick={() => react(n, r)}>
                      <span aria-hidden="true">{r}</span><b>{n.reactions?.[r] ?? 0}</b>
                    </button>
                  ))}
                </span>
              ) : <Likes n={n} onLike={() => like(n)} burst={burst === n.id} />}
              {admin && (
                <span className="news-tools">
                  {kind === "post" && <button onClick={() => edit(n)}>Edit</button>}
                  {kind === "post" && <button onClick={() => togglePin(n)}>{n.pinned ? "Unpin" : "Pin"}</button>}
                  <button className="danger" onClick={() => remove(n)}>Delete</button>
                </span>
              )}
            </footer>
          </article>
        );
      })}
      {toast && <div className="toast" role="status">{toast}</div>}
    </section>
  );
}
