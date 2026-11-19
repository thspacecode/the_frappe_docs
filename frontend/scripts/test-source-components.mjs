import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { sourceComponents } from "./source-components.ts";

test("source registry reaches MDX components and permits local overrides", async () => {
  const root = mkdtempSync(join(tmpdir(), "docs-components-"));
  try {
    mkdirSync(join(root, "_components"));
    writeFileSync(join(root, "_components/index.ts"), "");
    const plugin = sourceComponents(root);
    const code = plugin.transform(
      "export const documents = [{ Component: props => props.components }];",
      "\0virtual:docs-content"
    );
    const load = new Function(
      "sourceComponents",
      "renderSourceDocument",
      code
        .replace("export const documents", "const documents")
        .replace(/^import .*;$/gm, "") + "\nreturn documents;"
    );
    const [document] = load(
      { AccountingLedger: "ledger" },
      (Component, props) => Component(props)
    );
    assert.equal(document.Component({}).AccountingLedger, "ledger");
    assert.equal(
      document.Component({ components: { AccountingLedger: "local" } })
        .AccountingLedger,
      "local"
    );
    assert.equal(plugin.transform("unchanged", "other-module"), undefined);
  } finally {
    rmSync(root, { recursive: true });
  }
});

test("sources without a registry keep the preset behavior", () => {
  assert.equal(
    sourceComponents("/missing-source").transform(
      "unchanged",
      "\0virtual:docs-content"
    ),
    undefined
  );
});
