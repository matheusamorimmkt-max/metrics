/** Status de campanha/anúncio do Meta traduzido para a tela, com a cor do sinal. */
export type CorStatus = "verde" | "vermelho" | "amarelo" | "cinza";

const MAPA: Record<string, { rotulo: string; cor: CorStatus }> = {
  ACTIVE: { rotulo: "Ativa", cor: "verde" },
  PAUSED: { rotulo: "Desativada", cor: "vermelho" },
  CAMPAIGN_PAUSED: { rotulo: "Campanha desativada", cor: "vermelho" },
  ADSET_PAUSED: { rotulo: "Conjunto desativado", cor: "vermelho" },
  ARCHIVED: { rotulo: "Arquivada", cor: "cinza" },
  DELETED: { rotulo: "Excluída", cor: "cinza" },
  IN_PROCESS: { rotulo: "Em processamento", cor: "amarelo" },
  WITH_ISSUES: { rotulo: "Com problemas", cor: "vermelho" },
  PENDING_REVIEW: { rotulo: "Em análise", cor: "amarelo" },
  PREAPPROVED: { rotulo: "Pré-aprovada", cor: "amarelo" },
  DISAPPROVED: { rotulo: "Reprovada", cor: "vermelho" },
  PENDING_BILLING_INFO: { rotulo: "Pendente de pagamento", cor: "amarelo" },
};

export function traduzirStatusCampanha(status: string | null | undefined): {
  rotulo: string;
  cor: CorStatus;
} {
  if (!status) return { rotulo: "—", cor: "cinza" };
  const chave = status.toUpperCase();
  return MAPA[chave] ?? { rotulo: status, cor: "cinza" };
}

/** Classes do Badge por cor. */
export const CLASSE_COR_STATUS: Record<CorStatus, string> = {
  verde:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  vermelho:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  amarelo:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  cinza: "border-border bg-muted text-muted-foreground",
};
