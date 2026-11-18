import assert from "node:assert/strict";
import test from "node:test";
import { deskRoute, deskUrl, resolveDeskLink } from "../app/desk-links.ts";

const resolve = (href) =>
  resolveDeskLink(
    href,
    "/desk/the-frappe-docs/docs-viewer/bmu-core",
    "/p/setup?scope=team",
    "https://docs.example"
  );

test("same-source links resolve against the documentation route, not Desk", () => {
  for (const href of [
    "./hello-world",
    "../p/hello-world",
    "/p/hello-world",
    "/docs/bmu-core/p/hello-world",
    "https://docs.example/docs/bmu-core/p/hello-world",
  ]) {
    assert.equal(resolve(href).route, "/p/hello-world");
    assert.equal(
      resolve(href).url,
      "https://docs.example/desk/the-frappe-docs/docs-viewer/bmu-core?doc=%2Fp%2Fhello-world"
    );
  }
});

test("queries and heading anchors survive resolution", () => {
  assert.equal(
    resolve("./hello-world?scope=team#section").route,
    "/p/hello-world?scope=team#section"
  );
  assert.equal(resolve("#section").route, "/p/setup?scope=team#section");
  assert.equal(resolve("?scope=other").route, "/p/setup?scope=other");
});

test("cross-source, external, mail, and non-document links stay browser links", () => {
  for (const href of [
    "/docs/other/p/guide",
    "/docs/bmu-core-other/p/guide",
    "https://external.example/p/guide",
    "mailto:help@example.com",
    "/desk",
    "/docs/bmu-core/assets/file.pdf",
  ]) {
    assert.equal(resolve(href).route, null);
  }
  assert.equal(
    resolve("/docs/other/p/guide").url,
    "https://docs.example/desk/the-frappe-docs/docs-viewer/other?doc=%2Fp%2Fguide"
  );
  assert.equal(resolve("http://["), null);
});

test("canonical Desk links round trip encoded queries and headings", () => {
  const link = resolve("./hello-world?tag=a%26b&scope=team#hello%20world");
  const url = new URL(link.url);
  assert.equal(url.pathname, "/desk/the-frappe-docs/docs-viewer/bmu-core");
  assert.equal(
    url.searchParams.get("doc"),
    "/p/hello-world?tag=a%26b&scope=team"
  );
  assert.equal(url.hash, "#hello%20world");
  assert.equal(resolve(link.url).route, link.route);
  assert.equal(
    resolve("/docs/source/other_app/other/p/guide?x=1#title").url,
    "https://docs.example/desk/the-frappe-docs/docs-viewer/other?doc=%2Fp%2Fguide%3Fx%3D1#title"
  );
});

test("protected attachment links use the independent asset endpoint", () => {
  assert.equal(
    resolve("/docs/bmu-core/assets/file.pdf?download=1#page=2").url,
    "https://docs.example/docs-assets/bmu-core/assets/file.pdf?download=1#page=2"
  );
});

test("Desk route decoding rejects external paths and preserves home queries", () => {
  assert.equal(
    deskRoute(new URL("https://docs.example/?doc=https://evil.example")),
    "/"
  );
  assert.equal(deskRoute(new URL("https://docs.example/?doc=%2Funknown")), "/");
  const url = deskUrl(
    "/desk/the-frappe-docs/docs-viewer/bmu-core",
    "/?scope=team#intro",
    "https://docs.example"
  );
  assert.equal(deskRoute(url), "/?scope=team#intro");
});
