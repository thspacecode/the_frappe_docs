import type { Config } from "@react-router/dev/config";

export default {
  basename: process.env.THE_DOCS_SOURCE_BASE || "/docs/source/the_frappe_docs/the-docs",
  buildDirectory: ".build",
  ssr: false,
  routeDiscovery: { mode: "initial" },
} satisfies Config;
