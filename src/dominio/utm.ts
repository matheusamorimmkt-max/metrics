/**
 * Origem das vendas pelas UTMs gravadas na venda (`vendas.utm`, jsonb com as chaves
 * `utm_source`, `utm_medium`…). Independente de plataforma: cada conector grava o que
 * a origem entrega. A API da Greenn não envia UTMs (só o webhook, previsto para a fase
 * SaaS), então hoje o campo fica vazio e a tela avisa.
 */
import { agruparVendas, type GrupoPagamento, type VendaParaAgrupar } from "./pagamentos";

export const CAMPOS_UTM = [
  { chave: "utm_source", rotulo: "Origem (utm_source)" },
  { chave: "utm_medium", rotulo: "Mídia (utm_medium)" },
  { chave: "utm_campaign", rotulo: "Campanha (utm_campaign)" },
  { chave: "utm_content", rotulo: "Conteúdo (utm_content)" },
  { chave: "utm_term", rotulo: "Termo (utm_term)" },
] as const;

export type CampoUtm = (typeof CAMPOS_UTM)[number]["chave"];

export type VendaComUtm = VendaParaAgrupar & { utm: Record<string, string> };

export const SEM_UTM = "Não informada";

/** Vendas agrupadas pelo valor de um campo UTM; vazio vira "Não informada". */
export function agruparPorUtm(vendas: VendaComUtm[], campo: CampoUtm): GrupoPagamento[] {
  return agruparVendas(
    vendas,
    (v) => ((v as VendaComUtm).utm?.[campo] ?? "").trim(),
    (chave) => chave || SEM_UTM,
  );
}

/** Quantas vendas trazem pelo menos uma UTM. */
export function contarComUtm(vendas: VendaComUtm[]): number {
  return vendas.filter((v) => Object.values(v.utm ?? {}).some((x) => x && x.trim())).length;
}

export type ResumoUtm = {
  por_campo: Record<CampoUtm, GrupoPagamento[]>;
  com_utm: number;
  total: number;
};

export function resumirUtm(vendas: VendaComUtm[]): ResumoUtm {
  const por_campo = Object.fromEntries(
    CAMPOS_UTM.map((c) => [c.chave, agruparPorUtm(vendas, c.chave)]),
  ) as Record<CampoUtm, GrupoPagamento[]>;
  return { por_campo, com_utm: contarComUtm(vendas), total: vendas.length };
}
