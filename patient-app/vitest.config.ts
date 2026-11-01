import { defineConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";
// Tests use a fixed published address, independent of the repository's platform/mobile-config.json.
export default defineConfig({
  define: { ...viteConfig.define, "import.meta.env.VITE_ONCOFLOW_SERVICE_ORIGIN": JSON.stringify("https://published.example") },
  test: { include: ["tests/unit/**/*.test.ts"] },
});
