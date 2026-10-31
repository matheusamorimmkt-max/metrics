import { describe, expect, it } from "vitest";
import { calcularMetricas, ENTRADA_ZERADA, formatarMetrica } from "./metricas";

describe("calcularMetricas", () => {
  it("segue o modelo financeiro do PRD", () => {
    const m = calcularMetricas({
      gasto_anuncios: 1000,
      taxa_anuncios: 0.1215,
      faturamento_bruto: 5000,
      reembolsos: 200,
      taxas_gateway: 250,
      parceiros: 300,
      impostos: 270,
      transacoes: 50,
      clientes_novos: 40,
      vendas: 60,
      clientes_unicos: 45,
      clientes_recorrentes: 9,
      faturamento_recompra: 1250,
      ciclo_recompra_dias: 31.4,
    });
    expect(m.itens_por_transacao).toBeCloseTo(60 / 50, 6);
    expect(m.ciclo_recompra_dias).toBe(31.4);
    expect(formatarMetrica(1.2, "decimal")).toBe("1,2");
    expect(formatarMetrica(31.4, "dias")).toBe("31 dias");
    expect(formatarMetrica(1, "dias")).toBe("1 dia");
    expect(m.investimento).toBe(1121.5);
    expect(m.faturamento_recompra).toBe(1250);
    expect(m.percentual_recompra).toBeCloseTo(0.25, 6);
    expect(m.taxa_reembolso).toBeCloseTo(200 / 5000, 6);
    expect(m.itens).toBe(60);
    expect(m.clientes_unicos).toBe(45);
    expect(m.clientes_novos).toBe(40);
    expect(m.clientes_recorrentes).toBe(9);
    expect(m.taxa_recompra).toBeCloseTo(9 / 45, 6);
    expect(m.ltv).toBeCloseTo(5000 / 45, 6);
    expect(m.receita_liquida).toBe(3980);
    expect(m.lucro).toBe(2858.5);
    expect(m.roas).toBeCloseTo(5000 / 1121.5, 6);
    expect(m.roi).toBeCloseTo(2858.5 / 1121.5, 6);
    expect(m.ticket_medio).toBe(100);
    expect(m.cac).toBeCloseTo(1121.5 / 40, 6);
    expect(m.margem).toBeCloseTo(2858.5 / 5000, 6);
    expect(m.lucro_por_transacao).toBeCloseTo(2858.5 / 50, 6);
  });

  it("sem dados: valores zerados e razões indefinidas, nunca divisão por zero", () => {
    const m = calcularMetricas(ENTRADA_ZERADA);
    expect(m.investimento).toBe(0);
    expect(m.faturamento_bruto).toBe(0);
    expect(m.lucro).toBe(0);
    expect(m.roas).toBeNull();
    expect(m.roi).toBeNull();
    expect(m.ticket_medio).toBeNull();
    expect(m.cac).toBeNull();
    expect(m.taxa_reembolso).toBeNull();
    expect(m.taxa_recompra).toBeNull();
    expect(m.ltv).toBeNull();
  });

  it("prejuízo dá lucro negativo e ROI negativo", () => {
    const m = calcularMetricas({
      ...ENTRADA_ZERADA,
      gasto_anuncios: 1000,
      faturamento_bruto: 500,
    });
    expect(m.lucro).toBe(-500);
    expect(m.roi).toBe(-0.5);
  });
});

describe("formatarMetrica", () => {
  it("formata moeda, multiplicador, percentual e inteiro em pt-BR", () => {
    expect(formatarMetrica(1234.5, "moeda")).toMatch(/R\$\s?1\.234,50/);
    expect(formatarMetrica(2.5, "multiplicador")).toBe("2,50x");
    expect(formatarMetrica(0.2, "percentual")).toBe("20,0%");
    expect(formatarMetrica(1234, "inteiro")).toBe("1.234");
    expect(formatarMetrica(null, "moeda")).toBe("—");
  });
});
