/** Dates are plain "YYYY-MM-DD" strings everywhere; these helpers never use the local time zone. */
export function addDays(iso: string, n: number): string {
  return new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
}

export function fmt(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });
}
