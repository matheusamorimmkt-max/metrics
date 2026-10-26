import "server-only";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { colunaAusente, tabelaAusente } from "@/servidor/supabase/erros";
import { somarDias, type Periodo } from "@/dominio/periodo";
import { deslocamento } from "./vendas";
import type { Filtro, IndicadoresClientes } from "./home";
import type { ClienteRecompra } from "@/dominio/detalhe-metrica";
import type { ClientePeriodo } from "@/dominio/clientes-periodo";
import {
  montarFicha,
  type FichaCliente,
  type OrigemVenda,
  type StatusVenda,
} from "@/dominio/ficha-cliente";

export type RecompraPorFunil = {
  funil_entrada: string;
  clientes: number;
  recompraram: number;
  taxa: number | null;
  /** Para onde foram: funil da transação seguinte → quantidade. */
  destinos: { funil: string; quantidade: number }[];
  dias_ate_recompra_mediana: number | null;
};

export type ResumoClientes = {
  clientes_unicos: number;
  clientes_novos: number;
  transacoes: number;
  ticket_medio: number | null;
  recorrentes: number;
  taxa_recompra: number | null;
  dias_ate_recompra_mediana: number | null;
  por_funil_entrada: RecompraPorFunil[];
  truncado: boolean;
};

const LIMITE = 20_000;

function mediana(valores: number[]): number | null {
  if (!valores.length) return null;
  const v = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(v.length / 2);
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
}

/**
 * Aba Clientes: transações do período, clientes únicos e novos, ticket médio,
 * taxa de recompra e recompra dos front-ends com destino e tempo.
 */
export async function obterResumoClientes(
  organizacaoId: string,
  periodo: Periodo,
  fuso: string,
): Promise<ResumoClientes> {
  const supabase = await criarClienteServidor();
  const off = deslocamento(fuso);
  const inicio = `${periodo.de}T00:00:00${off}`;
  const fim = `${somarDias(periodo.ate, 1)}T00:00:00${off}`;

  const { data, error } = await supabase
    .from("transacoes")
    .select(
      "id, cliente_id, inicio, ordem, eh_recompra, valor_total, funil_id, funis(nome), clientes(primeira_compra_em, funil_entrada_id)",
    )
    .eq("organizacao_id", organizacaoId)
    .gte("inicio", inicio)
    .lt("inicio", fim)
    .order("inicio", { ascending: true })
    .limit(LIMITE);

  const vazio: ResumoClientes = {
    clientes_unicos: 0,
    clientes_novos: 0,
    transacoes: 0,
    ticket_medio: null,
    recorrentes: 0,
    taxa_recompra: null,
    dias_ate_recompra_mediana: null,
    por_funil_entrada: [],
    truncado: false,
  };
  if (error && tabelaAusente(error)) return vazio;
  if (error) throw new Error(`Falha ao carregar clientes: ${error.message}`);
  const transacoes = data ?? [];
  if (!transacoes.length) return vazio;

  // Nomes de funis para o funil de entrada (pode não aparecer nas transações do período)
  const funilIds = new Set<string>();
  for (const t of transacoes) {
    if (t.funil_id) funilIds.add(t.funil_id);
    if (t.clientes?.funil_entrada_id) funilIds.add(t.clientes.funil_entrada_id);
  }
  const { data: funis } = await supabase
    .from("funis")
    .select("id, nome")
    .eq("organizacao_id", organizacaoId)
    .in("id", [...funilIds]);
  const nomeFunil = new Map((funis ?? []).map((f) => [f.id, f.nome]));
  const nome = (id: string | null) => (id ? (nomeFunil.get(id) ?? "Funil") : "Sem funil");

  const clientes = new Set<string>();
  const porCliente = new Map<string, typeof transacoes>();
  let valorTotal = 0;
  let novos = 0;
  for (const t of transacoes) {
    clientes.add(t.cliente_id);
    valorTotal += Number(t.valor_total ?? 0);
    if (t.ordem === 1) novos += 1;
    porCliente.set(t.cliente_id, [...(porCliente.get(t.cliente_id) ?? []), t]);
  }

  // Recompra: clientes com transação de ordem ≥ 2 no período, agrupados pelo funil de entrada.
  const recorrentes = new Set<string>();
  const diasAteRecompra: number[] = [];
  const porEntrada = new Map<
    string,
    {
      clientes: Set<string>;
      recompraram: Set<string>;
      destinos: Map<string, number>;
      dias: number[];
    }
  >();
  for (const [clienteId, lista] of porCliente) {
    const entrada = nome(lista[0]?.clientes?.funil_entrada_id ?? null);
    const grupo = porEntrada.get(entrada) ?? {
      clientes: new Set<string>(),
      recompraram: new Set<string>(),
      destinos: new Map<string, number>(),
      dias: [],
    };
    grupo.clientes.add(clienteId);
    for (const t of lista) {
      if (!t.eh_recompra) continue;
      recorrentes.add(clienteId);
      grupo.recompraram.add(clienteId);
      const destino = nome(t.funil_id);
      grupo.destinos.set(destino, (grupo.destinos.get(destino) ?? 0) + 1);
      const primeira = t.clientes?.primeira_compra_em;
      if (primeira && t.ordem === 2) {
        const dias =
          (new Date(t.inicio).getTime() - new Date(primeira).getTime()) / 86_400_000;
        if (dias >= 0) {
          diasAteRecompra.push(dias);
          grupo.dias.push(dias);
        }
      }
    }
    porEntrada.set(entrada, grupo);
  }

  return {
    clientes_unicos: clientes.size,
    clientes_novos: novos,
    transacoes: transacoes.length,
    ticket_medio: transacoes.length ? valorTotal / transacoes.length : null,
    recorrentes: recorrentes.size,
    taxa_recompra: clientes.size ? recorrentes.size / clientes.size : null,
    dias_ate_recompra_mediana: mediana(diasAteRecompra),
    por_funil_entrada: [...porEntrada.entries()]
      .map(([funil_entrada, g]) => ({
        funil_entrada,
        clientes: g.clientes.size,
        recompraram: g.recompraram.size,
        taxa: g.clientes.size ? g.recompraram.size / g.clientes.size : null,
        destinos: [...g.destinos.entries()]
          .map(([funil, quantidade]) => ({ funil, quantidade }))
          .sort((a, b) => b.quantidade - a.quantidade),
        dias_ate_recompra_mediana: mediana(g.dias),
      }))
      .sort((a, b) => b.clientes - a.clientes),
    truncado: transacoes.length >= LIMITE,
  };
}

