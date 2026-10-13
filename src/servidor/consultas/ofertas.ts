import "server-only";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { tabelaAusente } from "@/servidor/supabase/erros";
import type { PapelOferta } from "@/dominio/schemas/funil-oferta";

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
  };
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
