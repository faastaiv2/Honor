import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type AdminMember, type ShaytanTest } from "../api";
import Avatar from "../lib/Avatar";
import Gem from "../lib/Gem";
import { fmt } from "../lib/dates";
import { useToast } from "../lib/events";
import ShaytanScene from "../lib/Shaytan";

/** Tests the admin sends to members. Deploy Shaytan: he appears to a member and offers gems to skip the day's tasks. */
export default function Tests() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [tests, setTests] = useState<ShaytanTest[] | null>(null);
  const [who, setWho] = useState("");
  const [offer, setOffer] = useState("50");
  const [autoCut, setAutoCut] = useState("1");
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useToast();
  const [amount, setAmount] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    api.members().then((ms) => { setMembers(ms.filter((m) => m.active)); setWho((w) => w || ms.find((m) => m.active)?.id || ""); }).catch(() => undefined);
    api.tests().then(setTests).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load"));
  }, []);
  useEffect(load, [load]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); setToast(ok); setError(""); load(); } catch (e) { setError(e instanceof ApiError ? e.message : "Something went wrong"); }
  };
  const n = (id: string, d: number) => Math.max(1, Math.floor(Number(amount[id] ?? d) || d));
  const name = members.find((m) => m.id === who)?.name ?? "";

  return (
    <section className="tests">
      <div className="card ts-deploy">
        <h2>😈 Deploy Shaytan</h2>
        <p className="note">Dark clouds roll in on the member's screen and Shaytan appears with a sack of gems: he offers them to skip today's tasks.
          Each "no" brings him back with a bigger offer (then 100, then 500). If they say yes he laughs (there are no gems), vanishes in fire,
          and their Honor is cut straight away by the amount you set (they see why);
          after the third "no" he is blown away and they earn the “Beat Shaytan” achievement (+30 gems).</p>
        <div className="ts-row">
          <select value={who} onChange={(e) => setWho(e.target.value)} aria-label="Member">
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <label className="ts-row">Offer <input inputMode="numeric" value={offer} onChange={(e) => setOffer(e.target.value.replace(/\D/g, "").slice(0, 4))} aria-label="Gems offered" /> <Gem /></label>
          <label className="ts-row">If they say yes, cut Honor <input inputMode="numeric" value={autoCut} onChange={(e) => setAutoCut(e.target.value.replace(/\D/g, "").slice(0, 2))} aria-label="Honor cut if they say yes" /></label>
          <button className="ts-go" disabled={!who} onClick={() => act(() => api.deployShaytan(who, Math.max(1, Number(offer) || 50), Math.min(20, Number(autoCut) || 0)), `😈 Shaytan is on his way to ${name}`)}>Deploy Shaytan</button>
          <button onClick={() => setPreview(true)}>👁 Preview</button>
        </div>
        {error && <p className="err">{error}</p>}
      </div>

      <div className="card">
        <h2>Results</h2>
        {tests === null ? <p className="note">Loading…</p> : tests.length === 0 ? <p className="note">No tests yet.</p> : (
          <ul className="ts-list">
            {tests.map((t) => (
              <li key={t.id} className="ts-item">
                <div className="ts-head">
                  <Avatar avatar={t.member.avatar} color="#ffffff" size={36} />
                  <b>{t.member.name}</b>
                  <span className={`ts-state ${t.answer || "wait"}`}>{t.answer === "yes" ? `😈 Said yes to ${t.final_offer}` : t.answer === "no" ? "🛡️ Said no 3 times" : "⏳ Waiting"}</span>
                  <small className="note">{fmt(t.created_at.slice(0, 10), { day: "numeric", month: "short" })} · offers {t.ladder.join(" → ")} gems
                    {t.answer === "yes" && t.refusals > 0 ? ` · refused ${t.refusals} first` : ""}</small>
                </div>
                {t.answer === "" && <div className="ts-row"><span className="ts-done">Shaytan appears the next time {t.member.name} opens the app.</span>
                  <button onClick={() => act(() => api.cancelTest(t.id), "Called off")}>Call off</button></div>}
                {t.answer === "" && t.auto_cut > 0 && <span className="ts-done">If they say yes: Honor −{t.auto_cut} straight away</span>}
                {t.answer === "yes" && <div className="ts-row">
                  <input inputMode="numeric" value={amount[t.id] ?? "1"} onChange={(e) => setAmount({ ...amount, [t.id]: e.target.value.replace(/\D/g, "").slice(0, 2) })} aria-label="Honor to cut" />
                  <button className="danger" onClick={() => act(() => api.cutTest(t.id, n(t.id, 1)), `Cut ${n(t.id, 1)} more Honor from ${t.member.name}`)}>Cut more −{n(t.id, 1)}</button>
                  {t.posted ? <span className="ts-done">Posted ✓</span>
                    : <button onClick={() => act(() => api.postTest(t.id), "Posted to Community")}>📣 Post "worked with Shaytan"</button>}
                  {t.cut > 0 && <span className="ts-done">Cut so far: −{t.cut}{t.auto_cut > 0 ? ` (−${t.auto_cut} automatic)` : ""}</span>}
                </div>}
                {t.answer === "no" && <div className="ts-row"><span className="ts-done">🏅 Earned the “Beat Shaytan” achievement (+30 <Gem />){t.reward > 0 ? ` · you also gave +${t.reward}` : ""}</span></div>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {preview && <ShaytanScene name={name || "Preview"} offer={Math.max(1, Number(offer) || 50)} preview onDone={() => setPreview(false)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </section>
  );
}
