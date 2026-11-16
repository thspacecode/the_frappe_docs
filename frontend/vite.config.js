import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const appPath = fileURLToPath(new URL("../the_frappe_docs/", import.meta.url));

export default defineConfig({
	base: "/assets/the_frappe_docs/frontend/",
	plugins: [
		react(),
		{
			name: "frappe-spa-page",
			closeBundle() {
				mkdirSync(`${appPath}/www`, { recursive: true });
				copyFileSync(`${appPath}/public/frontend/index.html`, `${appPath}/www/docs.html`);
			},
		},
	],
	build: {
		outDir: `${appPath}/public/frontend`,
		emptyOutDir: true,
	},
});
