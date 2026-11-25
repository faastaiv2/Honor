import { useEffect, useState } from "react";
import { api, ApiError, type Profile, type TodayInfo } from "../api";
import Avatar from "../lib/Avatar";
import { notifyChanged, useToast } from "../lib/events";

/** "🥇 Great Honor member", the title shown under a member's name. */
export function memberTitle(p: { tier: { emoji: string; name: string }; legendary: boolean }): string {
  return `${p.tier.emoji} ${p.tier.name} member`;
}

export default function ProfilePage({ info }: { info: TodayInfo | null }) {
  const [p, setP] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useToast();

  useEffect(() => { api.profile().then(setP).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load your profile")); }, []);

  async function save(body: { avatar?: string; frame?: string }, ok: string) {
    try { setP(await api.saveProfile(body)); setError(""); setToast(ok); notifyChanged(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not save"); }
  }

  if (!p) return <section className="card"><p className={error ? "err" : "note"}>{error || "Loading…"}</p></section>;

  const t = p.tier;
  const nextMin = info?.tiers.find((x) => x.name === p.next?.name)?.min ?? null;
  const pct = p.legendary || !p.next || nextMin === null || t.min === null ? 100 : Math.max(4, Math.min(100, ((p.level - t.min) / (nextMin - t.min)) * 100));

  return (
    <div className="profile">
      <section className="card profile-hero" style={{ ["--tc" as string]: t.color }}>
        <Avatar avatar={p.member.avatar} color={t.color} frame={p.member.frame} size={112} />
        <h2 className="profile-name">{p.member.name}</h2>
        <p className="profile-title">{memberTitle(p)}</p>
        <div className="profile-level">{p.label}</div>
        {p.next ? (
          <div className="profile-next">
            <div className="meter"><i style={{ width: `${pct}%`, background: t.color }} /></div>
            <span>{p.next.needed} more to {p.next.emoji} {p.next.name}</span>
          </div>
        ) : <p className="note">{p.legendary ? "👑 You hold Legendary Honor" : "XLIX is the top without the Legendary quest"}</p>}
        <p className="note">This week: {p.week_delta > 0 ? "+" : ""}{p.week_delta} Honor</p>
      </section>

      <section className="card">
        <h2>Your rewards</h2>
        <p><span aria-hidden="true">🎮</span> <b>Game / YouTube:</b> {t.games}</p>
        <p><span aria-hidden="true">🎁</span> <b>Benefits:</b> {t.benefits}</p>
      </section>

      <section className="card">
        <h2>Your frame</h2>
        <p className="note">This is how your picture looks on the leaderboard. Climb the ranks to unlock more.</p>
        <div className="frame-grid">
          {p.frames.map((f) => (
            <button key={f.key} className={`frame-pick${p.member.frame === f.key || (!p.member.frame && f.key === "plain") ? " on" : ""}`}
              disabled={!f.unlocked} title={f.unlocked ? f.name : `Unlocks at ${f.tier.emoji} ${f.tier.name}`}
              onClick={() => save({ frame: f.key }, `${f.name} frame on`)}>
              <Avatar avatar={p.member.avatar} color={t.color} frame={f.key} size={52} />
              <span>{f.name}</span>
              {!f.unlocked && <small>🔒 {f.tier.emoji} {f.tier.name}</small>}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Your picture</h2>
        <div className="chips avatars" role="group" aria-label="Choose your picture">
          <button className={`chip${!p.member.avatar ? " on" : ""}`} onClick={() => save({ avatar: "" }, "Picture saved")} aria-label="Plain person">👤</button>
          {p.avatars.map((a) => (
            <button key={a} className={`chip${p.member.avatar === a ? " on" : ""}`} onClick={() => save({ avatar: a }, "Picture saved")}>{a}</button>
          ))}
        </div>
      </section>
      {error && <p className="err" role="alert">{error}</p>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
