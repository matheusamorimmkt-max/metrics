import { z } from "zod";
import { fracaoPercentual } from "./organizacao";

export const BASES_IMPOSTO = ["bruto", "liquido"] as const;
export type BaseImposto = (typeof BASES_IMPOSTO)[number];

export const ROTULO_BASE: Record<BaseImposto, string> = {
  bruto: "Sobre o faturamento bruto",
  liquido: "Sobre o valor líquido",
};

/** Explicação de cada base, mostrada ao lado da opção. */
export const EXPLICACAO_BASE: Record<BaseImposto, string> = {
  bruto:
    "A alíquota incide sobre o valor das vendas menos os reembolsos. É o caso mais comum (Simples Nacional, Lucro Presumido): o imposto é calculado sobre a receita, antes das taxas.",
  liquido:
    "A alíquota incide sobre o que sobra depois de descontar reembolsos, taxas do gateway e comissões de parceiros. Use só se o seu contador calcula o imposto sobre o valor que efetivamente entra na conta.",
};

export const schemaImpostoProduto = z.object({
  produto_id: z.uuid("Produto inválido."),
  /** false = segue o padrão do negócio; true = alíquota e base próprias. */
  personalizado: z.boolean(),
  aliquota_imposto: fracaoPercentual.optional(),
  base_imposto: z.enum(BASES_IMPOSTO, "Escolha a base do imposto.").optional(),
});

export const schemaImpostoOrganizacao = z.object({
  aliquota_imposto: fracaoPercentual,
  base_imposto: z.enum(BASES_IMPOSTO, "Escolha a base do imposto."),
});
