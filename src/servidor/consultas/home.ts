import "server-only";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { tabelaAusente } from "@/servidor/supabase/erros";
import {
  calcularMetricas,
  ENTRADA_ZERADA,
  type EntradaMetricas,
  type Metricas,
} from "@/dominio/metricas";
import { somarDias, type Periodo } from "@/dominio/periodo";

export type Filtro =
  { tipo: "negocio" } | { tipo: "categoria"; id: string } | { tipo: "funil"; id: string };

export type LinhaDiaria = {
  data: string;
  funil_id: string | null;
  gasto: number;
  impressoes: number;
  cliques_link: number;
  visualizacoes_pagina: number;
  inicios_checkout: number;
  leads: number;
  faturamento_bruto: number;
  reembolsos: number;
  taxas_gateway: number;
  parceiros: number;
  impostos: number;
  vendas: number;
  transacoes: number;
  recompras: number;
  clientes_novos: number;
};

export type FunilInfo = {
  id: string;
  nome: string;
  tipo: string;
  meta_roi: number;
  categoria_id: string;
  categoria_nome: string;
  categoria_ordem: number;
  tem_semaforo: boolean;
};

export type Semaforo = "verde" | "amarelo" | "vermelho" | null;

export type ResumoFunil = {
  funil: FunilInfo | null;
  metricas: Metricas;
  semaforo: Semaforo;
};

export type ResumoCategoria = {
  id: string | null;
  nome: string;
  ordem: number;
  metricas: Metricas;
  funis: ResumoFunil[];
};

export type PontoSerie = {
  data: string;
  investimento: number;
  faturamento_bruto: number;
  lucro: number;
  roas: number | null;
  roi: number | null;
};

export type Composicao = {
  investimento: number;
  parceiros: number;
  taxas_gateway: number;
  impostos: number;
  reembolsos: number;
  lucro: number;
};

export type Etapas = {
  impressoes: number;
  cliques_link: number;
  visualizacoes_pagina: number;
  inicios_checkout: number;
  vendas: number;
  leads: number;
  recompras: number;
  clientes_novos: number;
};

export type ResumoHome = {
  atual: Metricas;
  anterior: Metricas;
  etapas: Etapas;
  serie: PontoSerie[];
  composicao: Composicao;
  categorias: ResumoCategoria[];
  gasto_nao_vinculado: number;
  faturamento_nao_vinculado: number;
  funis: FunilInfo[];
  categoriasDisponiveis: { id: string; nome: string }[];
};

export type IndicadoresClientes = { unicos: number; novos: number; recorrentes: number };

function somar(
  linhas: LinhaDiaria[],
  taxaAnuncios: number,
  clientes?: IndicadoresClientes,
): Metricas {
  const e: EntradaMetricas = {
    ...ENTRADA_ZERADA,
    taxa_anuncios: taxaAnuncios,
    clientes_unicos: clientes?.unicos ?? 0,
    clientes_recorrentes: clientes?.recorrentes ?? 0,
  };
  for (const l of linhas) {
    e.vendas += l.vendas;
    e.gasto_anuncios += l.gasto;
    e.faturamento_bruto += l.faturamento_bruto;
    e.reembolsos += l.reembolsos;
    e.taxas_gateway += l.taxas_gateway;
    e.parceiros += l.parceiros;
    e.impostos += l.impostos;
    e.transacoes += l.transacoes;
    e.clientes_novos += l.clientes_novos;
  }
  // Com os indicadores de clientes (identidade por CPF ou e-mail), eles mandam.
  if (clientes) e.clientes_novos = clientes.novos;
  return calcularMetricas(e);
}

function semaforoDe(
  funil: FunilInfo,
  linhasOntemAnteontem: LinhaDiaria[],
  taxaAnuncios: number,
): Semaforo {
  if (!funil.tem_semaforo) return null;
  const m = somar(linhasOntemAnteontem, taxaAnuncios);
  if (m.roi === null) return null;
  if (m.roi > funil.meta_roi) return "verde";
  if (m.roi >= 0) return "amarelo";
  return "vermelho";
}

