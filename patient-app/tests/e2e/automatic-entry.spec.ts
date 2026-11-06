import { expect, test, type Page } from "@playwright/test";

async function demoServer(page: Page, available = true, autoConnect = true) {
  const requests: string[] = [];
  const sessions: string[] = [];
  const state = { revoked: false };
  const names: Record<string, string> = {
    "pac-maria": "Maria do hospital",
    "pac-joao": "João do hospital",
  };
  await page.route("**/api/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    requests.push(url.pathname);
    const json = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (!available) {
      await json({ error: "not deployed" }, 503);
      return;
    }
    if (url.pathname === "/api/health") {
      await json({ status: "ok", service: "OncoFlow" });
      return;
    }
    if (url.pathname === "/api/mobile/config") {
      await json({
        apiVersion: "1",
        demo: true,
        autoConnectEnabled: autoConnect,
        serviceUrl: url.origin,
        defaultPatientId: "pac-maria",
      });
      return;
    }
    if (url.pathname === "/api/mobile/demo-patients") {
      await json({
        demo: true,
        patients: Object.entries(names).map(([id, displayName]) => ({
          id,
          displayName,
        })),
        defaultPatientId: "pac-maria",
      });
      return;
    }
    if (url.pathname === "/api/mobile/demo-session") {
      const { patientId } = request.postDataJSON();
      sessions.push(patientId);
      await json({
        accessToken: `server-token-${patientId}`,
        expiresAt: "2099-01-01T00:00:00Z",
        scope: { tenantId: "demo", hospitalId: "oncoflow", patientId },
        patient: { displayName: names[patientId] },
        demo: true,
      });
      return;
    }
    if (url.pathname === "/api/mobile/pair") {
      const { code } = request.postDataJSON();
      if (code !== "A1B2C3D4E5") {
        await json({ erro: "pareamento_invalido" }, 401);
        return;
      }
      sessions.push("code:pac-maria");
      await json({
        accessToken: "server-token-pac-maria",
        expiresAt: "2099-01-01T00:00:00Z",
        scope: { tenantId: "demo", hospitalId: "oncoflow", patientId: "pac-maria" },
        patient: { displayName: names["pac-maria"] },
        demo: true,
      });
      return;
    }
    if (state.revoked) {
      await json({ erro: "sessao_invalida" }, 401);
      return;
    }
    const patientId = url.pathname.split("/").at(-2)!;
    const endpoint = url.pathname.split("/").at(-1)!;
    expect(request.headers().authorization).toBe(
      `Bearer server-token-${patientId}`,
    );
    const scope = { tenantId: "demo", hospitalId: "oncoflow", patientId };
    const data =
      endpoint === "summary"
        ? {
            ...scope,
            id: "summary",
            displayName: names[patientId],
            preferredName: names[patientId].split(" ")[0],
            careTeamLabel: "Equipe do hospital",
          }
        : endpoint === "preferences"
          ? {
              ...scope,
              id: "prefs",
              locale: "pt-BR",
              explanation: "short",
              speechRate: 1,
              textScale: 1,
            }
          : [];
    await json({
      apiVersion: "1",
      resourceType: endpoint === "summary" ? "patient_summary" : endpoint,
      scope,
      asOf: new Date().toISOString(),
      data,
    });
  });
  return { requests, sessions, state };
}

test("on the web the patient enters with the care team code; entering without a code is a labelled demo option", async ({
  page,
}) => {
  const api = await demoServer(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Tenho um código da minha equipe" }),
  ).toBeVisible();
  await expect(page.getByLabel("Código de acesso", { exact: true })).toBeVisible();
  const demoEntry = page.getByRole("button", {
    name: "Entrar sem código (demonstração)",
    exact: true,
  });
  await expect(demoEntry).toBeVisible();
  // Only the public config is read before the patient acts; no session is opened.
  expect(api.requests.every((path) => path === "/api/mobile/config")).toBe(true);
  expect(api.sessions).toEqual([]);
  await expect(
    page.getByLabel("Endereço do hospital", { exact: true }),
  ).toHaveCount(0);
  await demoEntry.click();
  await expect(
    page.getByRole("heading", { name: "Olá, Maria." }),
  ).toBeVisible();
  expect(api.sessions).toEqual(["pac-maria"]);
  await page.getByRole("button", { name: "Perfil", exact: true }).click();
  await page
    .getByLabel("Perfil fictício conectado", { exact: true })
    .selectOption("pac-joao");
  await expect(page.getByRole("heading", { name: "Olá, João." })).toBeVisible();
  expect(api.sessions).toEqual(["pac-maria", "pac-joao"]);
  const stored = await page.evaluate(() => JSON.stringify(localStorage));
  expect(stored).not.toMatch(/server-token|accessToken|pac-joao/);
  await page.getByRole("button", { name: "Perfil", exact: true }).click();
  await page.getByRole("button", { name: "Desconectar", exact: true }).click();
  await expect(demoEntry).toBeVisible();
  await expect(page.getByText("João do hospital", { exact: true })).toHaveCount(
    0,
  );
});

test("without demo auto-connect only the care team code opens the app, and ending access sends the patient back", async ({
  page,
}) => {
  const api = await demoServer(page, true, false);
  await page.goto("/");
  const code = page.getByLabel("Código de acesso", { exact: true });
  await expect(code).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Entrar sem código (demonstração)", exact: true }),
  ).toHaveCount(0);
  await code.fill("errado1");
  await page.getByRole("button", { name: "Entrar com o código", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Código inválido, expirado ou já usado");
  expect(api.sessions).toEqual([]);
  await code.fill("a1b2c3d4e5");
  await page.getByRole("button", { name: "Entrar com o código", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Olá, Maria." }),
  ).toBeVisible();
  expect(api.sessions).toEqual(["code:pac-maria"]);
  // The care team ends access in the Pro: the next read is refused.
  api.state.revoked = true;
  await expect(
    page.getByText(
      "Seu acesso ao app foi encerrado. Para voltar, peça um novo código à sua equipe.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Olá, Maria." })).toHaveCount(0);
});

test("an unpublished service leaves the code entry and a usable offline demo", async ({
  page,
}) => {
  await demoServer(page, false);
  await page.goto("/");
  await expect(page.getByLabel("Código de acesso", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Entrar sem código (demonstração)", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Explorar demonstração offline", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Olá, Marina." }),
  ).toBeVisible();
});
