import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In development the browser talks to Vite (port 5173) and Vite forwards /api to the
// Python backend on port 8000. In production the backend serves this built site itself.
export default defineConfig({
  plugins: [react()],
  // The commit this site was built from: if the server is newer, an open tab reloads itself (see api.ts).
  define: { __BUILD__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA ?? "") },
  server: {
    port: 5173,
    proxy: { "/api": process.env.VITE_PROXY_TARGET ?? "http://127.0.0.1:8000" },
  },
  test: { environment: "node" },
});
