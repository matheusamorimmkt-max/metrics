import { z } from "zod";

export const schemaCriarOrganizacao = z.object({
  nome: z
    .string()
    .trim()
    .min(1, "Informe o nome da empresa.")
    .max(120, "O nome pode ter no máximo 120 caracteres."),
});

/** Fração entre 0 e 1 (0.1215 = 12,15%). A conversão de texto fica em dominio/percentual.ts. */
export const fracaoPercentual = z
  .number()
  .min(0, "Não pode ser negativo.")
  .max(1, "Não pode passar de 100%.");

export const schemaConfiguracoesGerais = z.object({
  nome: z
    .string()
    .trim()
    .min(1, "Informe o nome da empresa.")
    .max(120, "O nome pode ter no máximo 120 caracteres."),
  taxa_anuncios: fracaoPercentual,
  janela_transacao_min: z
    .number()
    .int("Use um número inteiro de minutos.")
    .min(1, "A janela precisa ter pelo menos 1 minuto.")
    .max(1440, "A janela pode ter no máximo 1440 minutos (1 dia)."),
  fuso_horario: z.string().trim().min(1, "Informe o fuso horário."),
  moeda: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, "Use o código de 3 letras da moeda (ex.: BRL)."),
});

export type ConfiguracoesGerais = z.infer<typeof schemaConfiguracoesGerais>;
