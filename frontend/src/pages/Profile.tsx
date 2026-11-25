import { useEffect, useState } from "react";
import RankIcon from "../lib/RankIcon";
import Gem from "../lib/Gem";
import { api, ApiError, type Profile, type ShopItem, type TodayInfo } from "../api";
import Avatar from "../lib/Avatar";
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
  // "Try it": show a theme on the whole app for a moment; leaving the page or stopping puts yours back.
  useEffect(() => {
    if (!trying) return;
    const before = document.documentElement.dataset.skin;
    document.documentElement.dataset.skin = trying.key;
    return () => { document.documentElement.dataset.skin = before; };
  }, [trying]);
  useEffect(() => { api.profile().then(setP).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load your profile")); }, []);

  async function use(kind: Kind, key: string, name: string) {
    try { setTrying(null); setP(await api.saveProfile({ [kind]: key })); setError(""); setToast(`${name} is on`); notifyChanged(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not save"); }
  }
  async function buy(kind: Kind, item: ShopItem) {
    try { setTrying(null); setP(await api.buy(kind, item.key)); setError(""); setToast(`Bought ${item.name}! −${item.price} gems`); confetti(); notifyChanged(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not buy"); }
  }

  if (!p) return <section className="card"><p className={error ? "err" : "note"}>{error || "Loading…"}</p></section>;

  const t = p.tier;
  const nextMin = info?.tiers.find((x) => x.name === p.next?.name)?.min ?? null;
  const pct = p.legendary || !p.next || nextMin === null || t.min === null ? 100 : Math.max(6, Math.min(100, ((p.level - t.min) / (nextMin - t.min)) * 100));
  const items = tab === "frame" ? p.frames : tab === "theme" ? p.themes : p.avatars;
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
          <div className="stat"><span className="stat-ico">🔥</span><b>{p.streak}</b><small>day streak</small></div>
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
        <p className="note">Your rank unlocks its own frame and theme for free. Buy extra ones with gems: +1 <Gem /> per task, +20 <Gem /> for finishing the whole day, and your daily streak chest.</p>
        <div className="seg" role="tablist">
          {TABS.map((x) => <button key={x.kind} role="tab" aria-selected={tab === x.kind} className={tab === x.kind ? "on" : ""} onClick={() => setTab(x.kind)}>{x.label}</button>)}
        </div>
        <div className={`shop-grid ${tab}`}>
          {tab === "avatar" && (
            <button className={`shop-item${!p.member.avatar ? " on" : ""}`} onClick={() => use("avatar", "", "Plain picture")}>
              <span className="shop-face">👤</span><span className="shop-name">Plain</span><span className="shop-act">{!p.member.avatar ? "In use" : "Use"}</span>
            </button>
          )}
          {items.map((it) => {
            const inUse = current === it.key;
            const locked = !it.available;
            const forSale = locked && it.price > 0;
            return (
              <div key={it.key} className={`shop-item${inUse ? " on" : ""}${locked && !forSale ? " locked" : ""}${forSale ? " for-sale" : ""}`}>
                <span className="shop-face">
                  {tab === "frame" ? <Avatar avatar={p.member.avatar} color={t.color} frame={it.key} size={54} />
                    : tab === "theme" ? <ThemePreview k={it.key} />
                    : <Avatar avatar={it.key} color={t.color} size={64} />}
                </span>
                <span className="shop-name">{it.name}</span>
                {tab === "theme" && !inUse && (
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
            );
          })}
        </div>
      </section>
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
