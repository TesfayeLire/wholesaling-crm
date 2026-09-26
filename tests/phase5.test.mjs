import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load(path, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, FormData, require: name => { if (!(name in imports)) throw new Error("Unexpected import: " + name); return imports[name]; } }, { filename: path });
  return exports;
}
const money = load("src/deal-analysis.ts"), dates = load("src/follow-up.ts"), input = load("src/crm-input.ts");
const rules = load("src/acquisitions.ts", { "./deal-analysis": money, "./crm-input": input, "./follow-up": dates });
const stamp = "2026-09-26T12:00:00.000Z", today = "2026-09-26";
function form(values) { const f = new FormData(); for (const [k, v] of Object.entries(values)) f.set(k, v ?? ""); return f; }
function fixture() {
  let state = { Property: [{ id: 1, status: "NEW_LEAD", nextAction: "Call seller", nextActionDate: "2026-09-27", temperature: "HOT", arv: "200000", offerAmount: "90000", updatedAt: stamp }], Contact: [{ id: 2, firstName: "Seller" }], PropertyContact: [{ id: 1, propertyId: 1, contactId: 2 }], Offer: [], AcquisitionContract: [], Activity: [], Task: [] };
  let failAt = Infinity, race = false, tick = 0;
  const orm = { public: {} };
  for (const name of Object.keys(state)) orm.public[name] = {
    async all() { return state[name].map(r => ({ ...r })); },
    where(filter) {
      const matches = row => Object.entries(filter).every(([k, v]) => row[k] === v);
      return { async first() { const row = state[name].find(matches); return row ? { ...row } : null; }, async all() { return state[name].filter(matches).map(r => ({ ...r })); },
        async update(data) { if (race) return null; const rows = state[name].filter(matches); rows.forEach(row => Object.assign(row, data, { updatedAt: new Date(Date.parse(stamp) + ++tick * 1000).toISOString() })); return rows[0] ? { ...rows[0] } : null; },
        async delete() { if (name === "Property" && state.Offer.some(o => state.Property.some(p => matches(p) && p.id === o.propertyId))) throw new Error("FK restrict");
          if (name === "Contact") for (const row of state.Contact.filter(matches)) for (const table of ["Offer", "AcquisitionContract"]) state[table].filter(item => item.contactId === row.id).forEach(item => item.contactId = null);
          state[name] = state[name].filter(r => !matches(r)); }
      };
    },
    async create(data) {
      if (name === "Activity" && state.Activity.length + 1 >= failAt) throw new Error("History failure");
      if (name === "AcquisitionContract" && state.AcquisitionContract.some(c => c.offerId === data.offerId)) throw new Error("Unique offer constraint");
      const row = { id: state[name].length + 10, createdAt: stamp, updatedAt: stamp, ...data }; state[name].push(row); return row;
    },
  };
  const db = { orm, async transaction(fn) { const before = structuredClone(state); try { return await fn({ orm }); } catch (e) { state = before; throw e; } } };
  const shared = { "@/src/prisma/db": { db }, "@/src/crm-input": input, "next/cache": { revalidatePath() {} } };
  const actions = load("app/acquisition-actions.ts", { ...shared, "@/src/acquisitions": rules, "@/src/deal-analysis": money });
  const old = load("app/actions.ts", { ...shared, "next/navigation": { redirect() { throw new Error("REDIRECT"); } } });
  return { actions, old, get state() { return state; }, fail(after = 1) { failAt = after; }, race() { race = true; },
    create(values = {}) { return actions.createOffer(form({ propertyId: 1, contactId: 2, updatedAt: state.Property[0].updatedAt, amount: "105000", offerDate: today, status: "PENDING", ...values })); },
    update(values = {}, index = 0) { const o = state.Offer[index]; return actions.updateOffer(form({ ...o, offerDate: o.offerDate?.slice(0, 10), expirationDate: o.expirationDate?.slice(0, 10), ...values })); },
    convert(values = {}, index = 0) { const o = state.Offer[index]; return actions.createContractFromOffer(form({ offerId: o.id, propertyId: 1, updatedAt: o.updatedAt, ...values })); },
    contract(values = {}, index = 0) { const c = state.AcquisitionContract[index]; const data = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, /Date$|Deadline$/.test(k) && typeof v === "string" ? v.slice(0, 10) : v])); return actions.updateAcquisitionContract(form({ ...data, ...values })); },
  };
}
async function accepted(f, amount = "105000") { await f.create({ amount }); assert.ok((await f.update({ status: "ACCEPTED", acceptedAmount: amount })).success); }
async function draftContract(f) { await accepted(f); assert.ok((await f.convert()).success); }
const active = { status: "ACTIVE", contractDate: "2026-09-26", closingDeadline: "2026-10-30" };

