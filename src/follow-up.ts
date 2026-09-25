export const FOLLOW_UP_TIME_ZONE = "America/Chicago";
export type FollowUpStatus = "Overdue" | "Due today" | "Upcoming" | "No follow-up scheduled";
/** The existing noon-UTC timestamp represents the calendar date selected by the user. */
export function calendarDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : null;
}
export function todayDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: FOLLOW_UP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)!.value).join("-");
}
export function followUpStatus(value: string | null | undefined, today = todayDate()): FollowUpStatus {
  const date = calendarDate(value);
  return !date ? "No follow-up scheduled" : date < today ? "Overdue" : date === today ? "Due today" : "Upcoming";
}
export function displayDate(value: string | null | undefined) {
  const date = calendarDate(value);
  if (!date) return "No follow-up scheduled";
  const [year, month, day] = date.split("-");
  return month + "/" + day + "/" + year;
}
export function isActive(status: string) { return status !== "CLOSED" && status !== "DEAD"; }
export function attentionOrder<T extends { id: number; status: string; nextActionDate: string | null }>(properties: T[]) {
  return properties.filter(p => isActive(p.status)).sort((a, b) =>
    (calendarDate(a.nextActionDate) ?? "9999-99-99").localeCompare(calendarDate(b.nextActionDate) ?? "9999-99-99") || a.id - b.id);
}
