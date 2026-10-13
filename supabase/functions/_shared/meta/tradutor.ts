/**
 * Graph API do Meta → formato interno. Puro: sem fetch, sem Deno, sem Supabase.
 * Testado no Vitest (tests/unit/meta-tradutor.test.ts).
 */
import type {
  AnuncioImportado,
  CampanhaImportada,
  ConjuntoImportado,
  ContaAnuncioImportada,
  MetricaDiariaImportada,
} from "./tipos.ts";

export type AcaoMeta = { action_type: string; value: string | number };

export type InsightMeta = {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  date_start: string;
  date_stop?: string;
  spend?: string | number;
  impressions?: string | number;
  reach?: string | number;
  clicks?: string | number;
  inline_link_clicks?: string | number;
  actions?: AcaoMeta[];
};

export type CampanhaMeta = {
  id: string;
  name?: string;
  status?: string;
  effective_status?: string;
  objective?: string;
};

export type CriativoMeta = {
  id?: string;
  thumbnail_url?: string;
  image_url?: string;
  video_id?: string;
  instagram_permalink_url?: string;
  object_type?: string;
  object_story_spec?: {
    video_data?: { video_id?: string; image_url?: string };
    link_data?: { picture?: string; image_hash?: string; child_attachments?: unknown[] };
    photo_data?: { image_hash?: string };
  };
};

export type ConjuntoMeta = {
  id: string;
  name?: string;
  status?: string;
  effective_status?: string;
  campaign_id?: string;
};

export type AnuncioMeta = {
  id: string;
  name?: string;
  status?: string;
  effective_status?: string;
  campaign_id?: string;
  adset_id?: string;
  adset?: { id?: string; name?: string };
  creative?: CriativoMeta;
};

export type ContaMeta = {
  id: string;
  account_id?: string;
  name?: string;
  currency?: string;
  timezone_name?: string;
};

/** Tipos de ação do pixel que alimentam cada coluna (decisão 3 do plano da Fase 3). */
const MAPA_ACOES: Record<
  keyof Pick<
    MetricaDiariaImportada,
    | "cliques_link"
    | "visualizacoes_pagina"
    | "inicios_checkout"
    | "leads"
    | "compras_plataforma"
  >,
  string[]
> = {
  cliques_link: ["link_click"],
  visualizacoes_pagina: ["landing_page_view"],
  inicios_checkout: ["initiate_checkout", "omni_initiated_checkout"],
  leads: ["lead", "onsite_conversion.lead_grouped"],
  compras_plataforma: ["purchase", "omni_purchase"],
};

export function numero(valor: string | number | undefined | null): number {
  if (valor === undefined || valor === null || valor === "") return 0;
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : 0;
}

/** Soma o valor da primeira ação encontrada entre os tipos aceitos (evita contar omni + simples duas vezes). */
export function somarAcao(acoes: AcaoMeta[] | undefined, tipos: string[]): number {
  if (!acoes?.length) return 0;
  for (const tipo of tipos) {
    const acao = acoes.find((a) => a.action_type === tipo);
    if (acao) return Math.round(numero(acao.value));
  }
  return 0;
}

export function traduzirInsight(insight: InsightMeta): MetricaDiariaImportada | null {
  if (!insight.campaign_id || !insight.date_start) return null;
  const cliquesLinkAcoes = somarAcao(insight.actions, MAPA_ACOES.cliques_link);
  return {
    campanha_id_externo: insight.campaign_id,
    campanha_nome: insight.campaign_name ?? "",
    conjunto_id_externo: insight.adset_id ?? "",
    conjunto_nome: insight.adset_name ?? null,
    anuncio_id_externo: insight.ad_id ?? "",
    anuncio_nome: insight.ad_name ?? null,
    data: insight.date_start,
    gasto: Math.round(numero(insight.spend) * 100) / 100,
    impressoes: Math.round(numero(insight.impressions)),
    alcance: Math.round(numero(insight.reach)),
    cliques: Math.round(numero(insight.clicks)),
    // inline_link_clicks é o campo direto; se não vier, cai para a ação link_click.
    cliques_link:
      insight.inline_link_clicks !== undefined
        ? Math.round(numero(insight.inline_link_clicks))
        : cliquesLinkAcoes,
    visualizacoes_pagina: somarAcao(insight.actions, MAPA_ACOES.visualizacoes_pagina),
    inicios_checkout: somarAcao(insight.actions, MAPA_ACOES.inicios_checkout),
    leads: somarAcao(insight.actions, MAPA_ACOES.leads),
    compras_plataforma: somarAcao(insight.actions, MAPA_ACOES.compras_plataforma),
    dados_brutos: insight,
  };
}

