/** Série da Home por dia ou por mês (faturamento e lucro). */
export type PontoBarras = {
  chave: string;
  rotulo: string;
  faturamento_bruto: number;
  lucro: number;
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-10" → "out/26". */
export function mesCurto(anoMes: string): string {
  const mes = Number(anoMes.slice(5, 7));
  return `${MESES[mes - 1] ?? anoMes.slice(5, 7)}/${anoMes.slice(2, 4)}`;
}

export function serieDiaria(
  serie: { data: string; faturamento_bruto: number; lucro: number }[],
  rotuloDia: (iso: string) => string,
): PontoBarras[] {
  return serie.map((p) => ({
    chave: p.data,
    rotulo: rotuloDia(p.data),
    faturamento_bruto: p.faturamento_bruto,
    lucro: p.lucro,
  }));
}

/** Soma os dias de cada mês (AAAA-MM), na ordem do tempo. */
export function serieMensal(
  serie: { data: string; faturamento_bruto: number; lucro: number }[],
): PontoBarras[] {
  const meses = new Map<string, PontoBarras>();
  for (const p of serie) {
    const chave = p.data.slice(0, 7);
    const m = meses.get(chave) ?? {
      chave,
      rotulo: mesCurto(chave),
      faturamento_bruto: 0,
      lucro: 0,
    };
    m.faturamento_bruto += p.faturamento_bruto;
    m.lucro += p.lucro;
    meses.set(chave, m);
  }
  return [...meses.values()]
    .map((m) => ({
      ...m,
      faturamento_bruto: Math.round(m.faturamento_bruto * 100) / 100,
      lucro: Math.round(m.lucro * 100) / 100,
    }))
    .sort((a, b) => a.chave.localeCompare(b.chave));
}
