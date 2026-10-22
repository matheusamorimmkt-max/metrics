/**
 * O que cada card da Home mostra ao clicar no olho: as parcelas que compõem o número.
 * Só entram parcelas positivas; a tela desenha a pizza e a legenda a partir daqui.
 */

export type Fatia = { nome: string; valor: number; cor: string };

/** Linha de tabela: valor com sinal e percentual (de uma referência dita na descrição). */
export type LinhaDetalhe = {
  nome: string;
  valor: number;
  sinal: "+" | "-" | "";
  pct: number | null;
  /** Linha de total: separador acima e negrito. */
  total?: boolean;
  /** Texto auxiliar à direita do nome. */
  detalhe?: string;
};

export type DetalheMetrica = {
  titulo: string;
  descricao: string;
  /** Pizza + legenda (composição). */
  fatias: Fatia[];
  /** Tabela no lugar da pizza (conta de chegada, reembolsos por produto). */
  linhas?: LinhaDetalhe[];
  /** Cabeçalho das colunas da tabela, quando houver. */
  colunas?: [string, string, string];
  /** Observação mostrada abaixo (ex.: prejuízo). */
  nota?: string;
};

export type Parcela = { chave: string; nome: string; valor: number };

export type EntradaDetalhes = {
  gasto_por_plataforma: Parcela[];
  faturamento_por_produto: Parcela[];
  reembolsos_por_produto: Parcela[];
  /** Fração do imposto sobre anúncios (ex.: 0.1215). */
  taxa_anuncios: number;
  investimento: number;
  faturamento_bruto: number;

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
    descricao:
      "Quanto cada produto faturou no período, pelo preço da oferta. Inclui vendas depois reembolsadas; o reembolso é descontado na data em que acontece.",
    fatias: positivas(
      e.faturamento_por_produto.map((p, i) => ({
        nome: p.nome,
        valor: arred(p.valor),
        cor: PALETA[i % PALETA.length],
      })),
    ),
  };

  // Lucro: conta de chegada a partir do faturamento bruto. Percentuais sobre o
  // faturamento bruto. Parceiros só entra quando houve comissão.
  const pct = (v: number) => (e.faturamento_bruto > 0 ? v / e.faturamento_bruto : null);
  const linhasLucro: LinhaDetalhe[] = [
    {
      nome: "Faturamento bruto",
      valor: arred(e.faturamento_bruto),
      sinal: "+",
      pct: pct(e.faturamento_bruto),
    },
    {
      nome: "Reembolsos e chargebacks",
      valor: arred(e.reembolsos),
      sinal: "-",
      pct: pct(e.reembolsos),
    },
    {
      nome: "Taxas do gateway",
      valor: arred(e.taxas_gateway),
      sinal: "-",
      pct: pct(e.taxas_gateway),
    },
    ...(e.parceiros > 0
      ? [
          {
            nome: "Parceiros",
            valor: arred(e.parceiros),
            sinal: "-" as const,
            pct: pct(e.parceiros),
          },
        ]
      : []),
    {
      nome: "Impostos sobre o faturamento",
      valor: arred(e.impostos),
      sinal: "-",
      pct: pct(e.impostos),
    },
    {
      nome: "Investimento",
      valor: arred(e.investimento),
      sinal: "-",
      pct: pct(e.investimento),
    },
    {
      nome: e.lucro < 0 ? "Prejuízo" : "Lucro",
      valor: arred(Math.abs(e.lucro)),
      sinal: e.lucro < 0 ? "-" : "+",
      pct: pct(e.lucro),
      total: true,
    },
  ];
  const lucro: DetalheMetrica = {
    titulo: "Lucro",
    descricao: "Do faturamento bruto até o lucro. Percentuais sobre o faturamento bruto.",
    fatias: [],
    linhas: linhasLucro,
    colunas: ["", "Valor", "% do faturamento"],
  };

  // Taxa de reembolso: produtos reembolsados no período, valor e taxa do produto.
  const faturamentoProduto = new Map(
    e.faturamento_por_produto.map((p) => [p.chave, p.valor]),
  );
  const totalReembolsos = e.reembolsos_por_produto.reduce((s, p) => s + p.valor, 0);
  const linhasReembolso: LinhaDetalhe[] = [
    ...e.reembolsos_por_produto.map((p) => {
      const fat = faturamentoProduto.get(p.chave) ?? 0;
      return {
        nome: p.nome,
        valor: arred(p.valor),
        sinal: "" as const,
        pct: fat > 0 ? p.valor / fat : null,
        detalhe:
          fat > 0 ? `de ${moeda(fat, e.moeda)} faturados` : "sem faturamento no período",
      };
    }),
    {
      nome: "Total",
      valor: arred(totalReembolsos),
      sinal: "" as const,
      pct: e.faturamento_bruto > 0 ? totalReembolsos / e.faturamento_bruto : null,
      total: true,
    },
  ];
  const taxaReembolso: DetalheMetrica = {
    titulo: "Taxa de reembolso",
    descricao:
      "Produtos com reembolso ou chargeback no período, o valor devolvido e a taxa de reembolso do produto (devolvido ÷ faturado no período).",
    fatias: [],
    linhas: e.reembolsos_por_produto.length ? linhasReembolso : [],
    colunas: ["Produto", "Reembolsado", "Taxa"],
  };

  return {
    investimento,
    faturamento_bruto: faturamento,
    lucro,
    taxa_reembolso: taxaReembolso,
  };
}
