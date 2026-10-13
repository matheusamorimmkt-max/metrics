/**
 * Fusos horários oferecidos em Configurações → Geral. No Brasil, só as cidades
 * principais de cada fuso; no mundo, as principais capitais. O deslocamento em
 * relação ao GMT é calculado na hora de mostrar (muda com horário de verão).
 */

export type OpcaoFuso = { id: string; cidades: string };

export const FUSOS_BRASIL: OpcaoFuso[] = [
  { id: "America/Noronha", cidades: "Fernando de Noronha" },
  { id: "America/Sao_Paulo", cidades: "Brasília, São Paulo, Rio de Janeiro" },
  { id: "America/Fortaleza", cidades: "Fortaleza, Recife, Salvador, Belém" },
  { id: "America/Manaus", cidades: "Manaus, Cuiabá, Campo Grande, Porto Velho" },
  { id: "America/Rio_Branco", cidades: "Rio Branco" },
];

export const FUSOS_MUNDO: OpcaoFuso[] = [
  { id: "Pacific/Honolulu", cidades: "Honolulu" },
  { id: "America/Anchorage", cidades: "Anchorage" },
  { id: "America/Los_Angeles", cidades: "Los Angeles, Vancouver" },
  { id: "America/Denver", cidades: "Denver" },
  { id: "America/Mexico_City", cidades: "Cidade do México" },
  { id: "America/Chicago", cidades: "Chicago" },
  { id: "America/Bogota", cidades: "Bogotá, Lima, Quito" },
  { id: "America/New_York", cidades: "Nova York, Washington, Toronto" },
  { id: "America/Caracas", cidades: "Caracas" },
  { id: "America/Santiago", cidades: "Santiago" },
  { id: "America/Asuncion", cidades: "Assunção" },
  { id: "America/Argentina/Buenos_Aires", cidades: "Buenos Aires" },
  { id: "America/Montevideo", cidades: "Montevidéu" },
  { id: "UTC", cidades: "UTC" },
  { id: "Europe/Lisbon", cidades: "Lisboa" },
  { id: "Europe/London", cidades: "Londres, Dublin" },
  { id: "Europe/Madrid", cidades: "Madri" },
  { id: "Europe/Paris", cidades: "Paris, Bruxelas, Amsterdã" },
  { id: "Europe/Berlin", cidades: "Berlim, Viena, Estocolmo" },
  { id: "Europe/Rome", cidades: "Roma" },
  { id: "Europe/Athens", cidades: "Atenas" },
  { id: "Europe/Moscow", cidades: "Moscou" },
  { id: "Europe/Istanbul", cidades: "Istambul" },
  { id: "Africa/Cairo", cidades: "Cairo" },
  { id: "Africa/Johannesburg", cidades: "Joanesburgo" },
  { id: "Africa/Lagos", cidades: "Lagos" },
  { id: "Africa/Luanda", cidades: "Luanda" },
  { id: "Africa/Maputo", cidades: "Maputo" },
  { id: "Asia/Dubai", cidades: "Dubai" },
  { id: "Asia/Karachi", cidades: "Karachi" },
  { id: "Asia/Kolkata", cidades: "Nova Délhi, Mumbai" },
  { id: "Asia/Bangkok", cidades: "Bangkok, Jacarta" },
  { id: "Asia/Shanghai", cidades: "Pequim, Xangai" },
  { id: "Asia/Singapore", cidades: "Singapura, Kuala Lumpur" },
  { id: "Asia/Hong_Kong", cidades: "Hong Kong" },
  { id: "Asia/Tokyo", cidades: "Tóquio" },
  { id: "Asia/Seoul", cidades: "Seul" },
  { id: "Australia/Sydney", cidades: "Sydney, Canberra" },
  { id: "Pacific/Auckland", cidades: "Auckland" },
];

/** "GMT-03:00" do fuso num instante (hoje, por padrão). */
export function deslocamentoGmt(fuso: string, instante = new Date()): string {
  try {
    const partes = new Intl.DateTimeFormat("en-US", {
      timeZone: fuso,
      timeZoneName: "longOffset",
    }).formatToParts(instante);
    const nome = partes.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    return nome === "GMT" ? "GMT+00:00" : nome;
  } catch {
    return "GMT";
  }
}

/** Rótulo mostrado no seletor: "GMT-03:00 · Brasília, São Paulo, Rio de Janeiro". */
export function rotuloFuso(opcao: OpcaoFuso, instante = new Date()): string {
  return `${deslocamentoGmt(opcao.id, instante)} · ${opcao.cidades}`;
}

/** Ordena pelo deslocamento (oeste → leste) num instante. */
export function ordenarPorGmt(opcoes: OpcaoFuso[], instante = new Date()): OpcaoFuso[] {
  const minutos = (fuso: string) => {
    const m = /GMT([+-])(\d{2}):(\d{2})/.exec(deslocamentoGmt(fuso, instante));
    if (!m) return 0;
    return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
  };
  return [...opcoes].sort((a, b) => minutos(a.id) - minutos(b.id));
}

/** Valida contra a lista do próprio runtime (Node 22 / navegadores modernos). */
export function fusoValido(fuso: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: fuso });
    return true;
  } catch {
    return false;
  }
}
