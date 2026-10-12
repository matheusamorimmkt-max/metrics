import { describe, expect, it } from "vitest";
import {
  fatiarPeriodo,
  somarDias,
  traduzirCampanha,
  traduzirConta,
  traduzirInsight,
} from "../../supabase/functions/_shared/meta/tradutor.ts";
import { ClienteMeta, ErroMeta } from "../../supabase/functions/_shared/meta/cliente.ts";

describe("traduzirInsight", () => {
  it("mapeia campos e ações do pixel para o formato interno", () => {
    const m = traduzirInsight({
      campaign_id: "c1",
      campaign_name: "Campanha 1",
      adset_id: "s1",
      adset_name: "Conjunto 1",
      ad_id: "a1",
      ad_name: "Anúncio 1",
      date_start: "2026-10-01",
      date_stop: "2026-10-01",
      spend: "123.456",
      impressions: "1000",
      reach: "800",
      clicks: "60",
      inline_link_clicks: "50",
      actions: [
        { action_type: "link_click", value: "50" },
        { action_type: "landing_page_view", value: "40" },
        { action_type: "omni_initiated_checkout", value: "7" },
        { action_type: "initiate_checkout", value: "7" },
        { action_type: "lead", value: "3" },
        { action_type: "purchase", value: "2" },
      ],
    });
    expect(m).not.toBeNull();
    expect(m).toMatchObject({
      campanha_id_externo: "c1",
      conjunto_id_externo: "s1",
      anuncio_id_externo: "a1",
      data: "2026-10-01",
      gasto: 123.46,
      impressoes: 1000,
      alcance: 800,
      cliques: 60,
      cliques_link: 50,
      visualizacoes_pagina: 40,
      inicios_checkout: 7,
      leads: 3,
      compras_plataforma: 2,
    });
  });

  it("sem ações e sem campos opcionais vira zero, nunca NaN", () => {
    const m = traduzirInsight({ campaign_id: "c1", date_start: "2026-10-01" });
    expect(m).toMatchObject({
      gasto: 0,
      impressoes: 0,
      cliques_link: 0,
      leads: 0,
      conjunto_id_externo: "",
      anuncio_id_externo: "",
    });
  });

  it("ignora linha sem campanha", () => {
    expect(traduzirInsight({ date_start: "2026-10-01" })).toBeNull();
  });
});

describe("traduzirCampanha e traduzirConta", () => {
  it("usa effective_status e marca ativo só quando ACTIVE", () => {
    expect(traduzirCampanha({ id: "1", name: "X", status: "ACTIVE", effective_status: "PAUSED" })).toMatchObject({
      status: "PAUSED",
      ativo: false,
    });
    expect(traduzirCampanha({ id: "2", status: "ACTIVE" }).ativo).toBe(true);
  });

  it("normaliza o id da conta com prefixo act_", () => {
    expect(traduzirConta({ id: "act_1", name: "Conta", currency: "brl" })).toMatchObject({
      id_externo: "act_1",
      moeda: "BRL",
    });
    expect(traduzirConta({ id: "1", account_id: "1" }).id_externo).toBe("act_1");
  });
});

describe("fatiarPeriodo e somarDias", () => {
  it("divide em fatias de 30 dias sem buracos nem sobreposição", () => {
    const fatias = fatiarPeriodo("2026-01-01", "2026-03-05", 30);
    expect(fatias).toEqual([
      { desde: "2026-01-01", ate: "2026-01-30" },
      { desde: "2026-01-31", ate: "2026-03-01" },
      { desde: "2026-03-02", ate: "2026-03-05" },
    ]);
    expect(somarDias("2026-02-28", 1)).toBe("2026-03-01");
    expect(somarDias("2026-03-01", -7)).toBe("2026-02-22");
  });
});

describe("ClienteMeta", () => {
  function fetchFalso(respostas: { status: number; corpo: unknown }[]) {
    const chamadas: string[] = [];
    const fn = (async (url: string) => {
      chamadas.push(url);
      const r = respostas.shift() ?? { status: 500, corpo: {} };
      return new Response(JSON.stringify(r.corpo), { status: r.status });
    }) as unknown as typeof fetch;
    return { fn, chamadas };
  }

  it("pagina por paging.next e não duplica o token", async () => {
    const { fn, chamadas } = fetchFalso([
      { status: 200, corpo: { data: [{ id: "1" }], paging: { next: "https://graph.facebook.com/x?after=1&access_token=t" } } },
      { status: 200, corpo: { data: [{ id: "2" }] } },
    ]);
    const cliente = new ClienteMeta({ token: "t", fetch: fn, esperar: async () => {} });
    const lotes: unknown[][] = [];
    const total = await cliente.paginar("/act_1/campaigns", async (l) => {
      lotes.push(l);
    });
    expect(total).toBe(2);
    expect(lotes.length).toBe(2);
    expect(chamadas[0]).toContain("access_token=t");
    expect(chamadas[1]).toBe("https://graph.facebook.com/x?after=1&access_token=t");
  });

  it("espera e repete em limite de uso; falha de credencial não repete", async () => {
    const limite = fetchFalso([
      { status: 400, corpo: { error: { message: "limite", code: 17 } } },
      { status: 200, corpo: { id: "act_1" } },
    ]);
    const esperas: number[] = [];
    const cliente = new ClienteMeta({
      token: "t",
      fetch: limite.fn,
      esperar: async (ms) => {
        esperas.push(ms);
      },
    });
    await expect(cliente.get("/act_1")).resolves.toEqual({ id: "act_1" });
    expect(esperas).toEqual([2000]);

    const invalido = fetchFalso([
      { status: 400, corpo: { error: { message: "Invalid OAuth access token.", code: 190, type: "OAuthException" } } },
    ]);
    const cliente2 = new ClienteMeta({ token: "t", fetch: invalido.fn, esperar: async () => {} });
    const erro = await cliente2.get("/act_1").catch((e) => e);
    expect(erro).toBeInstanceOf(ErroMeta);
    expect((erro as ErroMeta).credencialInvalida).toBe(true);
    expect(invalido.chamadas.length).toBe(1);
  });
});
