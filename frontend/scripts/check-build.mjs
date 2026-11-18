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
    const desk = readFileSync(new URL("assets/desk/desk.js", client), "utf8");
    assert.match(desk, /mount/);
    const styles = readFileSync(
      new URL("assets/desk/desk.css", client),
      "utf8"
    );
    assert.ok(
      styles.includes(":host"),
      "Desk styles must target the shadow host"
    );
    assert.ok(
      !/(^|[},])\s*:root\s*[{,]/m.test(styles),
      "Root styles must stay in Shadow DOM"
    );
    assert.ok(
      !existsSync(new URL("index.html", client)),
      "No standalone shell"
    );
    assert.ok(!desk.includes(`/docs/${slug}/assets/`));
    for (const match of styles.matchAll(/url\(["']?([^)'" ]+)/g)) {
      const url = match[1];
      if (url.startsWith("data:")) continue;
      const asset = url.startsWith(`/docs-assets/${slug}/`)
        ? url.slice(`/docs-assets/${slug}/`.length)
        : `assets/desk/${url}`;
      assert.ok(existsSync(new URL(asset, client)), `Missing asset: ${asset}`);
    }
  }
}
console.log("Protected source output and asset paths passed.");
