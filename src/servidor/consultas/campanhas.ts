import "server-only";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { tabelaAusente } from "@/servidor/supabase/erros";

export type CampanhaResumo = {
  id: string;
  nome: string;
  id_externo: string;
  plataforma: string;
  status: string | null;
  objetivo: string | null;
  ativo: boolean;
  conta_nome: string;
  moeda: string;
  funil_id: string | null;
  gasto_total: number;
  gasto_30d: number;
  ultima_data: string | null;
};

export type FunilOpcao = { id: string; nome: string; categoria: string };

/** Campanhas importadas com gasto acumulado e funil vinculado, mais gastadoras primeiro. */
export async function listarCampanhas(organizacaoId: string): Promise<CampanhaResumo[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("campanhas_resumo")
    .select(
      "id, nome, id_externo, plataforma, status, objetivo, ativo, conta_nome, moeda, funil_id, gasto_total, gasto_30d, ultima_data",
    )
    .eq("organizacao_id", organizacaoId)
    .order("gasto_30d", { ascending: false })
    .order("nome", { ascending: true });
  if (error && tabelaAusente(error)) return [];
  if (error) throw new Error(`Falha ao carregar campanhas: ${error.message}`);
  return data.map((c) => ({
    id: c.id ?? "",
    nome: c.nome ?? "",
    id_externo: c.id_externo ?? "",
    plataforma: c.plataforma ?? "",
    status: c.status,
    objetivo: c.objetivo,
    ativo: c.ativo ?? false,
    conta_nome: c.conta_nome ?? "",
    moeda: c.moeda ?? "BRL",
    funil_id: c.funil_id,
    gasto_total: Number(c.gasto_total ?? 0),
    gasto_30d: Number(c.gasto_30d ?? 0),
    ultima_data: c.ultima_data,
  }));
}

/** Funis ativos para o seletor de vínculo, com o nome da categoria. */
export async function listarFunisParaVinculo(
  organizacaoId: string,
): Promise<FunilOpcao[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("funis")
    .select("id, nome, categorias(nome, ordem)")
    .eq("organizacao_id", organizacaoId)
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) throw new Error(`Falha ao carregar funis: ${error.message}`);
  return data
    .map((f) => ({
      id: f.id,
      nome: f.nome,
      categoria: f.categorias?.nome ?? "",
      ordem: f.categorias?.ordem ?? 0,
    }))
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
    .map(({ id, nome, categoria }) => ({ id, nome, categoria }));
}
