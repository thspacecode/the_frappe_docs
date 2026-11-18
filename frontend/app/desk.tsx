import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import {
  DocumentListPage,
  HomePage,
  ScopesPage,
  TagsPage,
  getDocuments,
  getScopes,
  getTags,
  getTypes,
} from "@the-docs/core";
import Document, { loader, ErrorBoundary } from "@the-docs/core/route";
import Scope, { clientLoader } from "./routes/scope";
import { DeskBoundary } from "./desk-boundary";
import "./styles.css";

export function mount(host: HTMLElement) {
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  const content = document.createElement("div");
  content.className = "desk-docs-body";
  const portals = document.createElement("div");
  portals.className = "desk-docs-portals";
  shadow.append(content, portals);
  const router = createMemoryRouter([
    {
      path: "/",
      element: (
        <HomePage
          documents={getDocuments()}
          scopes={getScopes()}
          tags={getTags()}
          description="Architecture notes and guides for The Docs."
        />
      ),
    },
    {
      path: "/list",
      element: (
        <DocumentListPage
          documents={getDocuments()}
          tags={getTags()}
          types={getTypes()}
        />
      ),
    },
    {
      path: "/tags/tree",
      element: (
        <TagsPage documents={getDocuments()} tags={getTags()} view="tree" />
      ),
    },
    {
      path: "/tags/graph",
      element: (
        <TagsPage documents={getDocuments()} tags={getTags()} view="graph" />
      ),
    },
    { path: "/scopes", element: <ScopesPage scopes={getScopes()} /> },
    { path: "/scopes/:scopeSlug", Component: Scope, loader: clientLoader },
    { path: "/p/:slug", Component: Document, loader, ErrorBoundary },
    { path: "/docs/p/:slug", Component: Document, loader, ErrorBoundary },
  ]);
  const root = createRoot(content);
  const onAnchor = (event: Event) => {
    const link = event
      .composedPath()
      .find((node) => node instanceof HTMLAnchorElement);
    if (
      !(link instanceof HTMLAnchorElement) ||
      !link.getAttribute("href")?.startsWith("#")
    )
      return;
    event.preventDefault();
    shadow
      .getElementById(decodeURIComponent(link.hash.slice(1)))
      ?.scrollIntoView();
  };
  shadow.addEventListener("click", onAnchor);
  root.render(
    <DeskBoundary.Provider value={shadow}>
      <RouterProvider router={router} />
    </DeskBoundary.Provider>,
  );
  return () => {
    root.unmount();
    router.dispose();
    shadow.removeEventListener("click", onAnchor);
    content.remove();
    portals.remove();
  };
}
