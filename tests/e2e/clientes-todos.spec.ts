import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const senha = process.env.E2E_SENHA;

async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email!);
  await page.getByLabel("Senha", { exact: true }).fill(senha!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("group", { name: "Período" })).toBeVisible({ timeout: 30_000 });
}

test.describe("Lista de clientes do período", () => {
  test.skip(!email || !senha, "Defina E2E_EMAIL e E2E_SENHA.");

  test("mostra os filtros e a situação vazia", async ({ page }) => {
    await entrar(page);
    await page.goto("/clientes");
    await expect(page.getByText("Todos os clientes do período")).toBeVisible();
    await expect(page.getByLabel("Buscar cliente")).toBeVisible();
    await expect(page.getByLabel("Mínimo de transações")).toBeVisible();
    await page.getByLabel("Tipo de cliente").selectOption("recorrentes");
    await expect(page.getByText(/Nenhum cliente/)).toBeVisible();
  });
});
