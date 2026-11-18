const routes =
  /^\/(?:|list\/?|tags\/(?:tree|graph)\/?|scopes(?:\/[^/]+)?\/?|(?:docs\/)?p\/[^/]+\/?)$/;
const deskPrefix = "/desk/the-frappe-docs/docs-viewer/";

export function deskRoute(url: URL) {
  const path = url.searchParams.get("doc") || "/";
  return routes.test(path.split(/[?#]/)[0])
    ? path.split("#")[0] + url.hash
    : "/";
}

export function deskUrl(base: string, route: string, origin: string) {
  const url = new URL(base, origin);
  const target = new URL(route, origin);
  url.search = "";
  if (target.pathname !== "/" || target.search)
    url.searchParams.set("doc", target.pathname + target.search);
  url.hash = target.hash;
  return url;
}

export function resolveDeskLink(
  href: string,
  sourceBase: string,
  currentPath: string,
  origin: string,
) {
  const base = new URL(sourceBase, origin);
  const slug = base.pathname.split("/").pop();
  const virtualBase = `/docs/${slug}`;
  let target: URL;
  try {
    target = new URL(
      href.startsWith("/") &&
        !href.startsWith("//") &&
        routes.test(href.split(/[?#]/)[0])
        ? virtualBase + href
        : href,
      new URL(virtualBase + currentPath, origin),
    );
  } catch {
    return null;
  }
  if (target.origin !== base.origin) return { url: target.href, route: null };
  const old = target.pathname.match(
    /^\/docs\/(?:source\/[^/]+\/)?([^/]+)(\/.*)?$/,
  );
  if (old?.[2]?.startsWith("/assets/")) {
    target.pathname = `/docs-assets/${old[1]}${old[2]}`;
  } else if (old && routes.test(old[2] || "/")) {
    target = deskUrl(
      deskPrefix + old[1],
      (old[2] || "/") + target.search + target.hash,
      origin,
    );
  }
  const sameSource = target.pathname === base.pathname;
  return {
    url: target.href,
    route: sameSource ? deskRoute(target) : null,
  };
}
