import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const app = new URL("../../the_frappe_docs/", import.meta.url);
const client = new URL("private_build/the_frappe_docs/the-docs/client/", app);
const page = readFileSync(new URL("index.html", client), "utf8");
assert.ok(
  !existsSync(new URL("public/frontend/", app)),
  "Source output must not be public"
);
assert.ok(page.includes('"basename":"/docs/source/the_frappe_docs/the-docs"'));
const assets = [
  ...page.matchAll(
    /(?:src|href)="\/docs\/source\/the_frappe_docs\/the-docs\/(assets\/[^"?#]+)"/g
  ),
];
assert.ok(assets.length > 0);
for (const [, asset] of assets)
  assert.ok(existsSync(new URL(asset, client)), `Missing asset: ${asset}`);
console.log("Protected source output and asset paths passed.");
