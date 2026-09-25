"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/src/prisma/db";
import { analysisMoney, percentage, sameDecimal } from "@/src/deal-analysis";
import { calendarDate } from "@/src/follow-up";
import { optionalDate, optionalText, pipelineStatus, recordId, requiredText, text } from "@/src/crm-input";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Property = NonNullable<Awaited<ReturnType<typeof db.orm.public.Property.first>>>;
type Result = { error?: string; success?: string };
class ChangedRecord extends Error {}
function version(form: FormData) {
  const value = requiredText(form, "updatedAt");
  if (!Number.isFinite(Date.parse(value))) throw new Error("Reload the property before saving.");
  return value;
}
async function current(tx: Tx, id: number, expected: string) {
  const row = await tx.orm.public.Property.where({ id }).first();
  if (!row) throw new ChangedRecord("This property no longer exists.");
  if (row.updatedAt !== expected) throw new ChangedRecord("This property changed since you opened it. Reload before saving; your edits have not been applied.");
  return row;
}
async function save(tx: Tx, row: Property, data: Partial<Property>, type: string, description: string) {
  const changed = await tx.orm.public.Property.where({ id: row.id, updatedAt: row.updatedAt }).update(data);
  if (!changed) throw new ChangedRecord("This property changed while saving. Reload and try again.");
  await tx.orm.public.Activity.create({ type, description, propertyId: row.id, contactId: null });
}
async function mutation(work: (tx: Tx) => Promise<void>): Promise<Result> {
  try {
    await db.transaction(work);
    revalidatePath("/", "layout");
    return { success: "Saved." };
  } catch (error) {
    return { error: error instanceof ChangedRecord ? error.message : "Could not save. No changes were applied. Please try again." };
  }
}
export async function saveAnalysis(form: FormData): Promise<Result> {
  let id: number, expected: string, data;
  try {
    id = recordId(form.get("id")); expected = version(form);
    data = { askingPrice: analysisMoney(text(form, "askingPrice")), arv: analysisMoney(text(form, "arv")),
      repairEstimate: analysisMoney(text(form, "repairEstimate")), assignmentFee: analysisMoney(text(form, "assignmentFee")),
      buyerPercentage: percentage(text(form, "buyerPercentage")) };
  } catch (error) { return { error: (error as Error).message }; }
  return mutation(async tx => {
    const row = await current(tx, id, expected);
    if (Object.entries(data).every(([key, value]) => sameDecimal(row[key as keyof typeof data], value))) return;
    await save(tx, row, data, "DEAL_ANALYSIS_UPDATED", "Deal-analysis inputs updated.");
  });
}
export async function saveFollowUp(form: FormData): Promise<Result> {
  let id: number, expected: string, nextAction: string | null, nextActionDate: string | null;
  try {
    id = recordId(form.get("id")); expected = version(form);
    nextAction = optionalText(form, "nextAction"); nextActionDate = optionalDate(form, "nextActionDate");
    if (nextActionDate && !nextAction) throw new Error("Enter a next action for the follow-up date.");
  } catch (error) { return { error: (error as Error).message }; }
  return mutation(async tx => {
    const row = await current(tx, id, expected);
    if (row.nextAction === nextAction && calendarDate(row.nextActionDate) === calendarDate(nextActionDate)) return;
    await save(tx, row, { nextAction, nextActionDate }, "FOLLOW_UP_UPDATED",
      nextActionDate ? `Follow-up: ${nextAction} — ${calendarDate(nextActionDate)}.` : `Follow-up date cleared.${nextAction ? " Next action: " + nextAction : ""}`);
  });
}
export async function saveMotivation(form: FormData): Promise<Result> {
  let id: number, expected: string, sellerMotivation: string | null;
  try { id = recordId(form.get("id")); expected = version(form); sellerMotivation = optionalText(form, "sellerMotivation"); }
  catch (error) { return { error: (error as Error).message }; }
  return mutation(async tx => {
    const row = await current(tx, id, expected);
    if (row.sellerMotivation === sellerMotivation) return;
    await save(tx, row, { sellerMotivation }, "PROPERTY_UPDATED", "Seller motivation updated.");
  });
}
export async function addPropertyNote(form: FormData): Promise<Result> {
  let id: number, expected: string, note: string;
  try { id = recordId(form.get("id")); expected = version(form); note = requiredText(form, "note"); }
  catch (error) { return { error: (error as Error).message }; }
  return mutation(async tx => {
    const row = await current(tx, id, expected);
    // Append to existing notes; never replace them with the new note.
    const notes = row.notes ? row.notes + "\n\n" + note : note;
    await save(tx, row, { notes }, "NOTE_ADDED", "Note added: " + note);
  });
}
export async function changePropertyStage(form: FormData): Promise<Result> {
  let id: number, expected: string, status;
  try { id = recordId(form.get("id")); expected = version(form); status = pipelineStatus(text(form, "status")); }
  catch (error) { return { error: (error as Error).message }; }
  return mutation(async tx => {
    const row = await current(tx, id, expected);
    if (row.status === status) return;
    await save(tx, row, { status }, "PIPELINE_CHANGED", `Pipeline changed from ${row.status} to ${status}.`);
  });
}
