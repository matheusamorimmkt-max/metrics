import { z } from "zod";

const credencial = (mensagem: string) =>
  z.string().trim().min(8, mensagem).max(4096, "Credencial longa demais.");

/** "act_123" ou "123" → "act_123". */
const contaAnuncios = z
  .string()
  .trim()
  .regex(
    /^(act_)?\d{4,}$/,
    "Informe o ID da conta de anúncios (números, com ou sem o prefixo act_).",
  )
  .transform((v) => (v.startsWith("act_") ? v : `act_${v}`));

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
  conta_anuncios_id: contaAnuncios,
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
export function configDaConexao(conexao: ConexaoIntegracao): Record<string, string> {
  if (conexao.tipo === "meta") return { conta_anuncios_id: conexao.conta_anuncios_id };
  return {};
}
