import { expect, test } from "@playwright/test";

/**
 * Roteiro de aceite da Fase 1 (docs/plano-fase-1.md), de ponta a ponta.
 * Precisa de um Supabase real e de um usuário já criado (sem organização ou já membro):
 *   E2E_EMAIL=...  E2E_SENHA=...  pnpm test:e2e
 */
const email = process.env.E2E_EMAIL;
const senha = process.env.E2E_SENHA;

test.describe("Fase 1 — Fundação", () => {
  test.skip(
    !email || !senha,
    "Defina E2E_EMAIL e E2E_SENHA para rodar o teste de ponta a ponta.",
  );

  test("login, organização, configurações, categorias e funis", async ({ page }) => {
    const sufixo = Date.now().toString(36);

    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel("E-mail").fill(email!);
    await page.getByLabel("Senha").fill(senha!);
    await page.getByRole("button", { name: "Entrar" }).click();

    // Primeiro acesso: cria a organização. Acessos seguintes: já cai na Home.
    if (page.url().includes("/criar-organizacao")) {
      await page.getByLabel("Nome da empresa").fill(`Empresa ${sufixo}`);
      await page.getByRole("button", { name: "Criar empresa" }).click();
    }
    await expect(page).toHaveURL(/\/$/);

    // Categorias padrão
    await page.goto("/configuracoes/categorias");
    for (const nome of ["Iscas gratuitas", "Front-end", "Back-end", "High-end"]) {
      await expect(
        page.getByRole("cell", { name: nome, exact: true }).first(),
      ).toBeVisible();
    }

    // Nova categoria
    await page.getByLabel("Nome").fill(`Eventos ${sufixo}`);
    await page.getByRole("button", { name: "Criar categoria" }).click();
    await expect(page.getByRole("cell", { name: `Eventos ${sufixo}` })).toBeVisible();

    // Configurações gerais
    await page.goto("/configuracoes");
    await page.getByLabel("Taxa sobre anúncios (%)").fill("10");
    await page.getByLabel("Janela de transação (minutos)").fill("7");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Configurações salvas.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Taxa sobre anúncios (%)")).toHaveValue("10");
    await expect(page.getByLabel("Janela de transação (minutos)")).toHaveValue("7");

    // Lançamento sem datas é bloqueado pelo próprio navegador (required); com datas, salva.
    await page.goto("/configuracoes/funis/novo");
    await page.getByLabel("Nome do funil").fill(`Lançamento ${sufixo}`);
    await page.getByLabel("Tipo").selectOption("lancamento");
    await page.getByLabel("Início do lançamento").fill("2026-10-01");
    await page.getByLabel("Fim do lançamento").fill("2026-10-15");
    await page.getByRole("button", { name: "Criar funil" }).click();
    await expect(page).toHaveURL(/\/configuracoes\/funis\/[0-9a-f-]+\?criado=1/);
    await expect(page.getByText("Funil criado")).toBeVisible();
    await expect(page.getByText("As ofertas serão importadas da Greenn")).toBeVisible();

    // Funil de venda direta aparece na lista agrupada por categoria
    await page.goto("/configuracoes/funis/novo");
    await page.getByLabel("Nome do funil").fill(`Funil Desafio ${sufixo}`);
    await page.getByLabel("Meta de ROI (%)").fill("25");
    await page.getByRole("button", { name: "Criar funil" }).click();
    await page.goto("/configuracoes/funis");
    await expect(page.getByText(`Funil Desafio ${sufixo}`)).toBeVisible();
    await expect(page.getByText("meta de ROI 25%").first()).toBeVisible();

    // Sair
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
