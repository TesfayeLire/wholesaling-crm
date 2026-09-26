import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const now = new Date("2026-09-25T18:00:00.000Z");
class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now.toISOString()])); } static now() { return now.getTime(); } }
function load(path, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, FormData, Date: Clock, require: name => { if (!(name in imports)) throw new Error("Unexpected import: " + name); return imports[name]; } }, { filename: path });
  return exports;
}
const dates = load("src/follow-up.ts"), input = load("src/crm-input.ts");
const center = load("src/command-center.ts", { "./follow-up": dates });
const stamp = "2026-09-25T12:00:00.000Z";
const lead = { id: 1, address: "123 Main", status: "NEW_LEAD", temperature: "HOT", nextAction: "Call seller", nextActionDate: "2026-09-24T12:00:00.000Z", updatedAt: stamp };
const person = { id: 2, firstName: "Seller", lastName: "One", notes: null, updatedAt: stamp };
function form(values) { const f = new FormData(); for (const [k, v] of Object.entries(values)) f.set(k, v ?? ""); return f; }
function event(overrides = {}) { return { id: 1, type: "OUTREACH_CALL", description: "Call", createdAt: "2026-09-24T18:00:00Z", propertyId: 1, contactId: 2, ...overrides }; }
function fixture() {
  let state = { Property: [{ ...lead }], Contact: [{ ...person }], PropertyContact: [{ id: 1, propertyId: 1, contactId: 2 }], Task: [], Activity: [] };
  let fail = false, failAt = 1, race = false, tick = 1;
  const orm = { public: {} };
  for (const name of Object.keys(state)) orm.public[name] = {
    where(filter) {
      const match = row => Object.entries(filter).every(([k, v]) => row[k] === v);
      return { async first() { const row = state[name].find(match); return row ? { ...row } : null; }, async all() { return state[name].filter(match).map(r => ({ ...r })); },
        async update(data) { if (race) return null; const row = state[name].find(match); if (!row) return null; Object.assign(row, data, { updatedAt: `2026-09-25T18:00:${String(tick++).padStart(2, "0")}.000Z` }); return { ...row }; } };
    },
    async create(data) { if (fail && name === "Activity" && state.Activity.length + 1 >= failAt) throw new Error("History unavailable"); const row = { id: state[name].length + 100, createdAt: now.toISOString(), updatedAt: stamp, ...data }; state[name].push(row); return row; },
  };
  const db = { orm, async transaction(fn) { const before = structuredClone(state); try { return await fn({ orm }); } catch (e) { state = before; throw e; } } };
  const actions = load("app/outreach-actions.ts", { "@/src/prisma/db": { db }, "@/src/crm-input": input, "@/src/command-center": center, "@/src/follow-up": dates, "next/cache": { revalidatePath() {} } });
  const taskActions = load("app/actions.ts", { "@/src/prisma/db": { db }, "@/src/crm-input": input, "next/cache": { revalidatePath() {} }, "next/navigation": { redirect() { throw new Error("REDIRECT"); } } });
  return { actions, taskActions, get state() { return state; }, fail(after = 1) { fail = true; failAt = after; }, race() { race = true; },
    form(values = {}) { return form({ propertyId: 1, contactId: 2, updatedAt: state.Property[0].updatedAt, result: "CALL", followUpMode: "unchanged", ...values }); } };
}
test("temperature supports Hot/Warm/Cold and rejects malformed values", () => {
  for (const v of ["HOT", "WARM", "COLD"]) assert.equal(center.temperature(v), v);
  for (const v of ["hot", "", "URGENT", "toString"]) assert.throws(() => center.temperature(v));
});
test("temperature mutation persists and repeated no-op saves remain quiet", async () => {
  const f = fixture();
  for (const value of ["WARM", "COLD", "HOT"]) { assert.ok((await f.actions.changeTemperature(form({ id: 1, updatedAt: f.state.Property[0].updatedAt, temperature: value }))).success); assert.equal(f.state.Property[0].temperature, value); }
  await f.actions.changeTemperature(form({ id: 1, updatedAt: f.state.Property[0].updatedAt, temperature: "HOT" }));
  assert.equal(f.state.Activity.length, 3);
  assert.ok((await f.actions.changeTemperature(form({ id: 1, updatedAt: stamp, temperature: "INVALID" }))).error);
});
test("every supported contact result accepts an optional empty note", async () => {
  for (const result of Object.keys(center.contactTypes)) {
    const f = fixture(); assert.ok((await f.actions.logContact(f.form({ result }))).success);
    assert.equal(f.state.Activity[0].type, "OUTREACH_" + result); assert.equal(f.state.Activity[0].propertyId, 1); assert.equal(f.state.Activity[0].contactId, 2);
    assert.equal(f.state.Activity[0].createdAt, now.toISOString());
  }
});
test("property-only, contact-only, and joint outreach keep existing relationships", async () => {
  for (const fields of [{ contactId: "" }, { propertyId: "", updatedAt: stamp }, {}]) {
    const f = fixture(); assert.ok((await f.actions.logContact(f.form(fields))).success); assert.equal(f.state.PropertyContact.length, 1);
    assert.equal(f.state.Activity[0].propertyId, fields.propertyId === "" ? null : 1); assert.equal(f.state.Activity[0].contactId, fields.contactId === "" ? null : 2);
  }
});
test("unlinked or missing contacts/properties cannot be logged together", async () => {
  for (const values of [{ contactId: 999 }, { propertyId: 999 }, { contactId: "", propertyId: "" }]) {
    const f = fixture(); assert.ok((await f.actions.logContact(f.form(values))).error); assert.equal(f.state.Activity.length, 0);
  }
  const f = fixture(); f.state.PropertyContact = [];
  assert.ok((await f.actions.logContact(f.form())).error); assert.equal(f.state.Activity.length, 0); assert.equal(f.state.PropertyContact.length, 0);
});
test("invalid IDs, outcomes and oversized notes never mutate", async () => {
  for (const values of [{ propertyId: "1e0" }, { contactId: "-2" }, { result: "BOGUS" }, { note: "x".repeat(4001) }, { followUpMode: "bad" }]) {
    const f = fixture(), before = JSON.stringify(f.state); assert.ok((await f.actions.logContact(f.form(values))).error); assert.equal(JSON.stringify(f.state), before);
  }
});
test("contact timestamps reject rollover, malformed and future times", () => {
  assert.equal(center.contactTime("2026-09-24T13:45", now), "2026-09-24T13:45:00.000Z");
  for (const time of ["2026-02-30T13:45", "2026-09-25T25:01", "2026-09-26T01:00", "tomorrow"]) assert.throws(() => center.contactTime(time, now));
});
test("last contacted derives only from latest outreach time, including backdated logs", () => {
  const events = [event(), event({ id: 2, createdAt: "2026-09-20T18:00:00Z" }), event({ id: 3, type: "PROPERTY_UPDATED", createdAt: now.toISOString() })];
  assert.equal(center.latestContact(events).id, 1); assert.equal(center.latestContact([]), null); assert.equal(center.lastContactLabel(null), "Never contacted");
  assert.equal(center.lastContactLabel(event({ createdAt: now.toISOString() }), "2026-09-25"), "Today");
});
test("logging and rescheduling property follow-up are one save without creating tasks", async () => {
  const f = fixture(); assert.ok((await f.actions.logContact(f.form({ note: "Call tomorrow", followUpMode: "schedule", dueDate: "2026-09-26", nextAction: "Call seller" }))).success);
  assert.equal(f.state.Property[0].nextActionDate, "2026-09-26T12:00:00.000Z"); assert.equal(f.state.Task.length, 0); assert.equal(f.state.Activity.length, 2);
  const view = center.commandCenter(f.state.Property, f.state.Contact, [], f.state.Activity, f.state.PropertyContact, now);
  assert.equal(view.overdue.length, 0); assert.equal(view.upcoming.length, 1); assert.equal(view.upcoming[0].contact.id, 2);
});
test("invalid follow-up dates or missing next action roll back entire outreach", async () => {
  for (const values of [{ dueDate: "2026-02-30", nextAction: "Call" }, { dueDate: "2026-09-26", nextAction: "" }, { dueDate: "", nextAction: "Call" }]) {
    const f = fixture(), before = JSON.stringify(f.state); assert.ok((await f.actions.logContact(f.form({ followUpMode: "schedule", ...values }))).error); assert.equal(JSON.stringify(f.state), before);
  }
});
test("contact-only next follow-up uses existing Tasks and reschedules the selected task", async () => {
  const f = fixture(); await f.actions.logContact(f.form({ propertyId: "", followUpMode: "schedule", dueDate: "2026-09-26", nextAction: "Text seller" }));
  assert.equal(f.state.Task.length, 1); assert.equal(f.state.Task[0].contactId, 2); assert.equal(f.state.Task[0].propertyId, null);
  const task = f.state.Task[0];
  assert.ok((await f.actions.logContact(f.form({ propertyId: "", updatedAt: f.state.Contact[0].updatedAt, followUpMode: "schedule", taskChoice: `${task.id}|${task.updatedAt}`, dueDate: "2026-09-28", nextAction: "Call seller" }))).success);
  assert.equal(f.state.Task.length, 1); assert.equal(f.state.Task[0].dueDate, "2026-09-28T12:00:00.000Z");
});
test("contact task completion removes it from follow-up queues", async () => {
  const f = fixture(); f.state.Task.push({ id: 3, title: "Call", status: "PENDING", contactId: 2, propertyId: null, dueDate: "2026-09-24", updatedAt: stamp });
  assert.ok((await f.actions.logContact(f.form({ propertyId: "", followUpMode: "complete", taskChoice: `3|${stamp}` }))).success);
  assert.equal(f.state.Task[0].status, "COMPLETED"); assert.equal(center.commandCenter([], f.state.Contact, f.state.Task, f.state.Activity, [], now).overdue.length, 0);
});
test("unrelated, stale or completed tasks cannot be changed by outreach", async () => {
  for (const override of [{ contactId: 99 }, { updatedAt: "old" }, { status: "COMPLETED" }, { propertyId: 1 }]) {
    const f = fixture(); f.state.Task.push({ id: 3, title: "Call", status: "PENDING", contactId: 2, propertyId: null, dueDate: "2026-09-24", updatedAt: stamp, ...override });
    const before = JSON.stringify(f.state); assert.ok((await f.actions.logContact(f.form({ propertyId: "", followUpMode: "complete", taskChoice: `3|${stamp}` }))).error); assert.equal(JSON.stringify(f.state), before);
  }
});
test("property follow-up completion clears the existing next action and is idempotent", async () => {
  const f = fixture(); await f.actions.completePropertyFollowUp(form({ id: 1, updatedAt: stamp }));
  assert.equal(f.state.Property[0].nextActionDate, null); assert.equal(f.state.Property[0].nextAction, null);
  await f.actions.completePropertyFollowUp(form({ id: 1, updatedAt: f.state.Property[0].updatedAt })); assert.equal(f.state.Activity.length, 1);
});
test("duplicate and concurrent outreach submissions are rejected", async () => {
  const f = fixture(), request = f.form(); await f.actions.logContact(request); assert.ok((await f.actions.logContact(request)).error); assert.equal(f.state.Activity.length, 1);
  const g = fixture(); g.race(); assert.ok((await g.actions.logContact(g.form())).error); assert.equal(g.state.Activity.length, 0);
});
test("activity failure rolls back temperature, completion and combined outreach", async () => {
  for (const action of ["changeTemperature", "completePropertyFollowUp", "logContact"]) {
    const f = fixture(), before = JSON.stringify(f.state); f.fail();
    assert.ok((await f.actions[action](f.form({ id: 1, temperature: "WARM", followUpMode: "schedule", dueDate: "2026-09-28", nextAction: "Call again" }))).error);
    assert.equal(JSON.stringify(f.state), before);
  }
});
test("today/overdue/upcoming queues exclude completed tasks and inactive leads", () => {
  const tasks = [23, 25, 27].map((day, i) => ({ id: i, title: "Call", dueDate: `2026-09-${day}`, status: "PENDING", propertyId: null, contactId: 2, updatedAt: stamp }));
  tasks.push({ ...tasks[0], id: 4, status: "COMPLETED" });
  const view = center.commandCenter([{ ...lead, status: "CLOSED" }], [person], tasks, [], [], now);
  assert.equal(view.overdue.length, 1); assert.equal(view.dueToday.length, 1); assert.equal(view.upcoming.length, 1); assert.equal(view.hot.length, 0);
});
test("Hot lead attention reasons identify overdue, missing future follow-up and stale contact", () => {
  const reasons = center.attentionReasons(lead, ["2026-09-23"], event({ createdAt: "2026-09-18T18:00:00Z" }), "2026-09-25");
  assert.equal(reasons.length, 3); assert.match(reasons[0], /2 days overdue/); assert.match(reasons[1], /no next follow-up/); assert.match(reasons[2], /7 days/);
});
test("missing schedules are never labeled overdue; today's follow-up counts as planned", () => {
  assert.equal(center.attentionReasons(lead, [], null, "2026-09-25").some(r => r.includes("overdue")), false);
  assert.equal(center.attentionReasons(lead, ["2026-09-25"], event(), "2026-09-25").length, 0);
  for (const temperature of [null, "COLD", "WARM"]) assert.equal(center.attentionReasons({ ...lead, temperature }, [], null, "2026-09-25").length, 0);
});
test("recent outreach window and Central midnight are deterministic", () => {
  const view = center.commandCenter([], [], [], [event({ id: 1, createdAt: "2026-09-12T18:00:00Z" }), event({ id: 2, createdAt: "2026-09-11T18:00:00Z" }), event({ id: 3, type: "TEMPERATURE_CHANGED" })], [], now);
  assert.equal(view.recent.length, 1); assert.equal(view.recent[0].id, 1);
  assert.equal(center.commandCenter([], [], [], [], [], new Date("2026-09-25T04:59:00Z")).today, "2026-09-24");
});
test("Phase 4 migration adds only nullable temperature and its constraint", () => {
  const dir = fs.readdirSync("migrations/app").find(name => name.endsWith("_phase4_temperature"));
  const ops = fs.readFileSync(`migrations/app/${dir}/ops.json`, "utf8");
  assert.match(ops, /temperature/); assert.doesNotMatch(ops, /dropColumn|dropTable|deleteRow|createTable/);
  const manifest = fs.readFileSync(`migrations/app/${dir}/migration.json`, "utf8"); assert.match(manifest, /d56c37e38e845834ccb327c5872eb9bf43cd7f3ecaf8277c4fc788392822a2cc/);
});

