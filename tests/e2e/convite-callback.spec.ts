import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// O convite (template padrão do Supabase) chega em /auth/callback com a sessão no
// fragmento da URL. Reproduz esse caminho: gera um magic link para o usuário e2e, deixa
// o Supabase validá-lo (responde 303 com os tokens no fragmento) e abre o fragmento no
// callback local. Precisa de SUPABASE_SERVICE_ROLE_KEY e E2E_EMAIL em .env.local.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.E2E_EMAIL;

test.describe("link de e-mail com tokens no fragmento", () => {
  test.skip(!url || !chave || !email, "precisa de SUPABASE_SERVICE_ROLE_KEY e E2E_EMAIL");

  test("cria a sessão e segue para o app", async ({ page }) => {
    const admin = createClient(url!, chave!);
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: email! });
    expect(error).toBeNull();
    const resposta = await fetch(data.properties!.action_link, { redirect: "manual" });
    const fragmento = new URL(resposta.headers.get("location")!).hash;
    expect(fragmento).toContain("access_token=");

    await page.goto("/auth/callback" + fragmento);
    await page.waitForURL((u) => !u.pathname.startsWith("/auth/"), { timeout: 30_000 });
    await expect(page).toHaveURL(/\/$/);
    const cookies = (await page.context().cookies()).map((c) => c.name);
    expect(cookies.some((n) => n.startsWith("sb-"))).toBe(true);
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("sem tokens mostra que o link expirou", async ({ page }) => {
    await page.goto("/auth/callback");
    await expect(page.getByText("Este link expirou ou já foi usado")).toBeVisible();
  });
});
