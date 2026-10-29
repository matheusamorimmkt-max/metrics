"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  PAPEIS_OFERTA,
  schemaOfertaId,
  schemaVincularOferta,
  schemaVincularOfertasEmLote,
} from "@/dominio/schemas/funil-oferta";
import { obterContexto } from "@/servidor/sessao";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { falha, sucesso, type Resultado, semPermissao } from "./resultado";

function revalidar(funilId?: string | null) {
  revalidatePath("/configuracoes/ofertas");
  revalidatePath("/configuracoes/funis");
  if (funilId) revalidatePath(`/configuracoes/funis/${funilId}`);
  revalidatePath("/");
}

/** Onde a oferta já está, para a mensagem de conflito. */
async function funilAtualDaOferta(ofertaId: string) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("funil_ofertas")
    .select("funil_id, status, funis(nome)")
    .eq("oferta_id", ofertaId)
    .maybeSingle();
  return data
    ? { funil_id: data.funil_id, status: data.status, nome: data.funis?.nome ?? "" }
    : null;
}

/**
 * Vincula várias ofertas de uma vez ao mesmo funil e papel. Ofertas já confirmadas em
 * outro funil são puladas e listadas na mensagem; as demais são vinculadas (ou movidas,
 * se eram só sugestão).
 */
export async function vincularOfertasEmLote(
  ofertaIds: string[],
  funilId: string,
  papel: string,
): Promise<Resultado<{ vinculadas: number; puladas: string[] }>> {
  const contexto = await obterContexto();
  if (!contexto.podeEditar) return semPermissao();
  const { organizacao } = contexto;
  const parse = schemaVincularOfertasEmLote.safeParse({
    oferta_ids: ofertaIds,
    funil_id: funilId,
    papel,
  });
  if (!parse.success) return falha(parse.error.issues[0]?.message ?? "Dados inválidos.");

  const supabase = await criarClienteServidor();
  const { data: atuais, error: erroAtuais } = await supabase
    .from("funil_ofertas")
    .select("oferta_id, funil_id, status, funis(nome), ofertas(nome)")
    .eq("organizacao_id", organizacao.id)
    .in("oferta_id", parse.data.oferta_ids);
  if (erroAtuais) return falha(`Não foi possível conferir os vínculos: ${erroAtuais.message}`);

  const puladas: string[] = [];
  const funisAfetados = new Set<string>([parse.data.funil_id]);
  const bloqueadas = new Set<string>();
  for (const a of atuais ?? []) {
    if (a.funil_id !== parse.data.funil_id && a.status === "confirmado") {
      bloqueadas.add(a.oferta_id);
      puladas.push(`${a.ofertas?.nome ?? "oferta"} (já em "${a.funis?.nome ?? "outro funil"}")`);
    } else if (a.funil_id !== parse.data.funil_id) {
      funisAfetados.add(a.funil_id);
    }
  }
  const paraVincular = parse.data.oferta_ids.filter((id) => !bloqueadas.has(id));
  if (paraVincular.length) {
    const { error } = await supabase.from("funil_ofertas").upsert(
      paraVincular.map((oferta_id) => ({
        organizacao_id: organizacao.id,
        oferta_id,
        funil_id: parse.data.funil_id,
        papel: parse.data.papel,
        status: "confirmado" as const,
      })),
      { onConflict: "oferta_id" },
    );
    if (error) {
      if (error.code === "23503")
        return falha("Alguma oferta ou o funil não foi encontrado nesta organização.");
      return falha(`Não foi possível vincular: ${error.message}`);
    }
  }
  for (const f of funisAfetados) revalidar(f);

  const n = paraVincular.length;
  const mensagem =
    n === 0
      ? "Nenhuma oferta vinculada."
      : `${n} ${n === 1 ? "oferta vinculada" : "ofertas vinculadas"}.`;
  return sucesso(
    puladas.length
      ? `${mensagem} Puladas por já estarem confirmadas em outro funil: ${puladas.join("; ")}.`
      : mensagem,
    { vinculadas: n, puladas },
  );
}

/**
 * Vincula (ou muda o papel de) uma oferta num funil. Uma oferta pertence a um único
 * funil: se já estiver em outro confirmada, avisa em vez de mover.
 */
