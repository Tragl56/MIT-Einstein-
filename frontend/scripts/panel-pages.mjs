import { copyFile } from "node:fs/promises";

await Promise.all(["profissional", "paciente"].map((painel) =>
  copyFile(new URL("../dist/index.html", import.meta.url), new URL(`../dist/${painel}.html`, import.meta.url)),
));
