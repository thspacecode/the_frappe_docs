import { createRoutes } from "@the-docs/preset-default/routes";

export default [
  ...createRoutes().filter((route) => !["p/:slug", "docs/p/:slug", "scopes/:scopeSlug"].includes(route.path ?? "")),
  { path: "p/:slug", file: "routes/document.tsx" },
  { path: "scopes/:scopeSlug", file: "routes/scope.tsx" },
];
