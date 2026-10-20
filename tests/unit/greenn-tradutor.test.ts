import { describe, expect, it } from "vitest";
import {
  lerCliente,
  lerComissoes,
  lerUtm,
  traduzirOferta,
  traduzirProduto,
  traduzirStatus,
  traduzirVenda,
} from "../../supabase/functions/_shared/greenn/tradutor.ts";
import {
  ClienteGreenn,
  ErroGreenn,
} from "../../supabase/functions/_shared/greenn/cliente.ts";

describe("traduzirVenda", () => {
  const base = {
    id: 123,
    status: "paid",
    amount: 97,
    total: 103.5,
    currency: "BRL",
    method: "CREDIT_CARD",
    installments: 3,
    type: "TRANSACTION",
    created_at: "2026-09-01T12:00:00.000000Z",
    paid_at: "2026-09-01T12:05:00.000000Z",
    refunded_at: null,
    product_id: 10,
    client_id: 555,
    offer_id: 77,
    affiliate_id: null,
    coupon_code: "PROMO",
    client: {
      id: 555,
      name: "Fulano",
      email: " Fulano@Exemplo.COM ",
      cpf_cnpj: "123.456.789-01",
      cellphone: "+5511999990000",
    },
    participants: [
      { id: 9, name: "Coprodutor", type: "coproducer", amount: 10.5 },
      {
        user_id: 1,
        name: "Vendedor",
        type: "seller",
        commission_amount: 5.84,
        commission_percentage: 6.02,
      },
    ],
    saleMetas: [
      { meta_key: "utm_source", meta_value: "facebook" },
      { meta_key: "x", meta_value: "y" },
    ],
  };

  it("mapeia uma venda paga com cliente, comissões e utm", () => {
    const v = traduzirVenda(base);
    expect(v).not.toBeNull();
    expect(v).toMatchObject({
      id_externo: "123",
      status: "aprovada",
      reembolso_pendente: false,
      origem: "unica",
      valor_bruto: 97,
      taxa_gateway: 5.84,
      taxa_gateway_origem: "gateway",
      valor_parceiros: 10.5,
      moeda: "BRL",
      meio_pagamento: "CREDIT_CARD",
      parcelas: 3,
      cupom: "PROMO",
      oferta_id_externo: "77",
      produto_id_externo: "10",
      vendida_em: "2026-09-01T12:05:00.000000Z",
      reembolsada_em: null,
      utm: { utm_source: "facebook" },
    });
    expect(v?.cliente).toEqual({
      id_externo: "555",
      email: "fulano@exemplo.com",
      nome: "Fulano",
      cpf: "12345678901",
      telefone: "+5511999990000",
    });
    expect(v?.comissoes).toHaveLength(1);
    expect(v?.comissoes[0]).toMatchObject({
      tipo: "coprodutor",
      valor: 10.5,
      parceiro_nome: "Coprodutor",
    });
  });

  it("sem participante seller nem fee, a taxa fica desconhecida", () => {
    const v = traduzirVenda({ ...base, participants: [] });
    expect(v?.taxa_gateway).toBe(0);
    expect(v?.taxa_gateway_origem).toBe("desconhecida");
    expect(v?.valor_parceiros).toBe(0);
  });

  it("fee (webhook) tem prioridade sobre o participante seller", () => {
    const v = traduzirVenda({ ...base, fee: "2.91" });
    expect(v?.taxa_gateway).toBe(2.91);
    expect(v?.taxa_gateway_origem).toBe("gateway");
  });

  it("reembolso entra com a data do reembolso; chargeback idem", () => {
    const r = traduzirVenda({
      ...base,
      status: "refunded",
      refunded_at: "2026-09-05T10:00:00Z",
    });
    expect(r).toMatchObject({
      status: "reembolsada",
      reembolsada_em: "2026-09-05T10:00:00Z",
    });
    const c = traduzirVenda({
      ...base,
      status: "chargedback",
      refunded_at: null,
      updated_at: "2026-09-09T00:00:00Z",
    });
    expect(c).toMatchObject({
      status: "chargeback",
      reembolsada_em: "2026-09-09T00:00:00Z",
    });
    expect(traduzirVenda({ ...base, status: "refund_pending" })).toMatchObject({
      status: "aprovada",
      reembolso_pendente: true,
    });
  });

  it("ignora vendas nunca pagas", () => {
    expect(traduzirVenda({ ...base, status: "waiting_payment" })).toBeNull();
    expect(traduzirVenda({ ...base, status: "refused" })).toBeNull();
    expect(traduzirVenda({ ...base, status: "unpaid" })).toBeNull();
  });

  it("assinatura: primeira cobrança vs renovação", () => {
    expect(
      traduzirVenda({ ...base, type: "SUBSCRIPTION", subscription_id: 5 })?.origem,
    ).toBe("assinatura_primeira");
    expect(
      traduzirVenda({
        ...base,
        type: "SUBSCRIPTION",
        subscription_id: 5,
        charge_number: 3,
      })?.origem,
    ).toBe("recorrencia");
  });

  it("sem offer_id devolve null no campo, para o conector criar a oferta sintética", () => {
    expect(traduzirVenda({ ...base, offer_id: null })?.oferta_id_externo).toBeNull();
  });
});

