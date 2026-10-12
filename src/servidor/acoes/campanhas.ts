"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { obterContexto } from "@/servidor/sessao";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { falha, sucesso, type Resultado } from "./resultado";

const CAMINHO = "/configuracoes/campanhas";

const schema = z.object({
  campanha_id: z.uuid("Campanha inválida."),
  funil_id: z.uuid("Funil inválido.").nullable(),
});

/** Vincula a campanha a um funil, ou desvincula quando funil_id é null. */
export async function vincularCampanha(
  campanhaId: string,
  funilId: string | null,
): Promise<Resultado> {
  const { organizacao } = await obterContexto();
  const parse = schema.safeParse({ campanha_id: campanhaId, funil_id: funilId || null });
  if (!parse.success) return falha(parse.error.issues[0]?.message ?? "Dados inválidos.");

  const supabase = await criarClienteServidor();

  // RLS garante a organização; a checagem explícita evita vincular campanha alheia por id.
  const { data: campanha } = await supabase
    .from("campanhas")
    .select("id")
    .eq("id", parse.data.campanha_id)
    .eq("organizacao_id", organizacao.id)
    .maybeSingle();
  if (!campanha) return falha("Campanha não encontrada.");

  if (parse.data.funil_id === null) {
    const { error } = await supabase
      .from("funil_campanhas")
      .delete()
      .eq("campanha_id", parse.data.campanha_id)
      .eq("organizacao_id", organizacao.id);
    if (error) return falha(`Não foi possível desvincular: ${error.message}`);
    revalidatePath(CAMINHO);
    return sucesso("Campanha desvinculada.");
  }

  const { error } = await supabase.from("funil_campanhas").upsert(
    {
      organizacao_id: organizacao.id,
      campanha_id: parse.data.campanha_id,
      funil_id: parse.data.funil_id,
    },
    { onConflict: "campanha_id" },
  );
  if (error) {
    if (error.code === "23503") return falha("Funil não encontrado nesta organização.");
    return falha(`Não foi possível vincular: ${error.message}`);
  }
  revalidatePath(CAMINHO);
  return sucesso("Campanha vinculada.");
}
