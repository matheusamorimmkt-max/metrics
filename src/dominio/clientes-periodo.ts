/**
 * Aba Clientes: listas de destaque (top 10) e o conteúdo dos olhos dos cards, a partir
 * dos clientes com transação no período. Tudo puro: a consulta entrega os dados e a
 * tela só desenha.
 */
import type { Celula, DetalheMetrica, LinhaTabela } from "./detalhe-metrica";
import { formatarMetrica } from "./metricas";

export type TransacaoCliente = {
  id: string;
  /** ISO. */
  inicio: string;
  ordem: number;
  eh_recompra: boolean;
  itens: number;
  valor: number;
  /** Nomes dos produtos comprados nesta transação, sem repetição. */
  produtos: string[];
};

export type ClientePeriodo = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  primeira_compra_em: string | null;
  /** Transações no período, da mais antiga para a mais recente. */
  transacoes: TransacaoCliente[];
};

export type ClienteResumido = ClientePeriodo & {
  total_transacoes: number;
  itens: number;
  gasto: number;
  ultima_compra: string;
  /** Produtos da última transação do período. */
  produtos_ultima: string[];
  /** Primeira transação da vida caiu no período. */
  novo: boolean;
  /** Teve recompra no período. */
  recorrente: boolean;
};

export function resumirCliente(c: ClientePeriodo): ClienteResumido {
  const transacoes = [...c.transacoes].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const ultima = transacoes[transacoes.length - 1];
  return {
    ...c,
    transacoes,
    total_transacoes: transacoes.length,
    itens: transacoes.reduce((s, t) => s + t.itens, 0),
    gasto: transacoes.reduce((s, t) => s + t.valor, 0),
    ultima_compra: ultima?.inicio ?? "",
    produtos_ultima: ultima?.produtos ?? [],
    novo: transacoes.some((t) => t.ordem === 1),
    // Recorrente só quem já comprava antes do período: novo que recompra continua novo.
    recorrente: !transacoes.some((t) => t.ordem === 1) && transacoes.some((t) => t.eh_recompra),
  };
}

export function dataHora(iso: string, fuso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dataCurta(iso: string | null, fuso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: fuso });
}

export type ChaveCardClientes =
  | "clientes_unicos"
  | "clientes_novos"
  | "recorrentes"
  | "transacoes"
  | "taxa_recompra"
  | "tempo_recompra";

export const CARDS_CLIENTES: { chave: ChaveCardClientes; nome: string; descricao: string }[] = [
  { chave: "clientes_unicos", nome: "Total de clientes", descricao: "Clientes com transação no período." },
  { chave: "clientes_novos", nome: "Clientes novos", descricao: "Primeira compra da vida dentro do período, mesmo que tenha comprado de novo em seguida." },
  { chave: "recorrentes", nome: "Clientes recorrentes", descricao: "Já compravam antes do período e compraram de novo nele." },
  { chave: "transacoes", nome: "Transações", descricao: "Compras do mesmo cliente dentro da janela contam uma vez." },
  { chave: "taxa_recompra", nome: "Taxa de recompra", descricao: "Recorrentes ÷ clientes únicos do período." },
  { chave: "tempo_recompra", nome: "Tempo até a recompra", descricao: "Mediana entre a primeira compra e a segunda, para quem recomprou no período." },
];

/** Máximo de linhas num olho; acima disso a nota avisa. */
export const LIMITE_LINHAS_OLHO = 200;

function texto(t: string, extra?: Partial<Celula>): Celula {
  return { texto: t, ...extra };
}

