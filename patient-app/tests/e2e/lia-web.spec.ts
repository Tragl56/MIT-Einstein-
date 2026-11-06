import { test, expect } from "@playwright/test";

async function open(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar demonstração" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Lia", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Prefiro digitar", exact: true })
    .click();
  await page.getByRole("button", { name: "Entendi, ativar a Lia" }).click();
  await page.getByLabel("Ouvir as respostas da Lia").uncheck();
}
test("browser Lia reads actual app data and requires confirmation before a contact request", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).__liaSpoken = [];
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class { text: string; onend?: () => void; constructor(text: string) { this.text = text; } } });
    Object.defineProperty(window, 'speechSynthesis', { value: { cancel() {}, speak(utterance: { text: string; onend?: () => void }) { (window as any).__liaSpoken.push(utterance.text); setTimeout(() => utterance.onend?.(), 10); } } });
  });
  await open(page);
  await page.getByLabel("Mensagem para a Lia").fill("leia minha agenda");
  await page
    .getByRole("button", { name: "Enviar mensagem", exact: true })
    .click();
  await expect(page.getByTestId("lia-answer").last()).toContainText("novembro");
  await page.getByRole('button', { name: 'Ouvir resposta da Lia', exact: true }).last().click();
  await expect.poll(() => page.evaluate(() => (window as any).__liaSpoken.length)).toBe(1);
  await page.getByLabel("Mensagem para a Lia").fill("quero falar com a equipe");
  await page
    .getByRole("button", { name: "Enviar mensagem", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Sim, confirmar", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Não, cancelar", exact: true })
    .click();
  await expect(page.getByTestId("lia-answer").last()).toContainText(
    "Nada foi alterado",
  );
});
test("browser voice receives a transcript through the same safe application actions", async ({
  page,
}) => {
  await page.addInitScript(() => {
    class Recognition {
      onresult: ((event: unknown) => void) | null = null;
      start() {
        setTimeout(
          () =>
            this.onresult?.({
              results: [[{ transcript: "leia minha agenda" }]],
            }),
          10,
        );
      }
      abort() {}
    }
    Object.defineProperty(window, "SpeechRecognition", { value: Recognition });
    // The Lia asks for the microphone before listening; simulate a device that allows it.
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }),
      },
    });
    Object.defineProperty(navigator, "permissions", {
      value: { query: async () => ({ state: "granted" }) },
    });
  });
  await open(page);
  await page
    .getByRole("button", { name: "Falar uma mensagem", exact: true })
    .click();
  await expect(page.getByTestId("lia-answer").last()).toContainText("novembro");
  await expect(page.getByLabel("Conversa com Lia")).toContainText(
    "leia minha agenda",
  );
});
