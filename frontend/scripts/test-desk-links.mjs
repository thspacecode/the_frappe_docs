import assert from "node:assert/strict";
import test from "node:test";
import { resolveDeskLink } from "../app/desk-links.ts";

const resolve = (href) =>
  resolveDeskLink(
    href,
    "/docs/bmu-core",
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
      "https://docs.example/docs/bmu-core/p/hello-world"
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
    "https://docs.example/docs/other/p/guide"
  );
  assert.equal(resolve("http://["), null);
});
