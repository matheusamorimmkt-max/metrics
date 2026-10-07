import "server-only";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import type { TipoFunil } from "@/dominio/schemas/funil";

export type FunilResumo = {
  id: string;
  nome: string;
  tipo: TipoFunil;
  meta_roi: number;
  data_inicio: string | null;
  data_fim: string | null;
  ativo: boolean;
  categoria_id: string;
  total_ofertas: number;
};

export type CategoriaComFunis = {
  id: string;
  nome: string;
  tem_semaforo: boolean;
  funis: FunilResumo[];
};

export async function listarFunisPorCategoria(
  organizacaoId: string,
): Promise<CategoriaComFunis[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("categorias")
    .select(
      "id, nome, tem_semaforo, funis(id, nome, tipo, meta_roi, data_inicio, data_fim, ativo, categoria_id, funil_ofertas(count))",
    )
    .eq("organizacao_id", organizacaoId)
    .order("ordem", { ascending: true })
    .order("nome", { referencedTable: "funis", ascending: true });
  if (error) throw new Error(`Falha ao carregar funis: ${error.message}`);

  return data.map((c) => ({
    id: c.id,
    nome: c.nome,
    tem_semaforo: c.tem_semaforo,
    funis: c.funis.map((f) => ({
      id: f.id,
      nome: f.nome,
      tipo: f.tipo as TipoFunil,
      meta_roi: Number(f.meta_roi),
      data_inicio: f.data_inicio,
      data_fim: f.data_fim,
      ativo: f.ativo,
      categoria_id: f.categoria_id,
      total_ofertas: f.funil_ofertas[0]?.count ?? 0,
    })),
  }));
}

export async function obterFunil(
  organizacaoId: string,
  id: string,
): Promise<FunilResumo | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("funis")
    .select(
      "id, nome, tipo, meta_roi, data_inicio, data_fim, ativo, categoria_id, funil_ofertas(count)",
    )
    .eq("organizacao_id", organizacaoId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Falha ao carregar funil: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    nome: data.nome,
    tipo: data.tipo as TipoFunil,
    meta_roi: Number(data.meta_roi),
    data_inicio: data.data_inicio,
    data_fim: data.data_fim,
    ativo: data.ativo,
    categoria_id: data.categoria_id,
    total_ofertas: data.funil_ofertas[0]?.count ?? 0,
  };
}
