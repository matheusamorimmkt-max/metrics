import "server-only";
import { criarClienteServidor } from "@/servidor/supabase/servidor";

export type CategoriaComContagem = {
  id: string;
  nome: string;
  ordem: number;
  tem_semaforo: boolean;
  total_funis: number;
};

export async function listarCategorias(
  organizacaoId: string,
): Promise<CategoriaComContagem[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("categorias")
    .select("id, nome, ordem, tem_semaforo, funis(count)")
    .eq("organizacao_id", organizacaoId)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Falha ao carregar categorias: ${error.message}`);

  return data.map((c) => ({
    id: c.id,
    nome: c.nome,
    ordem: c.ordem,
    tem_semaforo: c.tem_semaforo,
    total_funis: c.funis[0]?.count ?? 0,
  }));
}
