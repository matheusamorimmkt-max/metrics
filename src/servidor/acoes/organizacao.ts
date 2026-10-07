"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { schemaCriarOrganizacao } from "@/dominio/schemas/organizacao";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import {
  COOKIE_ORGANIZACAO,
  exigirUsuario,
  listarOrganizacoesDoUsuario,
} from "@/servidor/sessao";
import { falha, falhaValidacao, texto, type Resultado } from "./resultado";

export async function criarOrganizacao(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  await exigirUsuario();

  const parse = schemaCriarOrganizacao.safeParse({ nome: texto(formData, "nome") });
  if (!parse.success) return falhaValidacao(parse.error);

  const supabase = await criarClienteServidor();
  const { data: organizacaoId, error } = await supabase.rpc("criar_organizacao", {
    p_nome: parse.data.nome,
  });
  if (error) return falha(`Não foi possível criar a organização: ${error.message}`);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_ORGANIZACAO, organizacaoId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  redirect("/");
}

/** Troca a organização atual (quando o usuário participa de mais de uma). */
export async function trocarOrganizacao(organizacaoId: string): Promise<void> {
  await exigirUsuario();
  const organizacoes = await listarOrganizacoesDoUsuario();
  if (!organizacoes.some((o) => o.id === organizacaoId)) return;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_ORGANIZACAO, organizacaoId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
  redirect("/");
}
