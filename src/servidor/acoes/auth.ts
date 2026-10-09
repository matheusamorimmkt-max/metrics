"use server";

import { redirect } from "next/navigation";
import {
  schemaDefinirSenha,
  schemaLogin,
  schemaRecuperarSenha,
} from "@/dominio/schemas/auth";
import { origemDoApp } from "@/servidor/origem";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { falha, falhaValidacao, sucesso, texto, type Resultado } from "./resultado";

/** Só aceita caminhos internos como destino após o login. */
function destinoSeguro(proximo: string | undefined) {
  if (!proximo || !proximo.startsWith("/") || proximo.startsWith("//")) return "/";
  return proximo;
}

export async function entrar(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const parse = schemaLogin.safeParse({
    email: texto(formData, "email"),
    senha: texto(formData, "senha"),
    proximo: texto(formData, "proximo") || undefined,
  });
  if (!parse.success) return falhaValidacao(parse.error);

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: parse.data.email,
    password: parse.data.senha,
  });

  if (error) {
    if (error.code === "invalid_credentials") return falha("E-mail ou senha incorretos.");
    if (error.code === "email_not_confirmed")
      return falha("Confirme seu e-mail antes de entrar.");
    return falha(`Não foi possível entrar: ${error.message}`);
  }

  redirect(destinoSeguro(parse.data.proximo));
}

export async function sair(): Promise<void> {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function definirSenha(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const parse = schemaDefinirSenha.safeParse({
    senha: texto(formData, "senha"),
    confirmacao: texto(formData, "confirmacao"),
  });
  if (!parse.success) return falhaValidacao(parse.error);

  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password: parse.data.senha });
  if (error) {
    if (error.code === "same_password")
      return falha("A nova senha precisa ser diferente da atual.");
    if (error.code === "weak_password")
      return falha("Senha fraca. Use pelo menos 8 caracteres.");
    return falha(`Não foi possível salvar a senha: ${error.message}`);
  }

  redirect("/");
}

/**
 * Envia o e-mail de recuperação de senha. A resposta é a mesma exista ou não a conta,
 * para não revelar quais e-mails estão cadastrados.
 */
export async function solicitarRecuperacaoSenha(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const parse = schemaRecuperarSenha.safeParse({ email: texto(formData, "email") });
  if (!parse.success) return falhaValidacao(parse.error);

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(parse.data.email, {
    redirectTo: `${await origemDoApp()}/auth/recuperar`,
  });

  if (error) {
    if (error.code === "over_email_send_rate_limit")
      return falha(
        "Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos e tente de novo.",
      );
    if (error.code === "email_address_invalid") return falha("Informe um e-mail válido.");
    // Outros erros (ex.: conta inexistente) não são expostos de propósito.
  }

  return sucesso(
    `Se ${parse.data.email} tiver uma conta, você receberá um e-mail com o link para criar uma nova senha. Confira também a caixa de spam.`,
  );
}
