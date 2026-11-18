import { fileURLToPath } from "node:url";
import { createViteConfig } from "@the-docs/preset-default/vite";
import { defineConfig, type Plugin, type PluginOption } from "vite";
import docsConfig from "./docs.config.ts";

function flattenPlugins(plugins: PluginOption[]): Plugin[] {
  return plugins.flatMap((plugin): Plugin[] =>
    Array.isArray(plugin)
      ? flattenPlugins(plugin)
      : plugin && typeof plugin === "object" && "name" in plugin
        ? [plugin]
        : [],
  );
}

const preset = createViteConfig(docsConfig);
const bridge = fileURLToPath(
  new URL("./app/desk-boundary.tsx", import.meta.url),
);

// Keep preset dialogs and heading lookups inside the mounted documentation root.
const boundary: Plugin = {
  name: "desk-docs-boundary",
  enforce: "pre",
  transform(code, id) {
    if (!id.includes("/@the-docs/core/dist/components/")) return;
    const portals = [...code.matchAll(/_jsx[s]?\((\w+)\.Portal, \{/g)];
    if (portals.length) {
      code = `import { DeskPortal } from ${JSON.stringify(bridge)};\n${code}`;
      code = code.replace(
        /_jsx[s]?\((\w+)\.Portal, \{/g,
        (_match, component) =>
          `_jsx(DeskPortal, { component: ${component}.Portal,`,
      );
    }
    if (id.endsWith("/table-of-contents.js")) {
      if (!code.includes("function useActiveHeading(items) {") || !code.includes("document.getElementById(")) {
        throw new Error("The Docs heading adapter needs an update for this preset version");
      }
      code = `import { useDeskRoot } from ${JSON.stringify(bridge)};\n${code}`;
      code = code.replace(
        "function useActiveHeading(items) {",
        "function useActiveHeading(items) {\nconst deskRoot = useDeskRoot();",
      );
      code = code.replaceAll(
        "document.getElementById(",
        "deskRoot.getElementById(",
      );
    }
    return code;
  },
};

export default defineConfig({
  resolve: preset.resolve,
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  plugins: [
    ...flattenPlugins(preset.plugins ?? []).filter(
      (plugin) =>
        plugin.name.startsWith("@tailwindcss/") ||
        ["the-docs-content", "@mdx-js/rollup"].includes(plugin.name),
    ),
    boundary,
  ],
  css: {
    postcss: {
      plugins: [
        {
          postcssPlugin: "desk-shadow-selectors",
          Rule(rule) {
            rule.selector = rule.selector
              .replace(/:root|\bhtml\b/g, ":host")
              .replace(/\bbody\b/g, ".desk-docs-body");
          },
        },
      ],
    },
  },
  base: `${process.env.THE_DOCS_SOURCE_BASE || "/docs/bmu-core"}/assets/desk/`,
  build: {
    outDir: ".desk-build",
    lib: {
      entry: "app/desk.tsx",
      formats: ["es"],
      fileName: () => "desk.js",
      cssFileName: "desk",
    },
    rollupOptions: { output: { assetFileNames: "[name][extname]" } },
  },
});
