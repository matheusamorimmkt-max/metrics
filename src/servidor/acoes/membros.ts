"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { schemaConvite } from "@/dominio/schemas/auth";
import { obterContexto } from "@/servidor/sessao";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { criarClienteAdmin } from "@/servidor/supabase/admin";
import { falha, falhaValidacao, sucesso, texto, type Resultado } from "./resultado";

const CAMINHO = "/configuracoes/usuarios";

/** URL pública do app, para o link do convite voltar para cá. */
async function origemDoApp() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

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
  if (erroMembro) {
    if (erroMembro.code === "23505")
      return falha("Essa pessoa já faz parte desta organização.");
    return falha(`Convite enviado, mas não foi possível vincular: ${erroMembro.message}`);
  }

  revalidatePath(CAMINHO);
  return sucesso(
    novoUsuario
      ? `Convite enviado para ${email}. A pessoa receberá um e-mail para definir a senha.`
      : `${email} já tinha conta e agora faz parte de ${organizacao.nome}.`,
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
