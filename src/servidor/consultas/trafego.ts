import "server-only";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { tabelaAusente } from "@/servidor/supabase/erros";
import type { Periodo } from "@/dominio/periodo";

export type LinhaTrafego = {
  chave: string;
  nome: string;
  /** Linha pai (campanha para conjunto; conjunto para anúncio). */
  pai: string | null;
  /** Chave da campanha a que a linha pertence (a própria, no nível campanha). */
  campanha_chave: string;
  nivel: "campanha" | "conjunto" | "anuncio";
  funil_nome: string | null;
  gasto: number;
  impressoes: number;
  cliques: number;
  cliques_link: number;
  visualizacoes_pagina: number;
  inicios_checkout: number;
  leads: number;
  compras_plataforma: number;
  cpm: number | null;
  ctr: number | null;
  cpc: number | null;
  custo_pagina: number | null;
  connect_rate: number | null;
  custo_lead: number | null;
  custo_checkout: number | null;
};

type Acumulador = Omit<
  LinhaTrafego,
  | "cpm"
  | "ctr"
  | "cpc"
  | "custo_pagina"
  | "connect_rate"
  | "custo_lead"
  | "custo_checkout"
>;

const LIMITE_LINHAS = 20_000;

function derivadas(a: Acumulador): LinhaTrafego {
  const r = (num: number, den: number) => (den > 0 ? num / den : null);
  return {
    ...a,
    cpm: a.impressoes > 0 ? (a.gasto / a.impressoes) * 1000 : null,
    ctr: r(a.cliques_link, a.impressoes),
    cpc: r(a.gasto, a.cliques_link),
    custo_pagina: r(a.gasto, a.visualizacoes_pagina),
    connect_rate: r(a.visualizacoes_pagina, a.cliques_link),
    custo_lead: r(a.gasto, a.leads),
    custo_checkout: r(a.gasto, a.inicios_checkout),
  };
}

/**
 * Tráfego por campanha, conjunto e anúncio no período. Soma as linhas diárias por
 * anúncio (nível mais fino) em memória; alcance fica de fora por não ser somável.
 */
export async function obterTrafego(
  organizacaoId: string,
  periodo: Periodo,
): Promise<{ linhas: LinhaTrafego[]; truncado: boolean }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("metricas_anuncio_diarias")
    .select(
      "campanha_id, conjunto_id_externo, conjunto_nome, anuncio_id_externo, anuncio_nome, gasto, impressoes, cliques, cliques_link, visualizacoes_pagina, inicios_checkout, leads, compras_plataforma, campanhas(nome, id_externo, funil_campanhas(funis(nome)))",
    )
    .eq("organizacao_id", organizacaoId)
    .gte("data", periodo.de)
    .lte("data", periodo.ate)
    .limit(LIMITE_LINHAS);
  if (error && tabelaAusente(error)) return { linhas: [], truncado: false };
  if (error) throw new Error(`Falha ao carregar tráfego: ${error.message}`);

  const acum = new Map<string, Acumulador>();
  const pega = (chave: string, inicial: () => Acumulador) => {
    let a = acum.get(chave);
    if (!a) {
      a = inicial();
      acum.set(chave, a);
    }
    return a;
  };
  const zero = (
    base: Pick<
      Acumulador,
      "chave" | "nome" | "pai" | "nivel" | "funil_nome" | "campanha_chave"
    >,
  ): Acumulador => ({
    ...base,
    gasto: 0,
    impressoes: 0,
    cliques: 0,
    cliques_link: 0,
    visualizacoes_pagina: 0,
    inicios_checkout: 0,
    leads: 0,
    compras_plataforma: 0,
  });

  for (const l of data ?? []) {
    const campanha = l.campanhas;
    const funilNome = campanha?.funil_campanhas?.funis?.nome ?? null;
    const chaveCamp = `c:${l.campanha_id}`;
    const chaveConj = `s:${l.campanha_id}:${l.conjunto_id_externo}`;
    const chaveAn = `a:${l.campanha_id}:${l.conjunto_id_externo}:${l.anuncio_id_externo}`;
    const destinos = [
      pega(chaveCamp, () =>
        zero({
          chave: chaveCamp,
          campanha_chave: chaveCamp,
          nome: campanha?.nome || campanha?.id_externo || "Campanha",
          pai: null,
          nivel: "campanha",
          funil_nome: funilNome,
        }),
      ),
    ];
    if (l.conjunto_id_externo) {
      destinos.push(
        pega(chaveConj, () =>
          zero({
            chave: chaveConj,
            campanha_chave: chaveCamp,
            nome: l.conjunto_nome || l.conjunto_id_externo,
            pai: chaveCamp,
            nivel: "conjunto",
            funil_nome: funilNome,
          }),
        ),
      );
    }
    if (l.anuncio_id_externo) {
      destinos.push(
        pega(chaveAn, () =>
          zero({
            chave: chaveAn,
            campanha_chave: chaveCamp,
            nome: l.anuncio_nome || l.anuncio_id_externo,
            pai: l.conjunto_id_externo ? chaveConj : chaveCamp,
            nivel: "anuncio",
            funil_nome: funilNome,
          }),
        ),
      );
    }
    for (const d of destinos) {
      d.gasto += Number(l.gasto ?? 0);
      d.impressoes += Number(l.impressoes ?? 0);
      d.cliques += Number(l.cliques ?? 0);
      d.cliques_link += Number(l.cliques_link ?? 0);
      d.visualizacoes_pagina += Number(l.visualizacoes_pagina ?? 0);
      d.inicios_checkout += Number(l.inicios_checkout ?? 0);
      d.leads += Number(l.leads ?? 0);
      d.compras_plataforma += Number(l.compras_plataforma ?? 0);
    }
  }

  const linhas = [...acum.values()].map(derivadas).sort((a, b) => b.gasto - a.gasto);
  return { linhas, truncado: (data?.length ?? 0) >= LIMITE_LINHAS };
}
