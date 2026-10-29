import "server-only";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { tabelaAusente } from "@/servidor/supabase/erros";
import type { PapelOferta } from "@/dominio/schemas/funil-oferta";
import { hojeNoFuso } from "@/dominio/periodo";
import { deslocamento } from "./vendas";

export type OfertaResumo = {
  id: string;
  nome: string;
  plataforma: string;
  id_externo: string;
  preco: number;
  ativo: boolean;
  produto_id: string;
  produto_nome: string;
  funil_id: string | null;
  funil_nome: string | null;
  papel: PapelOferta | null;
  vinculo_status: "sugerido" | "confirmado" | null;
  vendas: number;
  faturamento: number;
  ultima_venda: string | null;
  /** Movimento no mês corrente (fuso da organização); vem de `listarOfertasComMes`. */
  vendas_mes: number;
  faturamento_mes: number;
};

function mapear(o: Record<string, unknown>): OfertaResumo {
  return {
    id: String(o.id ?? ""),
    nome: String(o.nome ?? ""),
    plataforma: String(o.plataforma ?? ""),
    id_externo: String(o.id_externo ?? ""),
    preco: Number(o.preco ?? 0),
    ativo: Boolean(o.ativo ?? true),
    produto_id: String(o.produto_id ?? ""),
    produto_nome: String(o.produto_nome ?? ""),
    funil_id: (o.funil_id as string | null) ?? null,
    funil_nome: (o.funil_nome as string | null) ?? null,
    papel: (o.papel as PapelOferta | null) ?? null,
    vinculo_status: (o.vinculo_status as "sugerido" | "confirmado" | null) ?? null,
    vendas: Number(o.vendas ?? 0),
    faturamento: Number(o.faturamento ?? 0),
    ultima_venda: (o.ultima_venda as string | null) ?? null,
    vendas_mes: 0,
    faturamento_mes: 0,
  };
}

/**
 * Ofertas com vendas e faturamento do mês corrente, para ver o que tem movimento.
 * Ordena pelo faturamento do mês e depois pelo acumulado.
 */
export async function listarOfertasComMes(
  organizacaoId: string,
  fuso: string,
): Promise<OfertaResumo[]> {
  const supabase = await criarClienteServidor();
  const inicioMes = `${hojeNoFuso(fuso).slice(0, 7)}-01T00:00:00${deslocamento(fuso)}`;
  const [ofertas, mes] = await Promise.all([
    listarOfertas(organizacaoId),
    supabase
      .from("vendas")
      .select("oferta_id, valor_bruto, origem")
      .eq("organizacao_id", organizacaoId)
      .eq("status", "aprovada")
      .gte("vendida_em", inicioMes)
      .limit(20_000),
  ]);
  if (mes.error && !tabelaAusente(mes.error))
    throw new Error(`Falha ao carregar vendas do mês: ${mes.error.message}`);
  const porOferta = new Map<string, { vendas: number; faturamento: number }>();
  for (const v of mes.data ?? []) {
    const a = porOferta.get(v.oferta_id) ?? { vendas: 0, faturamento: 0 };
    if (v.origem !== "recorrencia") a.vendas += 1;
    a.faturamento += Number(v.valor_bruto ?? 0);
    porOferta.set(v.oferta_id, a);
  }
  return ofertas
    .map((o) => ({
      ...o,
      vendas_mes: porOferta.get(o.id)?.vendas ?? 0,
      faturamento_mes: porOferta.get(o.id)?.faturamento ?? 0,
    }))
    .sort((a, b) => b.faturamento_mes - a.faturamento_mes || b.faturamento - a.faturamento);
}

/** Todas as ofertas da organização, mais vendidas primeiro. */
export async function listarOfertas(organizacaoId: string): Promise<OfertaResumo[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("ofertas_resumo")
    .select("*")
    .eq("organizacao_id", organizacaoId)
    .order("faturamento", { ascending: false })
    .order("nome", { ascending: true });
  if (error && tabelaAusente(error)) return [];
  if (error) throw new Error(`Falha ao carregar ofertas: ${error.message}`);
  return data.map((o) => mapear(o as Record<string, unknown>));
}

/** Ofertas de um funil (confirmadas e sugeridas), na ordem front → bump → upsell → downsell. */
export async function listarOfertasDoFunil(
  organizacaoId: string,
  funilId: string,
): Promise<OfertaResumo[]> {
  const todas = await listarOfertas(organizacaoId);
  const ordem: Record<string, number> = { front: 0, bump: 1, upsell: 2, downsell: 3 };
  return todas
    .filter((o) => o.funil_id === funilId)
    .sort((a, b) => (ordem[a.papel ?? ""] ?? 9) - (ordem[b.papel ?? ""] ?? 9));
}

/** Ofertas ainda sem funil, para o seletor de vínculo. */
export async function listarOfertasSemFunil(
  organizacaoId: string,
): Promise<OfertaResumo[]> {
  const todas = await listarOfertas(organizacaoId);
  return todas.filter((o) => !o.funil_id);
}
