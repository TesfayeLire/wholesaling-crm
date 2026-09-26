import { calendarDate, isActive, todayDate } from "./follow-up";

export const temperatures = { HOT: "Hot", WARM: "Warm", COLD: "Cold" } as const;
export const contactTypes = { CALL: "Call", TEXT: "Text", EMAIL: "Email", VOICEMAIL: "Voicemail", NO_ANSWER: "No Answer", CONVERSATION: "Conversation", OTHER: "Other" } as const;
export const attentionRules = { hotContactDays: 7, recentContactDays: 14 } as const;
export function temperature(value: string) {
  if (!Object.hasOwn(temperatures, value)) throw new Error("Choose Hot, Warm, or Cold.");
  return value as keyof typeof temperatures;
}
export function contactType(value: string) {
  if (!Object.hasOwn(contactTypes, value)) throw new Error("Choose a valid contact result.");
  return value as keyof typeof contactTypes;
}
export function contactTime(value: string, now = new Date()) {
  if (!value) return now.toISOString();
  // Explicit UTC input; reject rollover dates and future contact events.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Enter a valid contact time in UTC.");
  const date = new Date(value + ":00.000Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 16) !== value || date > now) throw new Error("Contact time must be valid and cannot be in the future.");
  return date.toISOString();
}
export type Outreach = { id: number; type: string; description: string; createdAt: string; propertyId: number | null; contactId: number | null };
export function isOutreach(event: Outreach) { return event.type.startsWith("OUTREACH_") && Object.hasOwn(contactTypes, event.type.slice(9)); }
export function latestContact(events: Outreach[]) {
  return events.filter(isOutreach).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id)[0] ?? null;
}
export function lastContactLabel(event: Outreach | null, today = todayDate()) {
  return !event ? "Never contacted" : todayDate(new Date(event.createdAt)) === today ? "Today" : new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", year: "numeric" }).format(new Date(event.createdAt));
}
export type Lead = { id: number; address: string; status: string; temperature: string | null; nextAction: string | null; nextActionDate: string | null; updatedAt: string };
export type FollowTask = { id: number; title: string; dueDate: string | null; status: string; propertyId: number | null; contactId: number | null; updatedAt: string };
export type Person = { id: number; firstName: string; lastName: string | null; phone?: string | null; email?: string | null };
export type Relationship = { propertyId: number; contactId: number };
export type QueueRow = { key: string; property: Lead | null; contact: Person | null; task: FollowTask | null; title: string; dueDate: string; lastContact: Outreach | null };
export function daysBetween(from: string, to: string) { return Math.floor((Date.parse(to + "T12:00:00Z") - Date.parse(from + "T12:00:00Z")) / 86400000); }
export function attentionReasons(lead: Lead, dates: string[], last: Outreach | null, today: string) {
  if (!isActive(lead.status) || lead.temperature !== "HOT") return [];
  const reasons: string[] = [];
  const oldest = [...dates].sort()[0];
  if (oldest && oldest < today) reasons.push(`Hot lead — follow-up ${daysBetween(oldest, today)} days overdue`);
  if (!dates.some(date => date >= today)) reasons.push("Hot lead with no next follow-up today or later");
  if (!last) reasons.push("Hot lead — never contacted");
  else {
    const age = daysBetween(todayDate(new Date(last.createdAt)), today);
    if (age >= attentionRules.hotContactDays) reasons.push(`Hot lead — no contact in ${age} days`);
  }
  return reasons;
}
export function commandCenter(properties: Lead[], contacts: Person[], tasks: FollowTask[], activities: Outreach[], links: Relationship[], now = new Date()) {
  const today = todayDate(now);
  const propertyMap = new Map(properties.map(p => [p.id, p]));
  const contactMap = new Map(contacts.map(c => [c.id, c]));
  const propertyEvents = new Map<number, Outreach[]>(), contactEvents = new Map<number, Outreach[]>();
  for (const event of activities) {
    if (event.propertyId !== null) { const list = propertyEvents.get(event.propertyId) ?? []; list.push(event); propertyEvents.set(event.propertyId, list); }
    if (event.contactId !== null) { const list = contactEvents.get(event.contactId) ?? []; list.push(event); contactEvents.set(event.contactId, list); }
  }
  const lastForProperty = (id: number) => latestContact(propertyEvents.get(id) ?? []);
  const queue: QueueRow[] = [];
  for (const property of properties.filter(p => isActive(p.status))) {
    if (!property.nextActionDate) continue;
    // Scheduling history owns the optional contact association. A later Phase 3
    // follow-up edit records contactId=null, so an old association is not reused.
    const scheduled = (propertyEvents.get(property.id) ?? []).filter(a => a.type === "FOLLOW_UP_UPDATED").sort((a, b) => b.id - a.id)[0];
    const linkedId = links.find(l => l.propertyId === property.id)?.contactId;
    const contact = contactMap.get(scheduled?.contactId ?? linkedId ?? -1) ?? null;
    queue.push({ key: `property-${property.id}`, property, contact, task: null, title: property.nextAction || "Property follow-up", dueDate: calendarDate(property.nextActionDate)!, lastContact: lastForProperty(property.id) });
  }
  for (const task of tasks) {
    if (task.status !== "PENDING" || !task.dueDate) continue;
    const property = propertyMap.get(task.propertyId ?? -1) ?? null;
    if (property && !isActive(property.status)) continue;
    const contact = contactMap.get(task.contactId ?? -1) ?? null;
    queue.push({ key: `task-${task.id}`, property, contact, task, title: task.title, dueDate: calendarDate(task.dueDate)!, lastContact: property ? lastForProperty(property.id) : latestContact(contactEvents.get(task.contactId ?? -1) ?? []) });
  }
  queue.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.key.localeCompare(b.key));
  const hot = properties.filter(p => isActive(p.status) && p.temperature === "HOT");
  const attention = hot.map(property => ({ property, lastContact: lastForProperty(property.id), reasons: attentionReasons(property, queue.filter(q => q.property?.id === property.id).map(q => q.dueDate), lastForProperty(property.id), today) })).filter(item => item.reasons.length);
  attention.sort((a, b) => Number(b.reasons.some(r => r.includes("overdue"))) - Number(a.reasons.some(r => r.includes("overdue"))) || a.property.id - b.property.id);
  const recent = activities.filter(a => isOutreach(a) && Date.parse(a.createdAt) <= now.getTime() && daysBetween(todayDate(new Date(a.createdAt)), today) < attentionRules.recentContactDays).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id);
  return { today, hot, attention, recent, overdue: queue.filter(q => q.dueDate < today), dueToday: queue.filter(q => q.dueDate === today), upcoming: queue.filter(q => q.dueDate > today) };
}
