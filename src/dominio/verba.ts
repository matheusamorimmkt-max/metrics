/**
 * Orçamento de campanha ou conjunto digitado pelo usuário ("150", "150,50", "R$ 1.250,00")
 * vira número na moeda da conta, com 2 casas. O conector converte para a menor unidade
 * (centavos) ao falar com o Meta.
 */
export type TipoVerba = "diaria" | "total";

export const ROTULO_TIPO_VERBA: Record<TipoVerba, string> = {
  diaria: "Diário",
  total: "Total",
};

/** Menor orçamento aceito (o Meta recusa valores abaixo de ~R$ 1 por dia; aqui só evitamos zero). */
export const VERBA_MINIMA = 1;

/** "1.250,50" | "1250.50" | "R$ 150" -> 1250.5 / 150. Retorna null se não for número positivo. */
export function textoParaVerba(texto: string): number | null {
  let limpo = texto.replace(/[^\d.,-]/g, "");
  if (limpo === "") return null;
  // Com vírgula, ela é o decimal e os pontos são milhar ("1.250,50").
  if (limpo.includes(",")) limpo = limpo.replace(/\./g, "").replace(",", ".");
  // Só pontos: um ponto é decimal ("150.50"); mais de um, milhar ("1.250.000").
  else if ((limpo.match(/\./g) ?? []).length > 1) limpo = limpo.replace(/\./g, "");
  if (!/^\d+(\.\d+)?$/.test(limpo)) return null;
  const numero = Math.round(Number(limpo) * 100) / 100;
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return numero;
}

/** 1250.5 -> "1250,50" (para preencher o campo de edição). */
export function verbaParaTexto(valor: number): string {
  return valor.toFixed(2).replace(".", ",");
}
