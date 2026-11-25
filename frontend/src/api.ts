// Empty in local testing (Vite proxies /api). In production the same server hosts the site and the API.
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const TOKEN_KEY = "honor.token";

export interface Viewer { kind: "admin" | "member"; id: string; name: string; is_admin: boolean; theme?: string }
export interface SignInMember { id: string; name: string; avatar: string; frame: string; has_pin: boolean }
export interface Score { gain: number; bonus: number; cut: number; delta: number; done: number; of: number; weekend: boolean; excused: boolean }
export interface Tier { key: string; min: number | null; max: number | null; emoji: string; name: string; color: string; range: string; games: string; benefits: string }
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
  gems: { per_task: number; per_level: number; per_rank: number };
}
export interface TaskItem { key: string; label: string; done: boolean; fitness?: boolean; late?: boolean }
export interface DayView {
  member: { id: string; name: string }; date: string; today: string; weekend: boolean;
  pledge: TaskItem | null; groups: { name: string; tasks: TaskItem[] }[];
  bonus: { key: string; count: string; dhikr: string; done: boolean };
  excuse: string; score: Score; mode: "open" | "makeup" | "admin" | "locked"; editable: boolean; excuse_editable: boolean;
  makeup_left: number; makeup_rule: string; before_scoring: boolean; status: Status;
}
export interface BoardRow extends Status {
  rank: number; member: { id: string; name: string; avatar: string; frame: string };
  today: Score; week_delta: number; is_me: boolean;
}
export interface ShopItem { key: string; name: string; available: boolean; price: number; tier: Tier | null }
export interface Profile extends Status {
  member: { id: string; name: string; avatar: string; frame: string; theme: string };
  week_delta: number; streak: number;
  gems: { balance: number; earned: number; spent: number; today: number; from_tasks: number; from_levels: number };
  next_level_reward: { level: string; gems: number } | null;
  frames: ShopItem[]; themes: ShopItem[]; avatars: ShopItem[];
  celebrate: { tier: string; reward: number } | null; // a rank-up show not watched yet
}
export interface Board { week: Week; rows: BoardRow[]; weekly: { member_id: string; week_delta: number }[] }
export interface History {
  dates: { date: string; weekend: boolean }[];
  rows: { member: { id: string; name: string }; cells: { state: string; delta?: number; done?: number; of?: number }[] }[];
}
export interface AdminMember { id: string; name: string; code: string; base_honor: number; has_pin: boolean; sort_order: number; active: boolean; avatar: string }
export interface Adjustment { id: string; member_id: string; delta: number; note: string; created_at: string; created_by: string }
export interface TaskDef { key: string; label: string; group: string; fitness: boolean; number_today: number | null; step: number; every: number; shown_today: string; shown_tomorrow: string }
export interface Settings { score_from: string; cut_misses: number; timezone: string }

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const token = {
  get: (): string | null => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t: string | null) => { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } },
};

export const UNAUTHORIZED_EVENT = "honor:unauthorized";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const t = token.get();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  if (init.body) headers.set("Content-Type", "application/json");
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
  signInList: () => request<SignInMember[]>("/auth/members"),
  memberLogin: (member_id: string, pin: string) => request<{ token: string; viewer: Viewer }>("/auth/member", send("POST", { member_id, pin })),
  adminLogin: (email: string, password: string) => request<{ token: string; viewer: Viewer }>("/auth/admin", send("POST", { email, password })),
  me: () => request<Viewer>("/auth/me"),
  changePassword: (current_password: string, new_password: string) => request("/auth/password", send("POST", { current_password, new_password })),

  today: () => request<TodayInfo>("/board/today"),
  day: (memberId: string, date?: string) => request<DayView>(`/board/day?member_id=${encodeURIComponent(memberId)}${date ? `&date=${date}` : ""}`),
  saveDay: (member_id: string, date: string, tasks: string[], excuse: string) => request<DayView>("/board/day", send("PUT", { member_id, date, tasks, excuse })),
  leaderboard: () => request<Board>("/board/leaderboard"),
  setAvatar: (avatar: string) => request<{ avatar: string }>("/board/avatar", send("PUT", { avatar })),
  profile: () => request<Profile>("/board/profile"),
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
  addTask: (body: { label: string; group: string; fitness: boolean; number_today: number | null; step: number; every: number }) => request<TaskDef>("/admin/tasks", send("POST", body)),
  editTask: (key: string, body: Partial<{ label: string; group: string; fitness: boolean; number_today: number; clear_number: boolean; step: number; every: number; move: number }>) => request<TaskDef>(`/admin/tasks/${encodeURIComponent(key)}`, send("PATCH", body)),
  deleteTask: (key: string) => request<void>(`/admin/tasks/${encodeURIComponent(key)}`, { method: "DELETE" }),
  settings: () => request<Settings>("/admin/settings"),
  saveSettings: (body: Partial<Settings>) => request<Settings>("/admin/settings", send("PUT", body)),
};
