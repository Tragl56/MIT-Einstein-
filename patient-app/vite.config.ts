import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

// Only the public service address is embedded. Provider keys stay in the native private build.
// An empty serviceUrl means no published demo yet: the APK then uses repository discovery or the
// advanced pairing code, and the web preview keeps using its own origin.
const published = JSON.parse(readFileSync(new URL("../platform/mobile-config.json", import.meta.url), "utf8"));
if (published.apiVersion !== "1" || typeof published.serviceUrl !== "string") throw new Error("Invalid public OncoFlow service configuration.");
let serviceOrigin = "";
if (published.serviceUrl) {
  const origin = new URL(published.serviceUrl);
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) throw new Error("Invalid public OncoFlow service configuration.");
  serviceOrigin = origin.origin;
}
export default defineConfig({
  plugins: [react()],
  base: "./",
  define: { "import.meta.env.VITE_ONCOFLOW_SERVICE_ORIGIN": JSON.stringify(serviceOrigin) },
});
