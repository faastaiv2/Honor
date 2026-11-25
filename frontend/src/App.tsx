import FirstRun from "./pages/FirstRun";
import Achievements from "./pages/Achievements";
import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { api, type TodayInfo } from "./api";
import { useAuth } from "./auth";
import { fmt } from "./lib/dates";
import { useChangeCounter } from "./lib/events";
import Admin from "./pages/Admin";
import HistoryPage from "./pages/History";
import Leaderboard from "./pages/Leaderboard";
import ProfilePage from "./pages/Profile";
import Benefits from "./pages/Benefits";
import SignIn from "./pages/SignIn";
import Welcome from "./pages/Welcome";
import Tasks from "./pages/Tasks";
import Today from "./pages/Today";

export default function App() {
  const { viewer, loading, signOut } = useAuth();
  const [info, setInfo] = useState<TodayInfo | null>(null);
  const changes = useChangeCounter();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!viewer) { setInfo(null); return; }
    api.today().then(setInfo).catch(() => undefined);
  }, [viewer, changes]);

  useEffect(() => {
    // Bronze is the base look for everyone (sign-in, admin, new members); members can pick another theme.
    document.documentElement.dataset.skin = viewer && !viewer.is_admin ? info?.viewer.theme || "bronze" : "bronze";
  }, [viewer, info]);

  if (loading) return <p className="band note">Loading…</p>;
  if (!viewer) return <SignIn key={pathname.startsWith("/admin") ? "admin" : "member"} admin={pathname.startsWith("/admin")} />;

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
            {!viewer.is_admin && <NavLink to="/achievements">Achievements</NavLink>}
            {viewer.is_admin ? <NavLink to="/history">History</NavLink> : <NavLink to="/profile">Profile</NavLink>}
            <NavLink to="/benefits">Benefits</NavLink>
            {viewer.is_admin && <NavLink to="/tasks">Tasks</NavLink>}
            {viewer.is_admin && <NavLink to="/admin" end>Admin</NavLink>}
            <span className="who"><span>{viewer.name}</span><button onClick={signOut}>Sign out</button></span>
          </nav>
        </div>
      </header>
      {!viewer.is_admin && <FirstRun />}
      <main className="band">
        <div className="wrap">
          <Routes>
            <Route path="/" element={viewer.is_admin
              ? <div className="main"><Today info={info} /><Leaderboard info={info} /></div>
              : <div className="home"><Welcome info={info} /><Today info={info} /></div>} />
            <Route path="/leaderboard" element={<Leaderboard info={info} full />} />
            <Route path="/history" element={viewer.is_admin ? <HistoryPage /> : <Navigate to="/profile" />} />
            <Route path="/profile" element={viewer.is_admin ? <Navigate to="/admin" /> : <ProfilePage info={info} />} />
            <Route path="/benefits" element={<Benefits info={info} />} />
            <Route path="/achievements" element={viewer.is_admin ? <Navigate to="/" /> : <Achievements />} />
            <Route path="/rules" element={<Navigate to="/benefits" />} />
            <Route path="/admin" element={viewer.is_admin ? <Admin info={info} /> : <Navigate to="/" />} />
            <Route path="/tasks" element={viewer.is_admin ? <Tasks /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>
    </>
  );
}
