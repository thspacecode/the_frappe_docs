import type { Config } from "@react-router/dev/config";

export default {
  basename: "/docs",
  buildDirectory: ".build",
  ssr: false,
  routeDiscovery: { mode: "initial" },
} satisfies Config;
