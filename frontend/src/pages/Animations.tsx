import { useEffect, useRef, useState } from "react";
import { api, ApiError, type MusicInfo, type SoundKey, type Tier, type TodayInfo } from "../api";
import GemReward from "../lib/GemReward";
import RankIcon from "../lib/RankIcon";
import { playMusic, playSound, resetSounds, stopMusic } from "../lib/sounds";
import { useToast } from "../lib/events";
import QuestFilm from "./QuestFilm";
import RankUp from "./RankUp";

/**
 * Animations (parents only): watch every celebration in the app and give each one its own sound.
 * Sounds are uploaded here and kept privately in the family's database.
 */

const msg = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong");
const MUSIC: SoundKey[] = ["quest-music", "rankup-music"];
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
/** "1:20", "80" or "1:20.5" → seconds (rounded); "" → 0. NaN if it can't be read. */
const toSec = (t: string) => {
  const v = t.trim();
  if (!v) return 0;
  const m = v.match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/);
  return m ? Math.round(Number(m[1] ?? 0) * 60 + Number(m[2])) : NaN;
};

type Preview = { kind: "quest" } | { kind: "rank"; tier: Tier } | { kind: "chest" } | { kind: "gems" } | { kind: "achievement" } | { kind: "win" };

/** One sound slot: upload, test, start point, volume, remove. */
function SoundSlot({ k, label, when, info, onChange, onError, onDone }: {
  k: SoundKey; label: string; when: string; info?: MusicInfo;
  onChange: (i: MusicInfo) => void; onError: (s: string) => void; onDone: (s: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(mmss(info?.start ?? 0));
  const [end, setEnd] = useState(info?.end ? mmss(info.end) : "");
  const [vol, setVol] = useState(info?.volume ?? 80);
  const file = useRef<HTMLInputElement>(null);
  const isMusic = MUSIC.includes(k);
  useEffect(() => { setStart(mmss(info?.start ?? 0)); setEnd(info?.end ? mmss(info.end) : ""); setVol(info?.volume ?? 80); }, [info]);
  useEffect(() => () => stopMusic(k, 0), [k]);

  async function upload(f?: File) {
    if (!f) return;
    if (f.size > 4_300_000) { onError(`That file is ${(f.size / 1_000_000).toFixed(1)} MB. The most is 4.3 MB`); return; }
    setBusy(true);
    try { stopMusic(k, 0); setPlaying(false); onChange(await api.uploadMusic(f, k)); resetSounds(k); onDone(`${label}: sound uploaded`); }
    catch (e) { onError(msg(e)); } finally { setBusy(false); }
  }
  async function save() {
    const a = toSec(start), b = toSec(end);
    if (Number.isNaN(a) || Number.isNaN(b)) { onError("Write times like 1:20 or 80"); return; }
    if (b && b <= a) { onError("The end must be after the start"); return; }
    try { onChange(await api.musicSettings(a, vol, k, b)); resetSounds(k); onDone("Saved"); setOpen(false); }
    catch (e) { onError(msg(e)); }
  }
  async function test() {
    if (isMusic) {
      if (playing) { stopMusic(k, 500); setPlaying(false); return; }
      setPlaying(await playMusic(k));
    } else await playSound(k);
  }
  async function remove() {
    stopMusic(k, 0); setPlaying(false);
    try { onChange(await api.removeMusic(k)); resetSounds(k); onDone("Sound removed"); } catch (e) { onError(msg(e)); }
  }

  return (
    <div className={`an-slot${info?.has ? " has" : ""}`}>
      <span className="an-slot-ico" aria-hidden="true">{isMusic ? "🎵" : "🔔"}</span>
      <div className="an-slot-txt">
        <b>{label}</b>
        <small>{when}</small>
        <small className="an-slot-state">{info?.has ? `✓ Set · ${(info.size / 1_000_000).toFixed(1)} MB · plays ${mmss(info.start)} → ${info.end ? mmss(info.end) : "end"} · ${info.volume}%` : "No sound"}</small>
      </div>
      <div className="an-slot-btns">
        {info?.has && <button onClick={test} aria-label={`Test ${label}`}>{isMusic && playing ? "■" : "▶"}</button>}
        <button className={info?.has ? "" : "primary"} disabled={busy} onClick={() => file.current?.click()}>{busy ? "…" : info?.has ? "Replace" : "Upload"}</button>
        {info?.has && <button onClick={() => setOpen((x) => !x)} aria-expanded={open} aria-label="Sound settings">⚙</button>}
      </div>
      {open && info?.has && (
        <div className="an-slot-set">
          <div className="an-range">
            <label className="field"><span className="field-label">Play from</span>
              <input inputMode="decimal" placeholder="0:00" value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <span aria-hidden="true">→</span>
            <label className="field"><span className="field-label">to</span>
              <input inputMode="decimal" placeholder="the end" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
          </div>
          <label className="field"><span className="field-label">Volume · {vol}%</span>
            <input type="range" min={10} max={100} step={5} value={vol} onChange={(e) => setVol(Number(e.target.value))} /></label>
          <div className="ad-actions"><button className="primary" onClick={save}>Save</button><button className="danger" onClick={remove}>Remove sound</button></div>
        </div>
      )}
      <input ref={file} type="file" accept="audio/*" hidden onChange={(e) => { upload(e.target.files?.[0]); e.currentTarget.value = ""; }} />
    </div>
  );
}

export default function Animations({ info }: { info: TodayInfo | null }) {
  const [sounds, setSounds] = useState<Partial<Record<SoundKey, MusicInfo>>>({});
  const [error, setError] = useState("");
  const [toast, setToast] = useToast();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [rank, setRank] = useState("gold");
  useEffect(() => { api.soundsInfo().then(setSounds).catch((e) => setError(msg(e))); }, []);

  const tiers = (info?.tiers ?? []).filter((t) => t.key !== "low");
  const slot = (k: SoundKey, label: string, when: string) => (
    <SoundSlot key={k} k={k} label={label} when={when} info={sounds[k]}
      onChange={(i) => setSounds((s) => ({ ...s, [k]: i }))} onError={setError} onDone={(m) => { setError(""); setToast(m); }} />
  );
  const card = (icon: React.ReactNode, title: string, text: string, play: () => void, slots: React.ReactNode, extra?: React.ReactNode) => (
    <section className="card an-card">
      <div className="an-head">
        <span className="an-ico" aria-hidden="true">{icon}</span>
        <div><h2>{title}</h2><p className="note">{text}</p></div>
        <button className="an-play" onClick={play}>▶ Watch</button>
      </div>
      {extra}
      <div className="an-slots">{slots}</div>
    </section>
  );

  return (
    <div className="an">
      <section className="an-intro">
        <h1>Animations</h1>
        <p>Watch every celebration in Honor and give each one its own sound. Files (MP3, M4A, OGG or WAV, up to 4.3 MB) are kept privately in your database and only play for your family.</p>
      </section>
      {error && <p className="err banner" role="alert">{error}</p>}

      {card(<RankIcon rank="legendary" size={44} />, "Legendary quest film",
        "35 seconds: giving up Obsidian, the shatter, the road to L, then the To Be a Legend award.",
        () => setPreview({ kind: "quest" }),
        <>{slot("quest-music", "Music", "Plays through the whole film, fading in and out")}
          {slot("quest-thunder", "Thunder", "Plays with the lightning: at 9 seconds and again at 11.5 seconds")}
          {slot("quest-crack", "Crest shatters", "Plays once, 13 seconds in, when Obsidian breaks")}</>)}

      {card(<RankIcon rank={rank} size={44} />, "Rank-up film",
        "When a member reaches a new rank: the crest, the name, then their new frame, theme and gems.",
        () => { const t = tiers.find((x) => x.key === rank); if (t) setPreview({ kind: "rank", tier: t }); },
        slot("rankup-music", "Music", "Plays through the whole rank-up show"),
        <div className="an-ranks" role="radiogroup" aria-label="Rank to preview">
          {tiers.map((t) => (
            <button key={t.key} role="radio" aria-checked={rank === t.key} className={`an-rank${rank === t.key ? " on" : ""}`}
              style={{ ["--tc" as string]: t.color }} onClick={() => setRank(t.key)} title={t.name}>
              <RankIcon rank={t.key} size={28} /><small>{t.name}</small>
            </button>
          ))}
        </div>)}

      {card("🧰", "Treasure chest", "The daily streak chest and rank rewards: tap the chest, it opens, gems pour out.",
        () => setPreview({ kind: "chest" }),
        <>{slot("chest", "Chest opens", "Plays when the chest is tapped open")}
          {slot("collect", "Collect", "Plays when gems fly into the wallet (every gem reward)")}</>)}

      {card("💎", "Gem rain", "Day complete and achievements: gems rain down, pile up, the floor cracks and a few tumble off.", () => setPreview({ kind: "gems" }),
        <>{slot("gems", "Gems rain down", "Plays as the gems start falling")}
          {slot("gems-crack", "Floor cracks", "Plays when the heap lands and the floor cracks")}</>)}

      {card("🏅", "Achievement collected", "Collecting an achievement's gems in the Achievements tab.", () => setPreview({ kind: "achievement" }),
        slot("achievement", "Achievement", "Plays as the achievement's gems appear"))}

      {card("🎨", "Art tournament win", "A 1st, 2nd or 3rd place: a golden chest with the prize.", () => setPreview({ kind: "win" }),
        slot("event-win", "Win", "Plays when the prize chest appears"))}

      {preview?.kind === "quest" && <QuestFilm name="Preview" preview onClose={() => setPreview(null)} />}
      {preview?.kind === "rank" && <RankUp tier={preview.tier} name="Preview" profile={null}
        reward={(info?.gems.per_rank[preview.tier.key] ?? 0) + (preview.tier.key === "legendary" ? 0 : info?.gems.per_level ?? 10)} onClose={() => setPreview(null)} />}
      {preview?.kind === "chest" && <GemReward amount={45} chest jewel="#e3214a" title="Daily streak chest · preview" onDone={() => setPreview(null)} />}
      {preview?.kind === "gems" && <GemReward amount={20} title="Day complete! · preview" onDone={() => setPreview(null)} />}
      {preview?.kind === "achievement" && <GemReward amount={100} title="Achievement · preview" sound="achievement" onDone={() => setPreview(null)} />}
      {preview?.kind === "win" && <GemReward amount={100} chest jewel="#ffd24a" title="🥇 1st place · preview" sound="event-win" onDone={() => setPreview(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
