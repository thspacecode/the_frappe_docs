import { lstatSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

export function sourceComponentsPlugin(contentRoot: string): Plugin {
  const moduleId = "virtual:docs-source-components";
  const resolvedId = `\0${moduleId}`;
  const root = realpathSync(contentRoot);
  const directory = resolve(root, "_components");
  const registry = resolve(directory, "index.ts");
  const directoryInfo = lstatSync(directory, { throwIfNoEntry: false });
  if (directoryInfo?.isSymbolicLink()) {
    throw new Error("Component directories must not be symlinks");
  }
  const registryInfo = directoryInfo?.isDirectory()
    ? lstatSync(registry, { throwIfNoEntry: false })
    : undefined;
  if (registryInfo && (!registryInfo.isFile() || registryInfo.isSymbolicLink())) {
    throw new Error("_components/index.ts must be a regular file");
  }
  return {
    name: "docs-source-components",
    resolveId(id) {
      if (id === moduleId) return resolvedId;
    },
    load(id) {
      if (id !== resolvedId) return;
      return registryInfo
        ? `export { default } from ${JSON.stringify(registry)};`
        : "export default {};";
    },
  };
}
