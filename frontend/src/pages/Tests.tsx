import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type AdminMember, type BullyTest, type KittenTest, type CharityTest, type PigeonNote, type QuizQuestion, type QuizTest, type ShaytanTest } from "../api";
import CharityScene from "../lib/Charity";
import PigeonScene, { medievalNote } from "../lib/Pigeon";
import BullyScene from "../lib/Bully";
import QuizScene from "../lib/Quiz";
import KittenScene from "../lib/Kitten";
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
  const [charity, setCharity] = useState<CharityTest[] | null>(null);
  const [cWho, setCWho] = useState("");
  const [ask, setAsk] = useState("20");
  const [giveBack, setGiveBack] = useState("50");
  const [cPreview, setCPreview] = useState(false);
  const [pigeons, setPigeons] = useState<PigeonNote[] | null>(null);
  const [pWho, setPWho] = useState("");
  const [pFrom, setPFrom] = useState("");
  const [pGems, setPGems] = useState("50");
  const [pMsg, setPMsg] = useState("");
  const [pPreview, setPPreview] = useState(false);
  const [bullies, setBullies] = useState<BullyTest[] | null>(null);
  const [bWho, setBWho] = useState("");
  const [bPreview, setBPreview] = useState(false);
  const [kittens, setKittens] = useState<KittenTest[] | null>(null);
  const [kWho, setKWho] = useState("");
  const [kPreview, setKPreview] = useState(false);
  const blankQ = (): Required<QuizQuestion> => ({ q: "", options: ["", "", ""], answer: 0 });
  const [quizzes, setQuizzes] = useState<QuizTest[] | null>(null);
  const [qWho, setQWho] = useState("");
  const [qGems, setQGems] = useState("10");
  const [qs, setQs] = useState<Required<QuizQuestion>[]>([blankQ(), blankQ(), blankQ()]);
  const [qPreview, setQPreview] = useState(false);
  const setQ = (i: number, patch: Partial<Required<QuizQuestion>>) => setQs((xs) => xs.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const cleanQs = () => qs.map((x) => ({ ...x, options: x.options.map((o) => o.trim()) }))
    .filter((x) => x.q.trim()).map((x) => {
      const keep = x.options.map((o, k) => [o, k] as const).filter(([o]) => o);
      return { q: x.q.trim(), options: keep.map(([o]) => o), answer: Math.max(0, keep.findIndex(([, k]) => k === x.answer)) };
    });
  const quizOk = cleanQs().length > 0 && cleanQs().every((x) => x.options.length >= 2) &&
    qs.filter((x) => x.q.trim()).every((x) => x.options[x.answer]?.trim());

  const load = useCallback(() => {
    api.members().then((ms) => { setMembers(ms.filter((m) => m.active)); setWho((w) => w || ms.find((m) => m.active)?.id || ""); }).catch(() => undefined);
    api.members().then((ms) => setCWho((w) => w || ms.find((m) => m.active)?.id || "")).catch(() => undefined);
    api.members().then((ms) => setPWho((w) => w || ms.find((m) => m.active)?.id || "")).catch(() => undefined);
    api.members().then((ms) => { const f = ms.find((m) => m.active)?.id || ""; setBWho((w) => w || f); setQWho((w) => w || f); }).catch(() => undefined);
    api.members().then((ms) => setKWho((w) => w || ms.find((m) => m.active)?.id || "")).catch(() => undefined);
    api.kittenTests().then(setKittens).catch(() => undefined);
    api.bullyTests().then(setBullies).catch(() => undefined);
    api.quizTests().then(setQuizzes).catch(() => undefined);
    api.pigeons().then(setPigeons).catch(() => undefined);
    api.charityTests().then(setCharity).catch(() => undefined);
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

      <div className="card ts-deploy">
        <h2>🐱 The thirsty kitten</h2>
        <p className="note">Inspired by the hadith of the man who gave water to a thirsty dog. A thin kitten meows in the desert with the pyramids behind.
          Water costs <b>all</b> the member's gems. If they give it, the kitten drinks, turns into the Pharaoh Cat, every gem comes back, and they unlock
          a <b>secret</b> achievement (“???” until then: Mercy to All Creatures, Epic, +100) and the Pharaoh Cat picture. Walking past costs nothing; the kitten just lies down sadly.</p>
        <div className="ts-row">
          <select value={kWho} onChange={(e) => setKWho(e.target.value)} aria-label="Member">
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button className="ts-go" disabled={!kWho} onClick={() => act(() => api.sendKitten(kWho), `🐱 The kitten is waiting for ${members.find((m) => m.id === kWho)?.name ?? ""}`)}>Send the kitten</button>
          <button onClick={() => setKPreview(true)}>👁 Preview</button>
        </div>
        {kittens && kittens.length > 0 && (
          <ul className="ts-list">
            {kittens.map((t) => (
              <li key={t.id} className="ts-item">
                <div className="ts-head">
                  <Avatar avatar={t.member.avatar} color="#ffffff" size={36} />
                  <b>{t.member.name}</b>
                  <span className={`ts-state ${t.answer === "water" ? "no" : t.answer ? "yes" : "wait"}`}>
                    {t.answer === "water" ? `💧 Gave water (all ${t.gems} gems, returned)` : t.answer === "walk" ? "🚶 Walked past" : "⏳ Waiting"}</span>
                  <small className="note">{fmt(t.created_at.slice(0, 10), { day: "numeric", month: "short" })}</small>
                </div>
                {t.answer === "walk" && <div className="ts-row">{t.posted ? <span className="ts-done">Posted to Community ✓</span>
                  : <button onClick={() => act(() => api.postKitten(t.id), "Posted to Community")}>📣 Post “{t.member.name} left the kitten to die in the desert”</button>}</div>}
                {!t.answer && <div className="ts-row"><span className="ts-done">The kitten appears the next time {t.member.name} opens the app.</span>
                  <button onClick={() => act(() => api.cancelKitten(t.id), "Called off")}>Call off</button></div>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card ts-deploy">
        <h2>🦉 The owl's quiz</h2>
        <p className="note">A wise owl flies onto the member's screen with your questions. One try each: a right answer earns the gems at once, a wrong
          one shows the right answer. All right and the owl takes a bow. Tap the circle next to the right answer.</p>
        <div className="ts-row">
          <select value={qWho} onChange={(e) => setQWho(e.target.value)} aria-label="Member">
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <label className="ts-row">Gems per right answer <input inputMode="numeric" value={qGems} onChange={(e) => setQGems(e.target.value.replace(/\D/g, "").slice(0, 4))} aria-label="Gems per right answer" /> <Gem /></label>
        </div>
        <div className="qz-edit">
          {qs.map((x, i) => (
            <fieldset key={i} className="qz-edit-q">
              <legend>Question {i + 1}</legend>
              <input value={x.q} maxLength={300} placeholder={["e.g. How many surahs are in the Quran?", "e.g. What do we say before eating?", "e.g. Which surah is called the Mother of the Book?"][i] ?? "Question"}
                onChange={(e) => setQ(i, { q: e.target.value })} aria-label={`Question ${i + 1}`} />
              {x.options.map((o, k) => (
                <label key={k} className={`qz-edit-opt${x.answer === k ? " right" : ""}`}>
                  <input type="radio" name={`qz-right-${i}`} checked={x.answer === k} onChange={() => setQ(i, { answer: k })} aria-label={`Answer ${"ABCD"[k]} is right`} />
                  <span>{"ABCD"[k]}</span>
                  <input value={o} maxLength={120} placeholder={k < 2 ? "Answer" : "Answer (optional)"} onChange={(e) => setQ(i, { options: x.options.map((y, j) => (j === k ? e.target.value : y)) })} aria-label={`Answer ${"ABCD"[k]}`} />
                </label>
              ))}
              {x.options.length < 4 && <button type="button" className="qz-edit-add" onClick={() => setQ(i, { options: [...x.options, ""] })}>+ Add an answer</button>}
            </fieldset>
          ))}
        </div>
        <div className="ts-row">
          <button className="ts-go" disabled={!qWho || !quizOk} onClick={() => act(async () => { await api.sendQuiz(qWho, cleanQs(), Number(qGems) || 0); setQs([blankQ(), blankQ(), blankQ()]); },
            `🦉 The owl is flying to ${members.find((m) => m.id === qWho)?.name ?? ""}`)}>Send the owl</button>
          <button disabled={!quizOk} onClick={() => setQPreview(true)}>👁 Preview</button>
          {!quizOk && <span className="ts-done">Write at least one question with two answers, and pick the right one.</span>}
        </div>
        {quizzes && quizzes.length > 0 && (
          <ul className="ts-list">
            {quizzes.map((t) => (
              <li key={t.id} className="ts-item">
                <div className="ts-head">
                  <Avatar avatar={t.member.avatar} color="#ffffff" size={36} />
                  <b>{t.member.name}</b>
                  <span className={`ts-state ${t.finished_at ? (t.right === t.questions.length ? "no" : "yes") : "wait"}`}>
                    {t.finished_at ? `📜 ${t.right} of ${t.questions.length} right · +${t.right * t.gems_each} gems` : t.answers.some((a) => a !== -1) ? "✏️ Answering…" : "🦉 On its way"}</span>
                  <small className="note">{fmt(t.created_at.slice(0, 10), { day: "numeric", month: "short" })} · {t.questions.length} question{t.questions.length === 1 ? "" : "s"}</small>
                </div>
                <ol className="qz-review">
                  {t.questions.map((x, k) => <li key={k}>{x.q} <b>{x.options[x.answer]}</b>{t.answers[k] !== -1 && <span className={t.answers[k] === x.answer ? "ok" : "bad"}>
                    {t.answers[k] === x.answer ? " ✓" : ` ✗ said “${x.options[t.answers[k]]}”`}</span>}</li>)}
                </ol>
                {t.answers.every((a) => a === -1) && <div className="ts-row"><button onClick={() => act(() => api.cancelQuiz(t.id), "Called back")}>Call back</button></div>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card ts-deploy">
        <h2>😠 Someone was rude to you</h2>
        <p className="note">A boastful kid struts onto the member's screen: “You are very bad and lazy! I am better than you! I am very powerful and strong, and you are
          WEAK!” They choose: <b>Launch Gobi</b> (25 gems, the golden Mega Gobi launcher; hit him and he runs off crying), <b>say something mean back</b> (he gets
          angrier, a storm cloud, nothing gained), or <b>reply kindly</b> (he says sorry, becomes a friend, and they earn “Gentle Heart”, Rare, +40 gems).</p>
        <div className="ts-row">
          <select value={bWho} onChange={(e) => setBWho(e.target.value)} aria-label="Member">
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button className="ts-go" disabled={!bWho} onClick={() => act(() => api.sendBully(bWho), `😠 The rude kid is on his way to ${members.find((m) => m.id === bWho)?.name ?? ""}`)}>Send him</button>
          <button onClick={() => setBPreview(true)}>👁 Preview</button>
        </div>
        {bullies && bullies.length > 0 && (
          <ul className="ts-list">
            {bullies.map((t) => (
              <li key={t.id} className="ts-item">
                <div className="ts-head">
                  <Avatar avatar={t.member.avatar} color="#ffffff" size={36} />
                  <b>{t.member.name}</b>
                  <span className={`ts-state ${t.answer === "kind" ? "no" : t.answer ? "yes" : "wait"}`}>
                    {t.answer === "kind" ? "🤝 Replied kindly" : t.answer === "mean" ? "😤 Was mean back" : t.answer === "gobi" ? `🥦 Launched a Mega Gobi (−${t.paid})` : "⏳ Waiting"}</span>
                  <small className="note">{fmt(t.created_at.slice(0, 10), { day: "numeric", month: "short" })}</small>
                </div>
                {!t.answer && <div className="ts-row"><span className="ts-done">He appears the next time {t.member.name} opens the app.</span>
                  <button onClick={() => act(() => api.cancelBully(t.id), "Called off")}>Call off</button></div>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card ts-deploy">
        <h2>🕊️ Send a carrier pigeon</h2>
        <p className="note">A pigeon flies onto the member's screen with a scroll tied to its leg. When they tap the note it unrolls:
          a thank-you in old (medieval) English for keeping up the great work, signed by you, with a gift of gems.</p>
        <div className="ts-row">
          <select value={pWho} onChange={(e) => setPWho(e.target.value)} aria-label="Member">
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <label className="ts-row">From <input value={pFrom} maxLength={80} placeholder="Your name" onChange={(e) => setPFrom(e.target.value)} aria-label="From" style={{ width: 140 }} /></label>
          <label className="ts-row">Gift <input inputMode="numeric" value={pGems} onChange={(e) => setPGems(e.target.value.replace(/\D/g, "").slice(0, 5))} aria-label="Gems" /> <Gem /></label>
        </div>
        <textarea className="ts-msg" rows={4} maxLength={1500} value={pMsg} onChange={(e) => setPMsg(e.target.value)} aria-label="Message"
          placeholder={`Leave empty for the standard note:\n\n${medievalNote(members.find((m) => m.id === pWho)?.name ?? "…", Number(pGems) || 0)}`} />
        <div className="ts-row">
          <button className="ts-go" disabled={!pWho} onClick={() => act(async () => { await api.sendPigeon(pWho, pFrom.trim(), Number(pGems) || 0, pMsg.trim()); setPMsg(""); },
            `🕊️ The pigeon is flying to ${members.find((m) => m.id === pWho)?.name ?? ""}`)}>Send the pigeon</button>
          <button onClick={() => setPPreview(true)}>👁 Preview</button>
        </div>
        {pigeons && pigeons.length > 0 && (
          <ul className="ts-list">
            {pigeons.map((t) => (
              <li key={t.id} className="ts-item">
                <div className="ts-head">
                  <Avatar avatar={t.member.avatar} color="#ffffff" size={36} />
                  <b>{t.member.name}</b>
                  <span className={`ts-state ${t.opened_at ? "no" : "wait"}`}>{t.opened_at ? `📜 Opened · +${t.gems} gems` : "🕊️ On its way"}</span>
                  <small className="note">{fmt(t.created_at.slice(0, 10), { day: "numeric", month: "short" })} · from {t.sender}</small>
                </div>
                {!t.opened_at && <div className="ts-row"><span className="ts-done">It arrives the next time {t.member.name} opens the app.</span>
                  <button onClick={() => act(() => api.cancelPigeon(t.id), "Called back")}>Call back</button></div>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card ts-deploy">
        <h2>🧥 The man in the cloak</h2>
        <p className="note">A poor man in a hooded cloak shuffles onto the member's screen and begs for gems.
          If they <b>give</b>, the gems go (never more than they have), he thanks them and gives back the amount you set, and they earn the
          “Sadaqah” achievement (Rare, +40 gems). If they say <b>get lost</b>, he throws off the cloak: it was Shaytan, who says “Good job!”, laughs and leaves.</p>
        <div className="ts-row">
          <select value={cWho} onChange={(e) => setCWho(e.target.value)} aria-label="Member">
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <label className="ts-row">Begs for <input inputMode="numeric" value={ask} onChange={(e) => setAsk(e.target.value.replace(/\D/g, "").slice(0, 4))} aria-label="Gems he begs for" /> <Gem /></label>
          <label className="ts-row">Gives back <input inputMode="numeric" value={giveBack} onChange={(e) => setGiveBack(e.target.value.replace(/\D/g, "").slice(0, 4))} aria-label="Gems he gives back" /> <Gem /></label>
          <button className="ts-go" disabled={!cWho} onClick={() => act(() => api.deployCharity(cWho, Math.max(1, Number(ask) || 20), Math.max(0, Number(giveBack) || 0)),
            `🧥 The man in the cloak is on his way to ${members.find((m) => m.id === cWho)?.name ?? ""}`)}>Send him</button>
          <button onClick={() => setCPreview(true)}>👁 Preview</button>
        </div>
        {charity && charity.length > 0 && (
          <ul className="ts-list">
            {charity.map((t) => (
              <li key={t.id} className="ts-item">
                <div className="ts-head">
                  <Avatar avatar={t.member.avatar} color="#ffffff" size={36} />
                  <b>{t.member.name}</b>
                  <span className={`ts-state ${t.answer === "give" ? "no" : t.answer === "refuse" ? "yes" : "wait"}`}>
                    {t.answer === "give" ? `🤲 Gave ${t.given} · got ${t.give_back} back` : t.answer === "refuse" ? "👋 Said get lost" : "⏳ Waiting"}</span>
                  <small className="note">{fmt(t.created_at.slice(0, 10), { day: "numeric", month: "short" })} · begs {t.ask}, gives back {t.give_back}</small>
                </div>
                {t.answer === "" && <div className="ts-row"><span className="ts-done">He appears the next time {t.member.name} opens the app.</span>
                  <button onClick={() => act(() => api.cancelCharity(t.id), "Called off")}>Call off</button></div>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Shaytan results</h2>
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
      {kPreview && <KittenScene name={members.find((m) => m.id === kWho)?.name || "Preview"} balance={120} preview onDone={() => setKPreview(false)} />}
      {bPreview && <BullyScene name={members.find((m) => m.id === bWho)?.name || "Preview"} balance={100} preview onDone={() => setBPreview(false)} />}
      {qPreview && <QuizScene name={members.find((m) => m.id === qWho)?.name || "Preview"} preview onDone={() => setQPreview(false)}
        quiz={{ id: "p", gems_each: Number(qGems) || 0, answers: cleanQs().map(() => -1), questions: cleanQs() }} />}
      {pPreview && <PigeonScene name={members.find((m) => m.id === pWho)?.name || "Preview"} sender={pFrom.trim() || "Admin"} gems={Number(pGems) || 0} message={pMsg} preview onDone={() => setPPreview(false)} />}
      {cPreview && <CharityScene name={members.find((m) => m.id === cWho)?.name || "Preview"} ask={Math.max(1, Number(ask) || 20)} balance={9999} preview onDone={() => setCPreview(false)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </section>
  );
}
