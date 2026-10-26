import { describe, expect, it } from "vitest";
import {
  agruparPorMeioPagamento,
  agruparPorPais,
  paisDaMoeda,
  rotuloMeioPagamento,
  type VendaParaAgrupar,
} from "./pagamentos";

const vendas: VendaParaAgrupar[] = [
  { id: "v1", transacao_id: "t1", meio_pagamento: "PIX", moeda: "BRL", valor_bruto: 100 },
  { id: "v2", transacao_id: "t1", meio_pagamento: "PIX", moeda: "BRL", valor_bruto: 50 }, // bump da mesma transação
  { id: "v3", transacao_id: "t2", meio_pagamento: "CREDIT_CARD", moeda: "BRL", valor_bruto: 200 },
  { id: "v4", transacao_id: null, meio_pagamento: "CREDIT_CARD", moeda: "PYG", valor_bruto: 50 },
  { id: "v5", transacao_id: "t3", meio_pagamento: null, moeda: "USD", valor_bruto: 0 },
  { id: "v6", transacao_id: "t2", meio_pagamento: "CREDIT_CARD", moeda: "BRL", valor_bruto: 200, conta_item: false }, // renovação
];

describe("agruparPorMeioPagamento", () => {
  it("conta transações distintas, itens, faturamento, ticket e participação", () => {
    const grupos = agruparPorMeioPagamento(vendas);
    expect(grupos.map((g) => g.nome)).toEqual(["Cartão de crédito", "Pix", "Não informado"]);
    const cartao = grupos[0];
    expect(cartao.transacoes).toBe(2); // t2 e a venda sem transação (conta por si)
    expect(cartao.itens).toBe(2); // a renovação não é item
    expect(cartao.faturamento).toBe(450); // mas soma no valor
    expect(cartao.ticket_medio).toBe(225);
    expect(cartao.participacao).toBeCloseTo(450 / 600);
    const pix = grupos[1];
    expect(pix.transacoes).toBe(1);
    expect(pix.itens).toBe(2);
    expect(pix.ticket_medio).toBe(150);
  });

  it("sem vendas devolve lista vazia", () => {
    expect(agruparPorMeioPagamento([])).toEqual([]);
  });
});

describe("agruparPorPais", () => {
  it("estima o país pela moeda", () => {
    const grupos = agruparPorPais(vendas);
    expect(grupos.map((g) => g.nome)).toEqual([
      "Brasil",
      "Paraguai",
      "Dólar (país não informado)",
    ]);
    expect(grupos[0].faturamento).toBe(550);
  });
});

describe("rótulos", () => {
  it("traduz códigos conhecidos e suaviza os desconhecidos", () => {
    expect(rotuloMeioPagamento("TWO_CREDIT_CARDS")).toBe("Dois cartões de crédito");
    expect(rotuloMeioPagamento("SOME_NEW_METHOD")).toBe("some new method");
    expect(rotuloMeioPagamento(null)).toBe("Não informado");
    expect(paisDaMoeda("brl")).toBe("Brasil");
    expect(paisDaMoeda("XXX")).toBe("Moeda XXX");
    expect(paisDaMoeda(null)).toBe("Não informado");
  });
});
