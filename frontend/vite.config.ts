import { createViteConfig } from "@the-docs/preset-default/vite";
import { mergeConfig } from "vite";
import docsConfig from "./docs.config.ts";

export default mergeConfig(createViteConfig(docsConfig), {
  base: "/assets/the_frappe_docs/frontend/",
});
