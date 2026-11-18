import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "vite";
import { createDocsVitePlugins } from "@the-docs/core/build";
import { sourceComponentsPlugin } from "../source-components.ts";

async function render(directory) {
  const result = await build({
    configFile: false,
    logLevel: "silent",
    plugins: [
      ...createDocsVitePlugins({
        contentRoot: directory,
        mdx: {
          providerImportSource: new URL(
            "../app/mdx-components.ts",
            import.meta.url
          ).pathname,
        },
      }),
      sourceComponentsPlugin(directory),
    ],
    build: {
      ssr: join(directory, "index.mdx"),
      write: false,
      minify: false,
    },
  });
  const output = join(directory, `compiled.mjs`);
  await writeFile(output, result.output[0].code);
  const { default: Document } = await import(
    `${pathToFileURL(output).href}?build=${Date.now()}`
  );
  return renderToStaticMarkup(createElement(Document));
}

test(
  "renders import-free components and keeps source registries isolated",
  { timeout: 60000 },
  async () => {
    const directory = await mkdtemp(
      new URL("../.registry-test-", import.meta.url)
    );
    try {
      await writeFile(
        join(directory, "index.mdx"),
        "# Example\n\n<Notice>Hello</Notice>\n"
      );
      await mkdir(join(directory, "_components"));
      for (const label of ["first", "second"]) {
        await writeFile(
          join(directory, "_components/index.ts"),
          `import { createElement } from "react"; export default { Notice: ({ children }) => createElement("aside", { "data-owner": "${label}" }, children) };`
        );
        const html = await render(directory);
        assert.match(
          html,
          new RegExp(`<aside data-owner="${label}">Hello</aside>`)
        );
        assert.doesNotMatch(
          html,
          new RegExp(`data-owner="${label === "first" ? "second" : "first"}"`)
        );
      }
      await rm(join(directory, "_components/index.ts"));
      await assert.rejects(
        render(directory),
        /Expected component `Notice` to be defined/
      );
      await writeFile(join(directory, "index.mdx"), "# No registry needed\n");
      assert.match(await render(directory), /No registry needed/);
      await writeFile(
        join(directory, "_components/index.ts"),
        "export default { broken"
      );
      await assert.rejects(render(directory));
      await rm(join(directory, "_components/index.ts"));
      await symlink(
        join(directory, "index.mdx"),
        join(directory, "_components/index.ts")
      );
      assert.throws(() => sourceComponentsPlugin(directory), /regular file/);
      await rm(join(directory, "_components"), { recursive: true });
      await symlink(directory, join(directory, "_components"));
      assert.throws(() => sourceComponentsPlugin(directory), /symlinks/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
);
