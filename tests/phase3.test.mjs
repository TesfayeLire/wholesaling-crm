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
const analysis = load("src/deal-analysis.ts");
const dates = load("src/follow-up.ts");
const readiness = load("src/deal-readiness.ts", { "./deal-analysis": analysis, "./follow-up": dates });
const input = load("src/crm-input.ts");
const pipeline = load("src/pipeline.ts");
const complete = { askingPrice: "120000", arv: "200000", repairEstimate: "30000", assignmentFee: "10000", buyerPercentage: "70",
  sellerMotivation: "Relocating", nextAction: "Call seller", nextActionDate: "2026-10-01T12:00:00.000Z", status: "NEW_LEAD" };
function form(values) { const f = new FormData(); for (const [key, value] of Object.entries(values)) f.set(key, value ?? ""); return f; }

test("MAO example and asking difference", () => {
  const result = analysis.calculateAnalysis(complete);
  assert.equal(result.mao, "100000.00"); assert.equal(result.difference, "20000.00"); assert.equal(result.position, "above");
});
test("fractional percentages are percentages, not multipliers", () => {
  assert.equal(analysis.calculateAnalysis({ ...complete, buyerPercentage: "70.25" }).mao, "100500.00");
  assert.equal(analysis.calculateAnalysis({ ...complete, buyerPercentage: "0.5" }).mao, "-39000.00");
});
test("money beyond the safe JS integer boundary remains exact", () => {
  const result = analysis.calculateAnalysis({ ...complete, arv: "9007199254740993.12", buyerPercentage: "100", repairEstimate: "0.01", assignmentFee: "0.01", askingPrice: "9007199254740993.11" });
  assert.equal(result.mao, "9007199254740993.10"); assert.equal(result.difference, "0.01");
  assert.equal(analysis.formatMoney(result.mao), "$9,007,199,254,740,993.10");
});
test("decimal calculation avoids the 0.1 + 0.2 error", () => {
  assert.equal(analysis.calculateAnalysis({ ...complete, arv: "0.30", buyerPercentage: "100", repairEstimate: "0.10", assignmentFee: "0.20" }).mao, "0.00");
});
test("round once to cents, half away from zero, including negative MAO", () => {
  assert.equal(analysis.calculateAnalysis({ ...complete, arv: "0.01", buyerPercentage: "50", repairEstimate: "0", assignmentFee: "0" }).mao, "0.01");
  assert.equal(analysis.calculateAnalysis({ ...complete, arv: "0.01", buyerPercentage: "50", repairEstimate: "0.01", assignmentFee: "0" }).mao, "-0.01");
});
test("below and equal comparisons do not classify investment quality", () => {
  assert.equal(analysis.calculateAnalysis({ ...complete, askingPrice: "90000" }).position, "below");
  assert.equal(analysis.calculateAnalysis({ ...complete, askingPrice: "100000" }).position, "equal");
});
test("incomplete analysis stays unknown; missing asking does not hide MAO", () => {
  for (const key of ["arv", "repairEstimate", "assignmentFee", "buyerPercentage"]) assert.equal(analysis.calculateAnalysis({ ...complete, [key]: null }), null);
  const result = analysis.calculateAnalysis({ ...complete, askingPrice: null }); assert.equal(result.mao, "100000.00"); assert.equal(result.difference, null);
});
test("money and percentage validation rejects malformed, negative and unsupported values", () => {
  for (const value of ["-1", "1e5", "Infinity", "NaN", "1,000", "0.001", "0x10"]) assert.throws(() => analysis.analysisMoney(value));
  for (const value of ["0", "100.01", "-70", "70%", "70.123"]) assert.throws(() => analysis.percentage(value));
  assert.equal(analysis.percentage("100"), "100"); assert.equal(analysis.percentage("0.01"), "0.01");
  assert.equal(analysis.analysisMoney(" 001.200 "), "1.2"); assert.equal(analysis.analysisMoney(""), null);
});
test("overdue, today, upcoming and missing calendar dates", () => {
  assert.equal(dates.followUpStatus("2026-09-24T12:00:00Z", "2026-09-25"), "Overdue");
  assert.equal(dates.followUpStatus("2026-09-25T12:00:00Z", "2026-09-25"), "Due today");
  assert.equal(dates.followUpStatus("2026-09-26T12:00:00Z", "2026-09-25"), "Upcoming");
  assert.equal(dates.followUpStatus(null, "2026-09-25"), "No follow-up scheduled");
});
test("Central Time date boundaries and DST are deterministic", () => {
  assert.equal(dates.todayDate(new Date("2026-09-25T04:59:00Z")), "2026-09-24");
  assert.equal(dates.todayDate(new Date("2026-09-25T05:00:00Z")), "2026-09-25");
  assert.equal(dates.todayDate(new Date("2026-03-08T07:59:00Z")), "2026-03-08");
  assert.equal(dates.todayDate(new Date("2026-11-01T07:01:00Z")), "2026-11-01");
  assert.equal(dates.displayDate("2026-09-25T12:00:00Z"), "09/25/2026");
});
test("attention priority keeps dead and closed out and unscheduled last", () => {
  const ordered = dates.attentionOrder([
    { id: 1, status: "NEW_LEAD", nextActionDate: null },
    { id: 2, status: "NEW_LEAD", nextActionDate: "2026-09-27" },
    { id: 3, status: "NEW_LEAD", nextActionDate: "2026-09-25" },
    { id: 4, status: "NEW_LEAD", nextActionDate: "2026-09-23" },
    { id: 5, status: "DEAD", nextActionDate: "2026-09-01" },
    { id: 6, status: "CLOSED", nextActionDate: "2026-09-01" },
  ]);
  assert.equal(ordered.map(p => p.id).join(","), "4,3,2,1");
});
test("readiness distinguishes zero from missing and flags missing motivation and schedule", () => {
  assert.equal(readiness.dealReadiness({ ...complete, repairEstimate: "0" }).every(item => item.ready), true);
  const rows = readiness.dealReadiness({ ...complete, repairEstimate: null, sellerMotivation: " ", nextActionDate: null });
  assert.equal(rows.filter(item => !item.ready).map(item => item.key).join(","), "repairs,motivation,followUp");
});
test("recommendation priority is deterministic and due follow-up takes priority", () => {
  const today = "2026-09-25";
  assert.match(readiness.recommendedAction({ ...complete, askingPrice: null }, today), /asking price/);
  assert.match(readiness.recommendedAction({ ...complete, arv: null }, today), /comparable/);
  assert.match(readiness.recommendedAction({ ...complete, repairEstimate: null }, today), /repairs/);
  assert.match(readiness.recommendedAction({ ...complete, sellerMotivation: null }, today), /motivation/);
  assert.match(readiness.recommendedAction({ ...complete, assignmentFee: null }, today), /inputs/);
  assert.match(readiness.recommendedAction({ ...complete, nextActionDate: null }, today), /Schedule/);
  assert.equal(readiness.recommendedAction(complete, today), "Review deal analysis.");
  assert.equal(readiness.recommendedAction({ ...complete, arv: null, nextActionDate: today }, today), "Call seller");
  assert.match(readiness.recommendedAction({ ...complete, status: "DEAD" }, today), /No active/);
});
test("pipeline compatibility maps labels without changing stored values", () => {
  assert.equal(pipeline.stageLabels.NURTURE, "Follow-Up");
  assert.equal(pipeline.stageLabels.DISPOSITION, "Marketing to Buyers");
  assert.equal(pipeline.stageLabels.CLOSED, "Assigned / Closed");
  assert.ok(pipeline.allStages.includes("QUALIFIED")); assert.ok(pipeline.allStages.includes("NEGOTIATING"));
  assert.equal(pipeline.workflowStages.includes("DEAD"), false);
});

