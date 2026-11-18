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
import { resolveDeskLink } from "./desk-links";
import "./styles.css";

export function mount(host: HTMLElement, sourceBase: string) {
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
    if (!(event instanceof MouseEvent)) return;
    const link = event
      .composedPath()
      .find((node) => node instanceof HTMLAnchorElement);
    if (
      !(link instanceof HTMLAnchorElement) ||
      !link.hasAttribute("href") ||
      link.hasAttribute("download")
    )
      return;
    const href = link.getAttribute("href")!;
    const current = router.state.location;
    const target = resolveDeskLink(
      href,
      sourceBase,
      current.pathname + current.search,
      location.origin,
    );
    if (!target) return;
    // Set a real standalone URL for new tabs, modified clicks, and copied links.
    link.href = target.url;
    if (
      event.type !== "click" ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      (link.target && link.target !== "_self") ||
      !target.route
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    void router.navigate(target.route).then(() => {
      const hash = new URL(target.url).hash.slice(1);
      if (!hash) return;
      let id = hash;
      try {
        id = decodeURIComponent(hash);
      } catch {
        /* Keep an invalid escape literal. */
      }
      requestAnimationFrame(() => shadow.getElementById(id)?.scrollIntoView());
    });
  };
  for (const type of ["click", "auxclick", "contextmenu"]) {
    shadow.addEventListener(type, onAnchor, true);
  }
  root.render(
    <DeskBoundary.Provider value={shadow}>
      <RouterProvider router={router} />
    </DeskBoundary.Provider>,
  );
  return () => {
    root.unmount();
    router.dispose();
    for (const type of ["click", "auxclick", "contextmenu"]) {
      shadow.removeEventListener(type, onAnchor, true);
    }
    content.remove();
    portals.remove();
  };
}
