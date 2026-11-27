import { Link } from "react-router-dom";
import { Fragment, useEffect, useMemo, useState } from "react";
import RankIcon from "../lib/RankIcon";
import Gem from "../lib/Gem";
import { api, ApiError, type Profile, type ShopItem, type TodayInfo } from "../api";
import Avatar from "../lib/Avatar";
import Medal from "../lib/Medal";
import Brazier from "../lib/Brazier";
import RarityBadge from "../lib/RarityBadge";
import ThemePreview from "../lib/ThemePreview";
import { confetti } from "../lib/confetti";
import { notifyChanged, useToast } from "../lib/events";
import { markSeen, newItems, type ShopKind } from "../lib/shopNew";

/**
 * Avatar: the dressing room and shop. Your character stands on a glowing stage; tap anything to try it on
 * (themes colour the whole app for a moment). The bar at the bottom says what to do: wear it, buy it, earn it,
 * or which rank unlocks it. Red dots mark what's new: just added, just unlocked, or just affordable.
 */
type Kind = ShopKind;
const TABS: { kind: Kind; label: string; icon: string }[] = [
  { kind: "avatar", label: "Pictures", icon: "🖼️" }, { kind: "frame", label: "Frames", icon: "💍" }, { kind: "theme", label: "Themes", icon: "🎨" },
];
const RARITY = [
  { key: "common", name: "Common", icon: "⚪" },
  { key: "rare", name: "Rare", icon: "🔷" },
  { key: "epic", name: "Epic", icon: "🟣" },
  { key: "legendary", name: "Legendary", icon: "🌟" },
];

