"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { obterContexto } from "@/servidor/sessao";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { criarClienteAdmin } from "@/servidor/supabase/admin";
import { falha, sucesso, type Resultado, semPermissao } from "./resultado";

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
  const contexto = await obterContexto();
  if (!contexto.podeEditar) return semPermissao();
  const { organizacao } = contexto;
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

type RespostaAcao = { status: string; erro?: string; novo_status?: string };

const schemaVeiculacao = z.object({
  nivel: z.enum(["campanha", "conjunto", "anuncio"]),
  id: z.uuid("Registro inválido."),
});

const TABELA_POR_NIVEL = {
  campanha: "campanhas",
  conjunto: "conjuntos",
  anuncio: "anuncios",
} as const;

const ROTULO_NIVEL = { campanha: "Campanha", conjunto: "Conjunto", anuncio: "Anúncio" };

/**
 * Liga (ACTIVE) ou pausa (PAUSED) uma campanha, conjunto ou anúncio na plataforma,
 * pelo conector. O app nunca fala com o Meta direto: a Edge Function lê o token no
 * cofre e faz a chamada.
 */
export async function alterarStatusVeiculacao(
  nivel: "campanha" | "conjunto" | "anuncio",
  id: string,
  ativar: boolean,
): Promise<Resultado> {
  const contexto = await obterContexto();
  if (!contexto.podeEditar) return semPermissao();
  const { organizacao } = contexto;
  const parse = schemaVeiculacao.safeParse({ nivel, id });
  if (!parse.success) return falha(parse.error.issues[0]?.message ?? "Dados inválidos.");

  const supabase = await criarClienteServidor();
  const { data: linha, error: erroLinha } = await supabase
    .from(TABELA_POR_NIVEL[parse.data.nivel])
    .select("id, plataforma")
    .eq("id", parse.data.id)
    .eq("organizacao_id", organizacao.id)
    .maybeSingle();
  if (erroLinha) return falha(`Não foi possível localizar: ${erroLinha.message}`);
  if (!linha) return falha(`${ROTULO_NIVEL[parse.data.nivel]} não encontrado.`);
  const funcao = CONECTORES[linha.plataforma];
  if (!funcao)
    return falha("Esta plataforma ainda não permite ligar ou desligar pelo painel.");

  const admin = criarClienteAdmin();
  const { data, error } = await admin.functions.invoke<RespostaAcao>(funcao, {
    body: {
      acao: "alterar_status",
      nivel: parse.data.nivel,
      organizacao_id: organizacao.id,
      id: parse.data.id,
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
  const rotulo = ROTULO_NIVEL[parse.data.nivel];
  return sucesso(ativar ? `${rotulo} em veiculação.` : `${rotulo} pausado.`);
}
