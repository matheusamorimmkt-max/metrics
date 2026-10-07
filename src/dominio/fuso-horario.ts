/** Fusos mais usados no Brasil, mostrados primeiro no seletor. */
export const FUSOS_SUGERIDOS = [
  "America/Sao_Paulo",
  "America/Fortaleza",
  "America/Recife",
  "America/Bahia",
  "America/Belem",
  "America/Maceio",
  "America/Araguaina",
  "America/Cuiaba",
  "America/Campo_Grande",
  "America/Manaus",
  "America/Porto_Velho",
  "America/Boa_Vista",
  "America/Rio_Branco",
  "America/Noronha",
  "UTC",
  "Europe/Lisbon",
] as const;

/** Valida contra a lista do próprio runtime (Node 22 / navegadores modernos). */
export function fusoValido(fuso: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: fuso });
    return true;
  } catch {
    return false;
  }
}
