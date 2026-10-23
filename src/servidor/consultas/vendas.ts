import "server-only";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { tabelaAusente } from "@/servidor/supabase/erros";
import { somarDias, type Periodo } from "@/dominio/periodo";
import { rotuloMeioPagamento } from "@/dominio/pagamentos";

export type Agrupado = {
  chave: string;
  nome: string;
  detalhe?: string;
  vendas: number;
  valor: number;
};

export type ResumoVendas = {
  total_vendas: number;
  faturamento_bruto: number;
  reembolsos: { quantidade: number; valor: number };
  chargebacks: { quantidade: number; valor: number };
  taxas_gateway: number;
  parceiros: number;
  por_oferta: Agrupado[];
  por_produto: Agrupado[];
  por_meio_pagamento: Agrupado[];
  por_parcelas: Agrupado[];
  por_parceiro: Agrupado[];
  truncado: boolean;
};

const LIMITE = 20_000;


function acumular(
  mapa: Map<string, Agrupado>,
  chave: string,
  nome: string,
  valor: number,
  detalhe?: string,
) {
  const a = mapa.get(chave) ?? { chave, nome, detalhe, vendas: 0, valor: 0 };
  a.vendas += 1;
  a.valor += valor;
  mapa.set(chave, a);
}

function ordenar(mapa: Map<string, Agrupado>): Agrupado[] {
  return [...mapa.values()].sort((a, b) => b.valor - a.valor);
}

/**
 * Aba Vendas: vendas feitas no período (data da venda), reembolsos e chargebacks
 * ocorridos no período (data do reembolso), e os agrupamentos do PRD.
 */
export async function obterResumoVendas(
  organizacaoId: string,
  periodo: Periodo,
  fuso: string,
): Promise<ResumoVendas> {
  const supabase = await criarClienteServidor();
  // Limites em timestamptz: o dia da organização começa à meia-noite no fuso dela.
  // Usa a data seguinte como limite superior exclusivo.
  const inicio = `${periodo.de}T00:00:00`;
  const fim = `${somarDias(periodo.ate, 1)}T00:00:00`;

  const [vendidas, reembolsadas] = await Promise.all([
    supabase
      .from("vendas")
      .select(
        "id, status, valor_bruto, taxa_gateway, valor_parceiros, meio_pagamento, parcelas, oferta_id, produto_id, ofertas(nome), produtos(nome), comissoes(tipo, parceiro_nome, parceiro_id_externo, valor)",
      )
      .eq("organizacao_id", organizacaoId)
      .gte("vendida_em", `${inicio}${deslocamento(fuso)}`)
      .lt("vendida_em", `${fim}${deslocamento(fuso)}`)
      .limit(LIMITE),
    supabase
      .from("vendas")
      .select("status, valor_bruto")
      .eq("organizacao_id", organizacaoId)
      .neq("status", "aprovada")
      .gte("reembolsada_em", `${inicio}${deslocamento(fuso)}`)
      .lt("reembolsada_em", `${fim}${deslocamento(fuso)}`)
      .limit(LIMITE),
  ]);

  const vazio: ResumoVendas = {
    total_vendas: 0,
    faturamento_bruto: 0,
    reembolsos: { quantidade: 0, valor: 0 },
    chargebacks: { quantidade: 0, valor: 0 },
    taxas_gateway: 0,
    parceiros: 0,
    por_oferta: [],
    por_produto: [],
    por_meio_pagamento: [],
    por_parcelas: [],
    por_parceiro: [],
    truncado: false,
  };
  if (vendidas.error && tabelaAusente(vendidas.error)) return vazio;
  if (vendidas.error)
    throw new Error(`Falha ao carregar vendas: ${vendidas.error.message}`);
  if (reembolsadas.error && !tabelaAusente(reembolsadas.error)) {
    throw new Error(`Falha ao carregar reembolsos: ${reembolsadas.error.message}`);
  }

  const porOferta = new Map<string, Agrupado>();
  const porProduto = new Map<string, Agrupado>();
  const porMeio = new Map<string, Agrupado>();
  const porParcelas = new Map<string, Agrupado>();
  const porParceiro = new Map<string, Agrupado>();
  const r = { ...vazio };

  for (const v of vendidas.data ?? []) {
    const valor = Number(v.valor_bruto ?? 0);
    r.total_vendas += 1;
    r.faturamento_bruto += valor;
    r.taxas_gateway += Number(v.taxa_gateway ?? 0);
    r.parceiros += Number(v.valor_parceiros ?? 0);
    acumular(
      porOferta,
      v.oferta_id,
      v.ofertas?.nome ?? "Oferta",
      valor,
      v.produtos?.nome ?? undefined,
    );
    acumular(porProduto, v.produto_id, v.produtos?.nome ?? "Produto", valor);
    const meio = v.meio_pagamento ?? "desconhecido";
    acumular(porMeio, meio, rotuloMeioPagamento(v.meio_pagamento), valor);
    const parcelas = Number(v.parcelas ?? 1);
    acumular(
      porParcelas,
      String(parcelas),
      parcelas === 1 ? "À vista" : `${parcelas}x`,
      valor,
    );
    for (const c of v.comissoes ?? []) {
      const chave = `${c.tipo}:${c.parceiro_id_externo ?? c.parceiro_nome ?? "?"}`;
      acumular(
        porParceiro,
        chave,
        c.parceiro_nome ?? chave,
        Number(c.valor ?? 0),
        c.tipo,
      );
    }
  }
  for (const v of reembolsadas.data ?? []) {
    const alvo = v.status === "chargeback" ? r.chargebacks : r.reembolsos;
    alvo.quantidade += 1;
    alvo.valor += Number(v.valor_bruto ?? 0);
  }

  return {
    ...r,
    por_oferta: ordenar(porOferta),
    por_produto: ordenar(porProduto),
    por_meio_pagamento: ordenar(porMeio),
    por_parcelas: [...porParcelas.values()].sort(
      (a, b) => Number(a.chave) - Number(b.chave),
    ),
    por_parceiro: ordenar(porParceiro),
    truncado: (vendidas.data?.length ?? 0) >= LIMITE,
  };
}

/** Deslocamento "-03:00" do fuso na data de hoje (suficiente para filtros por dia). */
export function deslocamento(fuso: string, data = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    timeZoneName: "longOffset",
  }).formatToParts(data);
  const nome = partes.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-]\d{1,2})(?::(\d{2}))?/.exec(nome);
  if (!m) return "+00:00";
  const horas = Number(m[1]);
  const sinal = horas < 0 || m[1].startsWith("-") ? "-" : "+";
  return `${sinal}${String(Math.abs(horas)).padStart(2, "0")}:${m[2] ?? "00"}`;
}
