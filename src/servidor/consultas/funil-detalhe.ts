import "server-only";
import type { VendaAscensao } from "@/dominio/ascensao";
import type { FunilInfo } from "./home";
import { resumirUtm, type ResumoUtm, type VendaComUtm } from "@/dominio/utm";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { tabelaAusente } from "@/servidor/supabase/erros";
import { somarDias, type Periodo } from "@/dominio/periodo";
import {
  agruparPorMeioPagamento,
  agruparPorPais,
  type GrupoPagamento,
} from "@/dominio/pagamentos";
import { deslocamento } from "./vendas";
import { listarOfertasDoFunil, type OfertaResumo } from "./ofertas";
import { listarCampanhas, type CampanhaResumo } from "./campanhas";

export type Etapas = {
  impressoes: number;
  cliques_link: number;
  visualizacoes_pagina: number;
  inicios_checkout: number;
  vendas: number;
  leads: number;
};

export type OfertaNoPeriodo = OfertaResumo & {
  vendas_periodo: number;
  faturamento_periodo: number;
  reembolsadas_periodo: number;
};

export type CampanhaNoPeriodo = CampanhaResumo & {
  gasto_periodo: number;
  impressoes_periodo: number;
  cliques_link_periodo: number;
  leads_periodo: number;
};

/** Ofertas do funil com vendas e faturamento no período. */
export async function listarOfertasDoFunilNoPeriodo(
  organizacaoId: string,
  funilId: string,
  periodo: Periodo,
): Promise<OfertaNoPeriodo[]> {
  const ofertas = await listarOfertasDoFunil(organizacaoId, funilId);
  if (ofertas.length === 0) return [];
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("vendas_oferta_diarias")
    .select("oferta_id, vendas, faturamento_bruto, reembolsadas")
    .eq("organizacao_id", organizacaoId)
    .in(
      "oferta_id",
      ofertas.map((o) => o.id),
    )
    .gte("data", periodo.de)
    .lte("data", periodo.ate);
  if (error && !tabelaAusente(error))
    throw new Error(`Falha ao carregar vendas por oferta: ${error.message}`);
  const soma = new Map<string, { v: number; f: number; r: number }>();
  for (const l of data ?? []) {
    if (!l.oferta_id) continue;
    const s = soma.get(l.oferta_id) ?? { v: 0, f: 0, r: 0 };
    s.v += Number(l.vendas ?? 0);
    s.f += Number(l.faturamento_bruto ?? 0);
    s.r += Number(l.reembolsadas ?? 0);
    soma.set(l.oferta_id, s);
  }
  return ofertas.map((o) => {
    const s = soma.get(o.id) ?? { v: 0, f: 0, r: 0 };
    return {
      ...o,
      vendas_periodo: s.v,
      faturamento_periodo: s.f,
      reembolsadas_periodo: s.r,
    };
  });
}

/** Campanhas vinculadas ao funil com gasto no período. */
export async function listarCampanhasDoFunilNoPeriodo(
  organizacaoId: string,
  funilId: string,
  periodo: Periodo,
): Promise<CampanhaNoPeriodo[]> {
  const campanhas = (await listarCampanhas(organizacaoId)).filter(
    (c) => c.funil_id === funilId,
  );
  if (campanhas.length === 0) return [];
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("metricas_campanha_diarias")
    .select("campanha_id, gasto, impressoes, cliques_link, leads")
    .eq("organizacao_id", organizacaoId)
    .in(
      "campanha_id",
      campanhas.map((c) => c.id),
    )
    .gte("data", periodo.de)
    .lte("data", periodo.ate);
  if (error && !tabelaAusente(error))
    throw new Error(`Falha ao carregar métricas por campanha: ${error.message}`);
  const soma = new Map<string, { g: number; i: number; c: number; l: number }>();
  for (const l of data ?? []) {
    if (!l.campanha_id) continue;
    const s = soma.get(l.campanha_id) ?? { g: 0, i: 0, c: 0, l: 0 };
    s.g += Number(l.gasto ?? 0);
    s.i += Number(l.impressoes ?? 0);
    s.c += Number(l.cliques_link ?? 0);
    s.l += Number(l.leads ?? 0);
    soma.set(l.campanha_id, s);
  }
  return campanhas
    .map((c) => {
      const s = soma.get(c.id) ?? { g: 0, i: 0, c: 0, l: 0 };
      return {
        ...c,
        gasto_periodo: s.g,
        impressoes_periodo: s.i,
        cliques_link_periodo: s.c,
        leads_periodo: s.l,
      };
    })
    .sort((a, b) => b.gasto_periodo - a.gasto_periodo);
}

export type PagamentosDoFunil = {
  por_meio: GrupoPagamento[];
  por_pais: GrupoPagamento[];
  truncado: boolean;
  /** Origem das vendas pelas UTMs gravadas na venda. */
  utm: ResumoUtm;
};

const LIMITE_VENDAS = 20_000;

/**
 * Vendas do funil no período (pela oferta confirmada, data da venda no fuso da
 * organização) agrupadas por forma de pagamento e por país estimado pela moeda.
 */
