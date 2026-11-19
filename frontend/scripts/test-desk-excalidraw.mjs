import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { adaptDeskExcalidraw } from "../desk-excalidraw.ts";

test(
  "keeps the installed Excalidraw viewer inside the Desk shadow root",
  { timeout: 1000 },
  async () => {
    const code = await readFile(
      new URL(
        "../node_modules/@the-docs/plugin-excalidraw/dist/runtime/excalidraw-image.js",
        import.meta.url
      ),
      "utf8"
    );
    const adapted = adaptDeskExcalidraw(
      code,
      "/desk-boundary.tsx",
      "/preview.ts"
    );
    assert.match(adapted, /const deskRoot = useDeskRoot\(\)/);
    assert.match(adapted, /deskRoot.querySelector\("\.desk-docs-portals"\)/);
    assert.doesNotMatch(adapted, /,\s*document\.body\)/);
    assert.ok(adapted.includes("document.body.style.overflow"));
    assert.ok(adapted.includes('className: "excalidraw-preview"'));
    assert.ok(adapted.includes("viewModeEnabled: true"));
    assert.ok(adapted.includes("src: previewUrl"));
    assert.ok(adapted.includes("useExcalidrawPreview(model)"));
    assert.throws(
      () =>
        adaptDeskExcalidraw(
          code.replace("src: model.dataUrl", "src: changed"),
          "/bridge",
          "/preview"
        ),
      /needs an update/
    );
  }
);

test(
  "fails clearly when the plugin portal implementation changes",
  { timeout: 1000 },
  () => {
    assert.throws(
      () =>
        adaptDeskExcalidraw(
          "export default function NewViewer() {}",
          "/bridge",
          "/preview"
        ),
      /needs an update/
    );
    assert.throws(
      () =>
        adaptDeskExcalidraw(
          "export default function ExcalidrawImage() {}",
          "/bridge",
          "/preview"
        ),
      /needs an update/
    );
  }
);