/**
 * Clientes com transação no período, cada um com suas transações e os produtos de cada
 * uma (vendas do período agrupadas por transação). Base das listas de destaque e dos
 * olhos da aba Clientes. Só transações (vendas aprovadas).
 */
export async function listarClientesDoPeriodo(
  organizacaoId: string,
  periodo: Periodo,
  fuso: string,
): Promise<{ clientes: ClientePeriodo[]; truncado: boolean }> {
  const supabase = await criarClienteServidor();
  const off = deslocamento(fuso);
  const inicio = `${periodo.de}T00:00:00${off}`;
  const fim = `${somarDias(periodo.ate, 1)}T00:00:00${off}`;
  const consultar = (comTelefone: boolean) =>
    supabase
      .from("transacoes")
      .select(
        comTelefone
          ? "id, cliente_id, inicio, ordem, eh_recompra, valor_total, quantidade_vendas, clientes(nome, email, telefone, primeira_compra_em)"
          : "id, cliente_id, inicio, ordem, eh_recompra, valor_total, quantidade_vendas, clientes(nome, email, primeira_compra_em)",
      )
      .eq("organizacao_id", organizacaoId)
      .gte("inicio", inicio)
      .lt("inicio", fim)
      .order("inicio", { ascending: true })
      .limit(LIMITE);
  let resposta = await consultar(true);
  // Migration do telefone (20261013000006) ainda não aplicada: segue sem a coluna.
  if (resposta.error && colunaAusente(resposta.error)) resposta = await consultar(false);
  const { error } = resposta;
  const data = (resposta.data ?? []) as {
    id: string;
    cliente_id: string;
    inicio: string;
    ordem: number;
    eh_recompra: boolean;
    valor_total: number | null;
    quantidade_vendas: number | null;
    clientes: {
      nome: string | null;
      email: string;
      telefone?: string | null;
      primeira_compra_em: string | null;
    } | null;
  }[];
  if (error && tabelaAusente(error)) return { clientes: [], truncado: false };
  if (error) throw new Error(`Falha ao carregar clientes do período: ${error.message}`);
  if (!data.length) return { clientes: [], truncado: false };

  // Produtos de cada transação: vendas do período agrupadas por transacao_id.
  const { data: vendas, error: erroVendas } = await supabase
    .from("vendas")
    .select("transacao_id, produtos(nome)")
    .eq("organizacao_id", organizacaoId)
    .gte("vendida_em", inicio)
    .lt("vendida_em", fim)
    .limit(LIMITE);
  if (erroVendas && !tabelaAusente(erroVendas))
    throw new Error(`Falha ao carregar produtos das transações: ${erroVendas.message}`);
  const produtosPorTransacao = new Map<string, Set<string>>();
  for (const v of vendas ?? []) {
    if (!v.transacao_id) continue;
    const nomes = produtosPorTransacao.get(v.transacao_id) ?? new Set<string>();
    if (v.produtos?.nome) nomes.add(v.produtos.nome);
    produtosPorTransacao.set(v.transacao_id, nomes);
  }

  const porCliente = new Map<string, ClientePeriodo>();
  for (const t of data) {
    const c = porCliente.get(t.cliente_id) ?? {
      id: t.cliente_id,
      nome: t.clientes?.nome?.trim() || t.clientes?.email || "Cliente",
      email: t.clientes?.email ?? "",
      telefone: t.clientes?.telefone ?? null,
      primeira_compra_em: t.clientes?.primeira_compra_em ?? null,
      transacoes: [],
    };
    c.transacoes.push({
      id: t.id,
      inicio: t.inicio,
      ordem: t.ordem,
      eh_recompra: t.eh_recompra,
      itens: Number(t.quantidade_vendas ?? 0),
      valor: Number(t.valor_total ?? 0),
      produtos: [...(produtosPorTransacao.get(t.id) ?? [])],
    });
    porCliente.set(t.cliente_id, c);
  }
  return { clientes: [...porCliente.values()], truncado: data.length >= LIMITE };
}