export async function vincularOferta(
  ofertaId: string,
  funilId: string,
  papel: string,
): Promise<Resultado<{ conflito_funil_id?: string }>> {
  const contexto = await obterContexto();
  if (!contexto.podeEditar) return semPermissao();
  const { organizacao } = contexto;
  const parse = schemaVincularOferta.safeParse({
    oferta_id: ofertaId,
    funil_id: funilId,
    papel,
  });
  if (!parse.success) return falha(parse.error.issues[0]?.message ?? "Dados inválidos.");

  const atual = await funilAtualDaOferta(parse.data.oferta_id);
  if (atual && atual.funil_id !== parse.data.funil_id && atual.status === "confirmado") {
    return {
      ok: false,
      erro: `Esta oferta já está no funil "${atual.nome}". Remova de lá antes de vincular aqui.`,
      erros: { conflito_funil_id: [atual.funil_id] },
    };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("funil_ofertas").upsert(
    {
      organizacao_id: organizacao.id,
      oferta_id: parse.data.oferta_id,
      funil_id: parse.data.funil_id,
      papel: parse.data.papel,
      status: "confirmado",
    },
    { onConflict: "oferta_id" },
  );
  if (error) {
    if (error.code === "23503")
      return falha("Oferta ou funil não encontrados nesta organização.");
    return falha(`Não foi possível vincular: ${error.message}`);
  }
  revalidar(parse.data.funil_id);
  if (atual?.funil_id && atual.funil_id !== parse.data.funil_id)
    revalidar(atual.funil_id);
  return sucesso("Oferta vinculada.");
}

/** Confirma uma sugestão de bump/upsell, mantendo o papel sugerido (ou outro). */
export async function confirmarSugestao(
  ofertaId: string,
  papel?: string,
): Promise<Resultado> {
  const contexto = await obterContexto();
  if (!contexto.podeEditar) return semPermissao();
  const { organizacao } = contexto;
  const parse = schemaOfertaId.safeParse({ oferta_id: ofertaId });
  if (!parse.success) return falha("Oferta inválida.");
  const papelOk = z.enum(PAPEIS_OFERTA).safeParse(papel);

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("funil_ofertas")
    .update({ status: "confirmado", ...(papelOk.success ? { papel: papelOk.data } : {}) })
    .eq("oferta_id", parse.data.oferta_id)
    .eq("organizacao_id", organizacao.id)
    .select("funil_id")
    .maybeSingle();
  if (error) return falha(`Não foi possível confirmar: ${error.message}`);
  if (!data) return falha("Sugestão não encontrada.");
  revalidar(data.funil_id);
  return sucesso("Sugestão confirmada.");
}

/** Descarta a sugestão: sai do funil e não volta a ser sugerida para esse papel. */
export async function descartarSugestao(ofertaId: string): Promise<Resultado> {
  const contexto = await obterContexto();
  if (!contexto.podeEditar) return semPermissao();
  const { organizacao } = contexto;
  const parse = schemaOfertaId.safeParse({ oferta_id: ofertaId });
  if (!parse.success) return falha("Oferta inválida.");

  const supabase = await criarClienteServidor();
  const { data: vinculo } = await supabase
    .from("funil_ofertas")
    .select("funil_id, papel, status")
    .eq("oferta_id", parse.data.oferta_id)
    .eq("organizacao_id", organizacao.id)
    .maybeSingle();
  if (!vinculo) return falha("Sugestão não encontrada.");
  if (vinculo.status !== "sugerido")
    return falha("Esta oferta já está confirmada no funil.");

  if (vinculo.papel === "bump" || vinculo.papel === "upsell") {
    const { error } = await supabase.from("ofertas_descartadas").upsert(
      {
        organizacao_id: organizacao.id,
        funil_id: vinculo.funil_id,
        oferta_id: parse.data.oferta_id,
        papel: vinculo.papel,
      },
      { onConflict: "funil_id,oferta_id,papel" },
    );
    if (error) return falha(`Não foi possível registrar o descarte: ${error.message}`);
  }
  const { error } = await supabase
    .from("funil_ofertas")
    .delete()
    .eq("oferta_id", parse.data.oferta_id)
    .eq("organizacao_id", organizacao.id);
  if (error) return falha(`Não foi possível descartar: ${error.message}`);
  revalidar(vinculo.funil_id);
  return sucesso("Sugestão descartada.");
}

/** Tira a oferta do funil (volta a "não vinculada"). */
export async function removerOfertaDoFunil(ofertaId: string): Promise<Resultado> {
  const contexto = await obterContexto();
  if (!contexto.podeEditar) return semPermissao();
  const { organizacao } = contexto;
  const parse = schemaOfertaId.safeParse({ oferta_id: ofertaId });
  if (!parse.success) return falha("Oferta inválida.");

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("funil_ofertas")
    .delete()
    .eq("oferta_id", parse.data.oferta_id)
    .eq("organizacao_id", organizacao.id)
    .select("funil_id")
    .maybeSingle();
  if (error) return falha(`Não foi possível remover: ${error.message}`);
  revalidar(data?.funil_id);
  return sucesso("Oferta removida do funil.");
}
