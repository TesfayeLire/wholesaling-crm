"use server";

import { redirect } from "next/navigation";
import { db } from "@/src/prisma/db";

export async function createProperty(formData: FormData) {
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const zipCode = String(formData.get("zipCode") ?? "").trim();

  if (!address || !city || !state || !zipCode) {
    throw new Error("Address, city, state, and ZIP code are required.");
  }

  const optionalText = (name: string) => {
    const value = String(formData.get(name) ?? "").trim();
    return value || null;
  };

  const optionalNumber = (name: string) => {
    const value = String(formData.get(name) ?? "").trim();
    return value || null;
  };

  const status = String(formData.get("status") ?? "NEW_LEAD") as
    | "NEW_LEAD"
    | "RESEARCHING"
    | "CONTACTED"
    | "QUALIFIED"
    | "OFFER_MADE"
    | "NEGOTIATING"
    | "UNDER_CONTRACT"
    | "DISPOSITION"
    | "CLOSED"
    | "DEAD"
    | "NURTURE";

  const nextActionDateValue = String(
    formData.get("nextActionDate") ?? "",
  ).trim();

  await db.orm.public.Property.create({
    address,
    city,
    state,
    zipCode,
    county: optionalText("county"),
    source: optionalText("source"),
    askingPrice: optionalNumber("askingPrice"),
    estimatedValue: optionalNumber("estimatedValue"),
    repairEstimate: optionalNumber("repairEstimate"),
    offerAmount: optionalNumber("offerAmount"),
    status,
    nextAction: optionalText("nextAction"),
    nextActionDate: nextActionDateValue
      ? new Date(`${nextActionDateValue}T12:00:00Z`).toISOString()
      : null,
    notes: optionalText("notes"),
  });

  redirect("/properties");
}export async function createContact(formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();

  if (!firstName) {
    throw new Error("First name is required.");
  }

  const optionalText = (name: string) => {
    const value = String(formData.get(name) ?? "").trim();
    return value || null;
  };

  await db.orm.public.Contact.create({
    firstName,
    lastName: optionalText("lastName"),
    phone: optionalText("phone"),
    email: optionalText("email"),
    notes: optionalText("notes"),
  });

  redirect("/contacts");
}