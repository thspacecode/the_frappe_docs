import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const app = new URL("../../the_frappe_docs/", import.meta.url);
const page = readFileSync(new URL("www/docs.html", app), "utf8");
assert.ok(page.startsWith("{% raw %}"));
assert.ok(page.endsWith("{% endraw %}"));
const assets = [
  ...page.matchAll(
    /(?:src|href)="(\/assets\/the_frappe_docs\/frontend\/[^"?#]+)"/g
  ),
];
assert.ok(assets.length > 0, "SPA must reference built assets");
for (const [, asset] of assets) {
  assert.ok(
    existsSync(
      new URL(asset.replace("/assets/the_frappe_docs/", "public/"), app)
    ),
    `Missing asset: ${asset}`
  );
}
assert.ok(
  page.includes('"basename":"/docs"'),
  "Router must use the Frappe mount path"
);
console.log("Frappe page, asset paths, and router basename passed.");
