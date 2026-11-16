import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";

const frontend = fileURLToPath(new URL("../", import.meta.url));
const app = new URL("../../the_frappe_docs/", import.meta.url);
const python = process.env.PYTHON || "python3";
const sources = JSON.parse(
  execFileSync(
    python,
    [fileURLToPath(new URL("./discover-sources.py", import.meta.url))],
    { encoding: "utf8" }
  )
);
const staging = new URL("private_build.next/", app);
const output = new URL("private_build/", app);
// Remove assets left by the old public-content build.
rmSync(new URL("public/frontend/", app), { recursive: true, force: true });
rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });
for (const source of sources) {
  const content = new URL("../.content/", import.meta.url);
  rmSync(content, { recursive: true, force: true });
  cpSync(source.content_root, content, { recursive: true });
  const base = `/docs/source/${source.app}/${source.slug}`;
  execFileSync("npx", ["--no-install", "react-router", "build"], {
    cwd: frontend,
    stdio: "inherit",
    env: { ...process.env, THE_DOCS_SOURCE_BASE: base },
  });
  const target = new URL(`${source.app}/${source.slug}/`, staging);
  mkdirSync(target, { recursive: true });
  cpSync(
    new URL("../.build/client/", import.meta.url),
    new URL("client/", target),
    { recursive: true }
  );
  writeFileSync(
    new URL("source.json", target),
    JSON.stringify({ app: source.app, slug: source.slug, path: source.path })
  );
  if (!existsSync(new URL("client/index.html", target)))
    throw Error("Missing SPA shell");
}
rmSync(output, { recursive: true, force: true });
renameSync(staging, output);
console.log(`Built ${sources.length} protected documentation sources.`);
