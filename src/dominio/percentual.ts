/**
 * Percentuais são guardados como fração decimal (0.1215) no banco e em todo o código.
 * Nas telas o usuário digita e lê em "por cento" com vírgula brasileira ("12,15").
 * Estas funções fazem a ponte entre os dois mundos. Ver CLAUDE.md > Stack e convenções.
 */

/** "12,15" | "12.15" | " 12 % " -> 0.1215. Retorna null se não for número. */
export function textoParaFracao(texto: string): number | null {
  const limpo = texto.replace(/\s|%/g, "").replace(",", ".");
  if (limpo === "" || !/^-?\d*(\.\d+)?$/.test(limpo)) return null;
  const numero = Number(limpo);
  if (!Number.isFinite(numero)) return null;
  // Arredonda a 4 casas na fração (= 2 casas no percentual), que é a precisão do banco.
  return Math.round(numero * 100) / 10000;
}

/** 0.1215 -> "12,15". Casas decimais padrão 2, sem zeros à direita desnecessários opcionais. */
export function fracaoParaTexto(fracao: number, casas = 2): string {
  return (fracao * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: casas,
  });
}

/** 0.1215 -> "12,15%" */
export function formatarPercentual(fracao: number, casas = 2): string {
  return `${fracaoParaTexto(fracao, casas)}%`;
}