export async function listarFunisInfo(organizacaoId: string): Promise<FunilInfo[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("funis")
    .select(
      "id, nome, tipo, meta_roi, categoria_id, categorias(nome, ordem, tem_semaforo)",
    )
    .eq("organizacao_id", organizacaoId);
  if (error) throw new Error(`Falha ao carregar funis: ${error.message}`);
  return data.map((f) => ({
    id: f.id,
    nome: f.nome,
    tipo: f.tipo,
    meta_roi: Number(f.meta_roi),
    categoria_id: f.categoria_id,
    categoria_nome: f.categorias?.nome ?? "",
    categoria_ordem: f.categorias?.ordem ?? 0,
    tem_semaforo: f.categorias?.tem_semaforo ?? false,
  }));
}

async function listarLinhas(
  organizacaoId: string,
  de: string,
  ate: string,
): Promise<LinhaDiaria[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("metricas_diarias")
    .select("*")
    .eq("organizacao_id", organizacaoId)
    .gte("data", de)
    .lte("data", ate);
  if (error && tabelaAusente(error)) return [];
  if (error) throw new Error(`Falha ao carregar métricas: ${error.message}`);
  return data.map((l) => ({
    data: l.data ?? "",
    funil_id: l.funil_id,
    gasto: Number(l.gasto ?? 0),
    impressoes: Number(l.impressoes ?? 0),
    cliques_link: Number(l.cliques_link ?? 0),
    visualizacoes_pagina: Number(l.visualizacoes_pagina ?? 0),
    inicios_checkout: Number(l.inicios_checkout ?? 0),
    leads: Number(l.leads ?? 0),
    faturamento_bruto: Number(l.faturamento_bruto ?? 0),
    reembolsos: Number(l.reembolsos ?? 0),
    taxas_gateway: Number(l.taxas_gateway ?? 0),
    parceiros: Number(l.parceiros ?? 0),
    impostos: Number(l.impostos ?? 0),
    vendas: Number(l.vendas ?? 0),
    transacoes: Number(l.transacoes ?? 0),
    recompras: Number(l.recompras ?? 0),
    clientes_novos: Number(l.clientes_novos ?? 0),
  }));
}

/**
 * Tudo o que a Home mostra, para um período e um filtro. Uma única passagem pelas
 * linhas da visão metricas_diarias; o modelo financeiro é aplicado por calcularMetricas.
 */
