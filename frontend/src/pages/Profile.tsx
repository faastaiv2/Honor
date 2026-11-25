import { Fragment, useEffect, useState } from "react";
import RankIcon from "../lib/RankIcon";
import Gem from "../lib/Gem";
import { api, ApiError, type Profile, type ShopItem, type TodayInfo } from "../api";
import Avatar from "../lib/Avatar";
import Brazier from "../lib/Brazier";
import ThemePreview from "../lib/ThemePreview";
import { confetti } from "../lib/confetti";
import { notifyChanged, useToast } from "../lib/events";
import { RankBadge } from "./Welcome";

type Kind = "frame" | "theme" | "avatar";
const TABS: { kind: Kind; label: string }[] = [{ kind: "frame", label: "Frames" }, { kind: "theme", label: "Themes" }, { kind: "avatar", label: "Pictures" }];


export default function ProfilePage({ info }: { info: TodayInfo | null }) {
  const [p, setP] = useState<Profile | null>(null);
  const [tab, setTab] = useState<Kind>("frame");
  const [error, setError] = useState("");
  const [toast, setToast] = useToast();

  const [trying, setTrying] = useState<ShopItem | null>(null);
  const [peek, setPeek] = useState<{ kind: Kind; item: ShopItem } | null>(null);
  // "Try it": show a theme on the whole app for a moment; leaving the page or stopping puts yours back.
  useEffect(() => {
    if (!trying) return;
    const before = document.documentElement.dataset.skin;
    document.documentElement.dataset.skin = trying.key;
    return () => { document.documentElement.dataset.skin = before; };
  }, [trying]);
  useEffect(() => { api.profile().then(setP).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load your profile")); }, []);

  async function use(kind: Kind, key: string, name: string) {
    try { setTrying(null); setPeek(null); setP(await api.saveProfile({ [kind]: key })); setError(""); setToast(`${name} is on`); notifyChanged(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not save"); }
  }
  async function buy(kind: Kind, item: ShopItem) {
    try { setTrying(null); setPeek(null); setP(await api.buy(kind, item.key)); setError(""); setToast(`Bought ${item.name}! −${item.price} gems`); confetti(); notifyChanged(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not buy"); }
  }

  if (!p) return <section className="card"><p className={error ? "err" : "note"}>{error || "Loading…"}</p></section>;

  const t = p.tier;
  const nextMin = info?.tiers.find((x) => x.name === p.next?.name)?.min ?? null;
  const pct = p.legendary || !p.next || nextMin === null || t.min === null ? 100 : Math.max(6, Math.min(100, ((p.level - t.min) / (nextMin - t.min)) * 100));
  // Pictures: the three knights lead the list (the shop's top prizes), then everything else.
  const isKnight = (k: string) => k.startsWith("knight");
  const items = tab === "frame" ? p.frames : tab === "theme" ? p.themes
    : [...p.avatars.filter((a) => isKnight(a.key)).sort((a, b) => b.price - a.price), ...p.avatars.filter((a) => !isKnight(a.key))];
  const current = tab === "frame" ? p.member.frame || "plain" : tab === "theme" ? p.member.theme || "bronze" : p.member.avatar;

  return (
    <div className="profile">
      <section className="card profile-hero" style={{ ["--tc" as string]: t.color }}>
        <div className="wc-avatar">
          <Avatar avatar={p.member.avatar} color={t.color} frame={p.member.frame} size={116} />
          <span className="wc-badge"><RankBadge color={t.color} label={p.label} size={56} /></span>
        </div>
        <h2 className="profile-name">{p.member.name}</h2>
        <p className="profile-title"><RankIcon rank={t.key} /> {t.name} member</p>
        <div className="fat-bar" style={{ width: "min(100%, 340px)" }}><i style={{ width: `${pct}%` }} /></div>
        <p className="note" style={{ margin: 0 }}>{p.next ? <>{p.next.needed} more to <RankIcon rank={p.next.name} /> {p.next.name}</> : p.legendary ? <><RankIcon rank="legendary" /> You hold Legendary</> : "XLIX is the top without the Legendary quest"}</p>
        <div className="wc-stats" style={{ width: "100%" }}>
          <div className="stat"><span className="stat-ico"><Gem /></span><b>{p.gems.balance}</b><small>gems</small></div>
          <div className="stat"><span className="stat-ico"><Brazier lit={p.streak > 0} /></span><b>{p.streak}</b><small>day streak</small></div>
          <div className="stat"><span className="stat-ico">🏅</span><b>{p.gems.earned}</b><small>gems earned</small></div>
        </div>
        <div className="perks-mini">
          <p><span aria-hidden="true">🎮</span> {t.games}</p>
          <p><span aria-hidden="true">🎁</span> {t.benefits}</p>
        </div>
      </section>

      <section className="card shop">
        <div className="shop-head">
          <h2>Shop &amp; style</h2>
          <span className="gem-wallet"><Gem /> {p.gems.balance}</span>
        </div>
        <p className="note">Your rank unlocks its own frame and theme for free. Buy extra ones with gems: +20 <Gem /> for finishing every task in a day, plus your streak chest and achievements.</p>
        <div className="seg" role="tablist">
          {TABS.map((x) => <button key={x.kind} role="tab" aria-selected={tab === x.kind} className={tab === x.kind ? "on" : ""} onClick={() => setTab(x.kind)}>{x.label}</button>)}
        </div>
        <div className={`shop-grid ${tab}`}>
          {tab === "avatar" && <p className="shop-section">⚔️ Knights · the shop's top prizes</p>}
          {items.map((it, idx) => {
            const firstOther = tab === "avatar" && !isKnight(it.key) && (idx === 0 || isKnight(items[idx - 1].key));
            const inUse = current === it.key;
            const locked = !it.available;
            const forSale = locked && it.price > 0;
            return (<Fragment key={it.key}>
              {firstOther && <p className="shop-section">More pictures</p>}
              {firstOther && (
                <button className={`shop-item${!p.member.avatar ? " on" : ""}`} onClick={() => use("avatar", "", "Plain picture")}>
                  <span className="shop-face">👤</span><span className="shop-name">Plain</span><span className="shop-act">{!p.member.avatar ? "In use" : "Use"}</span>
                </button>
              )}
              <div className={`shop-item${inUse ? " on" : ""}${locked && !forSale ? " locked" : ""}${forSale ? " for-sale" : ""}${it.price >= 1500 ? " legendary" : it.price >= 1000 ? " epic" : ""}`}>
                <button type="button" className="shop-face" aria-label={forSale ? `Preview ${it.name}` : it.name} disabled={!forSale}
                  onClick={() => forSale && (tab === "theme" ? setTrying(trying?.key === it.key ? null : it) : setPeek({ kind: tab, item: it }))}>
                  {tab === "frame" ? <Avatar avatar={p.member.avatar} color={t.color} frame={it.key} size={54} />
                    : tab === "theme" ? <ThemePreview k={it.key} />
                    : <Avatar avatar={it.key} color={t.color} size={64} />}
                  {forSale && <span className="shop-peek" aria-hidden="true">👁</span>}
                </button>
                <span className="shop-name">{it.name}</span>
                {tab === "theme" && forSale && (
                  <button className={`shop-try${trying?.key === it.key ? " on" : ""}`} onClick={() => setTrying(trying?.key === it.key ? null : it)}>
                    {trying?.key === it.key ? "Stop preview" : "👁 Try it"}
                  </button>
                )}
                {inUse ? <span className="shop-act on">In use ✓</span>
                  : it.available ? <button className="shop-act" onClick={() => use(tab, it.key, it.name)}>Use</button>
                  : forSale ? (p.gems.balance >= it.price
                    ? <button className="shop-act buy" onClick={() => buy(tab, it)}><Gem /> {it.price}</button>
                    : <span className="shop-price"><span><Gem /> {it.price}</span><small>{it.price - p.gems.balance} more to go</small></span>)
                  : <span className="shop-lock">🔒 <RankIcon rank={it.tier?.key} /> {it.tier?.name}</span>}
              </div>
            </Fragment>);
          })}
        </div>
      </section>
      {peek && (() => {
        const it = peek.item;
        const avatar = peek.kind === "avatar" ? it.key : p.member.avatar;
        const frame = peek.kind === "frame" ? it.key : p.member.frame;
        const inUse = (peek.kind === "frame" ? p.member.frame || "plain" : p.member.avatar) === it.key;
        return (
          <div className="peek" role="dialog" aria-modal="true" aria-label={`Preview ${it.name}`} onClick={() => setPeek(null)}>
            <div className="peek-card" style={{ ["--tc" as string]: t.color }} onClick={(e) => e.stopPropagation()}>
              <p className="peek-kicker">{peek.kind === "frame" ? "Frame preview" : "Picture preview"}</p>
              <div className="peek-big"><Avatar avatar={avatar} color={t.color} frame={frame} size={150} /></div>
              <h3>{it.name}</h3>
              <p className="note" style={{ margin: 0 }}>How it looks on the leaderboard:</p>
              <div className="peek-row">
                <span className="peek-rank">#1</span>
                <Avatar avatar={avatar} color={t.color} frame={frame} size={46} />
                <b>{p.member.name}</b>
                <span className="peek-level">{p.label}</span>
              </div>
              <div className="peek-actions">
                {inUse ? <span className="shop-act on">In use ✓</span>
                  : it.available ? <button className="primary" onClick={() => use(peek.kind, it.key, it.name)}>Use it</button>
                  : it.price > 0 && p.gems.balance >= it.price ? <button className="ru-collect peek-buy" onClick={() => buy(peek.kind, it)}>
                      <span className="ru-collect-gem"><Gem size={28} /></span><span className="ru-collect-text"><b>Buy for {it.price}</b><small>You have {p.gems.balance} gems</small></span></button>
                  : it.price > 0 ? <span className="shop-price"><span><Gem /> {it.price}</span><small>{it.price - p.gems.balance} more gems to go</small></span>
                  : <span className="shop-lock">🔒 Unlocks at <RankIcon rank={it.tier?.key} /> {it.tier?.name}</span>}
                <button onClick={() => setPeek(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
      {trying && (
        <div className="try-bar" role="status">
          <span>👁 Previewing <b>{trying.name}</b></span>
          {trying.available ? <button className="primary" onClick={() => use("theme", trying.key, trying.name)}>Use it</button>
            : trying.price > 0 && p.gems.balance >= trying.price ? <button className="primary" onClick={() => buy("theme", trying)}>Buy · <Gem /> {trying.price}</button>
            : trying.price > 0 ? <span className="try-need"><Gem /> {trying.price - p.gems.balance} more to buy</span>
            : <span className="try-need">🔒 {trying.tier?.name} rank</span>}
          <button onClick={() => setTrying(null)}>Stop</button>
        </div>
      )}
      {error && <p className="err" role="alert">{error}</p>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
