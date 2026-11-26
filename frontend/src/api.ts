// Empty in local testing (Vite proxies /api). In production the same server hosts the site and the API.
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const TOKEN_KEY = "honor.token";

export interface Viewer { kind: "admin" | "member"; id: string; name: string; is_admin: boolean; theme?: string }
export interface SignInMember { id: string; name: string; avatar: string; frame: string; has_pin: boolean }
export interface Score { gain: number; bonus: number; cut: number; delta: number; done: number; of: number; weekend: boolean; excused: boolean }
export interface Tier { key: string; min: number | null; max: number | null; emoji: string; name: string; color: string; range: string; games: string; benefits: string; gems?: number; daily?: number;
  frame?: { key: string; name: string } | null; theme?: { key: string; name: string } | null;
  achievement?: { name: string; gems: number } | null }
export interface Week { number: number; start: string; days_left: number }
export interface Status {
  level: number; label: string; tier: Tier; legendary: boolean; banned: boolean; pending: number;
  quest: { active: boolean; start: string | null; days: number; broken_on: string | null };
  can_start_quest: boolean;
  next: { emoji: string; name: string; needed: number } | null;
}
export interface TodayInfo {
  today: string; day_number: number; weekend: boolean; week: Week;
  bonus: { count: string; dhikr: string };
  rules: { cut_misses: number; score_from: string; timezone: string };
  tiers: Tier[]; avatars: string[]; viewer: Viewer; task_count: number;
  gems: { per_task: number; full_day: number; per_level: number; per_rank: Record<string, number> };
}
export interface TaskItem { key: string; label: string; done: boolean; fitness?: boolean; late?: boolean; next_day?: boolean; counted_today?: boolean; excused?: string | null; not_before?: string; link?: string; watched?: boolean }
export interface DayView {
  member: { id: string; name: string }; date: string; today: string; weekend: boolean;
  pledge: TaskItem | null; groups: { name: string; tasks: TaskItem[] }[];
  bonus: { key: string; count: string; dhikr: string; done: boolean };
  excuse: string; task_excuses: Record<string, string>; gems_today: number | null; periods: { name: string; end: string }[];
  score: Score; mode: "open" | "makeup" | "admin" | "locked" | "preview"; starts?: string; editable: boolean; excuse_editable: boolean;
  makeup_left: number; makeup_rule: string; before_scoring: boolean; status: Status;
}
export interface BoardRow extends Status {
  rank: number; member: { id: string; name: string; avatar: string; frame: string }; can_take?: boolean; taken?: boolean;
  today: Score; week_delta: number; is_me: boolean; excused_today?: { task: string; reason: string }[];
}
export interface ShopItem { key: string; name: string; available: boolean; price: number; tier: Tier | null; rarity?: "common" | "rare" | "epic" | "legendary"; unlock?: { key: string; name: string; text: string; tier?: string; icon?: string }; special?: "godfather" }
export interface Profile extends Status {
  raid?: { stolen: number } | null; achievements_new?: { key: string; name: string; icon: string; tier: string; gems: number }[]; godfather?: { is: boolean; seen: boolean }; taken_today?: { name: string; gems: number }[];
  member: { id: string; name: string; avatar: string; frame: string; theme: string; shamed?: boolean; own_avatar?: string; own_frame?: string };
  week_delta: number; streak: number;
  gems: { balance: number; earned: number; spent: number; claimed: number; today: number; from_tasks: number; from_levels: number };
  next_level_reward: { level: string; gems: number } | null;
  frames: ShopItem[]; themes: ShopItem[]; avatars: ShopItem[];
  celebrate: { tier: string; reward: number } | null; // a rank-up show not watched yet
  daily: { gems: number; claimed_today: boolean; available: boolean; step: number; resets: string; map: { day: number; gems: number; done: boolean; on: string | null }[] }; // the weekly treasure map
  achievements_ready: number; event_win: { id: string; place: number; gems: number; day: string; title: string } | null; oath: boolean; oath_note: string; toured: boolean;
  week_days: { date: string; state: "done" | "open" | "missed" | "rest" | "excused" | "future" | "pre"; today: boolean }[];
}
export interface Board { week: Week; rows: BoardRow[]; weekly: { member_id: string; week_delta: number }[] }
export interface History {
  dates: { date: string; weekend: boolean }[];
  rows: { member: { id: string; name: string }; cells: { state: string; delta?: number; done?: number; of?: number }[] }[];
}
export interface AdminMember { id: string; name: string; code: string; base_honor: number; has_pin: boolean; sort_order: number; active: boolean; avatar: string; early_ticks: number; godfather: boolean }
export interface Adjustment { id: string; member_id: string; delta: number; note: string; created_at: string; created_by: string }
export interface TaskDef { key: string; label: string; group: string; fitness: boolean; next_day: boolean; not_before: string | null; links?: string[]; number_today: number | null; step: number; every: number; shown_today: string; shown_tomorrow: string }
export interface Achievement { key: string; name: string; text: string; group: string; icon: string; tier: string; gems: number; goal: number; progress: number; unlocked: boolean; claimed: boolean; picture?: { key: string; name: string }; theme?: { key: string; name: string } }
export interface Achievements { member: { id: string; name: string }; items: Achievement[]; unlocked: number; total: number }
export interface EventEntry { id: string; member: { id: string; name: string; avatar: string }; title: string; place: number | null; gems: number; day: string }
export interface ArtEvent {
  id: string; day: string; title: string; prompt: string; opens: string; closes: string; prizes: Record<string, number>;
  fee: number; banner: string; banner_image: boolean; state: "upcoming" | "open" | "closed";
}
export interface ArtEventIn {
  day: string; title: string; prompt: string; opens: string; closes: string; prize1: number; prize2: number; prize3: number;
  fee: number; banner: string; banner_image?: string | null;
}
export interface EventsInfo {
  today: string; clock: string; timezone: string; open: boolean; banners: string[]; event: ArtEvent | null; next: ArtEvent | null; upcoming: ArtEvent[];
  suggested_day: string; current: EventEntry[]; mine: EventEntry | null; past: (ArtEvent & { judged: boolean; entries: EventEntry[] })[];
}
export interface PeriodIn { name: string; start: string; end: string; off: string[]; numbers: Record<string, number>; members: string[] }
export interface Period extends PeriodIn { id: string }
export interface News {
  id: string; kind: "post" | "picture" | "win"; title: string; body: string; emoji: string; pinned: boolean; author: string; created_at: string; new: boolean;
  data: { avatar?: string; picture?: string; entry_id?: string; art?: string; event?: string; gems?: number };
  member: { id: string; name: string; avatar: string; frame: string } | null;
  likes: number; liked: boolean; likers: string[];
}
export interface NewsIn { title: string; body: string; emoji: string; pinned: boolean }
export interface Settings { score_from: string; cut_misses: number; timezone: string }

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type RankSoundKey = `rankup-music-${"bronze" | "silver" | "gold" | "platinum" | "emerald" | "sapphire" | "ruby" | "diamond" | "obsidian" | "legendary"}`;
export type SoundKey = RankSoundKey | "quest-music" | "quest-thunder" | "quest-crack" | "rankup-music" | "chest" | "gems" | "gems-crack" | "collect" | "achievement" | "event-win" | "goblins" | "godfather";
export interface MusicInfo { has: boolean; start: number; end: number; offset_ms: number; volume: number; size: number; updated: string | null }

