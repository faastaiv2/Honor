// Empty in local testing (Vite proxies /api). In production the same server hosts the site and the API.
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const TOKEN_KEY = "honor.token";

export interface Viewer { kind: "admin" | "member"; id: string; name: string; is_admin: boolean }
export interface SignInMember { id: string; name: string; code: string; has_pin: boolean }
export interface Score { gain: number; bonus: number; cut: number; delta: number; done: number; of: number; weekend: boolean; excused: boolean }
export interface Tier { emoji: string; name: string; color: string; min: number | null }
export interface TodayInfo {
  today: string; day_number: number; weekend: boolean;
  bonus: { count: string; dhikr: string };
  rules: { cut_misses: number; score_from: string; timezone: string };
  tiers: Tier[]; viewer: Viewer;
}
export interface TaskItem { key: string; label: string; done: boolean; fitness?: boolean }
export interface DayView {
  member: { id: string; name: string }; date: string; today: string; weekend: boolean;
  pledge: TaskItem | null; groups: { name: string; tasks: TaskItem[] }[];
  bonus: { key: string; count: string; dhikr: string; done: boolean };
  excuse: string; score: Score; editable: boolean; before_scoring: boolean;
}
export interface BoardRow {
  rank: number; member: { id: string; name: string; code: string }; honor: number; level: string;
  tier: Tier & { next: { emoji: string; name: string; min: number; needed: number } | null }; today: Score;
}
export interface History {
  dates: { date: string; weekend: boolean }[];
  rows: { member: { id: string; name: string }; cells: { state: string; delta?: number; done?: number; of?: number }[] }[];
}
export interface AdminMember { id: string; name: string; code: string; base_honor: number; has_pin: boolean; sort_order: number; active: boolean }
export interface Adjustment { id: string; member_id: string; delta: number; note: string; created_at: string; created_by: string }
export interface Settings { score_from: string; cut_misses: number; timezone: string }
export interface AdminAccount { id: string; email: string; name: string }

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
  leaderboard: () => request<BoardRow[]>("/board/leaderboard"),
  history: (days = 14) => request<History>(`/board/history?days=${days}`),

  members: () => request<AdminMember[]>("/admin/members"),
  addMember: (body: { name: string; code: string; base_honor: number; pin?: string }) => request<AdminMember>("/admin/members", send("POST", body)),
  editMember: (id: string, body: Partial<Omit<AdminMember, "id" | "has_pin">> & { pin?: string | null }) => request<AdminMember>(`/admin/members/${id}`, send("PATCH", body)),
  deleteMember: (id: string) => request<void>(`/admin/members/${id}`, { method: "DELETE" }),
  adjustments: () => request<Adjustment[]>("/admin/adjustments"),
  addAdjustment: (member_id: string, delta: number, note: string) => request("/admin/adjustments", send("POST", { member_id, delta, note })),
  deleteAdjustment: (id: string) => request<void>(`/admin/adjustments/${id}`, { method: "DELETE" }),
  settings: () => request<Settings>("/admin/settings"),
  saveSettings: (body: Partial<Settings>) => request<Settings>("/admin/settings", send("PUT", body)),
  admins: () => request<AdminAccount[]>("/admin/admins"),
  addAdmin: (email: string, name: string, password: string) => request<AdminAccount>("/admin/admins", send("POST", { email, name, password })),
  removeAdmin: (id: string) => request<void>(`/admin/admins/${id}`, { method: "DELETE" }),
  importSheet: (text: string, start: string, end: string) =>
    request<{ days: number; entries: number; unknown_initials: string[] }>("/admin/import", send("POST", { text, start, end })),
};