export async function obterPagamentosDoFunil(
  organizacaoId: string,
  funilId: string,
  periodo: Periodo,
  fuso: string,
): Promise<PagamentosDoFunil> {
  const vazio: PagamentosDoFunil = {
    por_meio: [],
    por_pais: [],
    truncado: false,
    utm: resumirUtm([]),
  };
  const ofertas = await listarOfertasDoFunil(organizacaoId, funilId);
  if (ofertas.length === 0) return vazio;

  const supabase = await criarClienteServidor();
  const inicio = `${periodo.de}T00:00:00${deslocamento(fuso)}`;
  const fim = `${somarDias(periodo.ate, 1)}T00:00:00${deslocamento(fuso)}`;
  const { data, error } = await supabase
    .from("vendas")
    .select("id, transacao_id, meio_pagamento, moeda, valor_bruto, origem, utm")
    .eq("organizacao_id", organizacaoId)
    .in(
      "oferta_id",
      ofertas.map((o) => o.id),
    )
    .gte("vendida_em", inicio)
    .lt("vendida_em", fim)
    .limit(LIMITE_VENDAS);
  if (error && tabelaAusente(error)) return vazio;
  if (error) throw new Error(`Falha ao carregar formas de pagamento: ${error.message}`);

  const vendas: VendaComUtm[] = (data ?? []).map((v) => ({
    id: v.id,
    transacao_id: v.transacao_id,
    meio_pagamento: v.meio_pagamento,
    moeda: v.moeda,
    valor_bruto: Number(v.valor_bruto ?? 0),
    conta_item: v.origem !== "recorrencia",
    utm: (v.utm && typeof v.utm === "object" ? v.utm : {}) as Record<string, string>,
  }));
  return {
    por_meio: agruparPorMeioPagamento(vendas),
    por_pais: agruparPorPais(vendas),
    truncado: vendas.length >= LIMITE_VENDAS,
    utm: resumirUtm(vendas),
  };
}

export type RecomprasGeradas = {
  clientes: number;
  transacoes: number;
  receita: number;
  /** Para onde foram as recompras (funil da oferta comprada) → transações e valor. */
  destinos: { funil: string; transacoes: number; receita: number }[];
};

/**
 * Recompras no período feitas por clientes que entraram por este funil, em qualquer
 * oferta. É a "receita adicional" que o funil gerou; na Home e nas métricas do funil
 * essas vendas contam no funil da oferta vendida.
 */
export async function obterRecomprasGeradas(
  organizacaoId: string,
  funilId: string,
  periodo: Periodo,
  fuso: string,
): Promise<RecomprasGeradas> {
  const supabase = await criarClienteServidor();
  const vazio: RecomprasGeradas = { clientes: 0, transacoes: 0, receita: 0, destinos: [] };
  const { data, error } = await supabase
    .from("transacoes")
    .select("cliente_id, valor_total, funil_id, funis(nome), clientes!inner(funil_entrada_id)")
    .eq("organizacao_id", organizacaoId)
    .eq("eh_recompra", true)
    .eq("clientes.funil_entrada_id", funilId)
    .gte("inicio", `${periodo.de}T00:00:00${deslocamento(fuso)}`)
    .lt("inicio", `${somarDias(periodo.ate, 1)}T00:00:00${deslocamento(fuso)}`)
    .limit(LIMITE_VENDAS);
  if (error && tabelaAusente(error)) return vazio;
  if (error) throw new Error(`Falha ao carregar recompras geradas: ${error.message}`);
  const clientes = new Set<string>();
  const destinos = new Map<string, { funil: string; transacoes: number; receita: number }>();
  let receita = 0;
  for (const t of data ?? []) {
    clientes.add(t.cliente_id);
    const valor = Number(t.valor_total ?? 0);
    receita += valor;
    const chave = t.funil_id ?? "";
    const d = destinos.get(chave) ?? {
      funil: t.funis?.nome ?? "Sem funil",
      transacoes: 0,
      receita: 0,
    };
    d.transacoes += 1;
    d.receita += valor;
    destinos.set(chave, d);
  }
  return {
    clientes: clientes.size,
    transacoes: (data ?? []).length,
    receita: Math.round(receita * 100) / 100,
    destinos: [...destinos.values()].sort((a, b) => b.receita - a.receita),
  };
}

/**
 * Vendas de recompra no período feitas por quem entrou por este funil, com produto e
 * categoria do funil da oferta comprada (para o olho "Destino das ascensões").
 */
export async function listarVendasAscensao(
  organizacaoId: string,
  funilId: string,
  periodo: Periodo,
  fuso: string,
  funis: FunilInfo[],
): Promise<VendaAscensao[]> {
  const supabase = await criarClienteServidor();
  const off = deslocamento(fuso);
  const { data, error } = await supabase
    .from("vendas")
    .select(
      "cliente_id, valor_bruto, produtos(nome), ofertas(funil_ofertas(funil_id, status)), transacoes!inner(eh_recompra), clientes!inner(funil_entrada_id)",
    )
    .eq("organizacao_id", organizacaoId)
    .eq("transacoes.eh_recompra", true)
    .eq("clientes.funil_entrada_id", funilId)
    .gte("vendida_em", `${periodo.de}T00:00:00${off}`)
    .lt("vendida_em", `${somarDias(periodo.ate, 1)}T00:00:00${off}`)
    .limit(LIMITE_VENDAS);
  if (error && tabelaAusente(error)) return [];
  if (error) throw new Error(`Falha ao carregar destino das ascensões: ${error.message}`);
  const funilPorId = new Map(funis.map((f) => [f.id, f]));
  return (data ?? []).map((v) => {
    const vinculo = v.ofertas?.funil_ofertas;
    const destino = vinculo?.status === "confirmado" ? funilPorId.get(vinculo.funil_id) : undefined;
    return {
      cliente_id: v.cliente_id,
      valor: Number(v.valor_bruto ?? 0),
      produto: v.produtos?.nome ?? "Produto",
      categoria: destino?.categoria_nome ?? "Sem funil",
      categoria_ordem: destino ? destino.categoria_ordem : Number.MAX_SAFE_INTEGER,
    };
  });
}
