import { useEffect, useState } from "react";
import { api, ApiError, type News, type NewsIn } from "../api";
import { notifyChanged, useToast } from "../lib/events";
import Avatar from "../lib/Avatar";
import Gem from "../lib/Gem";

/** Community: posts from the parents and from the app (new pictures, 1st places). Everyone can ❤️ them. */

/** A tournament picture (fetched with the sign-in, like on the Events page). */
function Art({ id, alt }: { id: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { let live = true; api.artUrl(id).then((u) => live && setSrc(u)).catch(() => undefined); return () => { live = false; }; }, [id]);
  return src ? <img className="cm-art" src={src} alt={alt} /> : <span className="cm-art wait" aria-label={alt} />;
}

function Likes({ n, onLike }: { n: News; onLike: () => void }) {
  const others = n.likers.filter(Boolean);
  return (
    <div className="cm-likes">
      <button className={`cm-like${n.liked ? " on" : ""}`} onClick={onLike} aria-pressed={n.liked} aria-label={n.liked ? "Unlike" : "Like"}>
        <span className="cm-heart" aria-hidden="true">{n.liked ? "❤️" : "🤍"}</span>{n.likes > 0 && <b>{n.likes}</b>}
      </button>
      {others.length > 0 && <small>{others.slice(0, 3).join(", ")}{n.likes > 3 ? ` and ${n.likes - 3} more` : ""} liked this</small>}
    </div>
  );
}
const EMOJIS = ["📣", "🎉", "🏆", "📅", "🕌", "⚠️", "🎁", "❤️", "🌙", "⭐"];
const blank: NewsIn = { title: "", body: "", emoji: "📣", pinned: false };

function when(iso: string) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return `Today · ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function NewsPage({ admin }: { admin: boolean }) {
  const [items, setItems] = useState<News[] | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<NewsIn>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useToast();

  const load = () => api.news().then((n) => {
    setItems(n.items);
    if (!admin && n.unread > 0) api.newsSeen().then(notifyChanged).catch(() => undefined);
  }).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load the news"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title.trim()) return;
    try {
      if (editing) await api.editNews(editing, form); else await api.addNews(form);
      setToast(editing ? "Announcement updated" : "Announcement posted 📣");
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
    setItems((xs) => xs && xs.map((x) => x.id === n.id ? { ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) } : x));
    try {
      const r = await api.likeNews(n.id);
      setItems((xs) => xs && xs.map((x) => x.id === n.id ? { ...x, ...r } : x));
    } catch { load(); }
  };
  const togglePin = async (n: News) => { await api.editNews(n.id, { pinned: !n.pinned }).catch(() => undefined); load(); };

  return (
    <section className="news">
      <div className="card news-head">
        <h2>🏘️ Community</h2>
        {admin && <p className="note">Post for the whole family. The app also posts here when someone puts on a new picture or wins 1st place. Everyone can ❤️ posts.</p>}
        {admin && !open && <button className="primary" onClick={() => { setForm(blank); setEditing(null); setOpen(true); }}>+ New announcement</button>}
        {admin && open && (
          <form className="news-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
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
        {error && <p className="error">{error}</p>}
      </div>
      {items === null ? <p className="note">Loading…</p> : items.length === 0 ? (
        <div className="card news-empty"><span>📭</span><p>Nothing here yet.</p></div>
      ) : items.map((n) => n.kind === "picture" && n.member ? (
        <article key={n.id} className={`card cm-post cm-picture${n.new ? " fresh" : ""}`}>
          <div className="cm-pic"><Avatar avatar={n.data.avatar ?? n.member.avatar} color="#ffffff" frame={n.member.frame} size={96} /></div>
          <div className="news-main">
            <p className="cm-kicker">🖼️ New picture{n.new && <span className="news-new">New</span>}</p>
            <h3>{n.member.name}{n.data.picture ? <> is now the <b>{n.data.picture}</b></> : " has a new picture"}</h3>
            <small className="note">{when(n.created_at)}</small>
            <Likes n={n} onLike={() => like(n)} />
            {admin && <div className="news-tools"><button className="danger" onClick={() => remove(n)}>Delete</button></div>}
          </div>
        </article>
      ) : n.kind === "win" && n.member ? (
        <article key={n.id} className={`card cm-post cm-win${n.new ? " fresh" : ""}`}>
          <div className="cm-win-head">
            <Avatar avatar={n.member.avatar} color="#ffffff" frame={n.member.frame} size={56} />
            <div>
              <p className="cm-kicker">🥇 1st place{n.data.event ? ` · ${n.data.event}` : ""}{n.new && <span className="news-new">New</span>}</p>
              <h3>{n.member.name} won 1st place!</h3>
            </div>
          </div>
          {n.data.entry_id && <figure className="cm-figure"><Art id={n.data.entry_id} alt={n.data.art || "The winning picture"} />
            <figcaption>{n.data.art ? <>“{n.data.art}”</> : null}{n.data.gems ? <span className="cm-prize">+{n.data.gems} <Gem /></span> : null}</figcaption></figure>}
          <small className="note">{when(n.created_at)}</small>
          <Likes n={n} onLike={() => like(n)} />
          {admin && <div className="news-tools"><button className="danger" onClick={() => remove(n)}>Delete</button></div>}
        </article>
      ) : (
        <article key={n.id} className={`card news-item${n.pinned ? " pinned" : ""}${n.new ? " fresh" : ""}`}>
          <div className="news-icon" aria-hidden="true">{n.emoji}</div>
          <div className="news-main">
            <h3>{n.title}{n.new && <span className="news-new">New</span>}{n.pinned && <span className="news-pinned">📌 Pinned</span>}</h3>
            {n.body && <p className="news-body">{n.body}</p>}
            <small className="note">{when(n.created_at)}{n.author ? ` · ${n.author}` : ""}</small>
            <Likes n={n} onLike={() => like(n)} />
            {admin && (
              <div className="news-tools">
                <button onClick={() => edit(n)}>Edit</button>
                <button onClick={() => togglePin(n)}>{n.pinned ? "Unpin" : "Pin"}</button>
                <button className="danger" onClick={() => remove(n)}>Delete</button>
              </div>
            )}
          </div>
        </article>
      ))}
      {toast && <div className="toast" role="status">{toast}</div>}
    </section>
  );
}
