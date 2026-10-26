import { describe, expect, it } from "vitest";
import { formatarDocumento, montarFicha, rotuloOrigem, type VendaFicha } from "./ficha-cliente";

const base: Omit<VendaFicha, "id" | "vendida_em" | "valor_bruto" | "origem" | "status"> = {
  id_externo: "x",
  plataforma: "greenn",
  produto: "Mentoria",
  oferta: "Mentoria 6x",
  moeda: "BRL",
  reembolsada_em: null,
  meio_pagamento: "CREDIT_CARD",
  parcelas: 6,
  cupom: null,
  taxa_gateway: 10,
  valor_parceiros: 0,
  utm: {},
  comissoes: [],
};

describe("montarFicha", () => {
  it("agrupa vendas por transação, soma totais e separa as soltas", () => {
    const ficha = montarFicha(
      {
        id: "c",
        nome: "Ana",
        email: "ana@x.com",
        telefone: null,
        cpf: "12345678901",
        plataforma: "greenn",
        id_externo: "1",
        cadastrado_em: "2026-01-01T00:00:00Z",
        primeira_compra_em: "2026-02-03T18:12:00Z",
        funil_entrada: "Mentoria",
      },
      [
        { id: "t1", inicio: "2026-02-03T18:12:00Z", ordem: 1, eh_recompra: false, funil: "Mentoria", valor_total: 1666, quantidade_vendas: 1 },
        { id: "t2", inicio: "2026-06-10T10:00:00Z", ordem: 2, eh_recompra: true, funil: null, valor_total: 37, quantidade_vendas: 1 },
      ],
      [
        { ...base, id: "v1", vendida_em: "2026-02-03T18:12:00Z", valor_bruto: 833, origem: "assinatura_primeira", status: "aprovada", transacao_id: "t1" },
        { ...base, id: "v2", vendida_em: "2026-03-03T17:19:00Z", valor_bruto: 833, origem: "recorrencia", status: "aprovada", transacao_id: "t1" },
        { ...base, id: "v3", vendida_em: "2026-06-10T10:00:00Z", valor_bruto: 37, origem: "unica", status: "reembolsada", transacao_id: "t2" },
        { ...base, id: "v4", vendida_em: "2026-07-03T17:19:00Z", valor_bruto: 833, origem: "recorrencia", status: "aprovada", transacao_id: null },
      ],
    );
    expect(ficha.totais).toEqual({
      transacoes: 2,
      itens: 2,
      gasto: 2536,
      cobrancas_recorrentes: 2,
      reembolsos: { quantidade: 1, valor: 37 },
      taxas_gateway: 40,
      parceiros: 0,
    });
    expect(ficha.transacoes.map((t) => t.id)).toEqual(["t2", "t1"]); // mais recente primeiro
    expect(ficha.transacoes[1].vendas.map((v) => v.id)).toEqual(["v1", "v2"]);
    expect(ficha.vendas_soltas.map((v) => v.id)).toEqual(["v4"]);
  });
});

describe("rótulos", () => {
  it("formata documento e origem", () => {
    expect(formatarDocumento("12345678901")).toBe("123.456.789-01");
    expect(formatarDocumento("12345678000190")).toBe("12.345.678/0001-90");
    expect(formatarDocumento(null)).toBe("—");
    expect(rotuloOrigem("recorrencia")).toBe("Cobrança recorrente");
    expect(rotuloOrigem("unica")).toBe("Compra");
  });
});
