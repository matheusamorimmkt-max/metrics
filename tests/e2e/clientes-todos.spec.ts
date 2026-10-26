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

test.describe("Lista completa de clientes", () => {
  test.skip(!email || !senha, "Defina E2E_EMAIL e E2E_SENHA.");

  test("abre pela aba Clientes, busca e mostra a situação vazia", async ({ page }) => {
    await entrar(page);
    await page.goto("/clientes");
    await page.getByRole("link", { name: "Ver todos os clientes" }).click();
    await expect(page.getByRole("heading", { name: "Todos os clientes" })).toBeVisible();
    await page.getByLabel("Buscar cliente").fill("ninguem@teste.invalido");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByText(/Nenhum cliente/)).toBeVisible();
    await page.getByRole("link", { name: "Limpar" }).click();
    await expect(page).toHaveURL(/\/clientes\/todos$/);
  });
});