export default function ProfilePage({ info }: { info: TodayInfo | null }) {
  const [p, setP] = useState<Profile | null>(null);
  const [tab, setTab] = useState<Kind>("avatar");
  const [error, setError] = useState("");
  const [toast, setToast] = useToast();
  const [sel, setSel] = useState<{ kind: Kind; item: ShopItem } | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  // Opened from the "set your avatar" reminder: point at the pictures until one is on.
  const [guide, setGuide] = useState(() => new URLSearchParams(window.location.search).has("pick"));
  useEffect(() => {
    if (!guide || !p) return;
    const t = window.setTimeout(() => document.querySelector(".av-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    return () => clearTimeout(t);
  }, [guide, !!p]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { api.profile().then(setP).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load your avatar")); }, []);
  // Which items are new; the open tab's dots clear after a moment (you've seen them).
  useEffect(() => { if (p) setFresh(newItems(p)); }, [p]);
  useEffect(() => {
    if (!p) return;
    const t = window.setTimeout(() => markSeen(p, tab), 2500);
    return () => clearTimeout(t);
  }, [p, tab]);

  // Trying on a theme colours the whole app until you stop or leave.
  const tryTheme = sel?.kind === "theme" ? sel.item.key : null;
  useEffect(() => {
    if (!tryTheme) return;
    const before = document.documentElement.dataset.skin;
    document.documentElement.dataset.skin = tryTheme;
    return () => { document.documentElement.dataset.skin = before; };
  }, [tryTheme]);

  async function use(kind: Kind, key: string, name: string) {
    try { setSel(null); if (kind === "avatar" && key) setGuide(false); setP(await api.saveProfile({ [kind]: key })); setError(""); setToast(`${name} is on ✨`); notifyChanged(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not save"); }
  }
  async function buy(kind: Kind, item: ShopItem) {
    try { setSel(null); setP(await api.buy(kind, item.key)); setError(""); setToast(`Bought ${item.name}! −${item.price} gems`); confetti(); notifyChanged(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not buy"); }
  }

  const sorted = useMemo(() => {
    if (!p) return { avatar: [], frame: [], theme: [] } as Record<Kind, ShopItem[]>;
    const rank = (it: ShopItem) => (it.rarity ? RARITY.findIndex((r) => r.key === it.rarity) : 0);
    const group = (it: ShopItem) => (it.unlock ? 2 : it.price > 0 ? 1 : 0);
    const looks = (list: ShopItem[]) => [...list.filter((x) => x.price === 0), ...list.filter((x) => x.price > 0).sort((a, b) => a.price - b.price)];
    return {
      avatar: [...p.avatars].sort((a, b) => rank(a) - rank(b) || group(a) - group(b) || a.price - b.price),
      frame: looks(p.frames), theme: looks(p.themes),
    };
  }, [p]);

  if (!p) return <section className="card"><p className={error ? "err" : "note"}>{error || "Loading…"}</p></section>;

  const t = p.tier;
  const shamed = !!p.member.shamed;
  const mine = { avatar: (p.member.own_avatar ?? p.member.avatar) || "", frame: (p.member.own_frame ?? p.member.frame) || "plain", theme: p.member.theme || "white" };
  const look = {
    avatar: sel?.kind === "avatar" ? sel.item.key : p.member.avatar,
    frame: sel?.kind === "frame" ? sel.item.key : p.member.frame,
  };
  const newIn = (kind: Kind) => [...fresh].filter((k) => k.startsWith(`${kind}:`)).length;
  const items = sorted[tab];
  const nextMin = info?.tiers.find((x) => x.name === p.next?.name)?.min ?? null;
  const pct = p.legendary || !p.next || nextMin === null || t.min === null ? 100 : Math.max(6, Math.min(100, ((p.level - t.min) / (nextMin - t.min)) * 100));
  const owned = (kind: Kind) => sorted[kind].filter((x) => x.available).length;

  /** What the selected item lets you do. */
  const action = (kind: Kind, it: ShopItem) => {
    const lockedLook = shamed && kind !== "theme";
    if (mine[kind] === it.key) return <span className="av-act on">✓ Wearing</span>;
    if (it.available) return lockedLook ? <span className="av-act off">🔒 Locked on the Pillar</span>
      : <button className="av-act wear" onClick={() => use(kind, it.key, it.name)}>Wear it</button>;
    if (it.unlock) return <Link className={`shop-ach t-${it.unlock.tier ?? "bronze"}`} to={`/achievements?a=${encodeURIComponent(it.unlock.key)}`}>
      <Medal icon={it.unlock.icon ?? "star"} tier={it.unlock.tier ?? "bronze"} size={22} /><span><small>Earn</small><b>{it.unlock.name}</b></span><i aria-hidden="true">›</i></Link>;
    if (it.price > 0) return p.gems.balance >= it.price
      ? <button className="av-act buy" onClick={() => buy(kind, it)}>Buy · <Gem /> {it.price}</button>
      : <span className="av-act off"><Gem /> {it.price} · {it.price - p.gems.balance} more to go</span>;
    return <span className="av-act off">🔒 Unlocks at <RankIcon rank={it.tier?.key} /> {it.tier?.name}</span>;
  };

  return (
    <div className="av">
      {/* the dressing room */}
      <section className="av-stage" style={{ ["--tc" as string]: t.color }}>
        <div className="av-stage-light" aria-hidden="true" />
        <div className="av-hero">
          <div className="av-figure">
            <div className="av-glow" aria-hidden="true" />
            <Avatar avatar={look.avatar} color={t.color} frame={look.frame} size={150} />
            <div className="av-pedestal" aria-hidden="true" />
          </div>
          <div className="av-who">
            <h1>{p.member.name}</h1>
            <p className="av-rank"><RankIcon rank={t.key} /> {t.key === "member" ? "Member" : t.key === "low" ? "On the Pillar of Shame" : `${t.name} · ${p.label}`}</p>
            <div className="av-bar"><i style={{ width: `${pct}%` }} /></div>
            <p className="av-next">{p.next ? <>{p.next.needed} more to <RankIcon rank={p.next.name} /> {p.next.name}</> : p.legendary ? "You hold Legendary 👑" : "Top of the climb"}</p>
            <div className="av-chips">
              <span className="av-wallet"><Gem size={20} /> <b>{p.gems.balance}</b></span>
              <span><Brazier lit={p.streak > 0} size={18} /> {p.streak} day streak</span>
            </div>
          </div>
        </div>
        {sel && <p className="av-trying">Trying on: <b>{sel.item.name}</b></p>}
      </section>

      {shamed && (
        <div className="shame-lock" role="status">
          <span aria-hidden="true">👹</span>
          <div><b>Locked on the Pillar of Shame</b><p>Your picture and frame are locked until you finish all your tasks and climb back to Member. You can still change your theme and buy things.</p></div>
        </div>
      )}

      {/* the shop */}
      <div className="av-tabs" role="tablist" aria-label="Shop">
        {TABS.map((x) => (
          <button key={x.kind} role="tab" aria-selected={tab === x.kind} className={`av-tab${tab === x.kind ? " on" : ""}`} onClick={() => { setTab(x.kind); setSel(null); }}>
            <span className="av-tab-ico" aria-hidden="true">{x.icon}</span>
            <b>{x.label}</b>
            <small>{owned(x.kind)}/{sorted[x.kind].length}</small>
            {newIn(x.kind) > 0 && <i className="red-dot" aria-label={`${newIn(x.kind)} new`} />}
          </button>
        ))}
      </div>

      {guide && tab === "avatar" && (
        <div className="av-guide" role="status">
          <span className="av-guide-hand" aria-hidden="true">👇</span>
          <p>{sel?.kind === "avatar" && sel.item.available ? <>Nice pick! Now press <b>Wear it</b> ✨</>
            : <>Tap a picture with <b>Yours</b> on it to try it on, then press <b>Wear it</b>. Others you can buy with gems.</>}</p>
          <button aria-label="Close" onClick={() => setGuide(false)}>✕</button>
        </div>
      )}
      <section className={`av-shelf ${tab}${guide && tab === "avatar" ? " guiding" : ""}`}>
        {tab === "avatar" && (
          <button className={`av-item plain${!mine.avatar ? " on" : ""}`} disabled={shamed} onClick={() => use("avatar", "", "Plain picture")}>
            <span className="av-face">👤</span><span className="av-name">Plain</span>
            <span className="av-state">{!mine.avatar ? "✓ Wearing" : "Free"}</span>
          </button>
        )}
        {items.map((it, idx) => {
          const kind = tab;
          const head = kind === "avatar" && (idx === 0 || items[idx - 1].rarity !== it.rarity) ? RARITY.find((r) => r.key === it.rarity) : null;
          const inGroup = head ? items.filter((x) => x.rarity === it.rarity) : [];
          const isNew = fresh.has(`${kind}:${it.key}`);
          const wearing = mine[kind] === it.key;
          const chosen = sel?.kind === kind && sel.item.key === it.key;
          const state = wearing ? "✓ Wearing" : it.available ? "Yours" : it.unlock ? "🏅 Achievement" : it.price > 0 ? null : `🔒 ${it.tier?.name ?? ""}`;
          return (
            <Fragment key={it.key}>
              {head && (
                <div className={`av-rarity r-${head.key}`}>
                  <span aria-hidden="true">{head.icon}</span><b>{head.name}</b>
                  <small>{inGroup.filter((x) => x.available).length}/{inGroup.length} yours</small>
                </div>
              )}
              <button type="button" className={`av-item${wearing ? " on" : ""}${chosen ? " sel" : ""}${it.available ? " mine" : ""}${it.rarity ? ` r-${it.rarity}` : ""}${it.special ? " gf" : ""}`}
                onClick={() => setSel(chosen ? null : { kind, item: it })} aria-pressed={chosen} aria-label={it.name}>
                {isNew && <i className="red-dot" aria-label="New" />}
                {it.special === "godfather" && <span className="shop-tag gf">Godfather only</span>}
                <span className="av-face">
                  {kind === "frame" ? <Avatar avatar={mine.avatar} color={t.color} frame={it.key} size={60} />
                    : kind === "theme" ? <ThemePreview k={it.key} />
                    : <RarityBadge pic={it.key} rarity={it.rarity} locked={!it.available} size={84} />}
                </span>
                <span className="av-name">{it.name}</span>
                {state ? <span className={`av-state${wearing ? " on" : ""}`}>{state}</span>
                  : <span className={`av-price${p.gems.balance >= it.price ? " can" : ""}`}><Gem /> {it.price}</span>}
              </button>
            </Fragment>
          );
        })}
      </section>

      {/* the try-on bar */}
      {sel && (
        <div className="av-try" role="dialog" aria-label={`Trying on ${sel.item.name}`}>
          <span className="av-try-face">
            {sel.kind === "theme" ? <ThemePreview k={sel.item.key} /> : <Avatar avatar={look.avatar} color={t.color} frame={look.frame} size={52} />}
          </span>
          <span className="av-try-name"><b>{sel.item.name}</b><small>{sel.kind === "avatar" ? (sel.item.rarity ?? "picture") : sel.kind}</small></span>
          {action(sel.kind, sel.item)}
          <button className="av-try-x" aria-label="Stop trying on" onClick={() => setSel(null)}>×</button>
        </div>
      )}
      {error && <p className="err" role="alert">{error}</p>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