test("valid offers persist independently and leave Phase 3/4 values unchanged", async () => {
  const f = fixture(); assert.ok((await f.create()).success); await f.update({ status: "REJECTED" }); assert.ok((await f.create({ amount: "110000" })).success);
  assert.equal(f.state.Offer.length, 2); assert.equal(f.state.Offer[0].amount, "105000"); assert.equal(f.state.Offer[0].status, "REJECTED"); assert.equal(f.state.Offer[1].amount, "110000");
  for (const [key, value] of Object.entries({ arv: "200000", offerAmount: "90000", temperature: "HOT", nextAction: "Call seller", nextActionDate: "2026-09-27" })) assert.equal(f.state.Property[0][key], value);
  assert.equal(f.state.PropertyContact.length, 1);
});
test("offer creation rejects invalid property, contact and unlinked seller", async () => {
  for (const values of [{ propertyId: 99 }, { propertyId: "1e0" }, { contactId: 99 }, { contactId: "-1" }]) { const f = fixture(); assert.ok((await f.create(values)).error); assert.equal(f.state.Offer.length, 0); }
  const f = fixture(); f.state.PropertyContact = []; assert.ok((await f.create()).error); assert.ok((await f.create({ contactId: "" })).success);
});
test("offer amounts reject blank, zero, negatives, malformed and excess precision", async () => {
  for (const amount of ["", "0", "-1", "1e5", "1,000", "1.001", "Infinity"]) { const f = fixture(); assert.ok((await f.create({ amount })).error); assert.equal(f.state.Offer.length, 0); }
});
test("Draft offers allow missing dates; Pending requires the actual offer date", async () => {
  const f = fixture(); assert.ok((await f.create({ status: "DRAFT", offerDate: "" })).success); assert.equal(f.state.Offer[0].offerDate, null);
  assert.ok((await f.update({ status: "PENDING", offerDate: "" })).error); assert.ok((await f.update({ status: "PENDING", offerDate: today })).success);
});
test("invalid statuses and impossible/reversed offer dates are rejected", async () => {
  for (const values of [{ status: "INVALID" }, { status: "ACCEPTED", acceptedAmount: "105000" }, { offerDate: "2026-02-30" }, { expirationDate: "2026-09-25" }]) { const f = fixture(); assert.ok((await f.create(values)).error); }
});
test("Pending offers can be Accepted, Rejected or Withdrawn with history", async () => {
  for (const status of ["ACCEPTED", "REJECTED", "WITHDRAWN"]) { const f = fixture(); await f.create(); assert.ok((await f.update({ status, acceptedAmount: status === "ACCEPTED" ? "105000" : "" })).success); assert.equal(f.state.Offer[0].status, status); assert.equal(f.state.Activity.length, 2); }
});
test("successive seller counters preserve the original and every previous counter in history", async () => {
  const f = fixture(); await f.create(); assert.ok((await f.update({ status: "COUNTERED", counterAmount: "115000", notes: "Seller counter" })).success);
  assert.ok((await f.update({ status: "COUNTERED", counterAmount: "112000", notes: "Second counter" })).success);
  assert.equal(f.state.Offer[0].amount, "105000"); assert.equal(f.state.Offer[0].counterAmount, "112000");
  assert.match(f.state.Activity.at(-1).description, /115000 → 112000/); assert.match(f.state.Activity[1].description, /115000/);
});
test("acceptance requires explicit agreement to original or counter price", async () => {
  const f = fixture(); await f.create(); assert.ok((await f.update({ status: "ACCEPTED" })).error); assert.ok((await f.update({ status: "COUNTERED" })).error);
  await f.update({ status: "COUNTERED", counterAmount: "115000" }); assert.ok((await f.update({ status: "ACCEPTED", acceptedAmount: "110000" })).error);
  assert.ok((await f.update({ status: "ACCEPTED", acceptedAmount: "115000" })).success);
  await f.convert(); assert.equal(f.state.AcquisitionContract[0].purchasePrice, "115000");
});
test("finalized offers cannot be reopened or rewritten; repeated no-op is quiet", async () => {
  const f = fixture(); await accepted(f); const count = f.state.Activity.length;
  assert.ok((await f.update()).success); assert.equal(f.state.Activity.length, count);
  assert.ok((await f.update({ status: "PENDING", acceptedAmount: "" })).error); assert.ok((await f.update({ notes: "rewrite" })).error);
});
test("offer IDs and property mismatch are validated on update", async () => {
  const f = fixture(); await f.create(); for (const values of [{ id: 999 }, { id: "no" }, { propertyId: 9 }]) assert.ok((await f.update(values)).error);
});
test("duplicate and stale offer forms do not insert or overwrite", async () => {
  const f = fixture(); await f.create(); assert.ok((await f.create({ updatedAt: stamp })).error); const old = f.state.Offer[0].updatedAt;
  await f.update({ notes: "New information" }); assert.ok((await f.update({ updatedAt: old, notes: "Old tab" })).error); assert.equal(f.state.Offer[0].notes, "New information");
  const g = fixture(); g.race(); assert.ok((await g.create()).error); assert.equal(g.state.Offer.length, 0);
});
test("contract from accepted offer carries price and relationships without inventing dates", async () => {
  const f = fixture(); await draftContract(f); const c = f.state.AcquisitionContract[0];
  assert.equal(c.purchasePrice, "105000"); assert.equal(c.propertyId, 1); assert.equal(c.contactId, 2); assert.equal(c.offerId, f.state.Offer[0].id); assert.equal(c.status, "DRAFT");
  for (const key of ["contractDate", "inspectionDeadline", "closingDeadline", "earnestMoneyAmount", "earnestMoneyDueDate"]) assert.equal(c[key], null);
  assert.equal(f.state.Offer[0].status, "ACCEPTED");
});
test("repeated accepted-offer conversion is quiet and never duplicates contracts", async () => {
  const f = fixture(); await draftContract(f); const count = f.state.Activity.length; assert.ok((await f.convert()).success); assert.equal(f.state.AcquisitionContract.length, 1); assert.equal(f.state.Activity.length, count);
});
test("contract conversion rejects pending, invalid, mismatched or missing relationships", async () => {
  const f = fixture(); await f.create(); assert.ok((await f.convert()).error); await f.update({ status: "ACCEPTED", acceptedAmount: "105000" });
  for (const values of [{ offerId: 999 }, { offerId: "bad" }, { propertyId: 99 }]) assert.ok((await f.convert(values)).error);
  f.state.Contact = []; assert.ok((await f.convert()).error); assert.equal(f.state.AcquisitionContract.length, 0);
});
test("purchase price uses exact decimals beyond JavaScript safe integers", async () => {
  const f = fixture(); await accepted(f, "9007199254740993.12"); await f.convert(); assert.equal(f.state.AcquisitionContract[0].purchasePrice, "9007199254740993.12");
  await f.contract({ purchasePrice: "9007199254740993.13" }); assert.equal(f.state.AcquisitionContract[0].purchasePrice, "9007199254740993.13"); assert.match(f.state.Activity.at(-1).description, /9007199254740993.12 → 9007199254740993.13/);
});
test("contract dates, inspection, closing and EMD persist using date-only noon UTC", async () => {
  const f = fixture(); await draftContract(f); assert.ok((await f.contract({ ...active, inspectionDeadline: "2026-10-03", earnestMoneyAmount: "1000.50", earnestMoneyDueDate: "2026-09-28", earnestMoneyStatus: "DUE" })).success);
  const c = f.state.AcquisitionContract[0]; assert.equal(c.contractDate, "2026-09-26T12:00:00.000Z"); assert.equal(c.inspectionDeadline, "2026-10-03T12:00:00.000Z"); assert.equal(c.closingDeadline, "2026-10-30T12:00:00.000Z"); assert.equal(c.earnestMoneyAmount, "1000.5"); assert.equal(c.earnestMoneyDueDate, "2026-09-28T12:00:00.000Z");
});
test("Active contracts require dates and reject invalid chronological deadlines", async () => {
  const f = fixture(); await draftContract(f);
  for (const values of [{ status: "ACTIVE" }, { ...active, contractDate: "2026-02-30" }, { ...active, inspectionDeadline: "2026-11-01" }, { ...active, earnestMoneyDueDate: "2026-09-25" }, { ...active, closingDeadline: "2026-09-25" }]) assert.ok((await f.contract(values)).error);
  assert.equal(f.state.AcquisitionContract[0].status, "DRAFT");
});
test("contract update validates IDs, seller links, amounts and statuses", async () => {
  const f = fixture(); await draftContract(f);
  for (const values of [{ id: 999 }, { id: "bad" }, { propertyId: 999 }, { contactId: 999 }, { contactId: "bad" }, { purchasePrice: "-1" }, { purchasePrice: "0.001" }, { status: "CLOSED" }, { earnestMoneyStatus: "SENT" }, { earnestMoneyAmount: "-5" }]) assert.ok((await f.contract(values)).error);
  assert.ok((await f.contract({ contactId: "" })).success); assert.equal(f.state.AcquisitionContract[0].contactId, null);
});
test("EMD statuses persist; Paid is explicit and requires an amount", async () => {
  const f = fixture(); await draftContract(f); assert.ok((await f.contract({ earnestMoneyStatus: "PAID" })).error);
  for (const earnestMoneyStatus of ["DUE", "PAID", "WAIVED", "NOT_DUE"]) { assert.ok((await f.contract({ earnestMoneyAmount: "1000", earnestMoneyStatus })).success); assert.equal(f.state.AcquisitionContract[0].earnestMoneyStatus, earnestMoneyStatus); }
});
test("contract cancellation retains accepted offer/history and removes deadlines", async () => {
  const f = fixture(); await draftContract(f); await f.contract(active); assert.ok((await f.contract({ status: "CANCELLED" })).success);
  assert.equal(f.state.Offer[0].status, "ACCEPTED"); assert.equal(rules.acquisitionSummary(f.state.Offer, f.state.AcquisitionContract, today).deadlines.length, 0);
  assert.ok((await f.contract({ status: "ACTIVE" })).error); assert.ok((await f.contract({ notes: "rewrite" })).error);
});
test("acquisition completion does not mark the property closed", async () => {
  const f = fixture(); await draftContract(f); await f.contract({ ...active, advancePipeline: "yes" }); await f.contract({ status: "COMPLETED" });
  assert.equal(f.state.Property[0].status, "UNDER_CONTRACT"); assert.equal(f.state.AcquisitionContract[0].status, "COMPLETED"); assert.equal(rules.acquisitionSummary([], f.state.AcquisitionContract, today).deadlines.length, 0);
});
test("only one Active acquisition per property is allowed", async () => {
  const f = fixture(); await draftContract(f); await f.contract(active); await f.create({ amount: "110000" }); await f.update({ status: "ACCEPTED", acceptedAmount: "110000" }, 1); await f.convert({}, 1);
  assert.ok((await f.contract(active, 1)).error); assert.equal(f.state.AcquisitionContract[1].status, "DRAFT");
});
test("pipeline progression requires an explicit choice and protects later stages", async () => {
  const f = fixture(); await f.create(); assert.equal(f.state.Property[0].status, "NEW_LEAD");
  await f.update({ advancePipeline: "yes" }); assert.equal(f.state.Property[0].status, "OFFER_MADE");
  await f.update({ status: "COUNTERED", counterAmount: "115000", advancePipeline: "yes" }); assert.equal(f.state.Property[0].status, "NEGOTIATING");
  f.state.Property[0].status = "UNDER_CONTRACT"; assert.ok((await f.update({ advancePipeline: "yes" })).error); assert.equal(f.state.Property[0].status, "UNDER_CONTRACT");
});
test("no-op contract saves do not add history and stale edits are rejected", async () => {
  const f = fixture(); await draftContract(f); const count = f.state.Activity.length, old = f.state.AcquisitionContract[0].updatedAt;
  assert.ok((await f.contract({ purchasePrice: "105000.00" })).success); assert.equal(f.state.Activity.length, count);
  await f.contract({ notes: "New" }); assert.ok((await f.contract({ updatedAt: old, notes: "Old" })).error); assert.equal(f.state.AcquisitionContract[0].notes, "New");
});
test("history failures roll back offer creation and offer updates", async () => {
  const f = fixture(), before = JSON.stringify(f.state); f.fail(); assert.ok((await f.create()).error); assert.equal(JSON.stringify(f.state), before);
  const g = fixture(); await g.create(); const snapshot = JSON.stringify(g.state); g.fail(2); assert.ok((await g.update({ status: "COUNTERED", counterAmount: "115000" })).error); assert.equal(JSON.stringify(g.state), snapshot);
});
test("history failures roll back contract conversion, edits and pipeline progression", async () => {
  const f = fixture(); await accepted(f); const snapshot = JSON.stringify(f.state); f.fail(3); assert.ok((await f.convert()).error); assert.equal(JSON.stringify(f.state), snapshot);
  const g = fixture(); await draftContract(g); const before = JSON.stringify(g.state); g.fail(g.state.Activity.length + 2); assert.ok((await g.contract({ ...active, advancePipeline: "yes" })).error); assert.equal(JSON.stringify(g.state), before);
});
test("all acquisition deadline types classify Today, Upcoming and Overdue deterministically", () => {
  for (const [date, status] of [["2026-09-25", "Overdue"], [today, "Due today"], ["2026-09-27", "Upcoming"]]) {
    const summary = rules.acquisitionSummary([{ id: 1, propertyId: 1, status: "PENDING", expirationDate: date }], [{ id: 2, propertyId: 1, status: "ACTIVE", earnestMoneyStatus: "DUE", earnestMoneyDueDate: date, inspectionDeadline: date, closingDeadline: date }], today);
    assert.equal(summary.deadlines.length, 4); assert.ok(summary.deadlines.every(d => d.status === status)); assert.equal(new Set(summary.deadlines.map(d => d.kind)).size, 4);
  }
});
test("missing dates, draft/finalized offers and inactive contracts create no deadlines", () => {
  const offers = ["DRAFT", "ACCEPTED", "REJECTED", "WITHDRAWN"].map((status, id) => ({ id, propertyId: 1, status, expirationDate: "2026-01-01" }));
  const contracts = ["DRAFT", "COMPLETED", "CANCELLED"].map((status, id) => ({ id, propertyId: 1, status, earnestMoneyStatus: "DUE", closingDeadline: "2026-01-01" }));
  assert.equal(rules.acquisitionSummary(offers, contracts, today).deadlines.length, 0);
  assert.equal(rules.acquisitionSummary([{ id: 9, propertyId: 1, status: "PENDING", expirationDate: null }], [], today).deadlines.length, 0);
});
test("Paid and Waived EMD disappear, but scheduled unpaid EMD remains even when Not Due", () => {
  for (const earnestMoneyStatus of ["PAID", "WAIVED", "DUE", "NOT_DUE"]) {
    const summary = rules.acquisitionSummary([], [{ id: 1, propertyId: 1, status: "ACTIVE", earnestMoneyStatus, earnestMoneyDueDate: today, inspectionDeadline: null, closingDeadline: null }], today);
    assert.equal(summary.deadlines.length, ["PAID", "WAIVED"].includes(earnestMoneyStatus) ? 0 : 1);
  }
});
test("dashboard counts and chronological ordering retain Countered and Accepted offers", () => {
  const offers = ["PENDING", "COUNTERED", "ACCEPTED"].map((status, id) => ({ id, propertyId: 1, amount: "100000", status, expirationDate: "2026-09-27" }));
  const summary = rules.acquisitionSummary(offers, [{ id: 1, propertyId: 1, status: "ACTIVE", earnestMoneyStatus: "DUE", earnestMoneyDueDate: "2026-09-25", inspectionDeadline: today, closingDeadline: "2026-10-30" }], today);
  assert.equal(summary.pending.length, 2); assert.equal(summary.accepted.length, 1); assert.equal(summary.active.length, 1); assert.equal(summary.overdue.length, 1); assert.equal(summary.dueToday.length, 1); assert.equal(summary.upcomingClosings.length, 1); assert.equal(summary.deadlines[0].kind, "EMD");
});
test("Phase 5 date storage and Central DST boundaries do not shift selected dates", () => {
  assert.equal(input.optionalDate(form({ date: "2026-11-01" }), "date"), "2026-11-01T12:00:00.000Z");
  const selected = [{ id: 1, propertyId: 1, status: "PENDING", expirationDate: "2026-11-01T12:00:00.000Z" }];
  assert.equal(rules.acquisitionSummary(selected, [], dates.todayDate(new Date("2026-11-01T04:59:00Z"))).deadlines[0].status, "Upcoming");
  assert.equal(rules.acquisitionSummary(selected, [], dates.todayDate(new Date("2026-11-01T06:01:00Z"))).deadlines[0].status, "Due today");
});
test("property deletion with offer history rolls back cleanup; contact deletion keeps acquisition history", async () => {
  const f = fixture(); await draftContract(f); const before = JSON.stringify(f.state);
  await assert.rejects(f.old.deleteProperty(form({ id: 1, confirm: "DELETE" })), /FK restrict/); assert.equal(JSON.stringify(f.state), before);
  await assert.rejects(f.old.deleteContact(form({ id: 2, confirm: "DELETE" })), /REDIRECT/); assert.equal(f.state.Offer[0].contactId, null); assert.equal(f.state.AcquisitionContract[0].contactId, null); assert.equal(f.state.Offer.length, 1); assert.equal(f.state.AcquisitionContract.length, 1);
});
test("migration is additive with numeric money, FKs, unique source offer and one Active contract", () => {
  const dir = fs.readdirSync("migrations/app").find(n => n.endsWith("_phase5_acquisitions"));
  const ops = JSON.parse(fs.readFileSync(`migrations/app/${dir}/ops.json`, "utf8")); assert.ok(ops.every(o => o.operationClass === "additive"));
  const sql = ops.flatMap(o => o.execute.map(e => e.sql)).join("\n");
  assert.doesNotMatch(sql, /DROP TABLE|DROP COLUMN|DELETE FROM|TRUNCATE/); assert.match(sql, /"purchasePrice" numeric/); assert.match(sql, /"amount" numeric/);
  assert.match(sql, /UNIQUE \("offerId"\)/); assert.match(sql, /FOREIGN KEY \("offerId", "propertyId"\)/); assert.match(sql, /ON DELETE RESTRICT/); assert.match(sql, /ON DELETE SET NULL/); assert.match(sql, /CREATE UNIQUE INDEX.*one_active_acquisition_per_property/);
});

test("withdrawing an unsent Draft does not require inventing an offer date", async () => {
  const f = fixture(); await f.create({ status: "DRAFT", offerDate: "" }); assert.ok((await f.update({ status: "WITHDRAWN" })).success); assert.equal(f.state.Offer[0].offerDate, null);
});
test("UI transition choices exclude invalid reopening and direct draft acceptance", () => {
  assert.equal(Object.hasOwn(rules.statusOptions("offer", "DRAFT"), "ACCEPTED"), false);
  assert.equal(Object.hasOwn(rules.statusOptions("contract", "DRAFT"), "COMPLETED"), false);
  assert.equal(Object.keys(rules.statusOptions("contract", "CANCELLED")).length, 1);
});
