/** Moedas oferecidas em Configurações → Geral (código ISO 4217). */
export const MOEDAS: { codigo: string; nome: string }[] = [
  { codigo: "BRL", nome: "Real brasileiro" },
  { codigo: "USD", nome: "Dólar americano" },
  { codigo: "EUR", nome: "Euro" },
  { codigo: "GBP", nome: "Libra esterlina" },
  { codigo: "ARS", nome: "Peso argentino" },
  { codigo: "CLP", nome: "Peso chileno" },
  { codigo: "COP", nome: "Peso colombiano" },
  { codigo: "MXN", nome: "Peso mexicano" },
  { codigo: "PEN", nome: "Sol peruano" },
  { codigo: "UYU", nome: "Peso uruguaio" },
  { codigo: "PYG", nome: "Guarani paraguaio" },
  { codigo: "BOB", nome: "Boliviano" },
  { codigo: "CAD", nome: "Dólar canadense" },
  { codigo: "AUD", nome: "Dólar australiano" },
  { codigo: "CHF", nome: "Franco suíço" },
  { codigo: "JPY", nome: "Iene japonês" },
  { codigo: "CNY", nome: "Yuan chinês" },
  { codigo: "AOA", nome: "Kwanza angolano" },
  { codigo: "MZN", nome: "Metical moçambicano" },
];

export function rotuloMoeda(codigo: string): string {
  const m = MOEDAS.find((x) => x.codigo === codigo);
  return m ? `${m.codigo} · ${m.nome}` : codigo;
}
