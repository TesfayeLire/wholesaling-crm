"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/src/prisma/db";
import { contactInput, optionalText, pipelineStatus, propertyInput, recordId, taskInput, taskStatus, text } from "@/src/crm-input";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ActionResult = { error: string } | void;

class UserError extends Error {}

function refresh() { revalidatePath("/", "layout"); }
function userError(message: string): never { throw new UserError(message); }
function confirmed(form: FormData) { if (text(form, "confirm") !== "DELETE") userError("Deletion requires explicit confirmation."); }
function safeInput<T>(work: () => T): T {
  try { return work(); }
  catch (error) {
    if (error instanceof UserError) throw error;
    userError(error instanceof Error ? error.message : "Check the fields and try again.");
  }
}
async function mutation(work: () => Promise<void>): Promise<ActionResult> {
  try { await work(); }
  catch (error) {
    if (error instanceof UserError) return { error: error.message };
    return { error: "Could not save this change. No changes were applied. Please try again." };
  }
}
async function activity(tx: Tx, type: string, description: string, propertyId: number | null = null, contactId: number | null = null) { await tx.orm.public.Activity.create({ type, description, propertyId, contactId }); }
async function validateRelations(tx: Tx, propertyId: number | null, contactId: number | null) {
  if (propertyId !== null && !await tx.orm.public.Property.where({ id: propertyId }).first()) userError("Property no longer exists.");
  if (contactId !== null && !await tx.orm.public.Contact.where({ id: contactId }).first()) userError("Contact no longer exists.");
}

export async function createProperty(form: FormData) {
  const result = await mutation(async () => {
    const data = safeInput(() => propertyInput(form));
    await db.orm.public.Property.create(data);
  });
  if (result) return result;
  refresh();
  redirect("/properties");
}

export async function createContact(form: FormData) {
  const result = await mutation(async () => {
    const data = safeInput(() => contactInput(form));
    await db.orm.public.Contact.create(data);
  });
  if (result) return result;
  refresh();
  redirect("/contacts");
}

export async function createTask(form: FormData) {
  const result = await mutation(async () => {
    const data = safeInput(() => taskInput(form));
    await db.transaction(async tx => {
      await validateRelations(tx, data.propertyId, data.contactId);
      await tx.orm.public.Task.create(data);
      await activity(tx, "TASK_CREATED", `Task "${data.title}" scheduled${data.dueDate ? " for " + data.dueDate.slice(0, 10) : " without a due date"}.`, data.propertyId, data.contactId);
    });
  });
  if (result) return result;
  refresh();
  redirect("/tasks");
}

export async function updateProperty(form: FormData) {
  let id = 0;
  const result = await mutation(async () => {
    id = safeInput(() => recordId(form.get("id")));
    const data = safeInput(() => propertyInput(form));

    await db.transaction(async tx => {
      const before = await tx.orm.public.Property.where({ id }).first();
      if (!before) userError("Property no longer exists.");

      const expected = text(form, "updatedAt");
      if (!expected || expected !== before.updatedAt) userError("This property changed. Reload before saving.");

      const sameDay = (before.nextActionDate ?? "").slice(0, 10) === (data.nextActionDate ?? "").slice(0, 10);
      if (sameDay) data.nextActionDate = before.nextActionDate;

      const decimalKeys = ["askingPrice", "estimatedValue", "repairEstimate", "offerAmount"];
      const comparable = (value: unknown) =>
        typeof value === "string" && /^\d+(\.\d+)?$/.test(value)
          ? value.replace(/^0+(?=\d)/, "").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")
          : value;

      if (!Object.entries(data).some(([key, value]) =>
        decimalKeys.includes(key)
          ? comparable(before[key as keyof typeof data]) !== comparable(value)
          : before[key as keyof typeof data] !== value
      )) return;

      const changed = await tx.orm.public.Property.where({ id, updatedAt: expected }).update(data);
      if (!changed) userError("This property changed while saving. Reload and try again.");

      if (!sameDay || before.nextAction !== data.nextAction)
        await activity(tx, "FOLLOW_UP_UPDATED", "Property follow-up updated.", id);

      await activity(tx, "PROPERTY_UPDATED", "Property details updated.", id);

      if (before.status !== data.status)
        await activity(tx, "PIPELINE_CHANGED", `Pipeline changed from ${before.status} to ${data.status}.`, id);
    });
  });

  if (result) return result;
  refresh();
  redirect(`/properties/${id}`);
}

