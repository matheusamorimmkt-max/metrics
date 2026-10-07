"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { schemaFunil, schemaIdFunil } from "@/dominio/schemas/funil";
import { textoParaFracao } from "@/dominio/percentual";
import { obterContexto } from "@/servidor/sessao";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { falha, falhaValidacao, sucesso, texto, type Resultado } from "./resultado";

const CAMINHO = "/configuracoes/funis";

function mensagemErro(codigo: string | undefined, mensagem: string) {
  if (codigo === "23505") return "Já existe um funil com esse nome.";
  if (codigo === "23503") return "Categoria inválida para esta organização.";
  if (codigo === "23514")
    return "Dados inválidos: confira o tipo e as datas do lançamento.";
  return `Não foi possível concluir: ${mensagem}`;
}

function lerFormulario(formData: FormData) {
  return schemaFunil.safeParse({
    nome: texto(formData, "nome"),
    categoria_id: texto(formData, "categoria_id"),
    tipo: texto(formData, "tipo"),
    meta_roi: textoParaFracao(texto(formData, "meta_roi")) ?? Number.NaN,
    data_inicio: texto(formData, "data_inicio"),
    data_fim: texto(formData, "data_fim"),
  });
}

export async function criarFunil(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { organizacao } = await obterContexto();
  const parse = lerFormulario(formData);
  if (!parse.success) return falhaValidacao(parse.error);

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("funis")
    .insert({ organizacao_id: organizacao.id, ...parse.data })
    .select("id")
    .single();
  if (error) return falha(mensagemErro(error.code, error.message));

  revalidatePath(CAMINHO);
  redirect(`${CAMINHO}/${data.id}?criado=1`);
}

export async function atualizarFunil(
  id: string,
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { organizacao } = await obterContexto();
  const idParse = schemaIdFunil.safeParse({ id });
  if (!idParse.success) return falha("Funil inválido.");
  const parse = lerFormulario(formData);
  if (!parse.success) return falhaValidacao(parse.error);

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("funis")
    .update(parse.data)
    .eq("organizacao_id", organizacao.id)
    .eq("id", idParse.data.id);
  if (error) return falha(mensagemErro(error.code, error.message));

  revalidatePath(CAMINHO);
  revalidatePath(`${CAMINHO}/${id}`);
  return sucesso("Funil salvo.");
}

export async function definirAtivoFunil(id: string, ativo: boolean): Promise<Resultado> {
  const { organizacao } = await obterContexto();
  const parse = schemaIdFunil.safeParse({ id });
  if (!parse.success) return falha("Funil inválido.");

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("funis")
    .update({ ativo })
    .eq("organizacao_id", organizacao.id)
    .eq("id", parse.data.id);
  if (error) return falha(mensagemErro(error.code, error.message));

  revalidatePath(CAMINHO);
  revalidatePath(`${CAMINHO}/${id}`);
  return sucesso(ativo ? "Funil reativado." : "Funil arquivado.");
}

export async function excluirFunil(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { organizacao } = await obterContexto();
  const parse = schemaIdFunil.safeParse({ id: texto(formData, "id") });
  if (!parse.success) return falha("Funil inválido.");

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("funis")
    .delete()
    .eq("organizacao_id", organizacao.id)
    .eq("id", parse.data.id);
  if (error) return falha(mensagemErro(error.code, error.message));

  revalidatePath(CAMINHO);
  redirect(`${CAMINHO}?excluido=1`);
}