/**
 * Clientes únicos e recorrentes no período e no período anterior, para a Home.
 * Identidade: mesmo CPF (quando há) ou mesmo e-mail = mesmo cliente. Com filtro de
 * funil/categoria, conta só transações daquele funil.
 */
export async function obterIndicadoresClientes(
  organizacaoId: string,
  periodo: Periodo,
  fuso: string,
  filtro: Filtro,
  categoriaDoFunil: Map<string, string>,
): Promise<{ atual: IndicadoresClientes; anterior: IndicadoresClientes }> {
  const supabase = await criarClienteServidor();
  const off = deslocamento(fuso);
  const { data, error } = await supabase
    .from("transacoes")
    .select("cliente_id, inicio, eh_recompra, funil_id, clientes(email, cpf)")
    .eq("organizacao_id", organizacaoId)
    .gte("inicio", `${periodo.anterior_de}T00:00:00${off}`)
    .lt("inicio", `${somarDias(periodo.ate, 1)}T00:00:00${off}`)
    .limit(LIMITE);
  const vazio = { unicos: 0, recorrentes: 0 };
  if (error && tabelaAusente(error)) return { atual: vazio, anterior: vazio };
  if (error) throw new Error(`Falha ao carregar clientes: ${error.message}`);

  const pertence = (funilId: string | null) => {
    if (filtro.tipo === "negocio") return true;
    if (!funilId) return false;
    if (filtro.tipo === "funil") return funilId === filtro.id;
    return categoriaDoFunil.get(funilId) === filtro.id;
  };
  const limiteAtual = `${periodo.de}T00:00:00${off}`;
  const contar = (noAtual: boolean): IndicadoresClientes => {
    const unicos = new Set<string>();
    const recorrentes = new Set<string>();
    for (const t of data ?? []) {
      if (!pertence(t.funil_id)) continue;
      const ehAtual = new Date(t.inicio) >= new Date(limiteAtual);
      if (ehAtual !== noAtual) continue;
      const chave = t.clientes?.cpf
        ? `cpf:${t.clientes.cpf}`
        : `email:${t.clientes?.email ?? t.cliente_id}`;
      unicos.add(chave);
      if (t.eh_recompra) recorrentes.add(chave);
    }
    return { unicos: unicos.size, recorrentes: recorrentes.size };
  };
  return { atual: contar(true), anterior: contar(false) };
}

export type DetalhesClientes = {
  clientes: { unicos: number; novos: number; antigos: number };
  transacoes_por_itens: { itens: number; quantidade: number }[];
  recompradores: ClienteRecompra[];
};

