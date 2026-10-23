"use server";

import { revalidatePath } from "next/cache";
import { schemaConvite } from "@/dominio/schemas/auth";
import { origemDoApp } from "@/servidor/origem";
import { obterContexto } from "@/servidor/sessao";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { criarClienteAdmin } from "@/servidor/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import { envServidor } from "@/servidor/env";
import { falha, falhaValidacao, sucesso, texto, type Resultado } from "./resultado";

const CAMINHO = "/configuracoes/usuarios";

/** Procura um usuário do Auth pelo e-mail (a API admin não tem busca direta por e-mail). */
async function encontrarUsuarioPorEmail(email: string) {
  const admin = criarClienteAdmin();
  let pagina = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page: pagina,
      perPage: 200,
    });
    if (error) throw new Error(error.message);
    const achado = data.users.find((u) => u.email?.toLowerCase() === email);
    if (achado) return achado;
    if (data.users.length < 200) return null;
    pagina += 1;
  }
}

/**
 * Para quem já tem conta no Auth, o convite do Supabase não envia e-mail nenhum. Manda
 * então o e-mail de redefinição de senha, que leva a /auth/callback e /definir-senha.
 * Usa um cliente de fluxo implícito: o PKCE guardaria o verificador no navegador de
 * quem convida, e o link só abriria nele.
 */
async function enviarLinkDeAcesso(email: string): Promise<string | null> {
  const env = envServidor();
  const auth = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false },
  });
  const { error } = await auth.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origemDoApp()}/auth/callback`,
  });
  if (!error) return null;
  if (error.code === "over_email_send_rate_limit")
    return "o Supabase recusou o envio por excesso de e-mails (o serviço padrão manda 2 por hora); tente de novo mais tarde";
  return error.message;
}

export async function convidarMembro(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { organizacao } = await obterContexto();
  const parse = schemaConvite.safeParse({ email: texto(formData, "email") });
  if (!parse.success) return falhaValidacao(parse.error);
  const email = parse.data.email;

  const admin = criarClienteAdmin();
  let userId: string | null = null;
  let novoUsuario = false;

  const { data: convite, error: erroConvite } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo: `${await origemDoApp()}/auth/callback`,
      data: { organizacao_convidada: organizacao.nome },
    },
  );

  if (!erroConvite) {
    userId = convite.user.id;
    novoUsuario = true;
  } else if (erroConvite.code === "email_exists") {
    const existente = await encontrarUsuarioPorEmail(email);
    if (!existente)
      return falha("Este e-mail já está cadastrado, mas não foi possível localizá-lo.");
    userId = existente.id;
  } else {
    return falha(`Não foi possível enviar o convite: ${erroConvite.message}`);
  }

  // Insere o vínculo com o cliente admin (o convidado ainda não tem sessão para passar pela RLS).
  const { error: erroMembro } = await admin
    .from("membros")
    .insert({ organizacao_id: organizacao.id, user_id: userId, papel: "diretor" });
  const jaEraMembro = erroMembro?.code === "23505";
  if (erroMembro && !jaEraMembro) {
    return falha(`Convite enviado, mas não foi possível vincular: ${erroMembro.message}`);
  }

  revalidatePath(CAMINHO);
  if (novoUsuario) {
    return sucesso(
      `Convite enviado para ${email}. A pessoa receberá um e-mail para definir a senha.`,
    );
  }

  const erroEnvio = await enviarLinkDeAcesso(email);
  if (erroEnvio) {
    return falha(
      `${email} já tinha conta${jaEraMembro ? " e já faz parte da organização" : ""}, mas não foi possível enviar o link de acesso: ${erroEnvio}.`,
    );
  }
  return sucesso(
    jaEraMembro
      ? `${email} já faz parte de ${organizacao.nome}. Reenviamos um e-mail com o link para entrar e definir a senha.`
      : `${email} já tinha conta e agora faz parte de ${organizacao.nome}. Enviamos um e-mail com o link para entrar e definir a senha.`,
  );
}

export async function removerMembro(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { organizacao, usuario } = await obterContexto();
  const membroId = texto(formData, "id");
  if (!membroId) return falha("Membro inválido.");

  const supabase = await criarClienteServidor();
  const { data: membro } = await supabase
    .from("membros")
    .select("user_id")
    .eq("organizacao_id", organizacao.id)
    .eq("id", membroId)
    .maybeSingle();
  if (!membro) return falha("Membro não encontrado.");
  if (membro.user_id === usuario.id) return falha("Você não pode remover a si mesmo.");

  const { error } = await supabase
    .from("membros")
    .delete()
    .eq("organizacao_id", organizacao.id)
    .eq("id", membroId);
  if (error) {
    if (error.code === "23514")
      return falha("A organização precisa ter pelo menos um membro.");
    return falha(`Não foi possível remover: ${error.message}`);
  }

  revalidatePath(CAMINHO);
  return sucesso("Acesso removido.");
}
