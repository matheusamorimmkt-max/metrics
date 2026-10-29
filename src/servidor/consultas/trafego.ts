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

export type NivelTrafego = "campanha" | "conjunto" | "anuncio";

/** O que a chave liga/desliga precisa: id interno, estado e status na plataforma. */
export type Veiculacao = { id: string; ativa: boolean; status: string | null };

export type LinhaTrafego = BaseTrafego & {
  chave: string;
  nome: string;
  /** Null quando o conector ainda não importou esta campanha/conjunto/anúncio. */
  veiculacao: Veiculacao | null;
  /** Criativo do anúncio (só no nível anúncio, quando importado). */
  criativo: Criativo | null;
  /** Linha pai (campanha para conjunto; conjunto para anúncio). */
  pai: string | null;
  /** Chave da campanha a que a linha pertence (a própria, no nível campanha). */
  campanha_chave: string;
  nivel: NivelTrafego;
  funil_nome: string | null;
  /** Conta de anúncios da campanha (útil com mais de uma conta conectada). */
  conta_nome: string | null;
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
      "campanha_id, conjunto_id_externo, conjunto_nome, anuncio_id_externo, anuncio_nome, gasto, impressoes, alcance, cliques, cliques_link, visualizacoes_pagina, inicios_checkout, leads, compras_plataforma, campanhas(nome, id_externo, objetivo, status, ativo, funil_campanhas(funis(nome)), contas_anuncio(nome))",
    )
    .eq("organizacao_id", organizacaoId)
    .gte("data", periodo.de)
    .lte("data", periodo.ate)
    .limit(LIMITE_LINHAS);
  if (error && tabelaAusente(error)) return { linhas: [], truncado: false };
  if (error) throw new Error(`Falha ao carregar tráfego: ${error.message}`);

  // Conjuntos e anúncios importados (tabelas podem não existir até a migration ser
  // aplicada): trazem o status para a chave e o criativo do anúncio.
  const [conjuntos, anuncios] = await Promise.all([
    supabase
      .from("conjuntos")
      .select("id, id_externo, status, ativo")
      .eq("organizacao_id", organizacaoId)
      .limit(LIMITE_LINHAS),
    supabase
      .from("anuncios")
      .select(
        "id, id_externo, status, ativo, criativo_tipo, miniatura_url, imagem_url, video_url, permalink_url",
      )
      .eq("organizacao_id", organizacaoId)
      .limit(LIMITE_LINHAS),
  ]);
  if (conjuntos.error && !tabelaAusente(conjuntos.error)) {
    throw new Error(`Falha ao carregar conjuntos: ${conjuntos.error.message}`);
  }
  if (anuncios.error && !tabelaAusente(anuncios.error)) {
    throw new Error(`Falha ao carregar anúncios: ${anuncios.error.message}`);
  }
  const conjuntoPorExterno = new Map<string, Veiculacao>();
  for (const c of conjuntos.data ?? []) {
    conjuntoPorExterno.set(c.id_externo, { id: c.id, ativa: c.ativo, status: c.status });
  }
  const anuncioPorExterno = new Map<
    string,
    { veiculacao: Veiculacao; criativo: Criativo }
  >();
  for (const a of anuncios.data ?? []) {
    anuncioPorExterno.set(a.id_externo, {
      veiculacao: { id: a.id, ativa: a.ativo, status: a.status },
      criativo: {
        tipo: a.criativo_tipo as Criativo["tipo"],
        miniatura_url: a.miniatura_url,
        imagem_url: a.imagem_url,
        video_url: a.video_url,
        permalink_url: a.permalink_url,
      },
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
      "chave" | "nome" | "pai" | "nivel" | "funil_nome" | "campanha_chave" | "objetivo" | "conta_nome"
    > &
      Partial<Pick<LinhaTrafego, "veiculacao" | "criativo">>,
  ): LinhaTrafego => ({ veiculacao: null, criativo: null, ...base, ...BASE_ZERADA });

  for (const l of data ?? []) {
    const campanha = l.campanhas;
    const funilNome = campanha?.funil_campanhas?.funis?.nome ?? null;
    const contaNome = campanha?.contas_anuncio?.nome || null;
    const objetivo = campanha?.objetivo ?? null;
    const veiculacaoCampanha: Veiculacao | null = campanha
      ? { id: l.campanha_id, ativa: campanha.ativo, status: campanha.status }
      : null;
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
          conta_nome: contaNome,
          objetivo,
          veiculacao: veiculacaoCampanha,
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
            conta_nome: contaNome,
            objetivo,
            veiculacao: conjuntoPorExterno.get(l.conjunto_id_externo) ?? null,
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
            conta_nome: contaNome,
            objetivo,
            veiculacao: anuncioPorExterno.get(l.anuncio_id_externo)?.veiculacao ?? null,
            criativo: anuncioPorExterno.get(l.anuncio_id_externo)?.criativo ?? null,
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
