import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { api, type TodayInfo } from "./api";
import { useAuth } from "./auth";
import { fmt } from "./lib/dates";
import { useChangeCounter } from "./lib/events";
import Admin from "./pages/Admin";
import HistoryPage from "./pages/History";
import Leaderboard from "./pages/Leaderboard";
import Rules from "./pages/Rules";
import SignIn from "./pages/SignIn";
import Today from "./pages/Today";

export default function App() {
  const { viewer, loading, signOut } = useAuth();
  const [info, setInfo] = useState<TodayInfo | null>(null);
  const changes = useChangeCounter();

  useEffect(() => {
    if (!viewer) { setInfo(null); return; }
    api.today().then(setInfo).catch(() => undefined);
  }, [viewer, changes]);

  if (loading) return <p className="band note">Loading…</p>;
  if (!viewer) return <SignIn />;

  return (
    <>
      <header className="hero band">
        <div className="wrap">
          <div className="hgrid">
            <div>
              <h1>Honor <span>🏆</span></h1>
              <p className="sub">
                {info ? `${fmt(info.today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · Day ${info.day_number}${info.weekend ? " · Weekend" : ""}` : " "}
              </p>
            </div>
            {info && (
              <div className="asma">
                <span className="ar">{info.bonus.dhikr}</span>
                <small>Today's bonus · {info.bonus.count} · +1 Honor</small>
              </div>
            )}
          </div>
          <nav className="tabs scroll" aria-label="Sections">
            <NavLink to="/" end>Today</NavLink>
            <NavLink to="/leaderboard">Leaderboard</NavLink>
            <NavLink to="/history">History</NavLink>
            <NavLink to="/rules">Rules</NavLink>
            {viewer.is_admin && <NavLink to="/admin">Admin</NavLink>}
            <span className="who"><span>{viewer.name}</span><button onClick={signOut}>Sign out</button></span>
          </nav>
        </div>
      </header>
      <main className="band">
        <div className="wrap">
          <Routes>
            <Route path="/" element={<div className="main"><Today info={info} /><Leaderboard info={info} /></div>} />
            <Route path="/leaderboard" element={<Leaderboard info={info} />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/rules" element={<Rules info={info} />} />
            <Route path="/admin" element={viewer.is_admin ? <Admin /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>
    </>
  );
}
