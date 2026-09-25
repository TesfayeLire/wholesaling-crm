import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(path, imports = {}) {
  const source = ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, FormData, require: name => {
    if (!(name in imports)) throw new Error("Unexpected import: " + name);
    return imports[name];
  } }, { filename: path });
  return exports;
}
const input = load("src/crm-input.ts");
function form(data) {
  const result = new FormData();
  for (const [key, value] of Object.entries(data)) result.set(key, String(value));
  return result;
}
function fixture() {
  let data = {
    Property: [{ id: 1, address: "10 Oak St", status: "NEW_LEAD" }, { id: 2, address: "20 Pine St", status: "QUALIFIED" }],
    Contact: [{ id: 3, firstName: "Pat" }, { id: 4, firstName: "Alex" }],
    PropertyContact: [{ id: 5, propertyId: 1, contactId: 3, role: "Seller" }, { id: 6, propertyId: 2, contactId: 4, role: "Owner" }],
    Task: [{ id: 7, title: "Call seller", status: "PENDING", propertyId: 1, contactId: 3 }, { id: 8, title: "Research", status: "PENDING", propertyId: 2, contactId: 4 }],
    Activity: [{ id: 9, type: "NOTE", description: "Keep history", propertyId: 1, contactId: 3 }],
  };
  let failActivity = false;
  let failDelete = false;
  const collections = Object.fromEntries(Object.keys(data).map(model => [model, {
    where(filter) {
      assert.ok(Object.keys(filter).length, "Every mutation must be scoped");
      const matches = row => Object.entries(filter).every(([key, value]) => row[key] === value);
      return {
        async first() { return data[model].find(matches) ? { ...data[model].find(matches) } : null; },
        async update(values) { data[model].filter(matches).forEach(row => Object.assign(row, values)); },
        async delete() {
          if (failDelete && model === "Property") throw new Error("FK conflict");
          data[model] = data[model].filter(row => !matches(row));
        },
      };
    },
    async create(values) {
      if (model === "Activity" && failActivity) throw new Error("History unavailable");
      if (model === "PropertyContact" && data[model].some(row => row.propertyId === values.propertyId && row.contactId === values.contactId)) throw new Error("Duplicate");
      const row = { id: Math.max(0, ...data[model].map(row => row.id)) + 1, ...values };
      data[model].push(row);
      return row;
    },
  }]));
  const db = { orm: { public: collections }, async transaction(fn) {
    const before = structuredClone(data);
    try { return await fn({ orm: this.orm }); }
    catch (error) { data = before; throw error; }
  } };
  const refreshed = [];
  const actions = load("app/actions.ts", {
    "@/src/prisma/db": { db }, "@/src/crm-input": input,
    "next/cache": { revalidatePath: (...args) => refreshed.push(args) },
    "next/navigation": { redirect: path => { throw new Error("REDIRECT:" + path); } },
  });
  return { actions, get data() { return data; }, refreshed, failActivity() { failActivity = true; }, failDelete() { failDelete = true; } };
}

