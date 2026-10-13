import { expect, test, type Page } from "@playwright/test";

/**
 * Roteiro das Fases 2 a 5 (telas de produtos, ofertas, campanhas, integrações,
 * Home com dados reais, Funis e abas secundárias). Roda sem nenhum conector
 * ligado: confere que cada tela abre, mostra os indicadores zerados e explica
 * como conectar. Precisa de um Supabase real e de um usuário já criado:
 *   E2E_EMAIL=...  E2E_SENHA=...  pnpm test:e2e
 */
const email = process.env.E2E_EMAIL;
const senha = process.env.E2E_SENHA;

async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email!);
  await page.getByLabel("Senha", { exact: true }).fill(senha!);
  await page.getByRole("button", { name: "Entrar" }).click();
  // Primeiro acesso: cria a organização. Acessos seguintes: já cai na Home.
  const nomeEmpresa = page.getByLabel("Nome da empresa");
  const home = page.getByRole("group", { name: "Período" });
  await expect(nomeEmpresa.or(home)).toBeVisible({ timeout: 30_000 });
  if (await nomeEmpresa.isVisible()) {
    await nomeEmpresa.fill(`Empresa e2e ${Date.now().toString(36)}`);
    await page.getByRole("button", { name: "Criar empresa" }).click();
    await expect(home).toBeVisible({ timeout: 30_000 });
  }
}

