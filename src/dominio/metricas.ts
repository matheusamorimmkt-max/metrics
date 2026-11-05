/**
 * Modelo financeiro (CLAUDE.md > Modelo financeiro). Uma única implementação,
 * usada para o negócio inteiro, cada categoria e cada funil: muda só a entrada.
 * Valores em moeda da organização; percentuais como fração (0.2 = 20%).
 */

export type EntradaMetricas = {
  /** Gasto em anúncios no período, antes do imposto sobre anúncios. */
  gasto_anuncios: number;
  /** Fração aplicada sobre o gasto (ex.: 0.1215). */
  taxa_anuncios: number;
  /** Soma das vendas aprovadas no período. */
  faturamento_bruto: number;
  /** Reembolsos e chargebacks ocorridos no período. */
  reembolsos: number;
  /**
   * Parte dos reembolsos cuja venda também aconteceu dentro do período: essas vendas
   * saem do faturamento bruto (decisão de 2026-11-05). Já está contida em `reembolsos`.
   */
  reembolsos_mesmo_periodo: number;
  /** Idem, só das vendas de recompra (sai de `faturamento_recompra`). */
  reembolsos_mesmo_periodo_recompra: number;
  taxas_gateway: number;
  parceiros: number;
  impostos: number;
  /** Número de transações (grupos de compras) no período. */
  transacoes: number;
  /** Clientes cuja primeira compra caiu no período. */
  clientes_novos: number;
  /** Itens vendidos (cada venda aprovada do gateway: front, bump e upsell contam separados). */
  vendas: number;
  /** Clientes únicos no período (mesmo e-mail ou CPF = mesmo cliente). */
  clientes_unicos: number;
  /** Clientes com 2 ou mais transações no período. */
  clientes_recorrentes: number;
  /** Parte do faturamento bruto vinda de recompras (transações eh_recompra). */
  faturamento_recompra: number;
  /** Média de dias entre a compra anterior e a recompra, nas recompras do período. Null sem recompras. */
  ciclo_recompra_dias: number | null;
};

export type Metricas = {
  investimento: number;
  faturamento_bruto: number;
  receita_liquida: number;
  lucro: number;
  /** Faturamento bruto / investimento. Null quando não há investimento. */
  roas: number | null;
  /** Lucro / investimento. Null quando não há investimento. */
  roi: number | null;
  transacoes: number;
  /** Faturamento bruto / transações. Null sem transações. */
  ticket_medio: number | null;
  /** Investimento / clientes novos. Null sem clientes novos. */
  cac: number | null;
  /** Reembolsos e chargebacks / faturamento bruto. Null sem faturamento. */
  taxa_reembolso: number | null;
  clientes_unicos: number;
  /** Primeira compra da vida dentro do período. */
  clientes_novos: number;
  /** Já tinham comprado antes e compraram de novo no período. */
  clientes_recorrentes: number;
  /** Itens vendidos. */
  itens: number;
  /** Clientes recorrentes / clientes únicos. Null sem clientes. */
  taxa_recompra: number | null;
  faturamento_recompra: number;
  /** Faturamento de recompra / faturamento bruto. Null sem faturamento. */
  percentual_recompra: number | null;
  /** Itens vendidos / transações. Null sem transações. */
  itens_por_transacao: number | null;
  ciclo_recompra_dias: number | null;
  /** Faturamento bruto / clientes únicos: quanto cada cliente gastou em média. Null sem clientes. */
  ltv: number | null;
  /** Lucro / faturamento bruto. Null sem faturamento. */
  margem: number | null;
  /** Lucro / transações. Null sem transações. */
  lucro_por_transacao: number | null;
};

const arred = (v: number) => Math.round(v * 100) / 100;
const razao = (num: number, den: number) => (den > 0 ? num / den : null);

export function calcularMetricas(e: EntradaMetricas): Metricas {
  const investimento = arred(e.gasto_anuncios * (1 + e.taxa_anuncios));
  // Venda reembolsada dentro do próprio período não conta como faturamento. O lucro
  // não muda: tirar a venda do faturamento e não descontar o reembolso dela dá o mesmo.
  const faturamento_bruto = arred(e.faturamento_bruto - e.reembolsos_mesmo_periodo);
  const receita_liquida = arred(
    e.faturamento_bruto - e.reembolsos - e.taxas_gateway - e.parceiros - e.impostos,
  );
  const lucro = arred(receita_liquida - investimento);
  const faturamento_recompra = arred(
    e.faturamento_recompra - e.reembolsos_mesmo_periodo_recompra,
  );
  return {
    investimento,
    faturamento_bruto,
    receita_liquida,
    lucro,
    roas: razao(faturamento_bruto, investimento),
    roi: razao(lucro, investimento),
    transacoes: e.transacoes,
    ticket_medio: razao(faturamento_bruto, e.transacoes),
    cac: razao(investimento, e.clientes_novos),
    // Taxa sobre tudo o que foi vendido no período, antes de tirar as vendas reembolsadas.
    taxa_reembolso: razao(e.reembolsos, e.faturamento_bruto),
    clientes_unicos: e.clientes_unicos,
    clientes_novos: e.clientes_novos,
    clientes_recorrentes: e.clientes_recorrentes,
    itens: e.vendas,
    taxa_recompra: razao(e.clientes_recorrentes, e.clientes_unicos),
    faturamento_recompra,
    percentual_recompra: razao(faturamento_recompra, faturamento_bruto),
    itens_por_transacao: razao(e.vendas, e.transacoes),
    ciclo_recompra_dias: e.ciclo_recompra_dias,
    ltv: razao(faturamento_bruto, e.clientes_unicos),
    margem: razao(lucro, faturamento_bruto),
    lucro_por_transacao: razao(lucro, e.transacoes),
  };
}

