"use server";

import { redirect } from "next/navigation";
import { schemaDefinirSenha, schemaLogin } from "@/dominio/schemas/auth";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { falha, falhaValidacao, texto, type Resultado } from "./resultado";

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
