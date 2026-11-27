import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { confetti } from "./confetti";
import { playSound } from "./sounds";

/**
 * The show after buying something in the Avatar shop. Four looks, one per rarity:
 *  - Common: a little wooden crate pops open with a puff.
 *  - Rare: a block of ice cracks and shatters into blue sparkles.
 *  - Epic: a golden chest bursts open in rays of light and coins.
 *  - Legendary: the screen goes dark, a beam of light, rainbow shockwaves, and the item descends with a crown.
 * Then "You got it!" with Wear it now / Later.
 */
export type Rarity = "common" | "rare" | "epic" | "legendary";

/** Frames and themes have no rarity: go by price. */
export function rarityOf(rarity: string | undefined, price: number): Rarity {
  if (rarity === "common" || rarity === "rare" || rarity === "epic" || rarity === "legendary") return rarity;
  return price >= 1000 ? "legendary" : price >= 600 ? "epic" : price >= 300 ? "rare" : "common";
}

const TIMES: Record<Rarity, number> = { common: 1400, rare: 2200, epic: 2600, legendary: 3800 };
const LABEL: Record<Rarity, string> = { common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary" };

export default function PurchaseShow({ rarity, name, art, onWear, onClose }: {
  rarity: Rarity; name: string; art: ReactNode; onWear?: () => void; onClose: () => void;
}) {
  const [stage, setStage] = useState<"open" | "reveal">("open");
  useEffect(() => {
    void playSound(`buy-${rarity}`);
    const t = window.setTimeout(() => {
      setStage("reveal");
      const colors: Record<Rarity, string[]> = {
        common: ["#c08a52", "#ffe0b0", "#ffffff"], rare: ["#8ad8ff", "#ffffff", "#4a8ae0"],
        epic: ["#ffd24a", "#c070ff", "#ffffff"], legendary: ["#ff6a8a", "#ffd24a", "#6aff9a", "#6ac8ff", "#c070ff"],
      };
      confetti(colors[rarity]);
      if (rarity === "legendary") window.setTimeout(() => confetti(colors.legendary), 500);
    }, TIMES[rarity]);
    return () => clearTimeout(t);
  }, [rarity]);

  return createPortal(
    <div className={`ps ps-r-${rarity} ps-st-${stage}`} role="dialog" aria-modal="true" aria-label={`You bought ${name}`}>
      {rarity === "legendary" && <>
        <div className="ps-beam" aria-hidden="true" />
        <div className="ps-rings" aria-hidden="true">{[0, 1, 2, 3].map((i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div>
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
        {rarity === "legendary" && <div className="ps-crown" aria-hidden="true">👑</div>}

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
        </> : <p className="ps-wait">{rarity === "legendary" ? "Something legendary is coming…" : "Opening…"}</p>}
      </div>
    </div>,
    document.body,
  );
}