export const ENTRADA_ZERADA: EntradaMetricas = {
  gasto_anuncios: 0,
  taxa_anuncios: 0,
  faturamento_bruto: 0,
  reembolsos: 0,
  reembolsos_mesmo_periodo: 0,
  reembolsos_mesmo_periodo_recompra: 0,
  taxas_gateway: 0,
  parceiros: 0,
  impostos: 0,
  transacoes: 0,
  clientes_novos: 0,
  vendas: 0,
  clientes_unicos: 0,
  clientes_recorrentes: 0,
  faturamento_recompra: 0,
  ciclo_recompra_dias: null,
};

export type FormatoMetrica =
  | "moeda"
  | "multiplicador"
  | "percentual"
  | "inteiro"
  | "decimal"
  | "dias";

/** Cards principais da Home, na ordem do PRD. */
export const CARDS_HOME: {
  chave: keyof Metricas;
  nome: string;
  descricao: string;
  formato: FormatoMetrica;
}[] = [
  {
    chave: "investimento",
    nome: "Investimento",
    descricao: "Gasto em anúncios mais o imposto sobre anúncios.",
    formato: "moeda",
  },
  {
    chave: "faturamento_bruto",
    nome: "Faturamento bruto",
    descricao:
      "Vendas aprovadas no gateway pelo preço da oferta. Venda reembolsada dentro do período não conta; reembolso de venda anterior é descontado na data em que acontece.",
    formato: "moeda",
  },
  {
    chave: "lucro",
    nome: "Lucro",
    descricao:
      "Faturamento menos reembolsos, taxas do gateway, parceiros, impostos e investimento.",
    formato: "moeda",
  },
  {
    chave: "roas",
    nome: "ROAS",
    descricao: "Faturamento bruto dividido pelo investimento.",
    formato: "multiplicador",
  },
  {
    chave: "roi",
    nome: "ROI",
    descricao:
      "Lucro dividido pelo investimento. 2x = cada real investido voltou em dobro de lucro.",
    formato: "multiplicador",
  },
  {
    chave: "taxa_reembolso",
    nome: "Taxa de reembolso",
    descricao: "Reembolsos e chargebacks do período divididos pelo faturamento bruto.",
    formato: "percentual",
  },
  {
    chave: "clientes_unicos",
    nome: "Total de clientes",
    descricao:
      "Pessoas diferentes que compraram no período. Mesmo e-mail ou mesmo CPF é o mesmo cliente.",
    formato: "inteiro",
  },
  {
    chave: "transacoes",
    nome: "Transações",
    descricao: "Compras agrupadas pela janela de transação.",
    formato: "inteiro",
  },
  {
    chave: "itens",
    nome: "Itens vendidos",
    descricao: "Cada item aprovado no gateway: front, bump e upsell contam separados.",
    formato: "inteiro",
  },
  {
    chave: "itens_por_transacao",
    nome: "Itens por transação",
    descricao: "Itens vendidos divididos pelas transações: quantos produtos cada compra leva em média.",
    formato: "decimal",
  },
  {
    chave: "percentual_recompra",
    nome: "Faturamento de recompra",
    descricao:
      "Parte do faturamento bruto que veio de recompras: compras de quem já era cliente, fora da janela da transação anterior.",
    formato: "percentual",
  },
  {
    chave: "ciclo_recompra_dias",
    nome: "Ciclo médio de recompra",
    descricao:
      "Média de dias entre a compra anterior e a recompra, nas recompras feitas no período.",
    formato: "dias",
  },
  {
    chave: "ticket_medio",
    nome: "Ticket médio por transação",
    descricao: "Faturamento bruto dividido pelo número de transações.",
    formato: "moeda",
  },
  {
    chave: "cac",
    nome: "CAC",
    descricao: "Investimento por cliente novo.",
    formato: "moeda",
  },
  {
    chave: "ltv",
    nome: "LTV",
    descricao:
      "Quanto cada cliente gastou em média no período: faturamento bruto por cliente único.",
    formato: "moeda",
  },
];

export function formatarMetrica(
  valor: number | null,
  formato: FormatoMetrica,
  moeda = "BRL",
): string {
  if (valor === null) return "—";
  switch (formato) {
    case "moeda":
      return valor.toLocaleString("pt-BR", { style: "currency", currency: moeda });
    case "multiplicador":
      return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
    case "percentual":
      return `${(valor * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    case "inteiro":
      return valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
    case "decimal":
      return valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    case "dias": {
      const d = Math.round(valor);
      return d === 1 ? "1 dia" : `${d.toLocaleString("pt-BR")} dias`;
    }
  }
}
