import preset from "./packages/shared/tailwind-preset.js";

export default {
  presets: [preset],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "./apps/pro/src/**/*.{ts,tsx}",
    "./apps/paciente/src/**/*.{ts,tsx}",
    "./packages/shared/src/**/*.{ts,tsx}",
  ],
};
