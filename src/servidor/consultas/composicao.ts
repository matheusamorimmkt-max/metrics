import "server-only";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { tabelaAusente } from "@/servidor/supabase/erros";
import { somarDias, type Periodo } from "@/dominio/periodo";
import type { Filtro, FunilInfo } from "./home";
import { deslocamento } from "./vendas";

export type Parcela = { chave: string; nome: string; valor: number; quantidade: number };

export type Composicoes = {
  /** Gasto em anúncios por plataforma (meta, google…), antes do imposto. */
  gasto_por_plataforma: Parcela[];
  /** Faturamento bruto por produto. */
  faturamento_por_produto: Parcela[];
  /** Reembolsos e chargebacks ocorridos no período, por produto. */
  reembolsos_por_produto: Parcela[];
};

const LIMITE = 20_000;

const NOME_PLATAFORMA: Record<string, string> = {
  meta: "Meta Ads",
  google: "Google Ads",
  tiktok: "TikTok Ads",
};

/**
 * Parcelas que compõem os cards da Home (o que o ícone de olho mostra). Respeita o
 * filtro: campanha pertence ao funil por funil_campanhas; venda pertence ao funil pela
 * oferta confirmada (ofertas sem funil ficam fora quando há filtro).
 */
export async function obterComposicoes(
  organizacaoId: string,
  periodo: Periodo,
  filtro: Filtro,
  funis: FunilInfo[],
  fuso: string,
): Promise<Composicoes> {
  const supabase = await criarClienteServidor();
  const categoriaDoFunil = new Map(funis.map((f) => [f.id, f.categoria_id]));
  const pertence = (funilId: string | null | undefined) => {
    if (filtro.tipo === "negocio") return true;
    if (!funilId) return false;
    if (filtro.tipo === "funil") return funilId === filtro.id;
    return categoriaDoFunil.get(funilId) === filtro.id;
  };
  const off = deslocamento(fuso);

  const [anuncios, vendas, reembolsos] = await Promise.all([
    supabase
      .from("metricas_anuncio_diarias")
      .select("gasto, campanhas(plataforma, funil_campanhas(funil_id))")
      .eq("organizacao_id", organizacaoId)
      .gte("data", periodo.de)
      .lte("data", periodo.ate)
      .limit(LIMITE),
    supabase
      .from("vendas")
      .select(
        "valor_bruto, produto_id, produtos(nome), ofertas(funil_ofertas(funil_id, status))",
      )
      .eq("organizacao_id", organizacaoId)
      .gte("vendida_em", `${periodo.de}T00:00:00${off}`)
      .lt("vendida_em", `${somarDias(periodo.ate, 1)}T00:00:00${off}`)
      .limit(LIMITE),
    supabase
      .from("vendas")
      .select(
        "valor_bruto, produto_id, produtos(nome), ofertas(funil_ofertas(funil_id, status))",
      )
      .eq("organizacao_id", organizacaoId)
      .neq("status", "aprovada")
      .gte("reembolsada_em", `${periodo.de}T00:00:00${off}`)
      .lt("reembolsada_em", `${somarDias(periodo.ate, 1)}T00:00:00${off}`)
      .limit(LIMITE),
  ]);
  if (reembolsos.error && !tabelaAusente(reembolsos.error)) {
    throw new Error(
      `Falha ao carregar reembolsos por produto: ${reembolsos.error.message}`,
    );
  }
  if (anuncios.error && !tabelaAusente(anuncios.error)) {
    throw new Error(`Falha ao carregar gasto por plataforma: ${anuncios.error.message}`);
  }
  if (vendas.error && !tabelaAusente(vendas.error)) {
    throw new Error(`Falha ao carregar faturamento por produto: ${vendas.error.message}`);
  }

  const porPlataforma = new Map<string, Parcela>();
  for (const l of anuncios.data ?? []) {
    const campanha = l.campanhas;
    if (!pertence(campanha?.funil_campanhas?.funil_id)) continue;
    const chave = campanha?.plataforma ?? "desconhecida";
    const p = porPlataforma.get(chave) ?? {
      chave,
      nome: NOME_PLATAFORMA[chave] ?? chave,
      valor: 0,
      quantidade: 0,
    };
    p.valor += Number(l.gasto ?? 0);
    p.quantidade += 1;
    porPlataforma.set(chave, p);
  }

  const porProduto = new Map<string, Parcela>();
  for (const v of vendas.data ?? []) {
    const vinculo = v.ofertas?.funil_ofertas;
    const funilId = vinculo?.status === "confirmado" ? vinculo.funil_id : null;
    if (!pertence(funilId)) continue;
    const chave = v.produto_id;
    const p = porProduto.get(chave) ?? {
      chave,
      nome: v.produtos?.nome ?? "Produto",
      valor: 0,
      quantidade: 0,
    };
    p.valor += Number(v.valor_bruto ?? 0);
    p.quantidade += 1;
    porProduto.set(chave, p);
  }

  const porProdutoReembolso = new Map<string, Parcela>();
  for (const v of reembolsos.data ?? []) {
    const vinculo = v.ofertas?.funil_ofertas;
    const funilId = vinculo?.status === "confirmado" ? vinculo.funil_id : null;
    if (!pertence(funilId)) continue;
    const p = porProdutoReembolso.get(v.produto_id) ?? {
      chave: v.produto_id,
      nome: v.produtos?.nome ?? "Produto",
      valor: 0,
      quantidade: 0,
    };
    p.valor += Number(v.valor_bruto ?? 0);
    p.quantidade += 1;
    porProdutoReembolso.set(v.produto_id, p);
  }

  const ordenar = (m: Map<string, Parcela>) =>
    [...m.values()]
      .filter((p) => p.valor > 0 || p.quantidade > 0)
      .sort((a, b) => b.valor - a.valor);
  return {
    gasto_por_plataforma: ordenar(porPlataforma),
    faturamento_por_produto: ordenar(porProduto),
    reembolsos_por_produto: ordenar(porProdutoReembolso),
  };
}
