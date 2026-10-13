/**
 * O que cada card da Home mostra ao clicar no olho: as parcelas que compõem o número.
 * Só entram parcelas positivas; a tela desenha a pizza e a legenda a partir daqui.
 */

export type Fatia = { nome: string; valor: number; cor: string };

export type DetalheMetrica = {
  titulo: string;
  descricao: string;
  fatias: Fatia[];
  /** Observação mostrada abaixo do gráfico (ex.: prejuízo). */
  nota?: string;
};

export type Parcela = { chave: string; nome: string; valor: number };

export type EntradaDetalhes = {
  gasto_por_plataforma: Parcela[];
  faturamento_por_produto: Parcela[];
  /** Fração do imposto sobre anúncios (ex.: 0.1215). */
  taxa_anuncios: number;
  investimento: number;
  faturamento_bruto: number;
  receita_liquida: number;
  lucro: number;
  reembolsos: number;
  taxas_gateway: number;
  parceiros: number;
  impostos: number;
  moeda: string;
};

export const CORES_DETALHE = {
  meta: "#2563eb",
  google: "#f59e0b",
  tiktok: "#0f172a",
  outra: "#7c3aed",
  imposto_anuncios: "#64748b",
  receita_liquida: "#16a34a",
  lucro: "#16a34a",
  investimento: "#2563eb",
  reembolsos: "#e11d48",
  taxas_gateway: "#d97706",
  parceiros: "#9333ea",
  impostos: "#64748b",
};

/** Paleta para listas abertas (produtos). */
export const PALETA = [
  "#0d9488",
  "#2563eb",
  "#9333ea",
  "#d97706",
  "#e11d48",
  "#16a34a",
  "#0891b2",
  "#7c3aed",
  "#ca8a04",
  "#64748b",
];

const arred = (v: number) => Math.round(v * 100) / 100;
const positivas = (fatias: Fatia[]) => fatias.filter((f) => f.valor > 0);

function moeda(valor: number, codigo: string) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: codigo });
}

export function montarDetalhes(
  e: EntradaDetalhes,
): Partial<Record<string, DetalheMetrica>> {
  const gasto = e.gasto_por_plataforma.reduce((s, p) => s + p.valor, 0);
  const impostoAnuncios = arred(gasto * e.taxa_anuncios);
  const investimento: DetalheMetrica = {
    titulo: "Investimento",
    descricao: "Gasto em cada plataforma de anúncios mais o imposto sobre anúncios.",
    fatias: positivas([
      ...e.gasto_por_plataforma.map((p) => ({
        nome: p.nome,
        valor: arred(p.valor),
        cor: CORES_DETALHE[p.chave as keyof typeof CORES_DETALHE] ?? CORES_DETALHE.outra,
      })),
      {
        nome: "Imposto sobre anúncios",
        valor: impostoAnuncios,
        cor: CORES_DETALHE.imposto_anuncios,
      },
    ]),
  };

  const faturamento: DetalheMetrica = {
    titulo: "Faturamento bruto",
    descricao: "Quanto cada produto faturou no período.",
    fatias: positivas(
      e.faturamento_por_produto.map((p, i) => ({
        nome: p.nome,
        valor: arred(p.valor),
        cor: PALETA[i % PALETA.length],
      })),
    ),
  };

  const descontos: Fatia[] = [
    {
      nome: "Reembolsos e chargebacks",
      valor: arred(e.reembolsos),
      cor: CORES_DETALHE.reembolsos,
    },
    {
      nome: "Taxas do gateway",
      valor: arred(e.taxas_gateway),
      cor: CORES_DETALHE.taxas_gateway,
    },
    { nome: "Parceiros", valor: arred(e.parceiros), cor: CORES_DETALHE.parceiros },
    {
      nome: "Impostos sobre o faturamento",
      valor: arred(e.impostos),
      cor: CORES_DETALHE.impostos,
    },
  ];
  const receita: DetalheMetrica = {
    titulo: "Receita líquida",
    descricao:
      "O que sobrou do faturamento bruto e o que foi descontado: reembolsos, taxas do gateway, parceiros e impostos sobre o faturamento.",
    fatias: positivas([
      {
        nome: "Receita líquida",
        valor: arred(e.receita_liquida),
        cor: CORES_DETALHE.receita_liquida,
      },
      ...descontos,
    ]),
    nota:
      e.receita_liquida < 0
        ? `Os descontos superaram o faturamento em ${moeda(Math.abs(e.receita_liquida), e.moeda)}.`
        : undefined,
  };

  const lucro: DetalheMetrica = {
    titulo: "Lucro",
    descricao:
      "Do faturamento bruto: quanto virou lucro e quanto foi para investimento, reembolsos, taxas, parceiros e impostos.",
    fatias: positivas([
      { nome: "Lucro", valor: arred(e.lucro), cor: CORES_DETALHE.lucro },
      {
        nome: "Investimento",
        valor: arred(e.investimento),
        cor: CORES_DETALHE.investimento,
      },
      ...descontos,
    ]),
    nota:
      e.lucro < 0
        ? `Prejuízo de ${moeda(Math.abs(e.lucro), e.moeda)}: os custos superaram o faturamento.`
        : undefined,
  };

  return {
    investimento,
    faturamento_bruto: faturamento,
    receita_liquida: receita,
    lucro,
  };
}
