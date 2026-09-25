"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/src/prisma/db";
import { contactInput, optionalText, pipelineStatus, propertyInput, recordId, taskInput, taskStatus, text } from "@/src/crm-input";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function refresh() {
  revalidatePath("/", "layout");
}
function confirmed(form: FormData) {
  if (text(form, "confirm") !== "DELETE") throw new Error("Deletion requires explicit confirmation.");
}
async function activity(tx: Tx, type: string, description: string, propertyId: number | null = null, contactId: number | null = null) {
  await tx.orm.public.Activity.create({ type, description, propertyId, contactId });
}
async function validateRelations(tx: Tx, propertyId: number | null, contactId: number | null) {
  if (propertyId !== null && !await tx.orm.public.Property.where({ id: propertyId }).first()) throw new Error("Property no longer exists.");
  if (contactId !== null && !await tx.orm.public.Contact.where({ id: contactId }).first()) throw new Error("Contact no longer exists.");
}

export async function createProperty(form: FormData) {
  await db.orm.public.Property.create(propertyInput(form));
  refresh();
  redirect("/properties");
}
export async function createContact(form: FormData) {
  await db.orm.public.Contact.create(contactInput(form));
  refresh();
  redirect("/contacts");
}
export async function createTask(form: FormData) {
  const data = taskInput(form);
  await db.transaction(async tx => {
    await validateRelations(tx, data.propertyId, data.contactId);
    await tx.orm.public.Task.create(data);
  });
  refresh();
  redirect("/tasks");
}
export async function updateProperty(form: FormData) {
  const id = recordId(form.get("id"));
  const data = propertyInput(form);
  await db.transaction(async tx => {
    const before = await tx.orm.public.Property.where({ id }).first();
    if (!before) throw new Error("Property no longer exists.");
    if (!Object.entries(data).some(([key, value]) => before[key as keyof typeof data] !== value)) return;
    await tx.orm.public.Property.where({ id }).update(data);
    await activity(tx, "PROPERTY_UPDATED", "Property details updated.", id);
    if (before.status !== data.status) await activity(tx, "PIPELINE_CHANGED", `Pipeline changed from ${before.status} to ${data.status}.`, id);
  });
  refresh();
  redirect(`/properties/${id}`);
}
export async function updatePropertyStatus(form: FormData) {
  const id = recordId(form.get("propertyId"));
  const status = pipelineStatus(text(form, "status"));
  await db.transaction(async tx => {
    const before = await tx.orm.public.Property.where({ id }).first();
    if (!before) throw new Error("Property no longer exists.");
    if (before.status === status) return;
    await tx.orm.public.Property.where({ id }).update({ status });
    await activity(tx, "PIPELINE_CHANGED", `Pipeline changed from ${before.status} to ${status}.`, id);
  });
  refresh();
  redirect("/pipeline");
}
export async function updateContact(form: FormData) {
  const id = recordId(form.get("id"));
  const data = contactInput(form);
  await db.transaction(async tx => {
    const before = await tx.orm.public.Contact.where({ id }).first();
    if (!before) throw new Error("Contact no longer exists.");
    if (!Object.entries(data).some(([key, value]) => before[key as keyof typeof data] !== value)) return;
    await tx.orm.public.Contact.where({ id }).update(data);
    await activity(tx, "CONTACT_UPDATED", "Contact details updated.", null, id);
  });
  refresh();
  redirect(`/contacts/${id}`);
}
export async function deleteProperty(form: FormData) {
  confirmed(form);
  const id = recordId(form.get("id"));
  await db.transaction(async tx => {
    // Keep tasks, contacts and history; clear only this property's references.
    await tx.orm.public.Task.where({ propertyId: id }).update({ propertyId: null });
    await tx.orm.public.Activity.where({ propertyId: id }).update({ propertyId: null });
    await tx.orm.public.PropertyContact.where({ propertyId: id }).delete();
    await tx.orm.public.Property.where({ id }).delete();
  });
  refresh();
  redirect("/properties");
}
export async function deleteContact(form: FormData) {
  confirmed(form);
  const id = recordId(form.get("id"));
  await db.transaction(async tx => {
    await tx.orm.public.Task.where({ contactId: id }).update({ contactId: null });
    await tx.orm.public.Activity.where({ contactId: id }).update({ contactId: null });
    await tx.orm.public.PropertyContact.where({ contactId: id }).delete();
    await tx.orm.public.Contact.where({ id }).delete();
  });
  refresh();
  redirect("/contacts");
}
export async function linkContact(form: FormData) {
  const propertyId = recordId(form.get("propertyId"));
  const contactId = recordId(form.get("contactId"));
  const role = optionalText(form, "role");
  await db.transaction(async tx => {
    await validateRelations(tx, propertyId, contactId);
    const existing = await tx.orm.public.PropertyContact.where({ propertyId, contactId }).first();
    if (existing) {
      if (existing.role === role) return;
      await tx.orm.public.PropertyContact.where({ id: existing.id }).update({ role });
    } else {
      // The existing composite unique constraint also prevents concurrent duplicates.
      await tx.orm.public.PropertyContact.create({ propertyId, contactId, role });
    }
    await activity(tx, "CONTACT_LINKED", `${existing ? "Relationship updated" : "Contact linked to property"}${role ? ": " + role : ""}.`, propertyId, contactId);
  });
  refresh();
  redirect(text(form, "from") === "contact" ? `/contacts/${contactId}` : `/properties/${propertyId}`);
}
export async function updateTask(form: FormData) {
  const id = recordId(form.get("id"));
  const data = taskInput(form);
  await db.transaction(async tx => {
    const before = await tx.orm.public.Task.where({ id }).first();
    if (!before) throw new Error("Task no longer exists.");
    await validateRelations(tx, data.propertyId, data.contactId);
    await tx.orm.public.Task.where({ id }).update(data);
    if (before.status !== data.status) await activity(tx, "TASK_STATUS_CHANGED", `Task "${data.title}" ${data.status === "COMPLETED" ? "completed" : "reopened"}.`, data.propertyId, data.contactId);
  });
  refresh();
  redirect("/tasks");
}
export async function setTaskStatus(form: FormData) {
  const id = recordId(form.get("id"));
  const status = taskStatus(text(form, "status"));
  await db.transaction(async tx => {
    const before = await tx.orm.public.Task.where({ id }).first();
    if (!before) throw new Error("Task no longer exists.");
    if (before.status === status) return;
    await tx.orm.public.Task.where({ id }).update({ status });
    await activity(tx, "TASK_STATUS_CHANGED", `Task "${before.title}" ${status === "COMPLETED" ? "completed" : "reopened"}.`, before.propertyId, before.contactId);
  });
  refresh();
}
export async function deleteTask(form: FormData) {
  confirmed(form);
  const id = recordId(form.get("id"));
  await db.orm.public.Task.where({ id }).delete();
  refresh();
  redirect("/tasks");
}
