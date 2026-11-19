import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

export function sourceComponents(contentRoot: string): Plugin {
  const registry = resolve(contentRoot, "_components/index.ts");
  return {
    name: "docs-source-components",
    transform(code, id) {
      if (id !== "\0virtual:docs-content" || !existsSync(registry)) return;
      return `${code}
import sourceComponents from ${JSON.stringify(registry)};
import { createElement as renderSourceDocument } from "react";
for (const document of documents) {
  const Content = document.Component;
  document.Component = (props) => renderSourceDocument(Content, {
    ...props,
    components: { ...sourceComponents, ...props?.components },
  });
}
`;
    },
  };
}
