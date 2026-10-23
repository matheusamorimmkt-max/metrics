import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { papelDe, podeEditar as papelPodeEditar, type Papel } from "@/dominio/papeis";

export const COOKIE_ORGANIZACAO = "organizacao";

export type Usuario = { id: string; email: string };

export type Organizacao = {
  id: string;
  nome: string;
  taxa_anuncios: number;
  janela_transacao_min: number;
  fuso_horario: string;
  moeda: string;
  /** Imposto sobre as vendas, padrão do negócio (fração). */
  aliquota_imposto: number;
  base_imposto: "bruto" | "liquido";
  /** Papel do usuário atual nesta organização. */
  papel: Papel;
};

/** Usuário autenticado ou null. Validado no servidor do Supabase (getUser), não só pelo cookie. */
export const obterUsuario = cache(async (): Promise<Usuario | null> => {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? "" };
});

/** Redireciona para /login se não houver usuário. */
export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await obterUsuario();
  if (!usuario) redirect("/login");
  return usuario;
}

/** Organizações das quais o usuário é membro, na ordem de entrada. */
export const listarOrganizacoesDoUsuario = cache(async (): Promise<Organizacao[]> => {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("membros")
    .select(
      // `*` tolera a migration do imposto ainda não aplicada (colunas chegam como undefined).
      "created_at, papel, organizacoes ( * )",
    )
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Falha ao carregar organizações: ${error.message}`);
  return data
    .filter((m) => m.organizacoes !== null)
    .map((m) => ({ o: m.organizacoes!, papel: papelDe(m.papel) }))
    .map(({ o, papel }) => ({
      id: o.id,
      nome: o.nome,
      taxa_anuncios: Number(o.taxa_anuncios),
      janela_transacao_min: o.janela_transacao_min,
      fuso_horario: o.fuso_horario,
      moeda: o.moeda.trim(),
      aliquota_imposto: Number(o.aliquota_imposto ?? 0),
      base_imposto: o.base_imposto === "liquido" ? "liquido" : "bruto",
      papel,
    }));
});

export type Contexto = {
  usuario: Usuario;
  organizacao: Organizacao;
  organizacoes: Organizacao[];
  /** Administrador edita; visualizador só vê. */
  podeEditar: boolean;
};

/**
 * Contexto de toda página autenticada: usuário + organização atual.
 * Sem organização, manda para /criar-organizacao.
 * A organização atual vem do cookie "organizacao" quando válido; senão, a primeira.
 */
export const obterContexto = cache(async (): Promise<Contexto> => {
  const usuario = await exigirUsuario();
  const organizacoes = await listarOrganizacoesDoUsuario();
  if (organizacoes.length === 0) redirect("/criar-organizacao");

  const cookieStore = await cookies();
  const preferida = cookieStore.get(COOKIE_ORGANIZACAO)?.value;
  const organizacao = organizacoes.find((o) => o.id === preferida) ?? organizacoes[0];

  return { usuario, organizacao, organizacoes, podeEditar: papelPodeEditar(organizacao.papel) };
});
