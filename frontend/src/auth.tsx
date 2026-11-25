import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, token, UNAUTHORIZED_EVENT, type Viewer } from "./api";

interface AuthState {
  viewer: Viewer | null;
  loading: boolean;
  signIn: (t: string, v: Viewer) => void;
  signOut: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [loading, setLoading] = useState(() => !!token.get());

  const signOut = useCallback(() => { token.set(null); setViewer(null); }, []);
  const signIn = useCallback((t: string, v: Viewer) => { token.set(t); setViewer(v); }, []);

  useEffect(() => {
    if (!token.get()) return;
    api.me().then(setViewer).catch(() => token.set(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, signOut);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, signOut);
  }, [signOut]);

  return <Ctx.Provider value={{ viewer, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
