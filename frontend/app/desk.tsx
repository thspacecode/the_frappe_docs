import { ExcalidrawPortalContainer } from "../vendor/the-docs/packages/plugin-excalidraw/src/runtime/excalidraw-image.tsx";
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
import { deskRoute, deskUrl, resolveDeskLink } from "./desk-links";
import "./styles.css";

export function mount(host: HTMLElement, sourceBase: string) {
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  const content = document.createElement("div");
  content.className = "desk-docs-body";
  const portals = document.createElement("div");
  portals.className = "desk-docs-portals";
  shadow.append(content, portals);
  const initialRoute = deskRoute(new URL(location.href));
  const router = createMemoryRouter(
    [
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
    ],
    { initialEntries: [initialRoute] },
  );
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
    // Use Desk URLs for new tabs and copied links.
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
    scrolledRoute = "";
    void router.navigate(target.route);
  };
  for (const type of ["click", "auxclick", "contextmenu"]) {
    shadow.addEventListener(type, onAnchor, true);
  }
  let lastRoute = initialRoute;
  let scrolledRoute = "";
  const scrollToHeading = () => {
    if (scrolledRoute === lastRoute) return;
    const hash = router.state.location.hash.slice(1);
    if (!hash) return;
    let id = hash;
    try {
      id = decodeURIComponent(hash);
    } catch {
      /* Use the literal ID. */
    }
    requestAnimationFrame(() => {
      const heading = shadow.getElementById(id);
      if (heading) {
        heading.scrollIntoView();
        scrolledRoute = lastRoute;
      }
    });
  };
  const unsubscribe = router.subscribe((state) => {
    const route =
      state.location.pathname + state.location.search + state.location.hash;
    if (route !== lastRoute) {
      lastRoute = route;
      scrolledRoute = "";
      const url = deskUrl(sourceBase, route, location.origin);
      if (url.href !== location.href) history.pushState(history.state, "", url);
    }
    if (state.navigation.state === "idle") scrollToHeading();
  });
  const onPopState = () => {
    if (location.pathname === new URL(sourceBase, location.origin).pathname)
      void router.navigate(deskRoute(new URL(location.href)));
  };
  window.addEventListener("popstate", onPopState);
  const headings = new MutationObserver(scrollToHeading);
  headings.observe(content, { childList: true, subtree: true });
  root.render(
    <DeskBoundary.Provider value={shadow}>
      <ExcalidrawPortalContainer.Provider value={portals}>
        <RouterProvider router={router} />
      </ExcalidrawPortalContainer.Provider>
    </DeskBoundary.Provider>,
  );
  return () => {
    headings.disconnect();
    unsubscribe();
    window.removeEventListener("popstate", onPopState);
    root.unmount();
    router.dispose();
    for (const type of ["click", "auxclick", "contextmenu"]) {
      shadow.removeEventListener(type, onAnchor, true);
    }
    content.remove();
    portals.remove();
  };
}
