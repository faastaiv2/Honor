import FirstRun from "./pages/FirstRun";
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { api, type Profile, type TodayInfo } from "./api";
import { newItems, SHOP_NEW_EVENT } from "./lib/shopNew";
import { useAuth } from "./auth";
import { fmt } from "./lib/dates";
import { useChangeCounter } from "./lib/events";
import { warmSounds } from "./lib/sounds";
import Leaderboard from "./pages/Leaderboard";
import Guard from "./lib/Guard";
import SignIn from "./pages/SignIn";
import Welcome from "./pages/Welcome";
import Today from "./pages/Today";
/** Load a page when first opened; if its file is gone (a new version was published), reload to the new version. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Page = { default: ComponentType<any> };
function lazyPage(load: () => Promise<Page>) {
  return lazy((): Promise<Page> => load().catch((err) => {
    const reload = (window as unknown as { __honorReload?: () => boolean }).__honorReload;
    if (reload?.()) return new Promise<Page>(() => undefined); // the page is reloading
    throw err;
  }));
}

// Pages a member doesn't need straight away load when first opened (a smaller first download).
const Events = lazyPage(() => import("./pages/Events"));
const AdminHome = lazyPage(() => import("./pages/AdminHome"));
const Achievements = lazyPage(() => import("./pages/Achievements"));
const Admin = lazyPage(() => import("./pages/Admin"));
const HistoryPage = lazyPage(() => import("./pages/History"));
const Animations = lazyPage(() => import("./pages/Animations"));
const ProfilePage = lazyPage(() => import("./pages/Profile"));
const Benefits = lazyPage(() => import("./pages/Benefits"));
const Tasks = lazyPage(() => import("./pages/Tasks"));
const NewsPage = lazyPage(() => import("./pages/News"));
const TestsPage = lazyPage(() => import("./pages/Tests"));


export default function App() {
  const { viewer, loading, signOut } = useAuth();
  const [info, setInfo] = useState<TodayInfo | null>(null);
  const changes = useChangeCounter();
  const { pathname } = useLocation();

  const [unread, setUnread] = useState(0);
  // A red dot on Avatar when the shop has something new (just added, unlocked or affordable).
  const [shopNew, setShopNew] = useState(0);
  const [achReady, setAchReady] = useState(0); // achievements unlocked and waiting to be collected
  useEffect(() => {
    if (!viewer || viewer.is_admin) { setShopNew(0); setAchReady(0); return; }
    let prof: Profile | null = null;
    const count = () => { if (prof) setShopNew(newItems(prof).size); };
    api.profile().then((x) => { prof = x; count(); setAchReady(x.achievements_ready ?? 0); }).catch(() => undefined);
    window.addEventListener(SHOP_NEW_EVENT, count);
    return () => window.removeEventListener(SHOP_NEW_EVENT, count);
  }, [viewer, changes]);
  useEffect(() => {
    if (!viewer || viewer.is_admin) { setUnread(0); return; }
    if (pathname === "/news") { setUnread(0); return; }
    api.news().then((n) => setUnread(n.unread)).catch(() => undefined);
  }, [viewer, changes, pathname]);

  useEffect(() => {
    // Download and decode the family's sounds in the background, so every animation's sound starts on time.
    if (viewer) { const t = window.setTimeout(() => { void warmSounds(); }, 1500); return () => window.clearTimeout(t); }
  }, [viewer]);

  useEffect(() => {
    if (!viewer) { setInfo(null); return; }
    api.today().then(setInfo).catch(() => undefined);
  }, [viewer, changes]);

  useEffect(() => {
    // White is the base look for everyone (sign-in, admin, new members); members can pick another theme.
    document.documentElement.dataset.skin = viewer ? info?.viewer.theme || "white" : "white";
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
            {!viewer.is_admin && <NavLink to="/leaderboard">Leaderboard</NavLink>}
            {!viewer.is_admin && <NavLink to="/achievements">Achievements{achReady > 0 && <i className="red-dot" aria-label={`${achReady} ready to collect`} />}</NavLink>}
            <NavLink to="/news">Community{unread > 0 && <span className="nbadge" aria-label={`${unread} new`}>{unread}</span>}</NavLink>
            <NavLink to="/events">Events</NavLink>
            {viewer.is_admin ? <NavLink to="/history">History</NavLink> : <NavLink to="/profile">Avatar{shopNew > 0 && <i className="red-dot" aria-label="Something new" />}</NavLink>}
            <NavLink to="/benefits">Benefits</NavLink>
            {viewer.is_admin && <NavLink to="/tasks">Tasks</NavLink>}
            {viewer.is_admin && <NavLink to="/animations">Animations</NavLink>}
            {viewer.is_admin && <NavLink to="/tests">Tests</NavLink>}
            {viewer.is_admin && <NavLink to="/admin" end>Members</NavLink>}
            <span className="who"><span>{viewer.name}</span>
              {viewer.is_admin && info && <button className="theme-toggle" aria-label={info.viewer.theme === "dark" ? "Switch to the white theme" : "Switch to the dark theme"}
                title={info.viewer.theme === "dark" ? "White theme" : "Dark theme"}
                onClick={async () => {
                  const next = info.viewer.theme === "dark" ? "white" : "dark";
                  setInfo({ ...info, viewer: { ...info.viewer, theme: next } });
                  await api.setAdminTheme(next).catch(() => undefined);
                }}>{info.viewer.theme === "dark" ? "☀️" : "🌙"}</button>}
              <button onClick={signOut}>Sign out</button></span>
          </nav>
        </div>
      </header>
      {!viewer.is_admin && <FirstRun />}
      <main className="band">
        <div className="wrap">
          <Guard name="This page">
          <Suspense fallback={<p className="note page-loading">Loading…</p>}>
          <Routes>
            <Route path="/" element={viewer.is_admin
              ? <div className="main"><AdminHome info={info} /><Leaderboard info={info} /></div>
              : <div className="home"><Welcome info={info} /><Today info={info} /></div>} />
            <Route path="/leaderboard" element={<Leaderboard info={info} full />} />
            <Route path="/history" element={viewer.is_admin ? <HistoryPage /> : <Navigate to="/profile" />} />
            <Route path="/profile" element={viewer.is_admin ? <Navigate to="/admin" /> : <ProfilePage info={info} />} />
            <Route path="/animations" element={viewer.is_admin ? <Animations info={info} /> : <Navigate to="/" />} />
            <Route path="/benefits" element={<Benefits info={info} />} />
            <Route path="/events" element={<Events />} />
            <Route path="/news" element={<NewsPage admin={viewer.is_admin} />} />
            <Route path="/achievements" element={viewer.is_admin ? <Navigate to="/" /> : <Achievements />} />
            <Route path="/rules" element={<Navigate to="/benefits" />} />
            <Route path="/admin" element={viewer.is_admin ? <Admin info={info} /> : <Navigate to="/" />} />
            <Route path="/tests" element={viewer.is_admin ? <TestsPage /> : <Navigate to="/" />} />
            <Route path="/tasks" element={viewer.is_admin ? <Tasks /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          </Suspense>
          </Guard>
        </div>
      </main>
    </>
  );
}
