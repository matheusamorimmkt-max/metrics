/**
 * O que cada card da Home mostra ao clicar no olho. Dois formatos: pizza com legenda
 * (composição, usada no Investimento) e tabela com colunas (todos os outros). As
 * células já saem formatadas daqui; a tela só desenha.
 */
import { formatarMetrica } from "./metricas";

export type Fatia = { nome: string; valor: number; cor: string };

export type Celula = {
  texto: string;
  /** Padrão: primeira coluna à esquerda, as demais à direita. */
  alinhar?: "left" | "right";
  cor?: "positivo" | "negativo" | "discreto";
  /** Texto auxiliar abaixo do principal (e-mail do cliente, por exemplo). */
  detalhe?: string;
  /** Quando é um cliente: o nome abre a ficha completa. */
  cliente_id?: string;
};

export type LinhaTabela = { celulas: Celula[]; total?: boolean };

export type TabelaDetalhe = {
  cabecalho: string[];
  linhas: LinhaTabela[];
  /** Mensagem quando não há linhas. */
  vazio: string;
};

export type DetalheMetrica = {
  titulo: string;
  descricao: string;
  /** Pizza + legenda (composição). */
  fatias: Fatia[];
  /** Tabela no lugar da pizza. */
  tabela?: TabelaDetalhe;
  /** Observação mostrada abaixo. */
  nota?: string;
};

export type Parcela = { chave: string; nome: string; valor: number; quantidade: number };

export type ClienteRecompra = {
  cliente_id: string;
  nome: string;
  email: string;
  transacoes_periodo: number;
  gasto_periodo: number;
  gasto_total: number;
  transacoes_total: number;
};

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
  transacoes: number;
  itens: number;
  clientes: {
    unicos: number;
    /** Primeira compra dentro do período. */
    novos: number;
    /** Já tinham comprado antes do período (a compra no período foi recompra). */
    antigos: number;
  };
  transacoes_por_itens: { itens: number; quantidade: number }[];
  recompradores: ClienteRecompra[];
  novos: ClienteRecompra[];
  moeda: string;
};

export const CORES_DETALHE = {
  meta: "#2563eb",
  google: "#f59e0b",
  tiktok: "#0f172a",
  outra: "#7c3aed",
  imposto_anuncios: "#64748b",
};

const arred = (v: number) => Math.round(v * 100) / 100;
const positivas = (fatias: Fatia[]) => fatias.filter((f) => f.valor > 0);
const razao = (num: number, den: number) => (den > 0 ? num / den : null);

