/** "2026-10-01" -> "01/10/2026" (sem converter fuso: datas de lançamento são datas puras). */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-");
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

export function formatarPeriodo(inicio: string | null, fim: string | null): string {
  if (!inicio && !fim) return "";
  return `${formatarData(inicio)} a ${formatarData(fim)}`;
}

/** ISO (timestamptz) -> "12/10/2026 14:32" no fuso da organização. */
export function formatarDataHora(iso: string | null | undefined, fuso: string): string {
  if (!iso) return "";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: fuso,
  }).format(data);
}
