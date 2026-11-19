export function adaptDeskExcalidraw(code: string, bridge: string, preview: string) {
  const target = /,\s*document\.body\)/g;
  if (!code.includes("export default function ExcalidrawImage(") || !target.test(code) || !code.includes("src: model.dataUrl")) {
    throw new Error("The Docs Excalidraw adapter needs an update for this plugin version");
  }
  return `import { useDeskRoot } from ${JSON.stringify(bridge)};\nimport { useExcalidrawPreview } from ${JSON.stringify(preview)};\n${code}`
    .replace(
      /export default function ExcalidrawImage\(([^]*?)\) \{/,
      "$&\nconst deskRoot = useDeskRoot();\nconst previewUrl = useExcalidrawPreview(model);",
    )
    .replace("src: model.dataUrl", "src: previewUrl")
    .replace(target, ', deskRoot.querySelector(".desk-docs-portals"))');
}
