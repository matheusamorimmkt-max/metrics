/** Lê uma lista separada por vírgula de um parâmetro da URL. */
export function lerLista(valor: string | string[] | null | undefined): string[] {
  if (typeof valor !== "string" || !valor) return [];
  return valor.split(",").filter(Boolean);
}
