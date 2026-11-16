import { cpSync, existsSync, rmSync } from "node:fs";

const upstream = new URL("../vendor/the-docs/docs/", import.meta.url);
const content = new URL("../.content/", import.meta.url);
if (!existsSync(upstream)) {
  throw new Error(
    "Missing The Docs source. Run git submodule update --init --recursive."
  );
}
rmSync(content, { recursive: true, force: true });
cpSync(upstream, content, { recursive: true });