export async function updatePropertyStatus(form: FormData) {
  const result = await mutation(async () => {
    const id = safeInput(() => recordId(form.get("propertyId")));
    const status = safeInput(() => pipelineStatus(text(form, "status")));

    await db.transaction(async tx => {
      const before = await tx.orm.public.Property.where({ id }).first();
      if (!before) userError("Property no longer exists.");
      if (before.status === status) return;

      await tx.orm.public.Property.where({ id }).update({ status });
      await activity(tx, "PIPELINE_CHANGED", `Pipeline changed from ${before.status} to ${status}.`, id);
    });
  });

  if (result) return result;
  refresh();
  redirect("/pipeline");
}

export async function updateContact(form: FormData) {
  let id = 0;
  const result = await mutation(async () => {
    id = safeInput(() => recordId(form.get("id")));
    const data = safeInput(() => contactInput(form));
    const expected = text(form, "updatedAt");
    if (!expected) userError("Reload the contact before saving.");

    await db.transaction(async tx => {
      const before = await tx.orm.public.Contact.where({ id }).first();
      if (!before) userError("Contact no longer exists.");
      if (expected !== before.updatedAt) userError("This contact changed. Reload before saving.");

      if (!Object.entries(data).some(([key, value]) => before[key as keyof typeof data] !== value)) return;

      const changed = await tx.orm.public.Contact.where({ id, updatedAt: expected }).update(data);
      if (!changed) userError("This contact changed while saving. Reload and try again.");

      await activity(tx, "CONTACT_UPDATED", "Contact details updated.", null, id);
    });
  });

  if (result) return result;
  refresh();
  redirect(`/contacts/${id}`);
}

export async function deleteProperty(form: FormData) {
  const result = await mutation(async () => {
    confirmed(form);
    const id = safeInput(() => recordId(form.get("id")));
    const expected = text(form, "updatedAt");
    if (!expected) userError("Reload the property before deleting.");

    await db.transaction(async tx => {
      const row = await tx.orm.public.Property.where({ id }).first();
      if (!row) userError("Property no longer exists.");
      if (row.updatedAt !== expected) userError("This property changed. Reload before deleting.");

      const offerModel = tx.orm.public.Offer;
      const contractModel = tx.orm.public.AcquisitionContract;

      if (
        (offerModel && await offerModel.where({ propertyId: id }).first()) ||
        (contractModel && await contractModel.where({ propertyId: id }).first())
      ) {
        userError("This property has offer or acquisition-contract history and cannot be deleted. Preserve the history and use an inactive pipeline stage instead.");
      }

      await tx.orm.public.Task.where({ propertyId: id }).update({ propertyId: null });
      await tx.orm.public.Activity.where({ propertyId: id }).update({ propertyId: null });
      await tx.orm.public.PropertyContact.where({ propertyId: id }).delete();

      await activity(tx, "PROPERTY_DELETED", `Property deleted: ${row.address}. Related contacts, tasks, and history were preserved.`);

      await tx.orm.public.Property.where({ id, updatedAt: expected }).delete();
    });
  });

  if (result) return result;
  refresh();
  redirect("/properties");
}

export async function deleteContact(form: FormData) {
  const result = await mutation(async () => {
    confirmed(form);
    const id = safeInput(() => recordId(form.get("id")));
    const expected = text(form, "updatedAt");
    if (!expected) userError("Reload the contact before deleting.");

    await db.transaction(async tx => {
      const row = await tx.orm.public.Contact.where({ id }).first();
      if (!row) userError("Contact no longer exists.");
      if (row.updatedAt !== expected) userError("This contact changed. Reload before deleting.");

      await tx.orm.public.Task.where({ contactId: id }).update({ contactId: null });
      await tx.orm.public.Activity.where({ contactId: id }).update({ contactId: null });
      await tx.orm.public.PropertyContact.where({ contactId: id }).delete();

      await activity(tx, "CONTACT_DELETED", `Contact deleted: ${row.firstName}${row.lastName ? " " + row.lastName : ""}. Related CRM and deal history was preserved.`);

      await tx.orm.public.Contact.where({ id, updatedAt: expected }).delete();
    });
  });

  if (result) return result;
  refresh();
  redirect("/contacts");
}

