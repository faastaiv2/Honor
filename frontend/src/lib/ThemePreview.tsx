import { THEME_SWATCH } from "./themes";

/** A tiny picture of the app in a theme's colours. */
export default function ThemePreview({ k }: { k: string }) {
  const [dark, light] = THEME_SWATCH[k] ?? ["#0b4a3a", "#c9962b"];
  return (
    <div className={`ru-theme${k === "white" ? " light" : ""}${k === "northern" ? " aurora" : ""}${k === "midnight" ? " midnight" : ""}`} style={{ ["--a" as string]: dark, ["--b" as string]: light }} aria-hidden="true">
      <div className="ru-theme-top"><i /><i /><i /></div>
      <div className="ru-theme-body"><span /><span /><em /></div>
    </div>
  );
}
