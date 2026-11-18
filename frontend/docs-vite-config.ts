import { fileURLToPath } from "node:url";
import { createDocsVitePlugins } from "@the-docs/core/build";
import { createViteConfig } from "@the-docs/preset-default/vite";
import { bpmnRehypePlugin } from "@the-docs/plugin-bpmn/build";
import { dataTableRehypePlugin } from "@the-docs/plugin-data-table/build";
import { excalidrawRehypePlugin } from "@the-docs/plugin-excalidraw/build";
import { mermaidRehypePlugin } from "@the-docs/plugin-mermaid/build";
import { syntaxHighlighterRehypePlugin } from "@the-docs/plugin-syntax-highlighter/build";
import type { Plugin, PluginOption } from "vite";
import docsConfig from "./docs.config.ts";
import { sourceComponentsPlugin } from "./source-components.ts";

export function flattenPlugins(plugins: PluginOption[]): Plugin[] {
  return plugins.flatMap((plugin): Plugin[] =>
    Array.isArray(plugin)
      ? flattenPlugins(plugin)
      : plugin && typeof plugin === "object" && "name" in plugin
        ? [plugin]
        : [],
  );
}

export function createDocsConfig() {
  const preset = createViteConfig(docsConfig);
  const options = docsConfig.plugins;
  const contentPlugins = createDocsVitePlugins({
    contentRoot: docsConfig.contentRoot,
    mdx: {
      providerImportSource: fileURLToPath(new URL("./app/mdx-components.ts", import.meta.url)),
      rehypePlugins: [
        ...(options.mermaid === false ? [] : [mermaidRehypePlugin(options.mermaid)]),
        ...(options.syntaxHighlighter === false ? [] : [syntaxHighlighterRehypePlugin(options.syntaxHighlighter)]),
        ...(options.excalidraw === false ? [] : [excalidrawRehypePlugin(options.excalidraw)]),
        ...(options.bpmn === false ? [] : [bpmnRehypePlugin(options.bpmn)]),
        ...(options.dataTable === false ? [] : [dataTableRehypePlugin(options.dataTable)]),
      ],
    },
  });
  return {
    ...preset,
    plugins: [
      ...contentPlugins,
      ...flattenPlugins(preset.plugins ?? []).filter(
        (plugin) => !["the-docs-content", "@mdx-js/rollup"].includes(plugin.name),
      ),
      sourceComponentsPlugin(docsConfig.contentRoot),
    ],
  };
}
