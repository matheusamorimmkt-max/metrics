/**
 * Métricas da aba Tráfego: catálogo, cálculo e colunas padrão. Uma linha pode ser
 * campanha, conjunto ou anúncio; os números base vêm somados por dia.
 */
import type { FormatoMetrica } from "./metricas";

export type BaseTrafego = {
  gasto: number;
  impressoes: number;
  cliques: number;
  cliques_link: number;
  visualizacoes_pagina: number;
  inicios_checkout: number;
  leads: number;
  compras_plataforma: number;
  /** Resultados conforme o objetivo da campanha (vendas, leads, tráfego…). */
  resultados: number;
};

export const BASE_ZERADA: BaseTrafego = {
  gasto: 0,
  impressoes: 0,
  cliques: 0,
  cliques_link: 0,
  visualizacoes_pagina: 0,
  inicios_checkout: 0,
  leads: 0,
  compras_plataforma: 0,
  resultados: 0,
};

export type MetricaTrafego = {
  chave: string;
  nome: string;
  descricao: string;
  formato: FormatoMetrica;
  grupo: "Desempenho" | "Cliques e tráfego" | "Conversões" | "Resultados";
  calcular: (b: BaseTrafego) => number | null;
};

const razao = (num: number, den: number) => (den > 0 ? num / den : null);

export const METRICAS_TRAFEGO: MetricaTrafego[] = [
  {
    chave: "gasto",
    nome: "Valor gasto",
    descricao: "Gasto no gerenciador, sem o imposto sobre anúncios.",
    formato: "moeda",
    grupo: "Desempenho",
    calcular: (b) => b.gasto,
  },
  {
    chave: "impressoes",
    nome: "Impressões",
    descricao: "Vezes que o anúncio apareceu.",
    formato: "inteiro",
    grupo: "Desempenho",
    calcular: (b) => b.impressoes,
  },
  {
    chave: "cpm",
    nome: "CPM",
    descricao: "Custo por mil impressões.",
    formato: "moeda",
    grupo: "Desempenho",
    calcular: (b) => (b.impressoes > 0 ? (b.gasto / b.impressoes) * 1000 : null),
  },
  {
    chave: "resultados",
    nome: "Resultados",
    descricao:
      "Conforme o objetivo da campanha: compras, leads, cliques no link ou impressões.",
    formato: "inteiro",
    grupo: "Resultados",
    calcular: (b) => b.resultados,
  },
  {
    chave: "custo_resultado",
    nome: "Custo por resultado",
    descricao: "Gasto dividido pelos resultados.",
    formato: "moeda",
    grupo: "Resultados",
    calcular: (b) => razao(b.gasto, b.resultados),
  },
  {
    chave: "cliques",
    nome: "Cliques (todos)",
    descricao: "Todos os cliques no anúncio.",
    formato: "inteiro",
    grupo: "Cliques e tráfego",
    calcular: (b) => b.cliques,
  },
  {
    chave: "cliques_link",
    nome: "Cliques no link",
    descricao: "Cliques que saem para o site.",
    formato: "inteiro",
    grupo: "Cliques e tráfego",
    calcular: (b) => b.cliques_link,
  },
  {
    chave: "ctr",
    nome: "CTR",
    descricao: "Cliques no link divididos pelas impressões.",
    formato: "percentual",
    grupo: "Cliques e tráfego",
    calcular: (b) => razao(b.cliques_link, b.impressoes),
  },
  {
    chave: "cpc",
    nome: "CPC",
    descricao: "Custo por clique no link.",
    formato: "moeda",
    grupo: "Cliques e tráfego",
    calcular: (b) => razao(b.gasto, b.cliques_link),
  },
  {
    chave: "visualizacoes_pagina",
    nome: "Visualizações de página",
    descricao: "Pessoas que carregaram a página de destino.",
    formato: "inteiro",
    grupo: "Cliques e tráfego",
    calcular: (b) => b.visualizacoes_pagina,
  },
  {
    chave: "custo_pagina",
    nome: "Custo por visualização de página",
    descricao: "Gasto dividido pelas visualizações de página.",
    formato: "moeda",
    grupo: "Cliques e tráfego",
    calcular: (b) => razao(b.gasto, b.visualizacoes_pagina),
  },
  {
    chave: "connect_rate",
    nome: "Connect rate",
    descricao: "Visualizações de página divididas pelos cliques no link.",
    formato: "percentual",
    grupo: "Cliques e tráfego",
    calcular: (b) => razao(b.visualizacoes_pagina, b.cliques_link),
  },
  {
    chave: "leads",
    nome: "Leads",
    descricao: "Cadastros reportados pela plataforma.",
    formato: "inteiro",
    grupo: "Conversões",
    calcular: (b) => b.leads,
  },
  {
    chave: "custo_lead",
    nome: "Custo por lead",
    descricao: "Gasto dividido pelos leads.",
    formato: "moeda",
    grupo: "Conversões",
    calcular: (b) => razao(b.gasto, b.leads),
  },
  {
    chave: "inicios_checkout",
    nome: "Inícios de checkout",
    descricao: "Pessoas que abriram o checkout.",
    formato: "inteiro",
    grupo: "Conversões",
    calcular: (b) => b.inicios_checkout,
  },
  {
    chave: "custo_checkout",
    nome: "Custo por início de checkout",
    descricao: "Gasto dividido pelos inícios de checkout.",
    formato: "moeda",
    grupo: "Conversões",
    calcular: (b) => razao(b.gasto, b.inicios_checkout),
  },
  {
    chave: "compras_plataforma",
    nome: "Compras (plataforma)",
    descricao: "Compras reportadas pelo pixel. A receita de verdade vem do gateway.",
    formato: "inteiro",
    grupo: "Conversões",
    calcular: (b) => b.compras_plataforma,
  },
  {
    chave: "custo_compra",
    nome: "Custo por compra (plataforma)",
    descricao: "Gasto dividido pelas compras do pixel.",
    formato: "moeda",
    grupo: "Conversões",
    calcular: (b) => razao(b.gasto, b.compras_plataforma),
  },
  {
    chave: "taxa_checkout",
    nome: "Taxa de checkout",
    descricao: "Inícios de checkout divididos pelas visualizações de página.",
    formato: "percentual",
    grupo: "Conversões",
    calcular: (b) => razao(b.inicios_checkout, b.visualizacoes_pagina),
  },
];