export const token = {
  get: (): string | null => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t: string | null) => { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } },
};

export const UNAUTHORIZED_EVENT = "honor:unauthorized";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const t = token.get();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(`${BASE}/api${path}`, { ...init, headers });
  if (!res.ok) {
    let message = res.statusText || "Something went wrong";
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail) && body.detail[0]?.msg) message = String(body.detail[0].msg);
    } catch { /* not JSON */ }
    if (res.status === 401 && t) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError(res.status, message);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const send = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  soundsInfo: () => request<Record<SoundKey, MusicInfo>>("/media"),
  musicInfo: (key: SoundKey = "quest-music") => request<MusicInfo>(`/media/${key}/info`),
  uploadMusic: (f: File, key: SoundKey = "quest-music") => request<MusicInfo>(`/media/${key}`, { method: "PUT", body: f, headers: { "Content-Type": f.type || "audio/mpeg" } }),
  musicSettings: (start: number, volume: number, key: SoundKey = "quest-music", end = 0, offset_ms = 0) => request<MusicInfo>(`/media/${key}`, send("PATCH", { start, end, volume, offset_ms })),
  removeMusic: (key: SoundKey = "quest-music") => request<MusicInfo>(`/media/${key}`, send("DELETE")),
  musicUrl: async (key: SoundKey = "quest-music"): Promise<string> => {
    const t = token.get();
    const res = await fetch(`${BASE}/api/media/${key}`, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
    if (!res.ok) throw new ApiError(res.status, "No music");
    return URL.createObjectURL(await res.blob());
  },
  signInList: () => request<SignInMember[]>("/auth/members"),
  memberSetup: (member_id: string, pin: string) => request<{ token: string; viewer: Viewer }>("/auth/member/setup", send("POST", { member_id, pin })),
  memberLogin: (member_id: string, pin: string) => request<{ token: string; viewer: Viewer }>("/auth/member", send("POST", { member_id, pin })),
  adminLogin: (email: string, password: string) => request<{ token: string; viewer: Viewer }>("/auth/admin", send("POST", { email, password })),
  me: () => request<Viewer>("/auth/me"),
  changePassword: (current_password: string, new_password: string) => request("/auth/password", send("POST", { current_password, new_password })),

  today: () => request<TodayInfo>("/board/today"),
  day: (memberId: string, date?: string) => request<DayView>(`/board/day?member_id=${encodeURIComponent(memberId)}${date ? `&date=${date}` : ""}`),
  saveDay: (member_id: string, date: string, tasks: string[], excuse: string, task_excuses?: Record<string, string>) =>
    request<DayView>("/board/day", send("PUT", { member_id, date, tasks, excuse, task_excuses })),
  watched: (member_id: string, date: string, task: string) =>
    request<{ watched: string[] }>("/board/watched", send("POST", { member_id, date, task })),
  news: () => request<{ items: News[]; unread: number }>("/news"),
  likeNews: (id: string) => request<{ likes: number; liked: boolean; likers: string[] }>(`/news/${encodeURIComponent(id)}/like`, send("POST", {})),
  newsSeen: () => request<{ unread: number }>("/news/seen", send("POST", {})),
  addNews: (body: NewsIn) => request<News>("/news", send("POST", body)),
  editNews: (id: string, body: Partial<NewsIn>) => request<News>(`/news/${encodeURIComponent(id)}`, send("PATCH", body)),
  deleteNews: (id: string) => request<void>(`/news/${encodeURIComponent(id)}`, { method: "DELETE" }),
  leaderboard: () => request<Board>("/board/leaderboard"),
  setAvatar: (avatar: string) => request<{ avatar: string }>("/board/avatar", send("PUT", { avatar })),
  profile: () => request<Profile>("/board/profile"),
  achievements: () => request<Achievements>("/board/achievements"),
  claimAchievement: (key: string) => request<Achievements>(`/board/achievements/${encodeURIComponent(key)}/claim`, send("POST", {})),
  oath: (words: string) => request<Profile>("/board/oath", send("POST", { words })),
  toured: () => request<Profile>("/board/toured", send("POST", {})),
  events: () => request<EventsInfo>("/events"),
  submitArt: (title: string, image: string) => request<EventsInfo>("/events/entry", send("POST", { title, image })),
  withdrawArt: () => request<EventsInfo>("/events/entry/mine", send("DELETE")),
  createEvent: (body: ArtEventIn) => request<EventsInfo>("/events/create", send("POST", body)),
  editEvent: (id: string, body: ArtEventIn) => request<EventsInfo>(`/events/${encodeURIComponent(id)}`, send("PUT", body)),
  deleteEvent: (id: string) => request<EventsInfo>(`/events/${encodeURIComponent(id)}`, send("DELETE")),
  judge: (day: string, first?: string, second?: string, third?: string) => request<EventsInfo>("/events/judge", send("POST", { day, first, second, third })),
  winSeen: (id: string) => request<{ ok: boolean }>(`/events/seen/${encodeURIComponent(id)}`, send("POST", {})),
  /** A tournament picture as a blob URL (pictures need the sign-in token, so <img src> can't fetch them directly). */
  bannerUrl: async (id: string): Promise<string> => {
    const t = token.get();
    const res = await fetch(`${BASE}/api/events/banner/${encodeURIComponent(id)}`, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
    if (!res.ok) throw new ApiError(res.status, "Banner not found");
    return URL.createObjectURL(await res.blob());
  },
  artUrl: async (id: string): Promise<string> => {
    const t = token.get();
    const res = await fetch(`${BASE}/api/events/image/${encodeURIComponent(id)}`, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
    if (!res.ok) throw new ApiError(res.status, "Picture not found");
    return URL.createObjectURL(await res.blob());
  },
  claimDaily: () => request<Profile>("/board/claim", send("POST", {})),
  takeGems: (victimId: string) => request<{ taken: number; from: string; profile: Profile }>(`/board/take/${encodeURIComponent(victimId)}`, send("POST", {})),
  godfatherSeen: () => request<{ ok: boolean }>("/board/profile/godfather-seen", send("POST", {})),
  setAdminTheme: (theme: "white" | "dark") => request<{ theme: string }>("/admin/theme", send("PUT", { theme })),
  adminGems: () => request<Record<string, number>>("/admin/gems"),
  changeGems: (id: string, body: { delta?: number; balance?: number; note?: string }) =>
    request<{ balance: number; delta: number }>(`/admin/members/${id}/gems`, send("POST", body)),
  raidSeen: () => request<Profile>("/board/profile/raid-seen", send("POST", {})),
  celebrated: () => request<Profile>("/board/profile/celebrated", send("POST", {})),
  saveProfile: (body: { avatar?: string; frame?: string; theme?: string }) => request<Profile>("/board/profile", send("PUT", body)),
  buy: (kind: "frame" | "theme" | "avatar", key: string) => request<Profile>("/board/shop/buy", send("POST", { kind, key })),
  startQuest: (member_id: string) => request<Status>("/board/quest", send("POST", { member_id })),
  history: (days = 14) => request<History>(`/board/history?days=${days}`),

  members: () => request<AdminMember[]>("/admin/members"),
  addMember: (body: { name: string; base_honor: number; pin?: string }) => request<AdminMember>("/admin/members", send("POST", body)),
  editMember: (id: string, body: Partial<Omit<AdminMember, "id" | "has_pin">> & { pin?: string | null }) => request<AdminMember>(`/admin/members/${id}`, send("PATCH", body)),
  deleteMember: (id: string) => request<void>(`/admin/members/${id}`, { method: "DELETE" }),
  adjustments: () => request<Adjustment[]>("/admin/adjustments"),
  addAdjustment: (member_id: string, delta: number, note: string) => request("/admin/adjustments", send("POST", { member_id, delta, note })),
  deleteAdjustment: (id: string) => request<void>(`/admin/adjustments/${id}`, { method: "DELETE" }),
  tasks: () => request<TaskDef[]>("/admin/tasks"),
  resetTasks: () => request<TaskDef[]>("/admin/tasks/reset", send("POST", {})),
  periods: () => request<Period[]>("/admin/periods"),
  addPeriod: (body: PeriodIn) => request<Period>("/admin/periods", send("POST", body)),
  editPeriod: (id: string, body: PeriodIn) => request<Period>(`/admin/periods/${encodeURIComponent(id)}`, send("PUT", body)),
  deletePeriod: (id: string) => request<void>(`/admin/periods/${encodeURIComponent(id)}`, send("DELETE")),
  addTask: (body: { label: string; group: string; fitness: boolean; next_day: boolean; not_before?: string | null; links?: string[]; number_today: number | null; step: number; every: number }) => request<TaskDef>("/admin/tasks", send("POST", body)),
  editTask: (key: string, body: Partial<{ label: string; group: string; fitness: boolean; next_day: boolean; not_before: string; links: string[]; number_today: number; clear_number: boolean; step: number; every: number; move: number }>) => request<TaskDef>(`/admin/tasks/${encodeURIComponent(key)}`, send("PATCH", body)),
  deleteTask: (key: string) => request<void>(`/admin/tasks/${encodeURIComponent(key)}`, { method: "DELETE" }),
  settings: () => request<Settings>("/admin/settings"),
  saveSettings: (body: Partial<Settings>) => request<Settings>("/admin/settings", send("PUT", body)),
};
