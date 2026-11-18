const routes =
  /^\/(?:|list\/?|tags\/(?:tree|graph)\/?|scopes(?:\/[^/]+)?\/?|(?:docs\/)?p\/[^/]+\/?)$/;

export function resolveDeskLink(
  href: string,
  sourceBase: string,
  currentPath: string,
  origin: string,
) {
  const base = new URL(sourceBase.replace(/\/$/, "") + "/", origin);
  const current = new URL(
    base.pathname.replace(/\/$/, "") + currentPath,
    origin,
  );
  let target: URL;
  try {
    // Preset navigation uses root-relative routes such as /p/guide.
    target = new URL(
      href.startsWith("/") &&
        !href.startsWith("//") &&
        routes.test(href.split(/[?#]/)[0])
        ? base.pathname.replace(/\/$/, "") + href
        : href,
      current,
    );
  } catch {
    return null;
  }
  const prefix = base.pathname.replace(/\/$/, "");
  const path =
    target.pathname === prefix
      ? "/"
      : target.pathname.startsWith(prefix + "/")
        ? target.pathname.slice(prefix.length)
        : null;
  return {
    url: target.href,
    route:
      target.origin === base.origin && path !== null && routes.test(path)
        ? path + target.search + target.hash
        : null,
  };
}
