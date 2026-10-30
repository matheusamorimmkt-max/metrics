import { describe, expect, it } from "vitest";
import { agruparPorUtm, contarComUtm, resumirUtm, type VendaComUtm } from "@/dominio/utm";

const vendas: VendaComUtm[] = [
  { id: "1", transacao_id: "t1", meio_pagamento: "PIX", moeda: "BRL", valor_bruto: 100, utm: { utm_source: "facebook", utm_medium: "cpc" } },
  { id: "2", transacao_id: "t1", meio_pagamento: "PIX", moeda: "BRL", valor_bruto: 50, utm: { utm_source: "facebook" } },
  { id: "3", transacao_id: "t2", meio_pagamento: "PIX", moeda: "BRL", valor_bruto: 70, utm: {} },
  { id: "4", transacao_id: "t3", meio_pagamento: "PIX", moeda: "BRL", valor_bruto: 30, utm: { utm_source: " " } },
];

describe("UTM", () => {
  it("agrupa pelo campo e manda vazio para 'Não informada'", () => {
    const g = agruparPorUtm(vendas, "utm_source");
    expect(g.map((x) => [x.nome, x.faturamento, x.transacoes, x.itens])).toEqual([
      ["facebook", 150, 1, 2],
      ["Não informada", 100, 2, 2],
    ]);
    expect(g[0].participacao).toBeCloseTo(0.6);
  });

  it("conta vendas com alguma UTM e resume todos os campos", () => {
    expect(contarComUtm(vendas)).toBe(2);
    const r = resumirUtm(vendas);
    expect(r.total).toBe(4);
    expect(r.por_campo.utm_medium.map((x) => x.nome)).toEqual(["Não informada", "cpc"]);
  });
});
