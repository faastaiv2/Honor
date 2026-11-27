import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { confetti } from "./confetti";
import { playSound } from "./sounds";

/**
 * The show after buying something in the Avatar shop. Four looks, one per rarity:
 *  - Common: a little wooden crate pops open with a puff.
 *  - Rare: a block of ice cracks and shatters into blue sparkles.
 *  - Epic: a golden chest bursts open in rays of light and coins.
 *  - Legendary (the longest, ~6 s): the screen turns to gold, golden dust rises, an ornate jewelled chest rises
 *    and rumbles with light leaking from its seams, a flash, the lid blasts off in golden god-rays, coins and gems
 *    fountain out, and the item rises from the chest under a crown. The background stays gold throughout.
 * Then "You got it!" with Wear it now / Later.
 */
export type Rarity = "common" | "rare" | "epic" | "legendary";

/** Frames and themes have no rarity: go by price. */
export function rarityOf(rarity: string | undefined, price: number): Rarity {
  if (rarity === "common" || rarity === "rare" || rarity === "epic" || rarity === "legendary") return rarity;
  return price >= 1000 ? "legendary" : price >= 600 ? "epic" : price >= 300 ? "rare" : "common";
}

const TIMES: Record<Rarity, number> = { common: 1400, rare: 2200, epic: 2600, legendary: 6000 };
/** The Legendary show's steps before the reveal (ms from the start). */
const LEGEND_STEPS: [number, string][] = [[0, "dark"], [600, "rise"], [2300, "rumble"], [4300, "crack"], [5400, "flash"]];
const LABEL: Record<Rarity, string> = { common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary" };

export default function PurchaseShow({ rarity, name, art, onWear, onClose }: {
  rarity: Rarity; name: string; art: ReactNode; onWear?: () => void; onClose: () => void;
}) {
  const [stage, setStage] = useState<"open" | "reveal">("open");
  const [step, setStep] = useState("dark");
  useEffect(() => {
    if (rarity !== "legendary") return;
    const ts = LEGEND_STEPS.map(([at, name]) => window.setTimeout(() => setStep(name), at));
    return () => ts.forEach(clearTimeout);
  }, [rarity]);
  useEffect(() => {
    void playSound(`buy-${rarity}`);
    const t = window.setTimeout(() => {
      setStage("reveal");
      const colors: Record<Rarity, string[]> = {
        common: ["#c08a52", "#ffe0b0", "#ffffff"], rare: ["#8ad8ff", "#ffffff", "#4a8ae0"],
        epic: ["#ffd24a", "#c070ff", "#ffffff"], legendary: ["#ffd24a", "#fff3b0", "#e8a317", "#ffffff", "#ff6a8a"],
      };
      confetti(colors[rarity]);
      if (rarity === "legendary") { window.setTimeout(() => confetti(colors.legendary), 450); window.setTimeout(() => confetti(colors.legendary), 1100); }
    }, TIMES[rarity]);
    return () => clearTimeout(t);
  }, [rarity]);

  return createPortal(
    <div className={`ps ps-r-${rarity} ps-st-${stage}${rarity === "legendary" ? ` psl-${stage === "reveal" ? "reveal" : step}` : ""}`} role="dialog" aria-modal="true" aria-label={`You bought ${name}`}>
      {rarity === "legendary" && <>
        <div className="psl-dust" aria-hidden="true">{Array.from({ length: 34 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div>
        <div className="ps-beam" aria-hidden="true" />
        <div className="ps-rings" aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div>
        <div className="psl-whiteout" aria-hidden="true" />
      </>}
      {(rarity === "epic" || rarity === "legendary") && <div className="ps-rays" aria-hidden="true" />}

      <div className="ps-stage">
        {/* the container it comes out of */}
        {rarity === "common" && <div className="ps-crate" aria-hidden="true"><span className="lid" /><span className="box" /><span className="puff" /></div>}
        {rarity === "rare" && <div className="ps-ice" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}
          <span className="crack" />
        </div>}
        {rarity === "epic" && <div className="ps-chest" aria-hidden="true">
          <span className="lid" /><span className="box" />
          {Array.from({ length: 12 }, (_, i) => <i key={i} className="coin" style={{ ["--i" as string]: i }} />)}
        </div>}
        {rarity === "legendary" && <>
          <div className="psl-chest" aria-hidden="true">
            <span className="psl-glow" />
            <span className="psl-lid"><i className="psl-jewel j1" /><i className="psl-jewel j2" /><i className="psl-jewel j3" /></span>
            <span className="psl-box"><i className="psl-band" /><i className="psl-lock" /><i className="psl-jewel j4" /><i className="psl-jewel j5" /></span>
            <span className="psl-leak">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</span>
            {Array.from({ length: 26 }, (_, i) => <i key={i} className={i % 3 === 0 ? "psl-gem" : "psl-coin"} style={{ ["--i" as string]: i }}>{i % 3 === 0 ? "💎" : ""}</i>)}
          </div>
          <div className="psl-aura" aria-hidden="true" />
          <div className="ps-crown" aria-hidden="true">👑</div>
        </>}

        <div className="ps-item">{art}</div>
        {(rarity === "rare" || rarity === "legendary") && <div className="ps-sparks" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}
        </div>}
      </div>

      <div className="ps-card">
        {stage === "reveal" ? <>
          <p className={`ps-tag t-${rarity}`}>{LABEL[rarity]}</p>
          <h2>{rarity === "legendary" ? <span className="ps-legend">LEGENDARY!</span> : "You got it!"}</h2>
          <p className="ps-name">{name}</p>
          <div className="ps-btns">
            {onWear && <button className="primary" autoFocus onClick={onWear}>✨ Use it now</button>}
            <button onClick={onClose}>{onWear ? "Later" : "Done"}</button>
          </div>
        </> : <p className="ps-wait">{rarity === "legendary" ? (step === "dark" || step === "rise" ? "Something legendary is coming…" : step === "rumble" ? "It's waking up…" : "✨✨✨") : "Opening…"}</p>}
      </div>
    </div>,
    document.body,
  );
}