export const COLUNAS_PADRAO_TRAFEGO = ["gasto", "ctr", "connect_rate"];

const POR_CHAVE = new Map(METRICAS_TRAFEGO.map((m) => [m.chave, m]));

export function metricaTrafego(chave: string): MetricaTrafego | undefined {
  return POR_CHAVE.get(chave);
}

/** Garante só chaves conhecidas, sem repetição; vazio cai no padrão. */
export function normalizarColunas(chaves: string[]): string[] {
  const validas = [...new Set(chaves)].filter((c) => POR_CHAVE.has(c));
  return validas.length ? validas : [...COLUNAS_PADRAO_TRAFEGO];
}

/**
 * "Resultados" de uma linha diária, pelo objetivo da campanha no Meta
 * (OUTCOME_SALES, OUTCOME_LEADS, OUTCOME_TRAFFIC, OUTCOME_AWARENESS,
 * OUTCOME_ENGAGEMENT, OUTCOME_APP_PROMOTION e os nomes antigos).
 */
export function resultadosDe(
  objetivo: string | null | undefined,
  b: Omit<BaseTrafego, "resultados">,
): number {
  const o = (objetivo ?? "").toUpperCase();
  if (o.includes("SALES") || o.includes("CONVERSIONS") || o.includes("CATALOG")) {
    return b.compras_plataforma;
  }
  if (o.includes("LEAD")) return b.leads;
  if (o.includes("TRAFFIC") || o.includes("LINK_CLICKS")) return b.cliques_link;
  if (o.includes("AWARENESS") || o.includes("REACH") || o.includes("BRAND")) {
    return b.impressoes;
  }
  if (o.includes("ENGAGEMENT") || o.includes("VIDEO")) return b.cliques;
  // Sem objetivo conhecido: compra se houver, senão lead, senão clique no link.
  return b.compras_plataforma || b.leads || b.cliques_link;
}
