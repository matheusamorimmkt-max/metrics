"use server";

import { revalidatePath } from "next/cache";
import {
  schemaCriarCategoria,
  schemaIdCategoria,
  schemaMoverCategoria,
  schemaRenomearCategoria,
} from "@/dominio/schemas/categoria";
import { obterContexto } from "@/servidor/sessao";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { falha, falhaValidacao, sucesso, texto, type Resultado } from "./resultado";

const CAMINHO = "/configuracoes/categorias";

function mensagemErro(codigo: string | undefined, mensagem: string) {
  if (codigo === "23505") return "Já existe uma categoria com esse nome.";
  if (codigo === "23503")
    return "Esta categoria tem funis. Mova ou exclua os funis antes.";
  return `Não foi possível concluir: ${mensagem}`;
}

export async function criarCategoria(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { organizacao } = await obterContexto();
  const parse = schemaCriarCategoria.safeParse({
    nome: texto(formData, "nome"),
    tem_semaforo: formData.get("tem_semaforo") === "on",
  });
  if (!parse.success) return falhaValidacao(parse.error);

  const supabase = await criarClienteServidor();
  const { data: ultima } = await supabase
    .from("categorias")
    .select("ordem")
    .eq("organizacao_id", organizacao.id)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("categorias").insert({
    organizacao_id: organizacao.id,
    nome: parse.data.nome,
    tem_semaforo: parse.data.tem_semaforo,
    ordem: (ultima?.ordem ?? 0) + 1,
  });
  if (error) return falha(mensagemErro(error.code, error.message));

  revalidatePath(CAMINHO);
  return sucesso(`Categoria "${parse.data.nome}" criada.`);
}

export async function renomearCategoria(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { organizacao } = await obterContexto();
  const parse = schemaRenomearCategoria.safeParse({
    id: texto(formData, "id"),
    nome: texto(formData, "nome"),
  });
  if (!parse.success) return falhaValidacao(parse.error);

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("categorias")
    .update({ nome: parse.data.nome })
    .eq("organizacao_id", organizacao.id)
    .eq("id", parse.data.id);
  if (error) return falha(mensagemErro(error.code, error.message));

  revalidatePath(CAMINHO);
  revalidatePath("/configuracoes/funis");
  return sucesso("Categoria renomeada.");
}

export async function definirSemaforo(id: string, ligado: boolean): Promise<Resultado> {
  const { organizacao } = await obterContexto();
  const parse = schemaIdCategoria.safeParse({ id });
  if (!parse.success) return falhaValidacao(parse.error);

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("categorias")
    .update({ tem_semaforo: ligado })
    .eq("organizacao_id", organizacao.id)
    .eq("id", parse.data.id);
  if (error) return falha(mensagemErro(error.code, error.message));

  revalidatePath(CAMINHO);
  return sucesso(ligado ? "Semáforo ligado." : "Semáforo desligado.");
}

export async function moverCategoria(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { organizacao } = await obterContexto();
  const parse = schemaMoverCategoria.safeParse({
    id: texto(formData, "id"),
    direcao: texto(formData, "direcao"),
  });
  if (!parse.success) return falhaValidacao(parse.error);

  const supabase = await criarClienteServidor();
  const { data: lista, error } = await supabase
    .from("categorias")
    .select("id, ordem")
    .eq("organizacao_id", organizacao.id)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return falha(mensagemErro(error.code, error.message));

  const indice = lista.findIndex((c) => c.id === parse.data.id);
  const vizinho = parse.data.direcao === "cima" ? indice - 1 : indice + 1;
  if (indice < 0 || vizinho < 0 || vizinho >= lista.length) return sucesso();

  // Renumera tudo em sequência (1..n) trocando as duas posições: evita empates de ordem.
  const nova = [...lista];
  [nova[indice], nova[vizinho]] = [nova[vizinho], nova[indice]];
  for (const [i, c] of nova.entries()) {
    if (c.ordem !== i + 1) {
      const { error: erroUpdate } = await supabase
        .from("categorias")
        .update({ ordem: i + 1 })
        .eq("organizacao_id", organizacao.id)
        .eq("id", c.id);
      if (erroUpdate) return falha(mensagemErro(erroUpdate.code, erroUpdate.message));
    }
  }

  revalidatePath(CAMINHO);
  revalidatePath("/configuracoes/funis");
  return sucesso();
}

export async function excluirCategoria(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { organizacao } = await obterContexto();
  const parse = schemaIdCategoria.safeParse({ id: texto(formData, "id") });
  if (!parse.success) return falhaValidacao(parse.error);

  const supabase = await criarClienteServidor();
  const { count } = await supabase
    .from("funis")
    .select("id", { count: "exact", head: true })
    .eq("organizacao_id", organizacao.id)
    .eq("categoria_id", parse.data.id);
  if ((count ?? 0) > 0) {
    return falha("Esta categoria tem funis. Mova ou exclua os funis antes.");
  }

  const { error } = await supabase
    .from("categorias")
    .delete()
    .eq("organizacao_id", organizacao.id)
    .eq("id", parse.data.id);
  if (error) return falha(mensagemErro(error.code, error.message));

  revalidatePath(CAMINHO);
  return sucesso("Categoria excluída.");
}
