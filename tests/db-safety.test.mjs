import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(path, imports = {}) {
  const source = ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => {
    if (!(name in imports)) throw new Error("Unexpected import: " + name);
    return imports[name];
  } }, { filename: path });
  return exports;
}

test("safeDbQuery returns fallback and redacts secrets in logs", async () => {
  const safety = load("src/db-safety.ts");
  const originalError = console.error;
  let text = "";
  console.error = (...args) => {
    text = args.join(" ");
  };

  try {
    const result = await safety.safeDbQuery(
      "dashboard command center",
      async () => {
        throw new Error("Invalid DATABASE_URL=postgresql://user:secret@db.example.com/app and the table does not exist.");
      },
      { ok: false },
    );

    assert.deepEqual(result, { ok: false });
    assert.ok(text.includes("dashboard command center"));
    assert.ok(!text.includes("secret"));
    assert.ok(!text.includes("db.example.com"));
    assert.ok(text.includes("[REDACTED]"));
  } finally {
    console.error = originalError;
  }
});