/**
 * Para os olhos da Home: novos × antigos, transações por quantidade de itens e quem
 * recomprou no período (com gasto no período e na vida). Mesma identidade de cliente
 * (CPF ou e-mail) e mesmo filtro de funil/categoria de obterIndicadoresClientes.
 */
export async function obterDetalhesClientes(
  organizacaoId: string,
  periodo: Periodo,
  fuso: string,
  filtro: Filtro,
  categoriaDoFunil: Map<string, string>,
): Promise<DetalhesClientes> {
  const supabase = await criarClienteServidor();
  const off = deslocamento(fuso);
  const { data, error } = await supabase
    .from("transacoes")
    .select(
      "cliente_id, inicio, ordem, eh_recompra, funil_id, quantidade_vendas, valor_total, clientes(nome, email, cpf)",
    )
    .eq("organizacao_id", organizacaoId)
    .gte("inicio", `${periodo.de}T00:00:00${off}`)
    .lt("inicio", `${somarDias(periodo.ate, 1)}T00:00:00${off}`)
    .limit(LIMITE);
  const vazio: DetalhesClientes = {
    clientes: { unicos: 0, novos: 0, antigos: 0 },
    transacoes_por_itens: [],
    recompradores: [],
  };
  if (error && tabelaAusente(error)) return vazio;
  if (error) throw new Error(`Falha ao carregar detalhes de clientes: ${error.message}`);

  const pertence = (funilId: string | null) => {
    if (filtro.tipo === "negocio") return true;
    if (!funilId) return false;
    if (filtro.tipo === "funil") return funilId === filtro.id;
    return categoriaDoFunil.get(funilId) === filtro.id;
  };
  const linhas = (data ?? []).filter((t) => pertence(t.funil_id));
  const chaveDe = (t: (typeof linhas)[number]) =>
    t.clientes?.cpf
      ? `cpf:${t.clientes.cpf}`
      : `email:${t.clientes?.email ?? t.cliente_id}`;

  type Acum = {
    ids: Set<string>;
    nome: string;
    email: string;
    transacoes: number;
    gasto: number;
    novo: boolean;
    recomprou: boolean;
  };
  const porCliente = new Map<string, Acum>();
  const porItens = new Map<number, number>();
  for (const t of linhas) {
    const chave = chaveDe(t);
    const c = porCliente.get(chave) ?? {
      ids: new Set<string>(),
      nome: t.clientes?.nome?.trim() || t.clientes?.email || "Cliente",
      email: t.clientes?.email ?? "",
      transacoes: 0,
      gasto: 0,
      novo: false,
      recomprou: false,
    };
    c.ids.add(t.cliente_id);
    c.transacoes += 1;
    c.gasto += Number(t.valor_total ?? 0);
    if (t.ordem === 1) c.novo = true;
    if (t.eh_recompra) c.recomprou = true;
    porCliente.set(chave, c);
    const itens = Number(t.quantidade_vendas ?? 0);
    porItens.set(itens, (porItens.get(itens) ?? 0) + 1);
  }

  const todos = [...porCliente.values()];
  const recompradores = todos
    .filter((c) => c.recomprou)
    .sort((a, b) => b.gasto - a.gasto)
    .slice(0, 50);

  // Gasto na vida dos que recompraram (todas as transações, sem filtro de período).
  const idsVida = recompradores.flatMap((c) => [...c.ids]);
  const vida = new Map<string, { gasto: number; transacoes: number }>();
  if (idsVida.length) {
    const { data: todasVida } = await supabase
      .from("transacoes")
      .select("cliente_id, valor_total")
      .eq("organizacao_id", organizacaoId)
      .in("cliente_id", idsVida)
      .limit(LIMITE);
    for (const t of todasVida ?? []) {
      const v = vida.get(t.cliente_id) ?? { gasto: 0, transacoes: 0 };
      v.gasto += Number(t.valor_total ?? 0);
      v.transacoes += 1;
      vida.set(t.cliente_id, v);
    }
  }

  return {
    clientes: {
      unicos: todos.length,
      // "Novo" só quando a primeira compra da vida caiu no período e não houve recompra
      // antes; quem recomprou no período já era cliente.
      novos: todos.filter((c) => c.novo && !c.recomprou).length,
      antigos: todos.filter((c) => c.recomprou || !c.novo).length,
    },
    transacoes_por_itens: [...porItens.entries()]
      .map(([itens, quantidade]) => ({ itens, quantidade }))
      .sort((a, b) => a.itens - b.itens),
    recompradores: recompradores.map((c) => {
      const soma = [...c.ids].reduce(
        (s, id) => {
          const v = vida.get(id);
          return {
            gasto: s.gasto + (v?.gasto ?? 0),
            transacoes: s.transacoes + (v?.transacoes ?? 0),
          };
        },
        { gasto: 0, transacoes: 0 },
      );
      return {
        nome: c.nome,
        email: c.email,
        transacoes_periodo: c.transacoes,
        gasto_periodo: Math.round(c.gasto * 100) / 100,
        gasto_total: Math.round(soma.gasto * 100) / 100,
        transacoes_total: soma.transacoes,
      };
    }),
  };
}

