import "@fontsource/amiri/400.css";
import "@fontsource/marcellus/400.css";
import "@fontsource/nunito-sans/400.css";
import "@fontsource/nunito-sans/600.css";
import "@fontsource/nunito-sans/800.css";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth";

// After a new version is published, a page that was already open may ask for files that no longer exist.
// Reload once to pick up the new version (a guard stops it looping if the network is really down).
function reloadForNewVersion() {
  try {
    const last = Number(sessionStorage.getItem("honor.reloaded") || 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem("honor.reloaded", String(Date.now()));
  } catch { /* private mode: reload anyway */ }
  window.location.reload();
  return true;
}
window.addEventListener("vite:preloadError", (e) => { if (reloadForNewVersion()) e.preventDefault(); });
(window as unknown as { __honorReload: () => boolean }).__honorReload = reloadForNewVersion;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
