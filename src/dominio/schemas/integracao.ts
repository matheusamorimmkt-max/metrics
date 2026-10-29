import { z } from "zod";

const credencial = (mensagem: string) =>
  z.string().trim().min(8, mensagem).max(4096, "Credencial longa demais.");

const ID_CONTA = /^(act_)?\d{4,}$/;

/**
 * Uma ou mais contas: "act_123, 456" ou uma por linha → ["act_123", "act_456"],
 * sem repetição.
 */
const contasAnuncios = z
  .string()
  .trim()
  .transform((v) => v.split(/[\s,;]+/).filter(Boolean))
  .refine((ids) => ids.length > 0, "Informe pelo menos um ID de conta de anúncios.")
  .refine(
    (ids) => ids.every((id) => ID_CONTA.test(id)),
    "Cada ID de conta é só números, com ou sem o prefixo act_. Separe várias contas por vírgula ou uma por linha.",
  )
  .transform((ids) => [...new Set(ids.map((id) => (id.startsWith("act_") ? id : `act_${id}`)))]);

export const schemaConectarGreenn = z.object({
  tipo: z.literal("greenn"),
  credencial: credencial("Cole o token da API da Greenn.").refine(
    (v) => /^grn_(live|test)_/.test(v),
    "Este não é um token da API pública da Greenn: ele começa com grn_live_. Gere um em Configurações do sistema → Integrações e Tokens → API.",
  ),
});

export const schemaConectarMeta = z.object({
  tipo: z.literal("meta"),
  credencial: credencial("Cole o token de acesso do Meta."),
  contas_anuncios_ids: contasAnuncios,
});

export const schemaConectarIntegracao = z.discriminatedUnion("tipo", [
  schemaConectarGreenn,
  schemaConectarMeta,
]);

export type ConexaoIntegracao = z.infer<typeof schemaConectarIntegracao>;

export const schemaTipoIntegracao = z.object({
  tipo: z.enum(["greenn", "meta"], "Integração desconhecida."),
});

/** O que vai para `integracoes.config` (tudo menos a credencial e o tipo). */
export function configDaConexao(
  conexao: ConexaoIntegracao,
): Record<string, string | string[]> {
  if (conexao.tipo === "meta") return { contas_anuncios_ids: conexao.contas_anuncios_ids };
  return {};
}
