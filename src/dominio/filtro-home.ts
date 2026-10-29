/**
 * Filtro da Home: negócio inteiro, uma ou mais categorias e um ou mais funis.
 * Vive na URL como `filtro=categoria:<id>,funil:<id>,...` (o formato antigo, com um
 * único item, continua válido). Categoria selecionada = todos os funis dela, inclusive
 * os criados depois; funil selecionado = só ele.
 */

export type SelecaoFiltro = { categorias: string[]; funis: string[] };

/** O que as consultas usam: tudo, ou um conjunto de funis. */
export type Filtro = { tipo: "negocio" } | { tipo: "funis"; ids: ReadonlySet<string> };

export const SELECAO_VAZIA: SelecaoFiltro = { categorias: [], funis: [] };

export function lerSelecao(texto: string | undefined | null): SelecaoFiltro {
  const categorias: string[] = [];
  const funis: string[] = [];
  for (const item of (texto ?? "").split(",")) {
    const [tipo, id] = item.trim().split(":");
    if (!id) continue;
    if (tipo === "categoria" && !categorias.includes(id)) categorias.push(id);
    if (tipo === "funil" && !funis.includes(id)) funis.push(id);
  }
  return { categorias, funis };
}

export function escreverSelecao(selecao: SelecaoFiltro): string {
  return [
    ...selecao.categorias.map((id) => `categoria:${id}`),
    ...selecao.funis.map((id) => `funil:${id}`),
  ].join(",");
}

export function selecaoVazia(selecao: SelecaoFiltro): boolean {
  return selecao.categorias.length === 0 && selecao.funis.length === 0;
}

/** Expande categorias em funis. Seleção vazia (ou só ids desconhecidos) = negócio inteiro. */
export function resolverFiltro(
  selecao: SelecaoFiltro,
  funis: { id: string; categoria_id: string }[],
): Filtro {
  if (selecaoVazia(selecao)) return { tipo: "negocio" };
  const ids = new Set<string>();
  const categorias = new Set(selecao.categorias);
  for (const f of funis) {
    if (categorias.has(f.categoria_id) || selecao.funis.includes(f.id)) ids.add(f.id);
  }
  return { tipo: "funis", ids };
}

export function pertenceAoFiltro(filtro: Filtro, funilId: string | null | undefined): boolean {
  if (filtro.tipo === "negocio") return true;
  return Boolean(funilId) && filtro.ids.has(funilId as string);
}

/** Título curto para a tela: "Negócio inteiro", nomes selecionados ou "N itens". */
export function rotuloSelecao(
  selecao: SelecaoFiltro,
  categorias: { id: string; nome: string }[],
  funis: { id: string; nome: string }[],
): string {
  if (selecaoVazia(selecao)) return "Negócio inteiro";
  const nomes = [
    ...selecao.categorias.map((id) => categorias.find((c) => c.id === id)?.nome ?? "Categoria"),
    ...selecao.funis.map((id) => funis.find((f) => f.id === id)?.nome ?? "Funil"),
  ];
  if (nomes.length <= 3) return nomes.join(" · ");
  return `${nomes.slice(0, 2).join(" · ")} e mais ${nomes.length - 2}`;
}