test("reject malformed IDs, invalid statuses and impossible dates", () => {
  for (const id of ["", "0", "-1", "1.5", "1x", "9007199254740992"]) assert.throws(() => input.recordId(id));
  assert.throws(() => input.pipelineStatus("INVALID"));
  assert.throws(() => input.taskStatus("DELETED"));
  assert.throws(() => input.optionalDate(form({ dueDate: "2026-02-30" }), "dueDate"));
  assert.equal(input.optionalDate(form({ dueDate: "" }), "dueDate"), null);
  assert.equal(input.optionalDate(form({ dueDate: "2028-02-29" }), "dueDate"), "2028-02-29T12:00:00.000Z");
});
test("money remains a precise string; optional fields clear to null", () => {
  const parsed = input.propertyInput(form({ address: "A", city: "B", state: "C", zipCode: "00123", askingPrice: "9007199254740993.12" }));
  assert.equal(parsed.askingPrice, "9007199254740993.12");
  assert.equal(parsed.zipCode, "00123");
  assert.equal(parsed.notes, null);
  assert.throws(() => input.propertyInput(form({ address: "A", city: "B", state: "C", zipCode: "1", askingPrice: "-1" })));
});
test("property deletion requires explicit confirmation", async () => {
  const f = fixture();
  await assert.rejects(f.actions.deleteProperty(form({ id: 1 })), /confirmation/);
  assert.equal(f.data.Property.length, 2);
});
test("property deletion preserves contacts, tasks, history and unrelated links", async () => {
  const f = fixture();
  await assert.rejects(f.actions.deleteProperty(form({ id: 1, confirm: "DELETE" })), /REDIRECT:\/properties/);
  assert.equal(f.data.Property.length, 1);
  assert.equal(f.data.Property[0].id, 2);
  assert.equal(f.data.Contact.length, 2);
  assert.equal(f.data.Task.length, 2);
  assert.equal(f.data.Task[0].propertyId, null);
  assert.equal(f.data.Task[0].contactId, 3);
  assert.equal(f.data.Activity[0].propertyId, null);
  assert.equal(f.data.Activity[0].contactId, 3);
  assert.equal(f.data.PropertyContact[0].id, 6);
});
test("failed final deletion rolls back all relationship cleanup", async () => {
  const f = fixture(); f.failDelete();
  await assert.rejects(f.actions.deleteProperty(form({ id: 1, confirm: "DELETE" })), /FK conflict/);
  assert.equal(f.data.Task[0].propertyId, 1);
  assert.equal(f.data.Activity[0].propertyId, 1);
  assert.equal(f.data.PropertyContact.length, 2);
  assert.equal(f.data.Property.length, 2);
});
test("contact deletion preserves properties and the other side of task/history links", async () => {
  const f = fixture();
  await assert.rejects(f.actions.deleteContact(form({ id: 3, confirm: "DELETE" })), /REDIRECT:\/contacts/);
  assert.equal(f.data.Property.length, 2);
  assert.equal(f.data.Contact[0].id, 4);
  assert.equal(f.data.Task[0].contactId, null);
  assert.equal(f.data.Task[0].propertyId, 1);
  assert.equal(f.data.Activity[0].propertyId, 1);
  assert.equal(f.data.PropertyContact[0].id, 6);
});
test("task completion/reopening writes related activity and repeated status is quiet", async () => {
  const f = fixture();
  await f.actions.setTaskStatus(form({ id: 7, status: "COMPLETED" }));
  await f.actions.setTaskStatus(form({ id: 7, status: "COMPLETED" }));
  assert.equal(f.data.Activity.length, 2);
  assert.equal(f.data.Activity[1].contactId, 3);
  assert.equal(f.data.Activity[1].propertyId, 1);
  await f.actions.setTaskStatus(form({ id: 7, status: "PENDING" }));
  assert.equal(f.data.Task[0].status, "PENDING");
  assert.match(f.data.Activity[2].description, /reopened/);
});
test("history failure rolls back task mutation", async () => {
  const f = fixture(); f.failActivity();
  await assert.rejects(f.actions.setTaskStatus(form({ id: 7, status: "COMPLETED" })), /History unavailable/);
  assert.equal(f.data.Task[0].status, "PENDING");
});
test("linking updates a role without inserting duplicates", async () => {
  const f = fixture();
  await assert.rejects(f.actions.linkContact(form({ propertyId: 1, contactId: 3, role: "Attorney" })), /REDIRECT/);
  assert.equal(f.data.PropertyContact.length, 2);
  assert.equal(f.data.PropertyContact[0].role, "Attorney");
  await assert.rejects(f.actions.linkContact(form({ propertyId: 1, contactId: 3, role: "Attorney" })), /REDIRECT/);
  assert.equal(f.data.Activity.length, 2);
});
test("new relationship appears once and history references both records", async () => {
  const f = fixture();
  await assert.rejects(f.actions.linkContact(form({ propertyId: 2, contactId: 3, role: "Agent", from: "contact" })), /REDIRECT:\/contacts\/3/);
  assert.equal(f.data.PropertyContact.length, 3);
  assert.equal(f.data.Activity[1].propertyId, 2);
  assert.equal(f.data.Activity[1].contactId, 3);
});
test("pipeline changes and property edits preserve identity and log stage transition", async () => {
  const f = fixture();
  await assert.rejects(f.actions.updatePropertyStatus(form({ propertyId: 1, status: "QUALIFIED" })), /REDIRECT/);
  await assert.rejects(f.actions.updateProperty(form({ id: 1, address: "11 Oak St", city: "Tulsa", state: "OK", zipCode: "74101", status: "UNDER_CONTRACT" })), /REDIRECT:\/properties\/1/);
  assert.equal(f.data.Property.length, 2);
  assert.equal(f.data.Property[0].id, 1);
  assert.equal(f.data.Property[0].address, "11 Oak St");
  assert.equal(f.data.Activity.filter(a => a.type === "PIPELINE_CHANGED").length, 2);
});
test("contact editing updates the existing ID and logs history", async () => {
  const f = fixture();
  await assert.rejects(f.actions.updateContact(form({ id: 3, firstName: "Pat", lastName: "Smith", email: "pat@example.com" })), /REDIRECT:\/contacts\/3/);
  assert.equal(f.data.Contact.length, 2);
  assert.equal(f.data.Contact[0].lastName, "Smith");
  assert.equal(f.data.Activity[1].contactId, 3);
});
test("task edit supports both relationships, clearing them, and no invented date", async () => {
  const f = fixture();
  await assert.rejects(f.actions.updateTask(form({ id: 7, title: "Updated", status: "PENDING", propertyId: 2, contactId: 4 })), /REDIRECT/);
  assert.equal(f.data.Task[0].propertyId, 2);
  assert.equal(f.data.Task[0].contactId, 4);
  await assert.rejects(f.actions.updateTask(form({ id: 7, title: "General", status: "PENDING" })), /REDIRECT/);
  assert.equal(f.data.Task[0].propertyId, null);
  assert.equal(f.data.Task[0].contactId, null);
  assert.equal(f.data.Task[0].dueDate, null);
});
test("invalid task relationship makes no changes", async () => {
  const f = fixture();
  await assert.rejects(f.actions.createTask(form({ title: "Bad reference", propertyId: 999 })), /no longer exists/);
  assert.equal(f.data.Task.length, 2);
});
test("task deletion confirms and deletes only the specified task", async () => {
  const f = fixture();
  await assert.rejects(f.actions.deleteTask(form({ id: 7 })), /confirmation/);
  await assert.rejects(f.actions.deleteTask(form({ id: 7, confirm: "DELETE" })), /REDIRECT/);
  assert.equal(f.data.Task.length, 1);
  assert.equal(f.data.Task[0].id, 8);
  assert.equal(f.data.Property.length, 2);
  assert.equal(f.data.Contact.length, 2);
});