function fixture() {
  let rows = [{ id: 1, ...complete, notes: "Existing note", estimatedValue: "155000", updatedAt: "2026-09-25T01:00:00.000Z" }];
  let events = [], fail = false, race = false, tick = 1;
  const db = { orm: { public: {
    Property: { where(filter) {
      const matches = row => Object.entries(filter).every(([key, value]) => row[key] === value);
      return { async first() { return rows.find(matches) ? { ...rows.find(matches) } : null; },
        async update(data) {
          if (race) return null;
          const row = rows.find(matches); if (!row) return null;
          Object.assign(row, data, { updatedAt: "2026-09-25T01:00:" + String(tick++).padStart(2, "0") + ".000Z" }); return { ...row };
        } };
    } },
    Activity: { async create(data) { if (fail) throw new Error("Failed activity"); events.push({ ...data }); } },
  } }, async transaction(callback) {
    const before = structuredClone({ rows, events });
    try { return await callback({ orm: this.orm }); } catch (error) { rows = before.rows; events = before.events; throw error; }
  } };
  const actions = load("app/property-workflow-actions.ts", {
    "@/src/prisma/db": { db }, "@/src/deal-analysis": analysis, "@/src/follow-up": dates, "@/src/crm-input": input, "next/cache": { revalidatePath() {} },
  });
  return { actions, get row() { return rows[0]; }, get events() { return events; }, failHistory() { fail = true; }, race() { race = true; },
    form(data) { return form({ id: 1, updatedAt: rows[0].updatedAt, ...data }); } };
}
test("analysis creation, reread and editing persist on the same property", async () => {
  const f = fixture();
  assert.ok((await f.actions.saveAnalysis(f.form({ askingPrice: "125000", arv: "210000", repairEstimate: "30000", assignmentFee: "11000", buyerPercentage: "70" }))).success);
  assert.equal(f.row.id, 1); assert.equal(f.row.estimatedValue, "155000");
  assert.equal(analysis.calculateAnalysis(f.row).mao, "106000.00");
  await f.actions.saveAnalysis(f.form({ ...f.row, arv: "220000" }));
  assert.equal(analysis.calculateAnalysis(f.row).mao, "113000.00"); assert.equal(f.events.length, 2);
});
test("incomplete analysis can be saved without inventing values", async () => {
  const f = fixture();
  await f.actions.saveAnalysis(f.form({ arv: "200000", buyerPercentage: "" }));
  assert.equal(f.row.buyerPercentage, null); assert.equal(f.row.assignmentFee, null); assert.equal(analysis.calculateAnalysis(f.row), null);
});
test("numeric equivalents do not create activity for no-op analysis saves", async () => {
  const f = fixture(), stamp = f.row.updatedAt;
  await f.actions.saveAnalysis(f.form({ ...complete, buyerPercentage: "70.00", arv: "200000.00" }));
  assert.equal(f.events.length, 0); assert.equal(f.row.updatedAt, stamp);
});
test("invalid analysis and invalid IDs cannot mutate records", async () => {
  const f = fixture();
  assert.ok((await f.actions.saveAnalysis(f.form({ ...complete, buyerPercentage: "101" }))).error);
  assert.ok((await f.actions.saveAnalysis(f.form({ ...complete, askingPrice: "-1" }))).error);
  assert.ok((await f.actions.saveAnalysis(f.form({ ...complete, id: "1e0" }))).error);
  assert.equal(f.row.askingPrice, "120000"); assert.equal(f.events.length, 0);
});
test("follow-up creation, reread and edit use existing property fields", async () => {
  const f = fixture();
  await f.actions.saveFollowUp(f.form({ nextAction: "Research comps", nextActionDate: "2026-09-25" }));
  assert.equal(f.row.nextActionDate, "2026-09-25T12:00:00.000Z");
  assert.equal(dates.followUpStatus(f.row.nextActionDate, "2026-09-25"), "Due today");
  await f.actions.saveFollowUp(f.form({ nextAction: "Call agent", nextActionDate: "2026-09-28" }));
  assert.equal(f.row.nextAction, "Call agent"); assert.equal(f.events.length, 2); assert.equal(f.events[0].type, "FOLLOW_UP_UPDATED");
});
test("clearing follow-up keeps unscheduled next action and creates one activity", async () => {
  const f = fixture();
  await f.actions.saveFollowUp(f.form({ nextAction: "Research later", nextActionDate: "" }));
  assert.equal(f.row.nextActionDate, null); assert.equal(f.row.nextAction, "Research later"); assert.equal(f.events.length, 1);
});
test("no-op date saves and impossible dates do not write activity", async () => {
  const f = fixture();
  await f.actions.saveFollowUp(f.form({ nextAction: "Call seller", nextActionDate: "2026-10-01" }));
  assert.equal(f.events.length, 0);
  assert.ok((await f.actions.saveFollowUp(f.form({ nextAction: "Call", nextActionDate: "2026-02-30" }))).error);
  assert.ok((await f.actions.saveFollowUp(f.form({ nextAction: "", nextActionDate: "2026-10-02" }))).error);
  assert.equal(f.events.length, 0);
});
test("motivation updates readiness and only meaningful changes create history", async () => {
  const f = fixture();
  await f.actions.saveMotivation(f.form({ sellerMotivation: "" }));
  assert.equal(readiness.dealReadiness(f.row).find(item => item.key === "motivation").ready, false);
  await f.actions.saveMotivation(f.form({ sellerMotivation: "Relocating soon" }));
  await f.actions.saveMotivation(f.form({ sellerMotivation: "Relocating soon" }));
  assert.equal(f.events.length, 2);
});
test("new notes append without replacing existing notes; duplicate stale submit is rejected", async () => {
  const f = fixture(), request = f.form({ note: "Asked for photos" });
  await f.actions.addPropertyNote(request);
  assert.equal(f.row.notes, "Existing note\n\nAsked for photos");
  assert.ok((await f.actions.addPropertyNote(request)).error); assert.equal(f.events.length, 1);
});
test("all pipeline transitions persist and no-op stage creates no activity", async () => {
  const f = fixture();
  for (const status of pipeline.allStages) {
    const before = f.row.status, count = f.events.length;
    await f.actions.changePropertyStage(f.form({ status }));
    assert.equal(f.row.status, status); assert.equal(f.events.length, count + (status === before ? 0 : 1));
  }
  const count = f.events.length;
  await f.actions.changePropertyStage(f.form({ status: f.row.status }));
  assert.equal(f.events.length, count);
});
test("stale and concurrently changed records are never silently overwritten", async () => {
  const f = fixture(), request = f.form({ ...complete, arv: "999999" });
  await f.actions.saveMotivation(f.form({ sellerMotivation: "New information" }));
  assert.ok((await f.actions.saveAnalysis(request)).error); assert.equal(f.row.arv, "200000");
  f.race(); assert.ok((await f.actions.saveAnalysis(f.form({ ...complete, arv: "999999" })) ).error); assert.equal(f.row.arv, "200000");
});
test("activity failure rolls back analysis, follow-up and note mutations", async () => {
  for (const [action, fields] of [
    ["saveAnalysis", { ...complete, arv: "300000" }], ["saveFollowUp", { nextAction: "New", nextActionDate: "2026-10-03" }], ["addPropertyNote", { note: "New" }],
  ]) {
    const f = fixture(), before = JSON.stringify(f.row); f.failHistory();
    assert.ok((await f.actions[action](f.form(fields))).error);
    assert.equal(JSON.stringify(f.row), before); assert.equal(f.events.length, 0);
  }
});
test("Phase 3 migration is additive only and preserves the Phase 2 contract and enum", () => {
  const dirs = fs.readdirSync("migrations/app");
  const dir = dirs.find(name => name.endsWith("_phase3_analysis"));
  const manifest = JSON.parse(fs.readFileSync("migrations/app/" + dir + "/migration.json"));
  const ops = fs.readFileSync("migrations/app/" + dir + "/ops.json", "utf8");
  assert.ok(JSON.stringify(manifest).includes("696f21a97624edcb948faa618e84d7d9e248eeb7675c1ffa795145d541876b14"));
  assert.ok(!/dropColumn|dropTable|deleteRow|alterEnum/.test(ops));
  for (const column of ["arv", "assignmentFee", "buyerPercentage", "sellerMotivation"]) assert.ok(ops.includes(column));
});
