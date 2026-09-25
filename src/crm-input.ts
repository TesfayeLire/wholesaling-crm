export const pipelineStatuses = ["NEW_LEAD", "RESEARCHING", "CONTACTED", "QUALIFIED", "OFFER_MADE", "NEGOTIATING", "UNDER_CONTRACT", "DISPOSITION", "CLOSED", "DEAD", "NURTURE"] as const;
export type PipelineStatus = typeof pipelineStatuses[number];
export function text(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}
export function optionalText(form: FormData, name: string) {
  return text(form, name) || null;
}
export function requiredText(form: FormData, name: string) {
  const value = text(form, name);
  if (!value) throw new Error(`${name} is required.`);
  return value;
}
export function recordId(value: unknown) {
  if (!/^\d+$/.test(String(value))) throw new Error("Invalid record ID.");
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Invalid record ID.");
  return id;
}
export function optionalId(form: FormData, name: string) {
  const value = text(form, name);
  return value ? recordId(value) : null;
}
export function pipelineStatus(value: string): PipelineStatus {
  if (!pipelineStatuses.includes(value as PipelineStatus)) throw new Error("Invalid pipeline status.");
  return value as PipelineStatus;
}
export function taskStatus(value: string): "PENDING" | "COMPLETED" {
  if (value !== "PENDING" && value !== "COMPLETED") throw new Error("Invalid task status.");
  return value;
}
export function optionalDate(form: FormData, name: string) {
  const value = text(form, name);
  if (!value) return null;
  const date = new Date(`${value}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error(`Invalid ${name}.`);
  return date.toISOString();
}
function money(form: FormData, name: string) {
  const value = text(form, name);
  if (!value) return null;
  if (!/^\d+(\.\d+)?$/.test(value)) throw new Error(`${name} must be a non-negative decimal.`);
  return value; // Decimal values stay strings; do not lose precision through Number.
}
export function propertyInput(form: FormData) {
  return {
    address: requiredText(form, "address"), city: requiredText(form, "city"),
    state: requiredText(form, "state"), zipCode: requiredText(form, "zipCode"),
    county: optionalText(form, "county"), source: optionalText(form, "source"),
    askingPrice: money(form, "askingPrice"), estimatedValue: money(form, "estimatedValue"),
    repairEstimate: money(form, "repairEstimate"), offerAmount: money(form, "offerAmount"),
    status: pipelineStatus(text(form, "status") || "NEW_LEAD"),
    nextAction: optionalText(form, "nextAction"), nextActionDate: optionalDate(form, "nextActionDate"),
    notes: optionalText(form, "notes"),
  };
}
export function contactInput(form: FormData) {
  const email = optionalText(form, "email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  return { firstName: requiredText(form, "firstName"), lastName: optionalText(form, "lastName"), phone: optionalText(form, "phone"), email, notes: optionalText(form, "notes") };
}
export function taskInput(form: FormData) {
  return { title: requiredText(form, "title"), description: optionalText(form, "description"), dueDate: optionalDate(form, "dueDate"), status: taskStatus(text(form, "status") || "PENDING"), propertyId: optionalId(form, "propertyId"), contactId: optionalId(form, "contactId") };
}
