import { notFound } from "next/navigation";
import { db } from "@/src/prisma/db";

function routeId(value: string) {
  const id = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id <= 0) notFound();
  return id;
}
export async function getProperty(value: string) {
  const row = await db.orm.public.Property.where({ id: routeId(value) }).first();
  if (!row) notFound();
  return row;
}
export async function getContact(value: string) {
  const row = await db.orm.public.Contact.where({ id: routeId(value) }).first();
  if (!row) notFound();
  return row;
}
export async function getTask(value: string) {
  const row = await db.orm.public.Task.where({ id: routeId(value) }).first();
  if (!row) notFound();
  return row;
}
export type Property = Awaited<ReturnType<typeof getProperty>>;
export type Contact = Awaited<ReturnType<typeof getContact>>;
export type Task = Awaited<ReturnType<typeof getTask>>;
export function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleDateString("en-US", { timeZone: "UTC" }) : "No date set";
}
