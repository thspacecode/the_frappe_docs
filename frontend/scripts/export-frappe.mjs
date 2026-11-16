import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";

const client = new URL("../.build/client/", import.meta.url);
const output = new URL(
  "../../the_frappe_docs/public/frontend/",
  import.meta.url
);
const www = new URL("../../the_frappe_docs/www/", import.meta.url);
rmSync(output, { recursive: true, force: true });
cpSync(client, output, { recursive: true });
mkdirSync(www, { recursive: true });
const html = readFileSync(new URL("index.html", client), "utf8");
writeFileSync(new URL("docs.html", www), `{% raw %}${html}{% endraw %}`);
