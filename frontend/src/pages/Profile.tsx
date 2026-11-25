import { useEffect, useState } from "react";
import { api, ApiError, type Profile, type ShopItem, type TodayInfo } from "../api";
import Avatar from "../lib/Avatar";
import { confetti } from "../lib/confetti";
import { notifyChanged, useToast } from "../lib/events";
import { RankBadge } from "./Welcome";

type Kind = "frame" | "theme" | "avatar";
const TABS: { kind: Kind; label: string }[] = [{ kind: "frame", label: "Frames" }, { kind: "theme", label: "Themes" }, { kind: "avatar", label: "Pictures" }];

/** Two-colour swatch for a theme, matching the colours in styles.css. */
const THEME_SWATCH: Record<string, [string, string]> = {
  classic: ["#0b4a3a", "#c9962b"], bronze: ["#6b3e1d", "#d49a5c"], silver: ["#3c4a57", "#b9c4ce"], gold: ["#6b4a00", "#f0c040"],
  platinum: ["#24515e", "#9fd3e0"], emerald: ["#0f6b47", "#7fe0b0"], sapphire: ["#163f86", "#7fb0ff"], ruby: ["#7a1631", "#ff8fa8"],
  diamond: ["#1d5f7a", "#a8ecff"], obsidian: ["#1a1426", "#b69cff"], legendary: ["#3a2a00", "#ffd24a"], rose: ["#8a2f55", "#ffb3c7"],
  ocean: ["#0b5c7a", "#7fe3e0"], desert: ["#8a4b1e", "#ffc46b"], midnight: ["#111a3a", "#8fb4ff"],
};

export default function ProfilePage({ info }: { info: TodayInfo | null }) {
  const [p, setP] = useState<Profile | null>(null);
  const [tab, setTab] = useState<Kind>("frame");
  const [error, setError] = useState("");
  const [toast, setToast] = useToast();

  useEffect(() => { api.profile().then(setP).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load your profile")); }, []);

  async function use(kind: Kind, key: string, name: string) {
    try { setP(await api.saveProfile({ [kind]: key })); setError(""); setToast(`${name} is on`); notifyChanged(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not save"); }
  }
  async function buy(kind: Kind, item: ShopItem) {
    try { setP(await api.buy(kind, item.key)); setError(""); setToast(`Bought ${item.name}! −${item.price} 💎`); confetti(); notifyChanged(); }
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
        <p className="profile-title">{t.emoji} {t.name} member</p>
        <div className="fat-bar" style={{ width: "min(100%, 340px)" }}><i style={{ width: `${pct}%` }} /></div>
        <p className="note" style={{ margin: 0 }}>{p.next ? `${p.next.needed} more to ${p.next.emoji} ${p.next.name}` : p.legendary ? "👑 You hold Legendary" : "XLIX is the top without the Legendary quest"}</p>
        <div className="wc-stats" style={{ width: "100%" }}>
          <div className="stat"><span className="stat-ico">💎</span><b>{p.gems.balance}</b><small>gems</small></div>
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
          <span className="gem-wallet">💎 {p.gems.balance}</span>
        </div>
        <p className="note">Your rank unlocks its own frame and theme for free. Buy extra ones with gems: every task is +5 💎.</p>
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
                    : tab === "theme" ? <span className="swatch" style={{ background: `linear-gradient(135deg, ${(THEME_SWATCH[it.key] ?? ["#0b4a3a", "#c9962b"])[0]} 50%, ${(THEME_SWATCH[it.key] ?? ["#0b4a3a", "#c9962b"])[1]} 50%)` }} />
                    : <Avatar avatar={it.key} color={t.color} size={64} />}
                </span>
                <span className="shop-name">{it.name}</span>
                {inUse ? <span className="shop-act on">In use ✓</span>
                  : it.available ? <button className="shop-act" onClick={() => use(tab, it.key, it.name)}>Use</button>
                  : forSale ? <button className="shop-act buy" disabled={p.gems.balance < it.price} onClick={() => buy(tab, it)}>💎 {it.price}</button>
                  : <span className="shop-lock">🔒 {it.tier?.emoji} {it.tier?.name}</span>}
              </div>
            );
          })}
        </div>
      </section>
      {error && <p className="err" role="alert">{error}</p>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
