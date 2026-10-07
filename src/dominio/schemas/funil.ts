import { z } from "zod";
import { fracaoPercentual } from "./organizacao";

export const TIPOS_FUNIL = ["venda_direta", "lancamento", "closer", "isca"] as const;
export type TipoFunil = (typeof TIPOS_FUNIL)[number];

export const ROTULO_TIPO_FUNIL: Record<TipoFunil, string> = {
  venda_direta: "Venda direta",
  lancamento: "Lançamento",
  closer: "Closer (alto valor)",
  isca: "Isca gratuita",
};

export const DESCRICAO_TIPO_FUNIL: Record<TipoFunil, string> = {
  venda_direta:
    "Front-end e Back-end: anúncio → página → checkout → compra, bumps e upsells.",
  lancamento: "Período com início e fim; a análise é sempre do lançamento inteiro.",
  closer: "High-end: leads, agendamentos e comparecimentos chegam quando houver CRM.",
  isca: "E-books, aulas e eventos gratuitos; mede custo por lead, não faturamento.",
};

const dataOpcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use uma data válida.")
      .nullable(),
  );

export const schemaFunil = z
  .object({
    nome: z
      .string()
      .trim()
      .min(1, "Informe o nome do funil.")
      .max(120, "O nome pode ter no máximo 120 caracteres."),
    categoria_id: z.uuid("Escolha uma categoria."),
    tipo: z.enum(TIPOS_FUNIL, "Escolha o tipo do funil."),
    meta_roi: fracaoPercentual.max(100, "Meta de ROI alta demais."),
    data_inicio: dataOpcional,
    data_fim: dataOpcional,
  })
  .superRefine((v, ctx) => {
    if (v.tipo === "lancamento") {
      if (!v.data_inicio) {
        ctx.addIssue({
          code: "custom",
          path: ["data_inicio"],
          message: "Lançamento precisa de data de início.",
        });
      }
      if (!v.data_fim) {
        ctx.addIssue({
          code: "custom",
          path: ["data_fim"],
          message: "Lançamento precisa de data de fim.",
        });
      }
      if (v.data_inicio && v.data_fim && v.data_fim < v.data_inicio) {
        ctx.addIssue({
          code: "custom",
          path: ["data_fim"],
          message: "A data de fim deve ser igual ou posterior à de início.",
        });
      }
    }
  })
  .transform((v) =>
    v.tipo === "lancamento" ? v : { ...v, data_inicio: null, data_fim: null },
  );

export type DadosFunil = z.infer<typeof schemaFunil>;

export const schemaIdFunil = z.object({ id: z.uuid() });
