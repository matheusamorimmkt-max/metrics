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

  test("sem transações mostra a situação vazia e aponta para Integrações", async ({ page }) => {
    // O usuário e2e não tem conector ligado: a aba não desenha a lista nem os filtros,
    // só explica de onde as vendas vêm (decisão de 2026-11-22).
    await entrar(page);
    await page.goto("/clientes");
    await expect(page.getByText("Todos os clientes do período")).toBeVisible();
    await expect(page.getByText(/Sem transações no período/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Integrações" })).toBeVisible();
    await expect(page.getByLabel("Buscar cliente")).toHaveCount(0);
  });
});
