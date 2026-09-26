"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/src/prisma/db";
import { optionalDate, optionalId, optionalText, recordId, requiredText, text } from "@/src/crm-input";
import { contactTime, contactType, contactTypes, temperature, temperatures } from "@/src/command-center";
import { calendarDate } from "@/src/follow-up";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
class InputError extends Error {}
async function perform(work: (tx: Tx) => Promise<void>) {
  try { await db.transaction(work); revalidatePath("/", "layout"); return { success: "Saved." }; }
  catch (error) { return { error: error instanceof InputError ? error.message : "Could not save. No changes were applied. Reload and try again." }; }
}
function stale() { return new InputError("This record changed. Reload before saving; no changes were applied."); }
function expected(form: FormData) {
  const value = requiredText(form, "updatedAt");
  if (!Number.isFinite(Date.parse(value))) throw new Error("Reload before saving.");
  return value;
}
export async function changeTemperature(form: FormData) {
  let id: number, value: ReturnType<typeof temperature>, version: string;
  try { id = recordId(form.get("id")); value = temperature(text(form, "temperature")); version = expected(form); }
  catch (e) { return { error: (e as Error).message }; }
  return perform(async tx => {
    const row = await tx.orm.public.Property.where({ id }).first();
    if (!row || row.updatedAt !== version) throw stale();
    if (row.temperature === value) return;
    if (!await tx.orm.public.Property.where({ id, updatedAt: version }).update({ temperature: value })) throw stale();
    await tx.orm.public.Activity.create({ propertyId: id, contactId: null, type: "TEMPERATURE_CHANGED", description: `Lead temperature changed from ${row.temperature ? temperatures[row.temperature] : "Unclassified"} to ${temperatures[value]}.` });
  });
}
export async function completePropertyFollowUp(form: FormData) {
  let id: number, version: string;
  try { id = recordId(form.get("id")); version = expected(form); } catch (e) { return { error: (e as Error).message }; }
  return perform(async tx => {
    const row = await tx.orm.public.Property.where({ id }).first();
    if (!row || row.updatedAt !== version) throw stale();
    if (!row.nextAction && !row.nextActionDate) return;
    if (!await tx.orm.public.Property.where({ id, updatedAt: version }).update({ nextAction: null, nextActionDate: null })) throw stale();
    await tx.orm.public.Activity.create({ type: "FOLLOW_UP_COMPLETED", description: `Completed property follow-up: ${row.nextAction || "Follow-up"}.`, propertyId: id, contactId: null });
  });
}
export async function logContact(form: FormData) {
  let propertyId: number | null, contactId: number | null, version: string, result: ReturnType<typeof contactType>, note: string | null, occurredAt: string, mode: string, dueDate: string | null, title: string | null, taskId: number | null, taskVersion: string;
  try {
    propertyId = optionalId(form, "propertyId"); contactId = optionalId(form, "contactId");
    if (propertyId === null && contactId === null) throw new Error("Choose a property or contact.");
    version = expected(form); result = contactType(text(form, "result"));
    note = optionalText(form, "note"); if (note && note.length > 4000) throw new Error("Keep the note to 4,000 characters or fewer.");
    occurredAt = contactTime(text(form, "occurredAt"));
    mode = text(form, "followUpMode"); if (!["unchanged", "schedule", "complete"].includes(mode)) throw new Error("Choose a valid follow-up action.");
    dueDate = optionalDate(form, "dueDate"); title = optionalText(form, "nextAction");
    if (title && title.length > 300) throw new Error("Keep the next action to 300 characters or fewer.");
    if (mode === "schedule" && (!dueDate || !title)) throw new Error("Enter the next action and follow-up date.");
    const choice = text(form, "taskChoice").split("|"); taskId = choice[0] ? recordId(choice[0]) : null; taskVersion = choice[1] ?? "";
    if (taskId && (!taskVersion || choice.length !== 2 || !Number.isFinite(Date.parse(taskVersion)))) throw new Error("Reload the task before saving.");
    if (mode === "complete" && propertyId === null && taskId === null) throw new Error("Select the task to complete.");
  } catch (e) { return { error: (e as Error).message }; }
  return perform(async tx => {
    const property = propertyId === null ? null : await tx.orm.public.Property.where({ id: propertyId }).first();
    const contact = contactId === null ? null : await tx.orm.public.Contact.where({ id: contactId }).first();
    if ((propertyId !== null && !property) || (contactId !== null && !contact)) throw new InputError("The related record no longer exists.");
    if (propertyId !== null && contactId !== null && !await tx.orm.public.PropertyContact.where({ propertyId, contactId }).first()) throw new InputError("Link this contact to the property before logging them together.");
    // Serialize submissions on the record used by the form, rejecting repeated/stale saves.
    if (property) {
      if (property.updatedAt !== version || !await tx.orm.public.Property.where({ id: property.id, updatedAt: version }).update({ nextAction: property.nextAction })) throw stale();
    } else if (contact) {
      if (contact.updatedAt !== version || !await tx.orm.public.Contact.where({ id: contact.id, updatedAt: version }).update({ notes: contact.notes })) throw stale();
    }
    const task = taskId === null ? null : await tx.orm.public.Task.where({ id: taskId }).first();
    if (taskId !== null && (!task || task.updatedAt !== taskVersion || task.status !== "PENDING" || (propertyId !== null ? task.propertyId !== propertyId : task.contactId !== contactId || task.propertyId !== null))) throw new InputError("The selected pending task changed or belongs to another record.");
    await tx.orm.public.Activity.create({ type: "OUTREACH_" + result, description: `${contactTypes[result]}${contact ? " — " + contact.firstName + (contact.lastName ? " " + contact.lastName : "") : ""}${note ? " — " + note : ""}`, propertyId, contactId, createdAt: occurredAt });
    if (mode === "unchanged") return;
    if (property) {
      const nextAction = mode === "complete" ? null : title;
      const nextActionDate = mode === "complete" ? null : dueDate;
      const priorSchedule = (await tx.orm.public.Activity.where({ propertyId: property.id }).all()).filter(a => a.type === "FOLLOW_UP_UPDATED").sort((a, b) => b.id - a.id)[0];
      const contactChanged = mode === "schedule" && (priorSchedule?.contactId ?? null) !== contactId;
      if (contactChanged || property.nextAction !== nextAction || calendarDate(property.nextActionDate) !== calendarDate(nextActionDate)) {
        await tx.orm.public.Property.where({ id: property.id }).update({ nextAction, nextActionDate });
        await tx.orm.public.Activity.create({ type: mode === "complete" ? "FOLLOW_UP_COMPLETED" : "FOLLOW_UP_UPDATED", description: mode === "complete" ? `Completed property follow-up: ${property.nextAction || "Follow-up"}.` : `Follow-up: ${title} — ${calendarDate(dueDate)}.`, propertyId, contactId });
      }
      // A selected task is explicitly marked handled alongside the property next action.
      if (task) {
        if (!await tx.orm.public.Task.where({ id: task.id, updatedAt: taskVersion }).update({ status: "COMPLETED" })) throw stale();
        await tx.orm.public.Activity.create({ type: "TASK_STATUS_CHANGED", description: `Task "${task.title}" completed.`, propertyId: task.propertyId, contactId: task.contactId });
      }
    } else if (task) {
      const data = mode === "complete" ? { status: "COMPLETED" as const } : { dueDate, title: title! };
      if (mode === "schedule" && task.title === title && calendarDate(task.dueDate) === calendarDate(dueDate)) return;
      if (!await tx.orm.public.Task.where({ id: task.id, updatedAt: taskVersion }).update(data)) throw stale();
      await tx.orm.public.Activity.create({ type: mode === "complete" ? "TASK_STATUS_CHANGED" : "FOLLOW_UP_UPDATED", description: mode === "complete" ? `Task "${task.title}" completed.` : `Task follow-up: ${title} — ${calendarDate(dueDate)}.`, propertyId: null, contactId });
    } else if (mode === "schedule") {
      await tx.orm.public.Task.create({ title: title!, description: null, dueDate, status: "PENDING", propertyId: null, contactId });
      await tx.orm.public.Activity.create({ type: "FOLLOW_UP_UPDATED", description: `Task follow-up: ${title} — ${calendarDate(dueDate)}.`, propertyId: null, contactId });
    }
  });
}
