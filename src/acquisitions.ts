import { analysisMoney, sameDecimal } from "./deal-analysis";
import { optionalDate, optionalText, text } from "./crm-input";
import { calendarDate, followUpStatus, todayDate } from "./follow-up";

export const offerStatuses = { DRAFT: "Draft", PENDING: "Pending", ACCEPTED: "Accepted", REJECTED: "Rejected", COUNTERED: "Countered", WITHDRAWN: "Withdrawn" } as const;
export const contractStatuses = { DRAFT: "Draft", ACTIVE: "Active", COMPLETED: "Acquisition stage completed", CANCELLED: "Cancelled" } as const;
export const emdStatuses = { NOT_DUE: "Not due", DUE: "Due", PAID: "Paid", WAIVED: "Waived" } as const;
export function choice<T extends Record<string, string>>(values: T, value: string): keyof T & string {
  if (!Object.hasOwn(values, value)) throw new Error("Choose a valid status.");
  return value as keyof T & string;
}
export function positiveMoney(value: string) {
  const amount = analysisMoney(value);
  if (amount === null || amount === "0") throw new Error("Enter a positive amount with at most two decimal places.");
  return amount;
}
function notes(form: FormData) {
  const value = optionalText(form, "notes");
  if (value && value.length > 4000) throw new Error("Notes must be 4,000 characters or fewer.");
  return value;
}
function ordered(earlier: string | null, later: string | null, message: string) {
  if (earlier && later && calendarDate(earlier)! > calendarDate(later)!) throw new Error(message);
}
export function offerInput(form: FormData, amount: string) {
  const data = { status: choice(offerStatuses, text(form, "status")), offerDate: optionalDate(form, "offerDate"), expirationDate: optionalDate(form, "expirationDate"), counterAmount: analysisMoney(text(form, "counterAmount")), acceptedAmount: analysisMoney(text(form, "acceptedAmount")), notes: notes(form) };
  if (["PENDING", "COUNTERED", "ACCEPTED", "REJECTED"].includes(data.status) && !data.offerDate) throw new Error("Enter the offer date before changing its status.");
  if (data.counterAmount === "0") throw new Error("A counter amount must be positive.");
  if (data.status === "COUNTERED" && !data.counterAmount) throw new Error("Enter the seller's counter amount.");
  if (data.status === "ACCEPTED") {
    if (!data.acceptedAmount || !(sameDecimal(data.acceptedAmount, amount) || (data.counterAmount !== null && sameDecimal(data.acceptedAmount, data.counterAmount)))) throw new Error("Explicitly enter the original offer or seller counter as the accepted amount. Record a new offer for a different agreed price.");
  } else if (data.acceptedAmount !== null) throw new Error("Accepted amount is only valid for an Accepted offer.");
  ordered(data.offerDate, data.expirationDate, "Expiration cannot precede the offer date.");
  return data;
}
export function contractInput(form: FormData) {
  const data = { purchasePrice: positiveMoney(text(form, "purchasePrice")), contractDate: optionalDate(form, "contractDate"), inspectionDeadline: optionalDate(form, "inspectionDeadline"), closingDeadline: optionalDate(form, "closingDeadline"), earnestMoneyAmount: analysisMoney(text(form, "earnestMoneyAmount")), earnestMoneyDueDate: optionalDate(form, "earnestMoneyDueDate"), earnestMoneyStatus: choice(emdStatuses, text(form, "earnestMoneyStatus")), status: choice(contractStatuses, text(form, "status")), notes: notes(form) };
  if ((data.status === "ACTIVE" || data.status === "COMPLETED") && (!data.contractDate || !data.closingDeadline)) throw new Error("Active contracts need a contract date and closing deadline.");
  if (data.earnestMoneyStatus === "PAID" && (!data.earnestMoneyAmount || data.earnestMoneyAmount === "0")) throw new Error("Enter the earnest money amount before marking it Paid.");
  for (const date of [data.inspectionDeadline, data.earnestMoneyDueDate, data.closingDeadline]) ordered(data.contractDate, date, "A contract deadline cannot precede the contract date.");
  ordered(data.inspectionDeadline, data.closingDeadline, "Inspection deadline cannot follow the closing deadline.");
  ordered(data.earnestMoneyDueDate, data.closingDeadline, "Earnest money due date cannot follow the closing deadline.");
  return data;
}
const offerTransitions: Record<string, string[]> = { DRAFT: ["PENDING", "WITHDRAWN"], PENDING: ["ACCEPTED", "REJECTED", "COUNTERED", "WITHDRAWN"], COUNTERED: ["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"], ACCEPTED: [], REJECTED: [], WITHDRAWN: [] };
const contractTransitions: Record<string, string[]> = { DRAFT: ["ACTIVE", "CANCELLED"], ACTIVE: ["COMPLETED", "CANCELLED"], COMPLETED: [], CANCELLED: [] };
export function statusOptions(kind: "offer" | "contract", from: string): Record<string, string> {
  const transitions = kind === "offer" ? offerTransitions : contractTransitions;
  const labels: Record<string, string> = kind === "offer" ? offerStatuses : contractStatuses;
  return Object.fromEntries([from, ...(transitions[from] ?? [])].map(value => [value, labels[value]]));
}
export function transition(kind: "offer" | "contract", from: string, to: string) {
  if (from !== to && !(kind === "offer" ? offerTransitions : contractTransitions)[from]?.includes(to)) throw new Error(`Cannot change ${kind} from ${from} to ${to}. Preserve this history and create a new record instead.`);
}
export function terminalOffer(status: string) { return ["ACCEPTED", "REJECTED", "WITHDRAWN"].includes(status); }
export function terminalContract(status: string) { return ["COMPLETED", "CANCELLED"].includes(status); }
export function sameFields(before: Record<string, unknown>, data: Record<string, unknown>) {
  return Object.entries(data).every(([key, value]) => /Amount$|^purchasePrice$/.test(key) ? sameDecimal(before[key] as string | null, value as string | null) : /Date$|Deadline$/.test(key) ? calendarDate(before[key] as string | null) === calendarDate(value as string | null) : before[key] === value);
}
export type OfferRow = { id: number; propertyId: number; contactId: number | null; amount: string; status: string; expirationDate: string | null };
export type ContractRow = { id: number; propertyId: number; contactId: number | null; status: string; earnestMoneyStatus: string; earnestMoneyDueDate: string | null; inspectionDeadline: string | null; closingDeadline: string | null };
export type AcquisitionDeadline = { key: string; propertyId: number; recordId: number; kind: "Offer expiration" | "EMD" | "Inspection" | "Closing"; date: string; status: string; href: string };
export function acquisitionSummary(offers: OfferRow[], contracts: ContractRow[], today = todayDate()) {
  const deadlines: AcquisitionDeadline[] = [];
  const add = (kind: AcquisitionDeadline["kind"], row: { id: number; propertyId: number }, value: string | null) => {
    const date = calendarDate(value); if (!date) return;
    deadlines.push({ key: `${kind}-${row.id}`, kind, propertyId: row.propertyId, recordId: row.id, date, status: followUpStatus(date, today), href: `/properties/${row.propertyId}#${kind === "Offer expiration" ? "offer" : "contract"}-${row.id}` });
  };
  for (const offer of offers) if (["PENDING", "COUNTERED"].includes(offer.status)) add("Offer expiration", offer, offer.expirationDate);
  for (const contract of contracts) if (contract.status === "ACTIVE") {
    if (!["PAID", "WAIVED"].includes(contract.earnestMoneyStatus)) add("EMD", contract, contract.earnestMoneyDueDate);
    add("Inspection", contract, contract.inspectionDeadline); add("Closing", contract, contract.closingDeadline);
  }
  deadlines.sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key));
  return { today, deadlines, pending: offers.filter(o => ["PENDING", "COUNTERED"].includes(o.status)), accepted: offers.filter(o => o.status === "ACCEPTED"), active: contracts.filter(c => c.status === "ACTIVE"), dueToday: deadlines.filter(d => d.status === "Due today"), overdue: deadlines.filter(d => d.status === "Overdue"), upcoming: deadlines.filter(d => d.status === "Upcoming"), upcomingClosings: deadlines.filter(d => d.kind === "Closing" && d.date >= today) };
}
