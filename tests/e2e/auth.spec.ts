import { expect, test } from "@playwright/test";

/**
 * Telas públicas de autenticação. Precisa só do app no ar com as variáveis do Supabase;
 * não faz login nem envia e-mail.
 */
test.describe("Autenticação — telas públicas", () => {
  test("login mostra e oculta a senha digitada", async ({ page }) => {
    await page.goto("/login");
    const senha = page.getByLabel("Senha", { exact: true });
    await senha.fill("segredo123");
    await expect(senha).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "Mostrar senha" }).click();
    await expect(senha).toHaveAttribute("type", "text");
    await expect(senha).toHaveValue("segredo123");

    await page.getByRole("button", { name: "Ocultar senha" }).click();
    await expect(senha).toHaveAttribute("type", "password");
  });

  test("login leva para a recuperação de senha", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Esqueci minha senha" }).click();
    await expect(page).toHaveURL(/\/esqueci-senha$/);
    await expect(page.getByText("Esqueci minha senha", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Enviar link de recuperação" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Voltar para o login" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("recuperação rejeita e-mail inválido sem sair da tela", async ({ page }) => {
    await page.goto("/esqueci-senha");
    // O navegador bloqueia e-mail inválido via type=email; o Zod cobre o servidor.
    await page.getByLabel("E-mail").fill("nao-e-email");
    await page.getByRole("button", { name: "Enviar link de recuperação" }).click();
    await expect(page).toHaveURL(/\/esqueci-senha$/);
    await expect(page.getByLabel("E-mail")).toBeVisible();
  });

  test("link de recuperação inválido volta ao login com aviso", async ({ page }) => {
    await page.goto("/auth/recuperar");
    await expect(page).toHaveURL(/\/login\?erro=/);
    await expect(page.getByText("Este link de recuperação expirou")).toBeVisible();
  });
});
