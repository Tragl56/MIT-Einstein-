import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const shared = fileURLToPath(new URL("./packages/shared/src/", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@oncoflow/shared/estilos.css", replacement: `${shared}estilos.css` },
      { find: "@oncoflow/shared", replacement: `${shared}index.ts` },
    ],
  },
  server: {
    proxy: { "/api": process.env.VITE_API_ALVO ?? "http://localhost:8000" },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