export function traduzirCampanha(c: CampanhaMeta): CampanhaImportada {
  const status = c.effective_status ?? c.status ?? null;
  return {
    id_externo: c.id,
    nome: c.name ?? "",
    status,
    objetivo: c.objective ?? null,
    ativo: status === "ACTIVE",
  };
}

export function traduzirConjunto(c: ConjuntoMeta): ConjuntoImportado | null {
  if (!c.id || !c.campaign_id) return null;
  const status = c.effective_status ?? c.status ?? null;
  return {
    id_externo: c.id,
    campanha_id_externo: c.campaign_id,
    nome: c.name ?? "",
    status,
    ativo: status === "ACTIVE",
  };
}

/** Anúncio com o criativo: decide se é vídeo, imagem ou carrossel e guarda as URLs. */
export function traduzirAnuncio(a: AnuncioMeta): AnuncioImportado | null {
  if (!a.id || !a.campaign_id) return null;
  const cr = a.creative ?? {};
  const spec = cr.object_story_spec;
  const videoId = cr.video_id ?? spec?.video_data?.video_id ?? null;
  const imagem =
    cr.image_url ?? spec?.link_data?.picture ?? spec?.video_data?.image_url ?? null;
  const carrossel =
    (spec?.link_data?.child_attachments?.length ?? 0) > 1 ||
    cr.object_type === "CAROUSEL";
  const tipo: AnuncioImportado["criativo_tipo"] = videoId
    ? "video"
    : carrossel
      ? "carrossel"
      : imagem || cr.thumbnail_url
        ? "imagem"
        : cr.id
          ? "outro"
          : null;
  const status = a.effective_status ?? a.status ?? null;
  return {
    id_externo: a.id,
    campanha_id_externo: a.campaign_id,
    conjunto_id_externo: a.adset_id ?? a.adset?.id ?? "",
    conjunto_nome: a.adset?.name ?? null,
    nome: a.name ?? "",
    status,
    ativo: status === "ACTIVE",
    criativo_tipo: tipo,
    miniatura_url: cr.thumbnail_url ?? imagem,
    imagem_url: imagem,
    video_id_externo: videoId,
    permalink_url: cr.instagram_permalink_url ?? null,
  };
}

export function traduzirConta(c: ContaMeta): ContaAnuncioImportada {
  const id = c.id.startsWith("act_") ? c.id : `act_${c.account_id ?? c.id}`;
  return {
    id_externo: id,
    nome: c.name ?? id,
    moeda: (c.currency ?? "BRL").toUpperCase().slice(0, 3),
    fuso_horario: c.timezone_name ?? null,
  };
}

/** Divide um período em fatias de até `dias` dias (inclusive), para a importação retroativa. */
export function fatiarPeriodo(
  desde: string,
  ate: string,
  dias = 30,
): { desde: string; ate: string }[] {
  const fatias: { desde: string; ate: string }[] = [];
  let inicio = new Date(`${desde}T00:00:00Z`);
  const fim = new Date(`${ate}T00:00:00Z`);
  while (inicio <= fim) {
    const fimFatia = new Date(inicio);
    fimFatia.setUTCDate(fimFatia.getUTCDate() + dias - 1);
    const ateFatia = fimFatia > fim ? fim : fimFatia;
    fatias.push({ desde: iso(inicio), ate: iso(ateFatia) });
    inicio = new Date(ateFatia);
    inicio.setUTCDate(inicio.getUTCDate() + 1);
  }
  return fatias;
}

export function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Soma dias a uma data AAAA-MM-DD. */
export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return iso(d);
}
