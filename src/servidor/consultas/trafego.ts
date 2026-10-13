import "server-only";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { tabelaAusente } from "@/servidor/supabase/erros";
import type { Periodo } from "@/dominio/periodo";
import { BASE_ZERADA, resultadosDe, type BaseTrafego } from "@/dominio/metricas-trafego";

export type Criativo = {
  tipo: "imagem" | "video" | "carrossel" | "outro" | null;
  miniatura_url: string | null;
  imagem_url: string | null;
  video_url: string | null;
  permalink_url: string | null;
};

export type LinhaTrafego = BaseTrafego & {
  chave: string;
  nome: string;
  /** Id interno da campanha (para ligar/desligar). */
  campanha_id: string;
  campanha_ativa: boolean;
  campanha_status: string | null;
  /** Status do anúncio (só no nível anúncio). */
  status: string | null;
  /** Criativo do anúncio (só no nível anúncio, quando importado). */
  criativo: Criativo | null;
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
      "campanha_id, conjunto_id_externo, conjunto_nome, anuncio_id_externo, anuncio_nome, gasto, impressoes, alcance, cliques, cliques_link, visualizacoes_pagina, inicios_checkout, leads, compras_plataforma, campanhas(nome, id_externo, objetivo, status, ativo, funil_campanhas(funis(nome)))",
    )
    .eq("organizacao_id", organizacaoId)
    .gte("data", periodo.de)
    .lte("data", periodo.ate)
    .limit(LIMITE_LINHAS);
  if (error && tabelaAusente(error)) return { linhas: [], truncado: false };
  if (error) throw new Error(`Falha ao carregar tráfego: ${error.message}`);

  // Criativos dos anúncios (tabela pode não existir até a migration ser aplicada).
  const criativos = new Map<string, Criativo & { status: string | null }>();
  const anuncios = await supabase
    .from("anuncios")
    .select(
      "id_externo, status, criativo_tipo, miniatura_url, imagem_url, video_url, permalink_url",
    )
    .eq("organizacao_id", organizacaoId)
    .limit(LIMITE_LINHAS);
  if (anuncios.error && !tabelaAusente(anuncios.error)) {
    throw new Error(`Falha ao carregar anúncios: ${anuncios.error.message}`);
  }
  for (const a of anuncios.data ?? []) {
    criativos.set(a.id_externo, {
      status: a.status,
      tipo: a.criativo_tipo as Criativo["tipo"],
      miniatura_url: a.miniatura_url,
      imagem_url: a.imagem_url,
      video_url: a.video_url,
      permalink_url: a.permalink_url,
    });
  }

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
      | "chave"
      | "nome"
      | "pai"
      | "nivel"
      | "funil_nome"
      | "campanha_chave"
      | "objetivo"
      | "campanha_id"
      | "campanha_ativa"
      | "campanha_status"
    > &
      Partial<Pick<LinhaTrafego, "status" | "criativo">>,
  ): LinhaTrafego => ({ status: null, criativo: null, ...base, ...BASE_ZERADA });

  for (const l of data ?? []) {
    const campanha = l.campanhas;
    const funilNome = campanha?.funil_campanhas?.funis?.nome ?? null;
    const objetivo = campanha?.objetivo ?? null;
    const campanhaBase = {
      campanha_id: l.campanha_id,
      campanha_ativa: campanha?.ativo ?? false,
      campanha_status: campanha?.status ?? null,
    };
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
          ...campanhaBase,
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
            ...campanhaBase,
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
            ...campanhaBase,
            status: criativos.get(l.anuncio_id_externo)?.status ?? null,
            criativo: criativos.get(l.anuncio_id_externo) ?? null,
          }),
        ),
      );
    }
    const dia = {
      gasto: Number(l.gasto ?? 0),
      impressoes: Number(l.impressoes ?? 0),
      alcance: Number(l.alcance ?? 0),
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
      d.alcance += dia.alcance;
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
