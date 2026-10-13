import { describe, expect, it } from "vitest";
import {
  BASE_ZERADA,
  COLUNAS_PADRAO_TRAFEGO,
  METRICAS_TRAFEGO,
  metricaTrafego,
  normalizarColunas,
  resultadosDe,
} from "./metricas-trafego";

const base = {
  ...BASE_ZERADA,
  gasto: 100,
  impressoes: 10_000,
  cliques: 300,
  cliques_link: 200,
  visualizacoes_pagina: 150,
  inicios_checkout: 30,
  leads: 20,
  compras_plataforma: 5,
};

describe("resultadosDe", () => {
  it("segue o objetivo da campanha", () => {
    expect(resultadosDe("OUTCOME_SALES", base)).toBe(5);
    expect(resultadosDe("OUTCOME_LEADS", base)).toBe(20);
    expect(resultadosDe("OUTCOME_TRAFFIC", base)).toBe(200);
    expect(resultadosDe("OUTCOME_AWARENESS", base)).toBe(10_000);
    expect(resultadosDe("LINK_CLICKS", base)).toBe(200);
  });
  it("sem objetivo, usa compra, depois lead, depois clique", () => {
    expect(resultadosDe(null, base)).toBe(5);
    expect(resultadosDe(null, { ...base, compras_plataforma: 0 })).toBe(20);
    expect(resultadosDe(null, { ...base, compras_plataforma: 0, leads: 0 })).toBe(200);
  });
});

describe("métricas derivadas", () => {
  const calc = (chave: string) =>
    metricaTrafego(chave)?.calcular({ ...base, resultados: 5 });
  it("calcula CPM, CTR, CPC, connect rate e custos", () => {
    expect(calc("cpm")).toBe(10);
    expect(calc("ctr")).toBe(0.02);
    expect(calc("cpc")).toBe(0.5);
    expect(calc("connect_rate")).toBe(0.75);
    expect(calc("custo_lead")).toBe(5);
    expect(calc("custo_resultado")).toBe(20);
    expect(calc("taxa_checkout")).toBe(0.2);
  });
  it("divisão por zero vira null (mostrado como —)", () => {
    expect(metricaTrafego("ctr")?.calcular(BASE_ZERADA)).toBeNull();
    expect(metricaTrafego("custo_resultado")?.calcular(BASE_ZERADA)).toBeNull();
  });
  it("toda métrica do catálogo tem chave única", () => {
    const chaves = METRICAS_TRAFEGO.map((m) => m.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });
});

describe("normalizarColunas", () => {
  it("remove desconhecidas e repetidas; vazio volta ao padrão", () => {
    expect(normalizarColunas(["ctr", "x", "ctr", "gasto"])).toEqual(["ctr", "gasto"]);
    expect(normalizarColunas(["nada"])).toEqual(COLUNAS_PADRAO_TRAFEGO);
    expect(normalizarColunas([])).toEqual(COLUNAS_PADRAO_TRAFEGO);
  });
});