export type ClienteLista = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  funil_entrada: string | null;
  primeira_compra_em: string | null;
  ultima_compra_em: string | null;
  transacoes: number;
  itens: number;
  gasto: number;
};

const LIMITE_CLIENTES = 5_000;

/**
 * Todos os clientes da organização (até 5 mil), com totais da vida, filtrados pela
 * busca (nome, e-mail ou telefone) e ordenados do maior gasto para o menor.
 */
export async function listarTodosClientes(
  organizacaoId: string,
  busca: string,
): Promise<{ clientes: ClienteLista[]; truncado: boolean }> {
  const supabase = await criarClienteServidor();
  const consultar = (comTelefone: boolean) =>
    supabase
      .from("clientes")
      .select(
        comTelefone
          ? "id, nome, email, telefone, primeira_compra_em, funis(nome)"
          : "id, nome, email, primeira_compra_em, funis(nome)",
      )
      .eq("organizacao_id", organizacaoId)
      .limit(LIMITE_CLIENTES);
  let resposta = await consultar(true);
  if (resposta.error && colunaAusente(resposta.error)) resposta = await consultar(false);
  if (resposta.error && tabelaAusente(resposta.error)) return { clientes: [], truncado: false };
  if (resposta.error)
    throw new Error(`Falha ao carregar clientes: ${resposta.error.message}`);
  const linhas = (resposta.data ?? []) as unknown as {
    id: string;
    nome: string | null;
    email: string;
    telefone?: string | null;
    primeira_compra_em: string | null;
    funis: { nome: string } | null;
  }[];

  const { data: transacoes, error: erroT } = await supabase
    .from("transacoes")
    .select("cliente_id, inicio, valor_total, quantidade_vendas")
    .eq("organizacao_id", organizacaoId)
    .limit(LIMITE);
  if (erroT && !tabelaAusente(erroT))
    throw new Error(`Falha ao carregar transações: ${erroT.message}`);
  const totais = new Map<
    string,
    { transacoes: number; itens: number; gasto: number; ultima: string | null }
  >();
  for (const t of transacoes ?? []) {
    const a = totais.get(t.cliente_id) ?? { transacoes: 0, itens: 0, gasto: 0, ultima: null };
    a.transacoes += 1;
    a.itens += Number(t.quantidade_vendas ?? 0);
    a.gasto += Number(t.valor_total ?? 0);
    if (!a.ultima || t.inicio > a.ultima) a.ultima = t.inicio;
    totais.set(t.cliente_id, a);
  }

  const termo = busca.trim().toLowerCase();
  const clientes = linhas
    .map((c) => {
      const t = totais.get(c.id) ?? { transacoes: 0, itens: 0, gasto: 0, ultima: null };
      return {
        id: c.id,
        nome: c.nome?.trim() || c.email,
        email: c.email,
        telefone: c.telefone ?? null,
        funil_entrada: c.funis?.nome ?? null,
        primeira_compra_em: c.primeira_compra_em,
        ultima_compra_em: t.ultima,
        transacoes: t.transacoes,
        itens: t.itens,
        gasto: t.gasto,
      };
    })
    .filter(
      (c) =>
        !termo ||
        c.nome.toLowerCase().includes(termo) ||
        c.email.toLowerCase().includes(termo) ||
        (c.telefone ?? "").replace(/\D/g, "").includes(termo.replace(/\D/g, "") || "\u0000"),
    )
    .sort((a, b) => b.gasto - a.gasto || b.transacoes - a.transacoes || a.nome.localeCompare(b.nome));
  return { clientes, truncado: linhas.length >= LIMITE_CLIENTES };
}

