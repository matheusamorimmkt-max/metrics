import "server-only";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { tabelaAusente } from "@/servidor/supabase/erros";
import type { Periodo } from "@/dominio/periodo";
import { BASE_ZERADA, resultadosDe, type BaseTrafego } from "@/dominio/metricas-trafego";

export type LinhaTrafego = BaseTrafego & {
  chave: string;
  nome: string;
  /** Linha pai (campanha para conjunto; conjunto para anúncio). */
  pai: string | null;
  /** Chave da campanha a que a linha pertence (a própria, no nível campanha). */
  campanha_chave: string;
  nivel: "campanha" | "conjunto" | "anuncio";
  funil_nome: string | null;
  objetivo: string | null;
};

const LIMITE_LINHAS = 20_000;

/**
 * Tráfego por campanha, conjunto e anúncio no período. Soma as linhas diárias por
 * anúncio (nível mais fino) em memória; alcance fica de fora por não ser somável.
 * As métricas derivadas (CPM, CTR…) são calculadas na tela por metricas-trafego.
 */
export async function obterTrafego(
  organizacaoId: string,
  periodo: Periodo,
): Promise<{ linhas: LinhaTrafego[]; truncado: boolean }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("metricas_anuncio_diarias")
    .select(
      "campanha_id, conjunto_id_externo, conjunto_nome, anuncio_id_externo, anuncio_nome, gasto, impressoes, cliques, cliques_link, visualizacoes_pagina, inicios_checkout, leads, compras_plataforma, campanhas(nome, id_externo, objetivo, funil_campanhas(funis(nome)))",
    )
    .eq("organizacao_id", organizacaoId)
    .gte("data", periodo.de)
    .lte("data", periodo.ate)
    .limit(LIMITE_LINHAS);
  if (error && tabelaAusente(error)) return { linhas: [], truncado: false };
  if (error) throw new Error(`Falha ao carregar tráfego: ${error.message}`);

  const acum = new Map<string, LinhaTrafego>();
  const pega = (chave: string, inicial: () => LinhaTrafego) => {
    let a = acum.get(chave);
    if (!a) {
      a = inicial();
      acum.set(chave, a);
    }
    return a;
  };
  const zero = (
    base: Pick<
      LinhaTrafego,
      "chave" | "nome" | "pai" | "nivel" | "funil_nome" | "campanha_chave" | "objetivo"
    >,
  ): LinhaTrafego => ({ ...base, ...BASE_ZERADA });

  for (const l of data ?? []) {
    const campanha = l.campanhas;
    const funilNome = campanha?.funil_campanhas?.funis?.nome ?? null;
    const objetivo = campanha?.objetivo ?? null;
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
          objetivo,
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
            objetivo,
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
            objetivo,
          }),
        ),
      );
    }
    const dia = {
      gasto: Number(l.gasto ?? 0),
      impressoes: Number(l.impressoes ?? 0),
      cliques: Number(l.cliques ?? 0),
      cliques_link: Number(l.cliques_link ?? 0),
      visualizacoes_pagina: Number(l.visualizacoes_pagina ?? 0),
      inicios_checkout: Number(l.inicios_checkout ?? 0),
      leads: Number(l.leads ?? 0),
      compras_plataforma: Number(l.compras_plataforma ?? 0),
    };
    const resultados = resultadosDe(objetivo, dia);
    for (const d of destinos) {
      d.gasto += dia.gasto;
      d.impressoes += dia.impressoes;
      d.cliques += dia.cliques;
      d.cliques_link += dia.cliques_link;
      d.visualizacoes_pagina += dia.visualizacoes_pagina;
      d.inicios_checkout += dia.inicios_checkout;
      d.leads += dia.leads;
      d.compras_plataforma += dia.compras_plataforma;
      d.resultados += resultados;
    }
  }

  const linhas = [...acum.values()].sort((a, b) => b.gasto - a.gasto);
  return { linhas, truncado: (data?.length ?? 0) >= LIMITE_LINHAS };
}