export async function linkContact(form: FormData) {
  let propertyId = 0;
  let contactId = 0;

  const result = await mutation(async () => {
    propertyId = safeInput(() => recordId(form.get("propertyId")));
    contactId = safeInput(() => recordId(form.get("contactId")));
    const role = optionalText(form, "role");

    await db.transaction(async tx => {
      await validateRelations(tx, propertyId, contactId);

      const existing = await tx.orm.public.PropertyContact.where({ propertyId, contactId }).first();

      if (existing) {
        if (existing.role === role) return;
        await tx.orm.public.PropertyContact.where({ id: existing.id }).update({ role });
      } else {
        await tx.orm.public.PropertyContact.create({ propertyId, contactId, role });
      }

      await activity(tx, "CONTACT_LINKED", `${existing ? "Relationship updated" : "Contact linked to property"}${role ? ": " + role : ""}.`, propertyId, contactId);
    });
  });

  if (result) return result;
  refresh();
  redirect(text(form, "from") === "contact" ? `/contacts/${contactId}` : `/properties/${propertyId}`);
}

export async function updateTask(form: FormData) {
  const result = await mutation(async () => {
    const id = safeInput(() => recordId(form.get("id")));
    const data = safeInput(() => taskInput(form));
    const expected = text(form, "updatedAt");
    if (!expected) userError("Reload the task before saving.");

    await db.transaction(async tx => {
      const before = await tx.orm.public.Task.where({ id }).first();
      if (!before) userError("Task no longer exists.");
      if (expected !== before.updatedAt) userError("This task changed. Reload before saving.");

      await validateRelations(tx, data.propertyId, data.contactId);

      if (Object.entries(data).every(([key, value]) => before[key as keyof typeof data] === value)) return;

      const changed = await tx.orm.public.Task.where({ id, updatedAt: expected }).update(data);
      if (!changed) userError("This task changed while saving. Reload and try again.");

      if (before.dueDate?.slice(0, 10) !== data.dueDate?.slice(0, 10) || before.title !== data.title)
        await activity(tx, "TASK_UPDATED", `Task "${data.title}" updated${data.dueDate ? " — due " + data.dueDate.slice(0, 10) : " — no due date"}.`, data.propertyId, data.contactId);

      if (before.status !== data.status)
        await activity(tx, "TASK_STATUS_CHANGED", `Task "${data.title}" ${data.status === "COMPLETED" ? "completed" : "reopened"}.`, data.propertyId, data.contactId);
    });
  });

  if (result) return result;
  refresh();
  redirect("/tasks");
}

export async function setTaskStatus(form: FormData) {
  const result = await mutation(async () => {
    const id = safeInput(() => recordId(form.get("id")));
    const status = safeInput(() => taskStatus(text(form, "status")));
    const expected = text(form, "updatedAt");
    if (!expected) userError("Reload the task before changing its status.");

    await db.transaction(async tx => {
      const before = await tx.orm.public.Task.where({ id }).first();
      if (!before) userError("Task no longer exists.");
      if (expected !== before.updatedAt) userError("This task changed. Reload before saving.");
      if (before.status === status) return;

      const changed = await tx.orm.public.Task.where({ id, updatedAt: expected }).update({ status });
      if (!changed) userError("This task changed while saving. Reload and try again.");

      await activity(tx, "TASK_STATUS_CHANGED", `Task "${before.title}" ${status === "COMPLETED" ? "completed" : "reopened"}.`, before.propertyId, before.contactId);
    });
  });

  if (result) return result;
  refresh();
}

export async function deleteTask(form: FormData) {
  const result = await mutation(async () => {
    confirmed(form);
    const id = safeInput(() => recordId(form.get("id")));
    const expected = text(form, "updatedAt");
    if (!expected) userError("Reload the task before deleting.");

    await db.transaction(async tx => {
      const row = await tx.orm.public.Task.where({ id }).first();
      if (!row) userError("Task no longer exists.");
      if (row.updatedAt !== expected) userError("This task changed. Reload before deleting.");

      await activity(tx, "TASK_DELETED", `Task deleted: "${row.title}".`, row.propertyId, row.contactId);

      await tx.orm.public.Task.where({ id, updatedAt: expected }).delete();
    });
  });

  if (result) return result;
  refresh();
  redirect("/tasks");
}
