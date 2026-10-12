/**
 * Formato interno do conector do Meta Ads. Telas e cálculos só conhecem isto;
 * o que vem da Graph API fica em tradutor.ts.
 */

export type ContaAnuncioImportada = {
  id_externo: string;
  nome: string;
  moeda: string;
  fuso_horario: string | null;
};

export type CampanhaImportada = {
  id_externo: string;
  nome: string;
  status: string | null;
  objetivo: string | null;
  ativo: boolean;
};

export type MetricaDiariaImportada = {
  campanha_id_externo: string;
  campanha_nome: string;
  conjunto_id_externo: string;
  conjunto_nome: string | null;
  anuncio_id_externo: string;
  anuncio_nome: string | null;
  /** AAAA-MM-DD no fuso da conta de anúncios. */
  data: string;
  gasto: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  cliques_link: number;
  visualizacoes_pagina: number;
  inicios_checkout: number;
  leads: number;
  compras_plataforma: number;
  dados_brutos: unknown;
};

export type ModoSincronizacao = "retroativa" | "incremental" | "reconsulta";

export type Periodo = { desde: string; ate: string };
