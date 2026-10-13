/**
 * Seletor de período da Home. Datas sempre como AAAA-MM-DD no fuso da organização.
 * Não usa Date local do servidor para "hoje": calcula pelo fuso informado.
 */

export const PERIODOS = [
  { chave: "hoje", rotulo: "Hoje" },
  { chave: "ontem", rotulo: "Ontem" },
  { chave: "7d", rotulo: "7 dias" },
  { chave: "30d", rotulo: "30 dias" },
  { chave: "mes", rotulo: "Este mês" },
  { chave: "mes_anterior", rotulo: "Mês passado" },
  { chave: "todo", rotulo: "Todo o período" },
  { chave: "personalizado", rotulo: "Personalizado" },
] as const;

/** Período padrão ao entrar no app. */
export const PERIODO_PADRAO: ChavePeriodo = "mes";

export type ChavePeriodo = (typeof PERIODOS)[number]["chave"];

export type Periodo = {
  chave: ChavePeriodo;
  de: string;
  ate: string;
  /** Período imediatamente anterior, com o mesmo número de dias, para a variação. */
  anterior_de: string;
  anterior_ate: string;
  dias: number;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function hojeNoFuso(fuso: string, agora = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const pega = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  return `${pega("year")}-${pega("month")}-${pega("day")}`;
}

export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function diasEntre(de: string, ate: string): number {
  const a = new Date(`${de}T00:00:00Z`).getTime();
  const b = new Date(`${ate}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}

function primeiroDiaDoMes(data: string): string {
  return `${data.slice(0, 7)}-01`;
}

/**
 * Resolve os parâmetros da URL (periodo, de, ate) num período válido. Padrão: este mês.
 * "Todo o período" começa no primeiro dado da organização (`inicioDados`, AAAA-MM-DD);
 * sem dado conhecido, cobre os últimos 365 dias.
 */
export function resolverPeriodo(
  fuso: string,
  params: { periodo?: string; de?: string; ate?: string },
  agora = new Date(),
  inicioDados?: string | null,
): Periodo {
  const hoje = hojeNoFuso(fuso, agora);
  const chave = (
    PERIODOS.some((p) => p.chave === params.periodo) ? params.periodo : PERIODO_PADRAO
  ) as ChavePeriodo;

  let de: string;
  let ate: string;
  switch (chave) {
    case "hoje":
      de = ate = hoje;
      break;
    case "ontem":
      de = ate = somarDias(hoje, -1);
      break;
    case "7d":
      de = somarDias(hoje, -6);
      ate = hoje;
      break;
    case "mes":
      de = primeiroDiaDoMes(hoje);
      ate = hoje;
      break;
    case "mes_anterior": {
      const fimAnterior = somarDias(primeiroDiaDoMes(hoje), -1);
      de = primeiroDiaDoMes(fimAnterior);
      ate = fimAnterior;
      break;
    }
    case "todo": {
      const inicio =
        inicioDados && ISO.test(inicioDados) && inicioDados <= hoje
          ? inicioDados
          : somarDias(hoje, -364);
      de = inicio;
      ate = hoje;
      break;
    }
    case "personalizado": {
      const deOk = params.de && ISO.test(params.de) ? params.de : somarDias(hoje, -29);
      const ateOk = params.ate && ISO.test(params.ate) ? params.ate : hoje;
      de = deOk <= ateOk ? deOk : ateOk;
      ate = deOk <= ateOk ? ateOk : deOk;
      break;
    }
    default:
      // "30d"
      de = somarDias(hoje, -29);
      ate = hoje;
  }

  const dias = diasEntre(de, ate);
  return {
    chave,
    de,
    ate,
    anterior_ate: somarDias(de, -1),
    anterior_de: somarDias(de, -dias),
    dias,
  };
}

/** "2026-09-01" -> "01/09". */
export function diaCurto(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}
