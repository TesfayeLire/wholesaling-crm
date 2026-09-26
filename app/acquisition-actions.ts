"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/src/prisma/db";
import { optionalId, recordId, requiredText, text } from "@/src/crm-input";
import { contractInput, offerInput, positiveMoney, sameFields, terminalContract, terminalOffer, transition } from "@/src/acquisitions";
import { formatMoney } from "@/src/deal-analysis";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
class UserError extends Error {}
const stale = () => new UserError("This record changed. Reload before saving; nothing was overwritten.");
function version(form: FormData) {
  const stamp = requiredText(form, "updatedAt");
  if (!Number.isFinite(Date.parse(stamp))) throw new Error("Reload the record before saving.");
  return stamp;
}
function advance(form: FormData) {
  const value = text(form, "advancePipeline");
  if (value !== "" && value !== "yes") throw new Error("Invalid pipeline choice.");
  return value === "yes";
}
async function run(work: (tx: Tx) => Promise<void>) {
  try { await db.transaction(work); revalidatePath("/", "layout"); return { success: "Saved." }; }
  catch (e) { return { error: e instanceof UserError ? e.message : "Could not save. No changes were applied. Reload and check that a contract has not already been created or activated." }; }
}
async function relations(tx: Tx, propertyId: number, contactId: number | null) {
  if (!await tx.orm.public.Property.where({ id: propertyId }).first()) throw new UserError("Property no longer exists.");
  if (contactId !== null) {
    if (!await tx.orm.public.Contact.where({ id: contactId }).first()) throw new UserError("Contact no longer exists.");
    if (!await tx.orm.public.PropertyContact.where({ propertyId, contactId }).first()) throw new UserError("Link this seller to the property first, or leave the seller blank.");
  }
}
async function lockProperty(tx: Tx, id: number, expected?: string) {
  const row = await tx.orm.public.Property.where({ id }).first();
  if (!row) throw new UserError("Property no longer exists.");
  if (expected && row.updatedAt !== expected) throw stale();
  if (!await tx.orm.public.Property.where({ id, updatedAt: row.updatedAt }).update({ nextAction: row.nextAction })) throw stale();
  return row;
}
async function history(tx: Tx, propertyId: number, contactId: number | null, type: string, description: string) {
  await tx.orm.public.Activity.create({ propertyId, contactId, type, description });
}
async function pipeline(tx: Tx, propertyId: number, target: "OFFER_MADE" | "NEGOTIATING" | "UNDER_CONTRACT", requested: boolean) {
  if (!requested) return;
  const property = await tx.orm.public.Property.where({ id: propertyId }).first();
  if (!property) throw stale();
  if (property.status === target) return;
  if (["CLOSED", "DEAD", "DISPOSITION"].includes(property.status) || (property.status === "UNDER_CONTRACT" && target !== "UNDER_CONTRACT")) throw new UserError("This pipeline stage is further along or inactive. Use the existing stage editor explicitly instead.");
  await tx.orm.public.Property.where({ id: propertyId }).update({ status: target });
  await history(tx, propertyId, null, "PIPELINE_CHANGED", `Pipeline changed from ${property.status} to ${target} at your request.`);
}
const fieldLabels: Record<string, string> = { status: "Status", offerDate: "Offer date", expirationDate: "Expiration", counterAmount: "Seller counter ($)", acceptedAmount: "Accepted amount ($)", purchasePrice: "Purchase price ($)", contractDate: "Contract date", inspectionDeadline: "Inspection deadline", closingDeadline: "Closing deadline", earnestMoneyAmount: "EMD amount ($)", earnestMoneyDueDate: "EMD due date", earnestMoneyStatus: "EMD status", notes: "Notes", contactId: "Seller contact ID" };
function changes(before: Record<string, unknown>, data: Record<string, unknown>) {
  return Object.entries(data).filter(([key, value]) => !sameFields({ [key]: before[key] }, { [key]: value })).map(([key, value]) => `${fieldLabels[key] ?? key}: ${before[key] ?? "not entered"} → ${value ?? "not entered"}`).join("; ");
}
export async function createOffer(form: FormData) {
  let propertyId: number, contactId: number | null, expected: string, amount: string, data: ReturnType<typeof offerInput>, move: boolean;
  try {
    propertyId = recordId(form.get("propertyId")); contactId = optionalId(form, "contactId"); expected = version(form); amount = positiveMoney(text(form, "amount")); data = offerInput(form, amount); move = advance(form);
    if (!["DRAFT", "PENDING"].includes(data.status) || data.counterAmount) throw new Error("Create a Draft or Pending offer, then record the seller's response.");
    if (move && data.status !== "PENDING") throw new Error("Only Pending offers can move the pipeline to Offer Made.");
  } catch (e) { return { error: (e as Error).message }; }
  return run(async tx => {
    await relations(tx, propertyId, contactId); await lockProperty(tx, propertyId, expected);
    const offer = await tx.orm.public.Offer.create({ propertyId, contactId, amount, ...data });
    await history(tx, propertyId, contactId, "OFFER_CREATED", `Offer #${offer.id} created: ${formatMoney(amount)}, ${data.status}; offer date ${data.offerDate?.slice(0, 10) ?? "not entered"}; expiration ${data.expirationDate?.slice(0, 10) ?? "not entered"}.${data.notes ? " Notes: " + data.notes : ""}`);
    await pipeline(tx, propertyId, "OFFER_MADE", move);
  });
}
export async function updateOffer(form: FormData) {
  let id: number, propertyId: number, expected: string, move: boolean;
  try { id = recordId(form.get("id")); propertyId = recordId(form.get("propertyId")); expected = version(form); move = advance(form); }
  catch (e) { return { error: (e as Error).message }; }
  return run(async tx => {
    const before = await tx.orm.public.Offer.where({ id, propertyId }).first();
    if (!before || before.updatedAt !== expected) throw stale();
    let data: ReturnType<typeof offerInput>;
    try { data = offerInput(form, before.amount); transition("offer", before.status, data.status); } catch (e) { throw new UserError((e as Error).message); }
    if (move && !["PENDING", "COUNTERED", "ACCEPTED"].includes(data.status)) throw new UserError("Pipeline progression is available for Pending, Countered, or Accepted offers.");
    const same = sameFields(before, data);
    if (!same && terminalOffer(before.status)) throw new UserError("This finalized offer is preserved. Create a new offer for further negotiation.");
    if (same && !move) return;
    await lockProperty(tx, propertyId);
    if (!same) {
      if (!await tx.orm.public.Offer.where({ id, updatedAt: expected }).update(data)) throw stale();
      await history(tx, propertyId, before.contactId, "OFFER_UPDATED", `Offer #${id} (${formatMoney(before.amount)} original): ${changes(before, data)}.`);
    }
    await pipeline(tx, propertyId, data.status === "COUNTERED" ? "NEGOTIATING" : "OFFER_MADE", move);
  });
}
export async function createContractFromOffer(form: FormData) {
  let offerId: number, propertyId: number, expected: string;
  try { offerId = recordId(form.get("offerId")); propertyId = recordId(form.get("propertyId")); expected = version(form); }
  catch (e) { return { error: (e as Error).message }; }
  return run(async tx => {
    const offer = await tx.orm.public.Offer.where({ id: offerId, propertyId }).first();
    if (!offer || offer.status !== "ACCEPTED" || !offer.acceptedAmount) throw new UserError("Choose an accepted offer with an explicit accepted amount.");
    // Repeated conversion is a quiet success; the unique FK is the concurrent backstop.
    if (await tx.orm.public.AcquisitionContract.where({ offerId }).first()) return;
    if (offer.updatedAt !== expected) throw stale();
    await relations(tx, propertyId, offer.contactId); await lockProperty(tx, propertyId);
    if (!await tx.orm.public.Offer.where({ id: offerId, updatedAt: expected }).update({ acceptedAmount: offer.acceptedAmount })) throw stale();
    const contract = await tx.orm.public.AcquisitionContract.create({ propertyId, offerId, contactId: offer.contactId, purchasePrice: offer.acceptedAmount, status: "DRAFT", earnestMoneyStatus: "NOT_DUE", contractDate: null, inspectionDeadline: null, closingDeadline: null, earnestMoneyAmount: null, earnestMoneyDueDate: null, notes: null });
    await history(tx, propertyId, offer.contactId, "ACQUISITION_CREATED", `Acquisition contract #${contract.id} created as Draft from accepted offer #${offerId} at ${formatMoney(offer.acceptedAmount)}. Remaining contract details must be entered.`);
  });
}
export async function updateAcquisitionContract(form: FormData) {
  let id: number, propertyId: number, contactId: number | null, expected: string, data: ReturnType<typeof contractInput>, move: boolean;
  try { id = recordId(form.get("id")); propertyId = recordId(form.get("propertyId")); contactId = optionalId(form, "contactId"); expected = version(form); data = contractInput(form); move = advance(form); if (move && data.status !== "ACTIVE") throw new Error("Only an Active contract can move the pipeline to Under Contract."); }
  catch (e) { return { error: (e as Error).message }; }
  return run(async tx => {
    const before = await tx.orm.public.AcquisitionContract.where({ id, propertyId }).first();
    if (!before || before.updatedAt !== expected) throw stale();
    try { transition("contract", before.status, data.status); } catch (e) { throw new UserError((e as Error).message); }
    const update = { ...data, contactId };
    const same = sameFields(before, update);
    if (!same && terminalContract(before.status)) throw new UserError("Completed or cancelled acquisition records are preserved and cannot be edited.");
    if (same && !move) return;
    await relations(tx, propertyId, contactId); await lockProperty(tx, propertyId);
    if (data.status === "ACTIVE") {
      const active = await tx.orm.public.AcquisitionContract.where({ propertyId, status: "ACTIVE" }).first();
      if (active && active.id !== id) throw new UserError("This property already has an Active acquisition contract. Resolve that contract before activating another.");
    }
    if (!same) {
      if (!await tx.orm.public.AcquisitionContract.where({ id, updatedAt: expected }).update(update)) throw stale();
      await history(tx, propertyId, contactId, "ACQUISITION_UPDATED", `Acquisition contract #${id}: ${changes(before, update)}. Completion refers only to the acquisition stage, not final closing.`);
    }
    await pipeline(tx, propertyId, "UNDER_CONTRACT", move);
  });
}