/** Conteúdo dos seis olhos, com os clientes já identificados. */
export function montarDetalhesClientes(
  clientes: ClienteResumido[],
  opcoes: { moeda: string; fuso: string },
): Record<ChaveCardClientes, DetalheMetrica> {
  const m = (v: number) => formatarMetrica(v, "moeda", opcoes.moeda);
  const n = (v: number) => formatarMetrica(v, "inteiro");
  const cliente = (c: ClienteResumido): Celula =>
    texto(c.nome, {
      detalhe: [c.email, c.telefone].filter(Boolean).join(" · "),
      cliente_id: c.id,
    });

  const listaClientes = (
    lista: ClienteResumido[],
    titulo: string,
    descricao: string,
    vazio: string,
  ): DetalheMetrica => {
    const ordenada = [...lista].sort((a, b) => b.gasto - a.gasto);
    const visiveis = ordenada.slice(0, LIMITE_LINHAS_OLHO);
    const linhas: LinhaTabela[] = visiveis.map((c) => ({
      celulas: [
        cliente(c),
        texto(dataHora(c.ultima_compra, opcoes.fuso)),
        texto(n(c.total_transacoes)),
        texto(n(c.itens)),
        texto(m(c.gasto)),
      ],
    }));
    if (ordenada.length) {
      linhas.push({
        total: true,
        celulas: [
          texto(`${n(ordenada.length)} clientes`),
          texto(""),
          texto(n(ordenada.reduce((s, c) => s + c.total_transacoes, 0))),
          texto(n(ordenada.reduce((s, c) => s + c.itens, 0))),
          texto(m(ordenada.reduce((s, c) => s + c.gasto, 0))),
        ],
      });
    }
    return {
      titulo,
      descricao,
      fatias: [],
      tabela: {
        cabecalho: ["Cliente", "Última compra", "Transações", "Itens", "Gasto"],
        linhas,
        vazio,
      },
      nota:
        ordenada.length > LIMITE_LINHAS_OLHO
          ? `Mostrando os ${LIMITE_LINHAS_OLHO} clientes que mais gastaram, de ${n(ordenada.length)}.`
          : undefined,
    };
  };

  const recorrentes = clientes.filter((c) => c.recorrente);
  const unicos = listaClientes(
    clientes,
    "Total de clientes",
    "Quem comprou no período, do maior gasto para o menor.",
    "Sem clientes no período.",
  );
  const novos = listaClientes(
    clientes.filter((c) => c.novo),
    "Clientes novos",
    "Quem fez a primeira compra da vida dentro do período.",
    "Nenhum cliente novo no período.",
  );
  const recorrentesDetalhe = listaClientes(
    recorrentes,
    "Clientes recorrentes",
    "Quem já comprava antes do período e comprou de novo nele.",
    "Ninguém recomprou no período.",
  );

  // Transações: uma linha por transação, da mais recente para a mais antiga.
  const transacoes = clientes
    .flatMap((c) => c.transacoes.map((t) => ({ c, t })))
    .sort((a, b) => b.t.inicio.localeCompare(a.t.inicio));
  const transacoesVisiveis = transacoes.slice(0, LIMITE_LINHAS_OLHO);
  const linhasTransacoes: LinhaTabela[] = transacoesVisiveis.map(({ c, t }) => ({
    celulas: [
      texto(c.nome, { detalhe: t.produtos.join(", ") || undefined, cliente_id: c.id }),
      texto(dataHora(t.inicio, opcoes.fuso)),
      texto(t.eh_recompra ? "Recompra" : t.ordem === 1 ? "Primeira" : `${t.ordem}ª`, {
        cor: "discreto",
      }),
      texto(n(t.itens)),
      texto(m(t.valor)),
    ],
  }));
  if (transacoes.length) {
    linhasTransacoes.push({
      total: true,
      celulas: [
        texto(`${n(transacoes.length)} transações`),
        texto(""),
        texto(""),
        texto(n(transacoes.reduce((s, x) => s + x.t.itens, 0))),
        texto(m(transacoes.reduce((s, x) => s + x.t.valor, 0))),
      ],
    });
  }
  const transacoesDetalhe: DetalheMetrica = {
    titulo: "Transações",
    descricao: "Cada transação do período, da mais recente para a mais antiga.",
    fatias: [],
    tabela: {
      cabecalho: ["Cliente", "Data e hora", "Compra", "Itens", "Valor"],
      linhas: linhasTransacoes,
      vazio: "Sem transações no período.",
    },
    nota:
      transacoes.length > LIMITE_LINHAS_OLHO
        ? `Mostrando as ${LIMITE_LINHAS_OLHO} mais recentes, de ${n(transacoes.length)}.`
        : undefined,
  };

  const taxa: DetalheMetrica = {
    ...recorrentesDetalhe,
    titulo: "Taxa de recompra",
    descricao: `${n(recorrentes.length)} recorrentes ÷ ${n(clientes.length)} clientes únicos. Abaixo, quem recomprou.`,
  };

  // Tempo até a recompra: quem fez a 2ª transação da vida no período.
  const segundas = clientes
    .flatMap((c) =>
      c.transacoes
        .filter((t) => t.ordem === 2 && c.primeira_compra_em)
        .map((t) => ({
          c,
          t,
          dias:
            (new Date(t.inicio).getTime() - new Date(c.primeira_compra_em!).getTime()) /
            86_400_000,
        })),
    )
    .filter((x) => x.dias >= 0)
    .sort((a, b) => a.dias - b.dias);
  const diasTexto = (d: number) =>
    d < 1 ? "mesmo dia" : `${Math.round(d)} ${Math.round(d) === 1 ? "dia" : "dias"}`;
  const tempo: DetalheMetrica = {
    titulo: "Tempo até a recompra",
    descricao: "Quem fez a segunda compra no período e quanto tempo levou desde a primeira.",
    fatias: [],
    tabela: {
      cabecalho: ["Cliente", "Primeira compra", "Segunda compra", "Tempo", "Valor da recompra"],
      linhas: segundas.slice(0, LIMITE_LINHAS_OLHO).map(({ c, t, dias }) => ({
        celulas: [
          cliente(c),
          texto(dataCurta(c.primeira_compra_em, opcoes.fuso)),
          texto(dataHora(t.inicio, opcoes.fuso)),
          texto(diasTexto(dias)),
          texto(m(t.valor)),
        ],
      })),
      vazio: "Ninguém fez a segunda compra no período.",
    },
    nota:
      segundas.length > LIMITE_LINHAS_OLHO
        ? `Mostrando as ${LIMITE_LINHAS_OLHO} recompras mais rápidas, de ${n(segundas.length)}.`
        : undefined,
  };

  return {
    clientes_unicos: unicos,
    clientes_novos: novos,
    recorrentes: recorrentesDetalhe,
    transacoes: transacoesDetalhe,
    taxa_recompra: taxa,
    tempo_recompra: tempo,
  };
}