describe("tradutores auxiliares", () => {
  it("status", () => {
    expect(traduzirStatus("PAID")).toEqual({ status: "aprovada", pendente: false });
    expect(traduzirStatus("nada")).toBeNull();
  });
  it("produto e oferta", () => {
    expect(traduzirProduto({ id: 1, name: "Curso", is_active: false })).toEqual({
      id_externo: "1",
      nome: "Curso",
      ativo: false,
    });
    expect(
      traduzirOferta({
        id: 2,
        product_id: 1,
        name: "Oferta",
        amount: "97.00",
        status: "approved",
        active: true,
      }),
    ).toEqual({
      id_externo: "2",
      produto_id_externo: "1",
      nome: "Oferta",
      preco: 97,
      ativo: true,
    });
    expect(traduzirOferta({ id: 3 })).toBeNull();
  });
  it("cliente sem e-mail válido vira null (o conector não grava a venda)", () => {
    expect(lerCliente({ id: 1, client: { email: "sem-arroba" } }).email).toBeNull();
    expect(lerCliente({ id: 1, client_id: 7 }).id_externo).toBe("7");
  });
  it("comissões ignoram valores zero e aceitam afiliado separado", () => {
    expect(
      lerComissoes({
        id: 1,
        participants: [{ amount: 0 }],
        affiliate: { id: 3, name: "Af", commission: 5 },
      }),
    ).toEqual([
      { tipo: "afiliado", parceiro_id_externo: "3", parceiro_nome: "Af", valor: 5 },
    ]);
  });
  it("utm em objeto", () => {
    expect(lerUtm({ id: 1, saleMetas: { utm_campaign: "c1", outro: "x" } })).toEqual({
      utm_campaign: "c1",
    });
  });
});

describe("ClienteGreenn", () => {
  function fetchFalso(
    respostas: { status: number; corpo: unknown; headers?: Record<string, string> }[],
  ) {
    const chamadas: string[] = [];
    const fn = (async (url: string) => {
      chamadas.push(url);
      const r = respostas.shift() ?? { status: 500, corpo: {} };
      return new Response(JSON.stringify(r.corpo), {
        status: r.status,
        headers: r.headers,
      });
    }) as unknown as typeof fetch;
    return { fn, chamadas };
  }

  it("pagina por meta.last_page e passa filtros no formato filter[campo]", async () => {
    const { fn, chamadas } = fetchFalso([
      { status: 200, corpo: { data: [{ id: 1 }], meta: { last_page: 2 } } },
      { status: 200, corpo: { data: [{ id: 2 }], meta: { last_page: 2 } } },
    ]);
    const cliente = new ClienteGreenn({
      token: "grn_live_x",
      fetch: fn,
      esperar: async () => {},
    });
    const lotes: number[] = [];
    const proxima = await cliente.vendas({ paid_after: "2026-01-01" }, async (l) => {
      lotes.push(l.length);
    });
    expect(proxima).toBeNull();
    expect(lotes).toEqual([1, 1]);
    expect(chamadas[0]).toContain(
      "/sales?filter%5Bpaid_after%5D=2026-01-01".replace("%5B", "[").replace("%5D", "]"),
    );
    expect(chamadas[0]).toContain("page=1&per_page=100");
    expect(chamadas[1]).toContain("page=2");
  });

  it("para quando o callback devolve false e informa a próxima página", async () => {
    const { fn } = fetchFalso([
      { status: 200, corpo: { data: [{ id: 1 }], meta: { last_page: 3 } } },
    ]);
    const cliente = new ClienteGreenn({ token: "t", fetch: fn, esperar: async () => {} });
    const proxima = await cliente.paginar("/sales", async () => false);
    expect(proxima).toBe(2);
  });

  it("espera Retry-After em 429 e não repete em 401", async () => {
    const limite = fetchFalso([
      { status: 429, corpo: {}, headers: { "retry-after": "3" } },
      { status: 200, corpo: { data: [] } },
    ]);
    const esperas: number[] = [];
    const cliente = new ClienteGreenn({
      token: "t",
      fetch: limite.fn,
      esperar: async (ms) => {
        esperas.push(ms);
      },
    });
    await cliente.get("/products");
    expect(esperas).toEqual([3000]);

    const invalido = fetchFalso([
      { status: 401, corpo: { error: { code: "INVALID_TOKEN", message: "x" } } },
    ]);
    const c2 = new ClienteGreenn({
      token: "t",
      fetch: invalido.fn,
      esperar: async () => {},
    });
    const erro = await c2.get("/products").catch((e) => e);
    expect(erro).toBeInstanceOf(ErroGreenn);
    expect((erro as ErroGreenn).credencialInvalida).toBe(true);
    expect(invalido.chamadas.length).toBe(1);
  });

  it("segura abaixo de 100 chamadas por minuto", async () => {
    let relogio = 0;
    const respostas = Array.from({ length: 96 }, () => ({
      status: 200,
      corpo: { ok: true },
    }));
    const { fn } = fetchFalso(respostas);
    const esperas: number[] = [];
    const cliente = new ClienteGreenn({
      token: "t",
      fetch: fn,
      agora: () => relogio,
      esperar: async (ms) => {
        esperas.push(ms);
        relogio += ms;
      },
    });
    for (let i = 0; i < 96; i++) await cliente.get("/x");
    expect(esperas.length).toBe(1);
    expect(esperas[0]).toBeGreaterThan(0);
  });
});
