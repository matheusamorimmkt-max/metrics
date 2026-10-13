import { z } from "zod";
import { fracaoPercentual } from "./organizacao";

export const BASES_IMPOSTO = ["bruto", "liquido"] as const;
export type BaseImposto = (typeof BASES_IMPOSTO)[number];

export const ROTULO_BASE: Record<BaseImposto, string> = {
  bruto: "Sobre o bruto (faturamento − reembolsos)",
  liquido: "Sobre o líquido (também desconta taxas e parceiros)",
};

export const MODOS_ALIQUOTA = ["daqui_para_frente", "recalcular_historico"] as const;
export type ModoAliquota = (typeof MODOS_ALIQUOTA)[number];

export const schemaImpostoProduto = z.object({
  produto_id: z.uuid("Produto inválido."),
  aliquota_imposto: fracaoPercentual,
  base_imposto: z.enum(BASES_IMPOSTO, "Escolha a base do imposto."),
  modo: z.enum(
    MODOS_ALIQUOTA,
    "Escolha se vale só daqui para frente ou para todo o histórico.",
  ),
});