export async function obterResumoHome(
  organizacaoId: string,
  taxaAnuncios: number,
  periodo: Periodo,
  filtro: Filtro,
  hoje: string,
  clientes?: { atual: IndicadoresClientes; anterior: IndicadoresClientes },
): Promise<ResumoHome> {
  // Notificações: últimas 48 horas. Os dados são diários, então é hoje (parcial) + ontem.
  const ontem = somarDias(hoje, -1);
  const de = [periodo.anterior_de, ontem].sort()[0];
  const ate = [periodo.ate, hoje].sort().at(-1) ?? periodo.ate;

  const [funis, todas] = await Promise.all([
    listarFunisInfo(organizacaoId),
    listarLinhas(organizacaoId, de, ate),
  ]);
  const porId = new Map(funis.map((f) => [f.id, f]));

  const pertence = (l: LinhaDiaria) => {
    if (filtro.tipo === "negocio") return true;
    if (filtro.tipo === "funil") return l.funil_id === filtro.id;
    const f = l.funil_id ? porId.get(l.funil_id) : null;
    return f?.categoria_id === filtro.id;
  };

  const noPeriodo = (l: LinhaDiaria) => l.data >= periodo.de && l.data <= periodo.ate;
  const noAnterior = (l: LinhaDiaria) =>
    l.data >= periodo.anterior_de && l.data <= periodo.anterior_ate;

  const filtradas = todas.filter(pertence);
  const atuais = filtradas.filter(noPeriodo);
  const atual = somar(atuais, taxaAnuncios, clientes?.atual);
  const anterior = somar(filtradas.filter(noAnterior), taxaAnuncios, clientes?.anterior);

  // Série por dia (preenche os dias sem linha com zero)
  const porDia = new Map<string, LinhaDiaria[]>();
  for (const l of atuais) porDia.set(l.data, [...(porDia.get(l.data) ?? []), l]);
  const serie: PontoSerie[] = [];
  for (let d = periodo.de; d <= periodo.ate; d = somarDias(d, 1)) {
    const m = somar(porDia.get(d) ?? [], taxaAnuncios);
    serie.push({
      data: d,
      investimento: m.investimento,
      faturamento_bruto: m.faturamento_bruto,
      lucro: m.lucro,
      roas: m.roas,
      roi: m.roi,
    });
  }

  const soma = (campo: keyof LinhaDiaria) =>
    atuais.reduce((s, l) => s + (l[campo] as number), 0);
  const etapas: Etapas = {
    impressoes: soma("impressoes"),
    cliques_link: soma("cliques_link"),
    visualizacoes_pagina: soma("visualizacoes_pagina"),
    inicios_checkout: soma("inicios_checkout"),
    vendas: soma("vendas"),
    leads: soma("leads"),
    recompras: soma("recompras"),
    clientes_novos: soma("clientes_novos"),
  };

  const composicao: Composicao = {
    investimento: atual.investimento,
    parceiros: soma("parceiros"),
    taxas_gateway: soma("taxas_gateway"),
    impostos: soma("impostos"),
    reembolsos: soma("reembolsos"),
    lucro: atual.lucro,
  };

  // Tabela por categoria e funil (sempre do negócio inteiro, respeitando o período)
  const linhasPeriodo = todas.filter(noPeriodo);
  const linhasSemaforo = todas.filter((l) => l.data === hoje || l.data === ontem);
  const categoriasMap = new Map<string | null, ResumoCategoria>();
  const garanteCategoria = (f: FunilInfo | null) => {
    const chave = f?.categoria_id ?? null;
    let c = categoriasMap.get(chave);
    if (!c) {
      c = {
        id: chave,
        nome: f?.categoria_nome ?? "Não vinculado",
        ordem: f?.categoria_ordem ?? Number.MAX_SAFE_INTEGER,
        metricas: calcularMetricas(ENTRADA_ZERADA),
        funis: [],
      };
      categoriasMap.set(chave, c);
    }
    return c;
  };

  for (const f of funis) garanteCategoria(f);
  const linhasPorFunil = new Map<string | null, LinhaDiaria[]>();
  for (const l of linhasPeriodo) {
    linhasPorFunil.set(l.funil_id, [...(linhasPorFunil.get(l.funil_id) ?? []), l]);
  }
  for (const f of funis) {
    const cat = garanteCategoria(f);
    cat.funis.push({
      funil: f,
      metricas: somar(linhasPorFunil.get(f.id) ?? [], taxaAnuncios),
      semaforo: semaforoDe(
        f,
        linhasSemaforo.filter((l) => l.funil_id === f.id),
        taxaAnuncios,
      ),
    });
  }
  const naoVinculadas = linhasPorFunil.get(null) ?? [];
  if (naoVinculadas.length) {
    const cat = garanteCategoria(null);
    cat.funis.push({
      funil: null,
      metricas: somar(naoVinculadas, taxaAnuncios),
      semaforo: null,
    });
  }
  const categorias = [...categoriasMap.values()]
    .map((c) => ({
      ...c,
      metricas: somar(
        linhasPeriodo.filter((l) =>
          c.id === null
            ? l.funil_id === null
            : porId.get(l.funil_id ?? "")?.categoria_id === c.id,
        ),
        taxaAnuncios,
      ),
      funis: c.funis.sort((a, b) =>
        (a.funil?.nome ?? "").localeCompare(b.funil?.nome ?? ""),
      ),
    }))
    .sort((a, b) => a.ordem - b.ordem);

  const categoriasDisponiveis = [
    ...new Map(funis.map((f) => [f.categoria_id, f])).values(),
  ]
    .sort((a, b) => a.categoria_ordem - b.categoria_ordem)
    .map((f) => ({ id: f.categoria_id, nome: f.categoria_nome }));

  return {
    atual,
    anterior,
    etapas,
    serie,
    composicao,
    categorias,
    gasto_nao_vinculado: naoVinculadas.reduce((s, l) => s + l.gasto, 0),
    faturamento_nao_vinculado: naoVinculadas.reduce((s, l) => s + l.faturamento_bruto, 0),
    funis,
    categoriasDisponiveis,
  };
}