test("late history failure rolls back an already-inserted outreach and contact task", async () => {
  const f = fixture(), before = JSON.stringify(f.state); f.fail(2);
  assert.ok((await f.actions.logContact(f.form({ propertyId: "", followUpMode: "schedule", dueDate: "2026-09-28", nextAction: "Call again" }))).error);
  assert.equal(JSON.stringify(f.state), before);
});
test("schedule contact association can change without changing the existing date", async () => {
  const f = fixture(); f.state.Activity.push(event({ type: "FOLLOW_UP_UPDATED", contactId: null }));
  assert.ok((await f.actions.logContact(f.form({ followUpMode: "schedule", dueDate: "2026-09-24", nextAction: "Call seller" }))).success);
  assert.equal(f.state.Activity.at(-1).type, "FOLLOW_UP_UPDATED"); assert.equal(f.state.Activity.at(-1).contactId, 2);
});
test("logging a past conversation preserves its note and does not move last contact backward", async () => {
  const f = fixture(); f.state.Activity.push(event());
  assert.ok((await f.actions.logContact(f.form({ result: "CONVERSATION", note: "Seller wants $145,000", occurredAt: "2026-09-20T12:00" }))).success);
  assert.match(f.state.Activity.at(-1).description, /Seller wants \$145,000/);
  assert.equal(center.latestContact(f.state.Activity).id, 1);
});
test("property reschedule can explicitly complete an existing task without duplicating it", async () => {
  const f = fixture(); f.state.Task.push({ id: 3, title: "Call", status: "PENDING", contactId: 2, propertyId: 1, dueDate: "2026-09-24", updatedAt: stamp });
  assert.ok((await f.actions.logContact(f.form({ taskChoice: `3|${stamp}`, followUpMode: "schedule", dueDate: "2026-09-28", nextAction: "Call again" }))).success);
  assert.equal(f.state.Task.length, 1); assert.equal(f.state.Task[0].status, "COMPLETED");
  const view = center.commandCenter(f.state.Property, f.state.Contact, f.state.Task, f.state.Activity, f.state.PropertyContact, now);
  assert.equal(view.overdue.length, 0); assert.equal(view.upcoming.length, 1);
});

