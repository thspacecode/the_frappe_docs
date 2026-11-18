import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const app = new URL("../../the_frappe_docs/", import.meta.url);
const output = new URL("private_build/", app);
assert.ok(
  !existsSync(new URL("public/frontend/", app)),
  "Source output must not be public"
);
for (const owner of readdirSync(output)) {
  for (const slug of readdirSync(new URL(`${owner}/`, output))) {
    const client = new URL(`${owner}/${slug}/client/`, output);
    const page = readFileSync(new URL("index.html", client), "utf8");
    const base = `/docs/${slug}`;
    assert.ok(page.includes(`"basename":"${base}"`));
    const assets = [...page.matchAll(/(?:src|href)="([^"?#]+)"/g)]
      .map((match) => match[1])
      .filter((url) => url.startsWith(`${base}/assets/`));
    assert.ok(assets.length > 0);
    for (const url of assets) {
      const asset = url.slice(base.length + 1);
      assert.ok(existsSync(new URL(asset, client)), `Missing asset: ${asset}`);
    }
  }
}
console.log("Protected source output and asset paths passed.");
