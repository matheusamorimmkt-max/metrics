"use server";

import { revalidatePath } from "next/cache";
import { INTEGRACOES } from "@/dominio/integracoes";
import {
  configDaConexao,
  schemaConectarIntegracao,
  schemaTipoIntegracao,
} from "@/dominio/schemas/integracao";
import { obterContexto } from "@/servidor/sessao";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { falha, falhaValidacao, sucesso, texto, type Resultado, semPermissao } from "./resultado";

const CAMINHO = "/configuracoes/integracoes";

/**
 * Guarda a credencial da integração no Vault, pela função do banco.
 * A credencial passa por aqui uma única vez e nunca é registrada em log nem devolvida.
 */
export async function conectarIntegracao(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const contexto = await obterContexto();
  if (!contexto.podeEditar) return semPermissao();
  const { organizacao } = contexto;

  const parse = schemaConectarIntegracao.safeParse({
    tipo: texto(formData, "tipo"),
    credencial: texto(formData, "credencial"),
    conta_anuncios_id: texto(formData, "conta_anuncios_id") || undefined,
  });
  if (!parse.success) return falhaValidacao(parse.error);

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("guardar_credencial_integracao", {
    p_organizacao_id: organizacao.id,
    p_tipo: parse.data.tipo,
    p_credencial: parse.data.credencial,
    p_config: configDaConexao(parse.data),
  });
  if (error) return falha(`Não foi possível guardar as credenciais: ${error.message}`);

  revalidatePath(CAMINHO);
  return sucesso(
    `${INTEGRACOES[parse.data.tipo].nome}: credenciais guardadas no cofre. A primeira sincronização confirma se o acesso está correto.`,
  );
}

/** Apaga a credencial do Vault e volta a integração para "não conectada". */
export async function desconectarIntegracao(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const contexto = await obterContexto();
  if (!contexto.podeEditar) return semPermissao();
  const { organizacao } = contexto;

  const parse = schemaTipoIntegracao.safeParse({ tipo: texto(formData, "tipo") });
  if (!parse.success) return falhaValidacao(parse.error);

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("remover_credencial_integracao", {
    p_organizacao_id: organizacao.id,
    p_tipo: parse.data.tipo,
  });
  if (error) return falha(`Não foi possível desconectar: ${error.message}`);

  revalidatePath(CAMINHO);
  return sucesso(
    `${INTEGRACOES[parse.data.tipo].nome} desconectada. A credencial foi apagada.`,
  );
}
