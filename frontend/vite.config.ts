import { createDocsConfig } from "./docs-vite-config.ts";
import { mergeConfig } from "vite";

export default mergeConfig(createDocsConfig(), {
  base: `${process.env.THE_DOCS_SOURCE_BASE || "/docs/the-docs"}/`,
});
