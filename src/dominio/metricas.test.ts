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
    });
    expect(m.investimento).toBe(1121.5);
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
    expect(formatarMetrica(2.5, "multiplicador")).toBe("2,50×");
    expect(formatarMetrica(0.2, "percentual")).toBe("20,0%");
    expect(formatarMetrica(1234, "inteiro")).toBe("1.234");
    expect(formatarMetrica(null, "moeda")).toBe("—");
  });
});
