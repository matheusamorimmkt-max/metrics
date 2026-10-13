"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { obterContexto } from "@/servidor/sessao";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { criarClienteAdmin } from "@/servidor/supabase/admin";
import { falha, sucesso, type Resultado } from "./resultado";

const CAMINHO = "/configuracoes/campanhas";
/** Conectores que aceitam ações, por plataforma da campanha. */
const CONECTORES: Record<string, string> = { meta: "meta-sync" };

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

type RespostaAcao = { status: string; erro?: string; campanha_status?: string };

/**
 * Liga (ACTIVE) ou desativa (PAUSED) a campanha na plataforma, pelo conector. O app
 * nunca fala com o Meta direto: a Edge Function lê o token no cofre e faz a chamada.
 */
export async function alterarStatusCampanha(
  campanhaId: string,
  ativar: boolean,
): Promise<Resultado> {
  const { organizacao } = await obterContexto();
  const id = z.uuid().safeParse(campanhaId);
  if (!id.success) return falha("Campanha inválida.");

  const supabase = await criarClienteServidor();
  const { data: campanha } = await supabase
    .from("campanhas")
    .select("id, plataforma")
    .eq("id", id.data)
    .eq("organizacao_id", organizacao.id)
    .maybeSingle();
  if (!campanha) return falha("Campanha não encontrada.");
  const funcao = CONECTORES[campanha.plataforma];
  if (!funcao)
    return falha("Esta plataforma ainda não permite ligar ou desligar pelo painel.");

  const admin = criarClienteAdmin();
  const { data, error } = await admin.functions.invoke<RespostaAcao>(funcao, {
    body: {
      acao: "alterar_status_campanha",
      organizacao_id: organizacao.id,
      campanha_id: id.data,
      status: ativar ? "ACTIVE" : "PAUSED",
    },
  });
  if (error) {
    let mensagem = error.message;
    const contexto = (error as { context?: Response }).context;
    if (contexto && typeof contexto.json === "function") {
      try {
        const corpo = (await contexto.json()) as RespostaAcao;
        mensagem = corpo.erro ?? mensagem;
      } catch {
        /* mantém a mensagem padrão */
      }
    }
    return falha(mensagem);
  }
  if (data?.status !== "concluida")
    return falha(data?.erro ?? "A plataforma não confirmou.");

  revalidatePath(CAMINHO);
  revalidatePath("/trafego");
  revalidatePath("/", "layout");
  return sucesso(ativar ? "Campanha ligada." : "Campanha desativada.");
}
