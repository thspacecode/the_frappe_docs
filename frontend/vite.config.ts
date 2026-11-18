import { createViteConfig } from "@the-docs/preset-default/vite";
import { mergeConfig } from "vite";
import docsConfig from "./docs.config.ts";

export default mergeConfig(createViteConfig(docsConfig), {
  base: `${process.env.THE_DOCS_SOURCE_BASE || "/docs/the-docs"}/`,
});
