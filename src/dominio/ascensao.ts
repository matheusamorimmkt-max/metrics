/**
 * Destino das ascensões de um funil: o que os clientes que entraram por ele compraram
 * de novo (recompras) no período, por categoria do funil da oferta e por produto.
 * Clientes contam uma vez por produto e uma vez por categoria.
 */
import type { DetalheMetrica, LinhaTabela } from "./detalhe-metrica";
import { formatarMetrica } from "./metricas";

export type VendaAscensao = {
  cliente_id: string;
  valor: number;
  produto: string;
  categoria: string;
  categoria_ordem: number;
};

export type ProdutoAscensao = { produto: string; clientes: number; receita: number };
export type CategoriaAscensao = {
  categoria: string;
  ordem: number;
  clientes: number;
  receita: number;
  produtos: ProdutoAscensao[];
};

export function agruparAscensao(vendas: VendaAscensao[]): CategoriaAscensao[] {
  const cats = new Map<
    string,
    {
      ordem: number;
      clientes: Set<string>;
      receita: number;
      produtos: Map<string, { clientes: Set<string>; receita: number }>;
    }
  >();
  for (const v of vendas) {
    const c = cats.get(v.categoria) ?? {
      ordem: v.categoria_ordem,
      clientes: new Set<string>(),
      receita: 0,
      produtos: new Map(),
    };
    c.clientes.add(v.cliente_id);
    c.receita += v.valor;
    const p = c.produtos.get(v.produto) ?? { clientes: new Set<string>(), receita: 0 };
    p.clientes.add(v.cliente_id);
    p.receita += v.valor;
    c.produtos.set(v.produto, p);
    cats.set(v.categoria, c);
  }
  return [...cats.entries()]
    .map(([categoria, c]) => ({
      categoria,
      ordem: c.ordem,
      clientes: c.clientes.size,
      receita: c.receita,
      produtos: [...c.produtos.entries()]
        .map(([produto, p]) => ({ produto, clientes: p.clientes.size, receita: p.receita }))
        .sort((a, b) => b.receita - a.receita),
    }))
    .sort((a, b) => a.ordem - b.ordem || b.receita - a.receita);
}

/**
 * Tabela do olho: categoria (linha de grupo) e produtos, com clientes, % sobre os
 * clientes do funil no período e valor.
 */
export function montarDetalheAscensao(
  vendas: VendaAscensao[],
  totalClientes: number,
  moeda: string,
): DetalheMetrica {
  const m = (v: number | null) => formatarMetrica(v, "moeda", moeda);
  const pc = (v: number) =>
    formatarMetrica(totalClientes > 0 ? v / totalClientes : null, "percentual");
  const grupos = agruparAscensao(vendas);
  const clientesTotal = new Set(vendas.map((v) => v.cliente_id)).size;
  const receitaTotal = vendas.reduce((s, v) => s + v.valor, 0);
  const linhas: LinhaTabela[] = grupos.flatMap((g) => [
    {
      grupo: true,
      celulas: [
        { texto: g.categoria },
        { texto: String(g.clientes) },
        { texto: pc(g.clientes), cor: "discreto" as const },
        { texto: m(g.receita) },
      ],
    },
    ...g.produtos.map((p) => ({
      celulas: [
        { texto: p.produto, alinhar: "left" as const },
        { texto: String(p.clientes) },
        { texto: pc(p.clientes), cor: "discreto" as const },
        { texto: m(p.receita) },
      ],
    })),
  ]);
  if (linhas.length) {
    linhas.push({
      total: true,
      celulas: [
        { texto: "Total" },
        { texto: String(clientesTotal) },
        { texto: pc(clientesTotal), cor: "discreto" as const },
        { texto: m(receitaTotal) },
      ],
    });
  }
  return {
    titulo: "Destino das ascensões",
    descricao: `O que os clientes que entraram por este funil compraram de novo no período, por categoria e produto. A porcentagem é sobre os ${totalClientes} clientes deste funil no período; um cliente conta uma vez por produto e uma vez por categoria.`,
    fatias: [],
    tabela: {
      cabecalho: ["Produto", "Clientes", "% dos clientes", "Valor"],
      vazio: "Nenhuma recompra de clientes deste funil no período.",
      linhas,
    },
  };
}
