import "server-only";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { tabelaAusente } from "@/servidor/supabase/erros";
import type { BaseImposto } from "@/dominio/schemas/produto";

export type ProdutoResumo = {
  id: string;
  nome: string;
  plataforma: string;
  id_externo: string;
  aliquota_imposto: number;
  base_imposto: BaseImposto;
  imposto_personalizado: boolean;
  ativo: boolean;
  ofertas: number;
  vendas_30d: number;
  vigencias: number;
};

export async function listarProdutos(organizacaoId: string): Promise<ProdutoResumo[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("produtos_resumo")
    .select("*")
    .eq("organizacao_id", organizacaoId)
    .order("nome", { ascending: true });
  if (error && tabelaAusente(error)) return [];
  if (error) throw new Error(`Falha ao carregar produtos: ${error.message}`);
  return data.map((p) => ({
    id: p.id ?? "",
    nome: p.nome ?? "",
    plataforma: p.plataforma ?? "",
    id_externo: p.id_externo ?? "",
    aliquota_imposto: Number(p.aliquota_imposto ?? 0),
    base_imposto: (p.base_imposto ?? "bruto") as BaseImposto,
    imposto_personalizado: p.imposto_personalizado ?? false,
    ativo: p.ativo ?? true,
    ofertas: Number(p.ofertas ?? 0),
    vendas_30d: Number(p.vendas_30d ?? 0),
    vigencias: Number(p.vigencias ?? 0),
  }));
}