/** Ficha completa: dados cadastrais, totais da vida e cada venda de cada transação. */
export async function obterFichaCliente(
  organizacaoId: string,
  clienteId: string,
): Promise<FichaCliente | null> {
  const supabase = await criarClienteServidor();
  const consultar = (comTelefone: boolean) =>
    supabase
      .from("clientes")
      .select(
        comTelefone
          ? "id, nome, email, telefone, cpf, plataforma, id_externo, created_at, primeira_compra_em, funis(nome)"
          : "id, nome, email, cpf, plataforma, id_externo, created_at, primeira_compra_em, funis(nome)",
      )
      .eq("organizacao_id", organizacaoId)
      .eq("id", clienteId)
      .maybeSingle();
  let resposta = await consultar(true);
  if (resposta.error && colunaAusente(resposta.error)) resposta = await consultar(false);
  if (resposta.error) throw new Error(`Falha ao carregar cliente: ${resposta.error.message}`);
  const c = resposta.data as unknown as {
    id: string;
    nome: string | null;
    email: string;
    telefone?: string | null;
    cpf: string | null;
    plataforma: string | null;
    id_externo: string | null;
    created_at: string;
    primeira_compra_em: string | null;
    funis: { nome: string } | null;
  } | null;
  if (!c) return null;

  const [transacoes, vendas] = await Promise.all([
    supabase
      .from("transacoes")
      .select("id, inicio, ordem, eh_recompra, valor_total, quantidade_vendas, funis(nome)")
      .eq("organizacao_id", organizacaoId)
      .eq("cliente_id", clienteId)
      .limit(LIMITE),
    supabase
      .from("vendas")
      .select(
        "id, id_externo, plataforma, transacao_id, vendida_em, valor_bruto, moeda, status, reembolsada_em, meio_pagamento, parcelas, origem, cupom, taxa_gateway, valor_parceiros, utm, produtos(nome), ofertas(nome), comissoes(tipo, parceiro_nome, parceiro_id_externo, valor)",
      )
      .eq("organizacao_id", organizacaoId)
      .eq("cliente_id", clienteId)
      .limit(LIMITE),
  ]);
  if (transacoes.error) throw new Error(`Falha ao carregar transações: ${transacoes.error.message}`);
  if (vendas.error) throw new Error(`Falha ao carregar vendas: ${vendas.error.message}`);

  return montarFicha(
    {
      id: c.id,
      nome: c.nome,
      email: c.email,
      telefone: c.telefone ?? null,
      cpf: c.cpf,
      plataforma: c.plataforma,
      id_externo: c.id_externo,
      cadastrado_em: c.created_at,
      primeira_compra_em: c.primeira_compra_em,
      funil_entrada: c.funis?.nome ?? null,
    },
    (transacoes.data ?? []).map((t) => ({
      id: t.id,
      inicio: t.inicio,
      ordem: t.ordem,
      eh_recompra: t.eh_recompra,
      funil: t.funis?.nome ?? null,
      valor_total: Number(t.valor_total ?? 0),
      quantidade_vendas: Number(t.quantidade_vendas ?? 0),
    })),
    (vendas.data ?? []).map((v) => ({
      id: v.id,
      id_externo: v.id_externo,
      plataforma: v.plataforma,
      transacao_id: v.transacao_id,
      vendida_em: v.vendida_em,
      produto: v.produtos?.nome ?? "Produto",
      oferta: v.ofertas?.nome ?? "Oferta",
      valor_bruto: Number(v.valor_bruto ?? 0),
      moeda: (v.moeda ?? "BRL").trim(),
      status: v.status as StatusVenda,
      reembolsada_em: v.reembolsada_em,
      meio_pagamento: v.meio_pagamento,
      parcelas: Number(v.parcelas ?? 1),
      origem: v.origem as OrigemVenda,
      cupom: v.cupom,
      taxa_gateway: Number(v.taxa_gateway ?? 0),
      valor_parceiros: Number(v.valor_parceiros ?? 0),
      utm: (v.utm && typeof v.utm === "object" && !Array.isArray(v.utm)
        ? Object.fromEntries(
            Object.entries(v.utm as Record<string, unknown>).map(([k, val]) => [k, String(val)]),
          )
        : {}) as Record<string, string>,
      comissoes: (v.comissoes ?? []).map((co) => ({
        tipo: co.tipo,
        parceiro: co.parceiro_nome ?? co.parceiro_id_externo ?? "Parceiro",
        valor: Number(co.valor ?? 0),
      })),
    })),
  );
}