test("an older queue or task editor cannot complete or overwrite a rescheduled task", async () => {
  const f = fixture(); f.state.Task.push({ id: 3, title: "Call", status: "PENDING", propertyId: 1, contactId: 2, dueDate: "2026-09-28", updatedAt: "2026-09-25T13:00:00Z" });
  await assert.rejects(f.taskActions.setTaskStatus(form({ id: 3, updatedAt: stamp, status: "COMPLETED" })), /changed/);
  await assert.rejects(f.taskActions.updateTask(form({ id: 3, updatedAt: stamp, title: "Old title", status: "PENDING", dueDate: "2026-09-24" })), /changed/);
  assert.equal(f.state.Task[0].status, "PENDING"); assert.equal(f.state.Task[0].dueDate, "2026-09-28"); assert.equal(f.state.Activity.length, 0);
});
test("task rescheduling produces history and a repeated save adds no duplicate event", async () => {
  const f = fixture(); f.state.Task.push({ id: 3, title: "Call", description: null, status: "PENDING", propertyId: 1, contactId: 2, dueDate: "2026-09-24T12:00:00.000Z", updatedAt: stamp });
  const fields = { id: 3, title: "Call", status: "PENDING", propertyId: 1, contactId: 2, dueDate: "2026-09-28" };
  await assert.rejects(f.taskActions.updateTask(form({ ...fields, updatedAt: stamp })), /REDIRECT/);
  assert.equal(f.state.Activity[0].type, "TASK_UPDATED"); assert.equal(f.state.Task[0].dueDate, "2026-09-28T12:00:00.000Z");
  await assert.rejects(f.taskActions.updateTask(form({ ...fields, updatedAt: f.state.Task[0].updatedAt })), /REDIRECT/);
  assert.equal(f.state.Activity.length, 1);
});
