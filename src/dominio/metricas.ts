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
  taxas_gateway: number;
  parceiros: number;
  impostos: number;
  /** Número de transações (grupos de compras) no período. */
  transacoes: number;
  /** Clientes cuja primeira compra caiu no período. */
  clientes_novos: number;
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
  /** Lucro / faturamento bruto. Null sem faturamento. */
  margem: number | null;
  /** Lucro / transações. Null sem transações. */
  lucro_por_transacao: number | null;
};

const arred = (v: number) => Math.round(v * 100) / 100;
const razao = (num: number, den: number) => (den > 0 ? num / den : null);

export function calcularMetricas(e: EntradaMetricas): Metricas {
  const investimento = arred(e.gasto_anuncios * (1 + e.taxa_anuncios));
  const receita_liquida = arred(
    e.faturamento_bruto - e.reembolsos - e.taxas_gateway - e.parceiros - e.impostos,
  );
  const lucro = arred(receita_liquida - investimento);
  return {
    investimento,
    faturamento_bruto: arred(e.faturamento_bruto),
    receita_liquida,
    lucro,
    roas: razao(e.faturamento_bruto, investimento),
    roi: razao(lucro, investimento),
    transacoes: e.transacoes,
    ticket_medio: razao(e.faturamento_bruto, e.transacoes),
    cac: razao(investimento, e.clientes_novos),
    margem: razao(lucro, e.faturamento_bruto),
    lucro_por_transacao: razao(lucro, e.transacoes),
  };
}

export const ENTRADA_ZERADA: EntradaMetricas = {
  gasto_anuncios: 0,
  taxa_anuncios: 0,
  faturamento_bruto: 0,
  reembolsos: 0,
  taxas_gateway: 0,
  parceiros: 0,
  impostos: 0,
  transacoes: 0,
  clientes_novos: 0,
};

export type FormatoMetrica = "moeda" | "multiplicador" | "percentual" | "inteiro";

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
    descricao: "Vendas aprovadas no gateway.",
    formato: "moeda",
  },
  {
    chave: "receita_liquida",
    nome: "Receita líquida",
    descricao: "Faturamento menos reembolsos, taxas, parceiros e impostos.",
    formato: "moeda",
  },
  {
    chave: "lucro",
    nome: "Lucro",
    descricao: "Receita líquida menos investimento.",
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
    descricao: "Lucro dividido pelo investimento.",
    formato: "percentual",
  },
  {
    chave: "transacoes",
    nome: "Transações",
    descricao: "Compras agrupadas pela janela de transação.",
    formato: "inteiro",
  },
  {
    chave: "ticket_medio",
    nome: "Ticket médio",
    descricao: "Faturamento bruto por transação.",
    formato: "moeda",
  },
  {
    chave: "cac",
    nome: "CAC",
    descricao: "Investimento por cliente novo.",
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
      return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×`;
    case "percentual":
      return `${(valor * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    case "inteiro":
      return valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  }
}