export function montarDetalhes(
  e: EntradaDetalhes,
): Partial<Record<string, DetalheMetrica>> {
  const m = (v: number | null) => formatarMetrica(v, "moeda", e.moeda);
  const pc = (v: number | null) => formatarMetrica(v, "percentual");
  const n = (v: number | null) => formatarMetrica(v, "inteiro");
  const texto = (t: string, extra?: Partial<Celula>): Celula => ({ texto: t, ...extra });

  // ---- Investimento: pizza por plataforma + imposto sobre anúncios
  const gasto = e.gasto_por_plataforma.reduce((s, p) => s + p.valor, 0);
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
        valor: arred(gasto * e.taxa_anuncios),
        cor: CORES_DETALHE.imposto_anuncios,
      },
    ]),
  };

  // ---- Faturamento bruto: por produto, com itens e ticket médio por item
  const faturamento: DetalheMetrica = {
    titulo: "Faturamento bruto",
    descricao:
      "Quanto cada produto faturou no período, pelo preço da oferta. Inclui vendas depois reembolsadas (o reembolso é descontado na data em que acontece). Ticket médio aqui é por item vendido.",
    fatias: [],
    tabela: {
      cabecalho: ["Produto", "Faturamento", "%", "Itens", "Ticket médio"],
      vazio: "Sem vendas no período.",
      linhas: [
        ...e.faturamento_por_produto.map((p) => ({
          celulas: [
            texto(p.nome),
            texto(m(p.valor)),
            texto(pc(razao(p.valor, e.faturamento_bruto)), { cor: "discreto" }),
            texto(n(p.quantidade)),
            texto(m(razao(p.valor, p.quantidade))),
          ],
        })),
        {
          total: true,
          celulas: [
            texto("Total"),
            texto(m(e.faturamento_bruto)),
            texto(""),
            texto(n(e.itens)),
            texto(m(razao(e.faturamento_bruto, e.itens))),
          ],
        },
      ],
    },
  };

  // ---- Lucro: conta de chegada, percentuais sobre o faturamento bruto
  const pctFat = (v: number) => razao(v, e.faturamento_bruto);
  const linha = (
    nome: string,
    valor: number,
    sinal: "+" | "-",
    total = false,
  ): LinhaTabela => ({
    total,
    celulas: [
      texto(nome),
      texto(`${sinal}${m(arred(Math.abs(valor)))}`, {
        cor: sinal === "-" ? "negativo" : "positivo",
      }),
      texto(pc(pctFat(valor)), { cor: "discreto" }),
    ],
  });
  const lucro: DetalheMetrica = {
    titulo: "Lucro",
    descricao: "Do faturamento bruto até o lucro. Percentuais sobre o faturamento bruto.",
    fatias: [],
    tabela: {
      cabecalho: ["", "Valor", "% do faturamento"],
      vazio: "Sem movimento no período.",
      linhas:
        e.faturamento_bruto === 0 && e.investimento === 0
          ? []
          : [
              linha("Faturamento bruto", e.faturamento_bruto, "+"),
              linha("Reembolsos e chargebacks", e.reembolsos, "-"),
              linha("Taxas do gateway", e.taxas_gateway, "-"),
              ...(e.parceiros > 0 ? [linha("Parceiros", e.parceiros, "-")] : []),
              linha("Impostos sobre o faturamento", e.impostos, "-"),
              linha("Investimento", e.investimento, "-"),
              linha(
                e.lucro < 0 ? "Prejuízo" : "Lucro",
                e.lucro,
                e.lucro < 0 ? "-" : "+",
                true,
              ),
            ],
    },
  };

  // ---- Taxa de reembolso: por produto, com quantidade, valor e taxa do produto
  const fatPorProduto = new Map(e.faturamento_por_produto.map((p) => [p.chave, p]));
  const totalReembolsado = e.reembolsos_por_produto.reduce((s, p) => s + p.valor, 0);
  const totalQtdReembolsos = e.reembolsos_por_produto.reduce(
    (s, p) => s + p.quantidade,
    0,
  );
  const taxaReembolso: DetalheMetrica = {
    titulo: "Taxa de reembolso",
    descricao:
      "Produtos com reembolso ou chargeback no período: quantidade, valor devolvido e taxa do produto (devolvido ÷ faturado no período).",
    fatias: [],
    tabela: {
      cabecalho: ["Produto", "Reembolsos", "Valor", "Taxa"],
      vazio: "Sem reembolsos no período.",
      linhas: e.reembolsos_por_produto.length
        ? [
            ...e.reembolsos_por_produto.map((p) => {
              const fat = fatPorProduto.get(p.chave);
              return {
                celulas: [
                  texto(p.nome, {
                    detalhe: fat
                      ? `${n(fat.quantidade)} itens e ${m(fat.valor)} faturados no período`
                      : "sem faturamento no período",
                  }),
                  texto(n(p.quantidade)),
                  texto(m(p.valor), { cor: "negativo" }),
                  texto(pc(razao(p.valor, fat?.valor ?? 0))),
                ],
              };
            }),
            {
              total: true,
              celulas: [
                texto("Total"),
                texto(n(totalQtdReembolsos)),
                texto(m(totalReembolsado), { cor: "negativo" }),
                texto(pc(razao(totalReembolsado, e.faturamento_bruto))),
              ],
            },
          ]
        : [],
    },
  };

  // ---- Clientes únicos: novos × antigos
  const clientesUnicos: DetalheMetrica = {
    titulo: "Clientes únicos",
    descricao:
      "Pessoas diferentes que compraram no período (mesmo CPF ou e-mail = mesmo cliente), separadas entre quem comprou pela primeira vez e quem já era cliente.",
    fatias: [],
    tabela: {
      cabecalho: ["", "Clientes", "%"],
      vazio: "Sem clientes no período.",
      linhas: e.clientes.unicos
        ? [
            {
              celulas: [
                texto("Novos", { detalhe: "primeira compra dentro do período" }),
                texto(n(e.clientes.novos)),
                texto(pc(razao(e.clientes.novos, e.clientes.unicos)), {
                  cor: "discreto",
                }),
              ],
            },
            {
              celulas: [
                texto("Já eram clientes", {
                  detalhe: "compraram antes do período e voltaram",
                }),
                texto(n(e.clientes.antigos)),
                texto(pc(razao(e.clientes.antigos, e.clientes.unicos)), {
                  cor: "discreto",
                }),
              ],
            },
            {
              total: true,
              celulas: [texto("Clientes únicos"), texto(n(e.clientes.unicos)), texto("")],
            },
          ]
        : [],
    },
  };

  // ---- Transações: por quantidade de itens
  const transacoes: DetalheMetrica = {
    titulo: "Transações",
    descricao:
      "Compras do mesmo cliente dentro da janela de transação contam como uma. Aqui, quantas transações tiveram 1 item e quantas levaram bump ou upsell.",
    fatias: [],
    tabela: {
      cabecalho: ["Itens na transação", "Transações", "%"],
      vazio: "Sem transações no período.",
      linhas: e.transacoes
        ? [
            ...e.transacoes_por_itens.map((t) => ({
              celulas: [
                texto(t.itens === 1 ? "1 item" : `${t.itens} itens`),
                texto(n(t.quantidade)),
                texto(pc(razao(t.quantidade, e.transacoes)), { cor: "discreto" }),
              ],
            })),
            {
              total: true,
              celulas: [
                texto("Total", {
                  detalhe: `${formatarMetrica(razao(e.itens, e.transacoes), "multiplicador")?.replace("x", "")} itens por transação em média · ticket médio ${m(razao(e.faturamento_bruto, e.transacoes))}`,
                }),
                texto(n(e.transacoes)),
                texto(""),
              ],
            },
          ]
        : [],
    },
  };

  // ---- Itens vendidos: por produto
  const itens: DetalheMetrica = {
    titulo: "Itens vendidos",
    descricao:
      "Cada item aprovado no gateway (front, bump e upsell contam separados), por produto.",
    fatias: [],
    tabela: {
      cabecalho: ["Produto", "Itens", "%", "Faturamento"],
      vazio: "Sem vendas no período.",
      linhas: e.itens
        ? [
            ...[...e.faturamento_por_produto]
              .sort((a, b) => b.quantidade - a.quantidade)
              .map((p) => ({
                celulas: [
                  texto(p.nome),
                  texto(n(p.quantidade)),
                  texto(pc(razao(p.quantidade, e.itens)), { cor: "discreto" }),
                  texto(m(p.valor)),
                ],
              })),
            {
              total: true,
              celulas: [
                texto("Total"),
                texto(n(e.itens)),
                texto(""),
                texto(m(e.faturamento_bruto)),
              ],
            },
          ]
        : [],
    },
  };

  // ---- Lista de clientes (novos e recorrentes): nome, transações e gasto
  const listaClientes = (
    lista: ClienteRecompra[],
    titulo: string,
    descricao: string,
    vazio: string,
  ): DetalheMetrica => ({
    titulo,
    descricao,
    fatias: [],
    tabela: {
      cabecalho: ["Cliente", "Transações no período", "Gasto no período", "Gasto total"],
      vazio,
      linhas: lista.length
        ? [
            ...lista.map((c) => ({
              celulas: [
                texto(c.nome, { detalhe: c.email, cliente_id: c.cliente_id }),
                texto(n(c.transacoes_periodo)),
                texto(m(c.gasto_periodo)),
                texto(m(c.gasto_total), {
                  detalhe: `${n(c.transacoes_total)} transações na vida`,
                }),
              ],
            })),
            {
              total: true,
              celulas: [
                texto(`${n(lista.length)} clientes`),
                texto(n(lista.reduce((s, c) => s + c.transacoes_periodo, 0))),
                texto(m(lista.reduce((s, c) => s + c.gasto_periodo, 0))),
                texto(m(lista.reduce((s, c) => s + c.gasto_total, 0))),
              ],
            },
          ]
        : [],
    },
    nota: lista.length >= 50 ? "Mostrando os 50 clientes que mais gastaram no período." : undefined,
  });
  const clientesNovos = listaClientes(
    e.novos,
    "Clientes novos",
    "Quem fez a primeira compra da vida dentro do período.",
    "Nenhum cliente novo no período.",
  );
  const clientesRecorrentes = listaClientes(
    e.recompradores,
    "Clientes recorrentes",
    "Quem já tinha comprado antes e comprou de novo no período.",
    "Ninguém recomprou no período.",
  );

  // ---- Taxa de recompra: quem recomprou e quanto gastou
  const taxaRecompra: DetalheMetrica = {
    titulo: "Taxa de recompra",
    descricao:
      "Clientes que já tinham comprado antes e compraram de novo no período, divididos pelos clientes únicos do período. Abaixo, quem recomprou, quantas transações fez no período e quanto gastou.",
    fatias: [],
    tabela: {
      cabecalho: ["Cliente", "Transações no período", "Gasto no período", "Gasto total"],
      vazio: "Ninguém recomprou no período.",
      linhas: e.recompradores.length
        ? [
            ...e.recompradores.map((c) => ({
              celulas: [
                texto(c.nome, { detalhe: c.email, cliente_id: c.cliente_id }),
                texto(n(c.transacoes_periodo)),
                texto(m(c.gasto_periodo)),
                texto(m(c.gasto_total), {
                  detalhe: `${n(c.transacoes_total)} transações na vida`,
                }),
              ],
            })),
            {
              total: true,
              celulas: [
                texto(`${n(e.recompradores.length)} clientes`),
                texto(n(e.recompradores.reduce((s, c) => s + c.transacoes_periodo, 0))),
                texto(m(e.recompradores.reduce((s, c) => s + c.gasto_periodo, 0))),
                texto(m(e.recompradores.reduce((s, c) => s + c.gasto_total, 0))),
              ],
            },
          ]
        : [],
    },
    nota:
      e.recompradores.length >= 50
        ? "Mostrando os 50 clientes que mais gastaram no período."
        : undefined,
  };

  return {
    investimento,
    faturamento_bruto: faturamento,
    lucro,
    taxa_reembolso: taxaReembolso,
    clientes_unicos: clientesUnicos,
    clientes_novos: clientesNovos,
    clientes_recorrentes: clientesRecorrentes,
    transacoes,
    itens,
    taxa_recompra: taxaRecompra,
  };
}