test.describe("Fases 2 a 5 — telas com conectores desligados", () => {
  test.skip(
    !email || !senha,
    "Defina E2E_EMAIL e E2E_SENHA para rodar o teste de ponta a ponta.",
  );

  test.beforeEach(async ({ page }) => {
    await entrar(page);
  });

  test("Home mostra os indicadores, o aviso de integrações e o seletor de período", async ({
    page,
  }) => {
    for (const nome of [
      "Investimento",
      "Faturamento bruto",
      "Receita líquida",
      "Lucro",
      "ROAS",
      "ROI",
      "Transações",
      "Ticket médio",
      "CAC",
    ]) {
      await expect(page.getByText(nome, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText("Por categoria e funil")).toBeVisible();
    await expect(page.getByRole("group", { name: "Período" })).toBeVisible();

    // Sem credenciais, a Home avisa e leva para Integrações.
    await expect(
      page.getByText(
        "Os dados serão preenchidos quando as integrações estiverem conectadas",
      ),
    ).toBeVisible();

    // O período vive na URL.
    await page.getByRole("button", { name: "7 dias", exact: true }).click();
    await expect(page).toHaveURL(/periodo=7d/);
    await page.getByRole("button", { name: "Mês passado", exact: true }).click();
    await expect(page).toHaveURL(/periodo=mes_anterior/);

    await page.getByRole("link", { name: "Conectar integrações" }).click();
    await expect(page).toHaveURL(/\/configuracoes\/integracoes$/);
  });

  test("Integrações pede token da Greenn com prefixo grn_live_ e token + conta do Meta", async ({
    page,
  }) => {
    await page.goto("/configuracoes/integracoes");
    await expect(
      page.getByRole("heading", { name: "Gateways de pagamento" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Fontes de tráfego" })).toBeVisible();
    for (const nome of ["Hotmart", "Kiwify", "Eduzz", "Google Ads"]) {
      await expect(page.getByRole("button", { name: `Conectar ${nome}` })).toBeDisabled();
    }
    await expect(page.getByText("CRM", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Token da API")).toBeVisible();
    await expect(page.getByLabel("Token de acesso")).toBeVisible();
    await expect(page.getByLabel("ID da conta de anúncios")).toBeVisible();

    // Token da Greenn no formato errado é recusado no servidor sem gravar nada.
    await page.getByLabel("Token da API").fill("$2y$10$tokenDeWebhookNaoServe");
    await page.getByRole("button", { name: "Conectar Greenn" }).click();
    await expect(page.getByText(/grn_live_/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Conectar Greenn" })).toBeVisible();
  });

  test("menu lateral cobre todas as seções e configurações não repetem no topo", async ({
    page,
  }) => {
    for (const rotulo of [
      "Home",
      "Funis",
      "Tráfego",
      "Vendas",
      "Clientes",
      "Configurações",
    ]) {
      await expect(
        page.getByRole("link", { name: rotulo, exact: true }).first(),
      ).toBeVisible();
    }
    await page.getByRole("link", { name: "Configurações", exact: true }).first().click();
    await expect(page).toHaveURL(/\/configuracoes$/);
    for (const rotulo of [
      "Geral",
      "Categorias",
      "Produtos",
      "Ofertas",
      "Campanhas",
      "Usuários",
      "Integrações",
    ]) {
      await expect(
        page.getByRole("link", { name: rotulo, exact: true }).first(),
      ).toBeVisible();
    }
    // As abas de configuração aparecem só no menu lateral (nav), não em outra barra.
    const navs = page.getByRole("navigation");
    expect(await navs.count()).toBeLessThanOrEqual(1);
  });

  test("Produtos, Ofertas e Campanhas explicam que os dados vêm dos conectores", async ({
    page,
  }) => {
    await page.goto("/configuracoes/produtos");
    await expect(page.getByText("Produtos", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText(/Conecte a Greenn|Nenhum produto importado/),
    ).toBeVisible();

    await page.goto("/configuracoes/ofertas");
    await expect(page.getByText("Ofertas", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText(/Conecte a Greenn|Nenhuma oferta importada/),
    ).toBeVisible();

    await page.goto("/configuracoes/campanhas");
    await expect(page.getByText("Campanhas", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText(/Conecte o Meta Ads|Nenhuma campanha importada/),
    ).toBeVisible();
  });

  test("Funis lista os funis cadastrados e abre o detalhe com as etapas", async ({
    page,
  }) => {
    const sufixo = Date.now().toString(36);
    await page.goto("/configuracoes/funis/novo");
    await page.getByLabel("Nome do funil").fill(`Funil e2e ${sufixo}`);
    await page.getByRole("button", { name: "Criar funil" }).click();
    await page.waitForURL(/\/configuracoes\/funis\/[0-9a-f-]+\?criado=1/);

    await page.goto("/funis");
    await expect(page.getByRole("heading", { name: "Funis" })).toBeVisible();
    await page
      .getByRole("link", { name: `Funil e2e ${sufixo}` })
      .first()
      .click();
    await expect(page).toHaveURL(/\/funis\/[0-9a-f-]+/);
    await expect(
      page.getByRole("heading", { name: `Funil e2e ${sufixo}` }),
    ).toBeVisible();
    await expect(page.getByText("Etapas do funil")).toBeVisible();
    await expect(page.getByText("Sem movimento no período").first()).toBeVisible();
    await expect(page.getByText("Campanhas vinculadas")).toBeVisible();
  });

  test("Tráfego, Vendas e Clientes abrem zerados e apontam para Integrações", async ({
    page,
  }) => {
    await page.goto("/trafego");
    await expect(page.getByRole("heading", { name: "Tráfego" })).toBeVisible();
    await expect(page.getByText("Sem dados de anúncios no período")).toBeVisible();
    await page.getByRole("link", { name: "Anúncios", exact: true }).click();
    await expect(page).toHaveURL(/nivel=anuncio/);

    await page.goto("/vendas");
    await expect(page.getByRole("heading", { name: "Vendas" })).toBeVisible();
    await expect(page.getByText("Sem vendas no período")).toBeVisible();

    await page.goto("/clientes");
    await expect(
      page.getByRole("heading", { name: "Clientes", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Sem transações no período").first()).toBeVisible();
    await page.getByRole("link", { name: "Integrações", exact: true }).last().click();
    await expect(page).toHaveURL(/\/configuracoes\/integracoes$/);
  });
});
