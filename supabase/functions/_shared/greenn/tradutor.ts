/**
 * API da Greenn → formato interno. Puro: sem fetch, sem Deno, sem Supabase.
 * Testado no Vitest (tests/unit/greenn-tradutor.test.ts).
 *
 * PONTOS A CONFIRMAR NA SONDA (Etapa 0 do plano da Fase 2), marcados com [SONDA]:
 *  1. Unidade de amount/total (reais com decimais ou centavos): UNIDADE_VALOR.
 *  2. Estrutura de `client` no detalhe da venda (e-mail, documento, nome): lerCliente().
 *  3. `participants`/`affiliate` e `fee` no detalhe: lerComissoes() e lerTaxa().
 */
import type {
  ClienteImportado,
  ComissaoImportada,
  OfertaImportada,
  ProdutoImportado,
  StatusVenda,
  VendaImportada,
} from "./tipos.ts";

/** [SONDA] O spec diz integer; o webhook documenta reais com decimais. */
export const UNIDADE_VALOR: "reais" | "centavos" = "reais";

/** [SONDA] Se o detalhe da venda não trouxer `fee`, o conector não precisa buscá-lo para clientes já conhecidos. */
export const DETALHE_TRAZ_TAXA = false;

export type ProdutoGreenn = {
  id: string | number;
  name?: string;
  status?: string;
  is_active?: boolean;
};

export type OfertaGreenn = {
  id: string | number;
  product_id?: string | number;
  name?: string;
  amount?: string | number;
  status?: string;
  active?: boolean;
};

export type VendaGreenn = {
  id: string | number;
  status?: string;
  amount?: string | number;
  total?: string | number;
  currency?: string | null;
  method?: string;
  installments?: number;
  type?: string;
  created_at?: string;
  paid_at?: string | null;
  refunded_at?: string | null;
  updated_at?: string | null;
  product_id?: string | number | null;
  client_id?: string | number | null;
  offer_id?: string | number | null;
  affiliate_id?: string | number | null;
  transaction_id?: string | number | null;
  coupon_code?: string | null;
  subscription_id?: string | number | null;
  contract_id?: string | number | null;
  charge_number?: number | null;
  fee?: string | number | null;
  seller_balance?: string | number | null;
  client?: unknown;
  participants?: unknown;
  affiliate?: unknown;
  saleMetas?: unknown;
  [extra: string]: unknown;
};

export function numero(valor: unknown): number {
  if (valor === undefined || valor === null || valor === "") return 0;
  const n = typeof valor === "number" ? valor : Number(String(valor).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Converte o valor da API para a moeda com 2 casas. */
export function valorMonetario(valor: unknown): number {
  const n = numero(valor);
  const emReais = UNIDADE_VALOR === "centavos" ? n / 100 : n;
  return Math.round(emReais * 100) / 100;
}

export function normalizarEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const limpo = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo) ? limpo : null;
}

export function somenteDigitos(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  const d = String(valor).replace(/\D/g, "");
  return d.length >= 11 && d.length <= 14 ? d : null;
}

function texto(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  const s = String(valor).trim();
  return s.length ? s : null;
}

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

export function traduzirProduto(p: ProdutoGreenn): ProdutoImportado {
  return {
    id_externo: String(p.id),
    nome: texto(p.name) ?? `Produto ${p.id}`,
    ativo: p.is_active ?? p.status !== "inactive",
  };
}

export function traduzirOferta(o: OfertaGreenn): OfertaImportada | null {
  if (o.product_id === undefined || o.product_id === null) return null;
  return {
    id_externo: String(o.id),
    produto_id_externo: String(o.product_id),
    nome: texto(o.name) ?? `Oferta ${o.id}`,
    preco: valorMonetario(o.amount),
    ativo: (o.active ?? true) && (o.status ?? "approved") === "approved",
  };
}

/** Status da Greenn → interno. Null = não entra (nunca foi paga). */
export function traduzirStatus(status: string | undefined): { status: StatusVenda; pendente: boolean } | null {
  switch ((status ?? "").toLowerCase()) {
    case "paid":
      return { status: "aprovada", pendente: false };
    case "refund_pending":
      return { status: "aprovada", pendente: true };
    case "refunded":
      return { status: "reembolsada", pendente: false };
    case "chargedback":
    case "chargeback":
      return { status: "chargeback", pendente: false };
    default:
      return null;
  }
}

/** [SONDA] Aceita os nomes de campo mais prováveis para o cliente no detalhe. */
export function lerCliente(venda: VendaGreenn): ClienteImportado {
  const c = objeto(venda.client) ?? {};
  const email = normalizarEmail(c.email ?? c.mail ?? venda.client_email);
  return {
    id_externo: texto(c.id ?? venda.client_id),
    email,
    nome: texto(c.name ?? c.nome ?? c.full_name),
    cpf: somenteDigitos(c.cpf_cnpj ?? c.document ?? c.cpf ?? c.cnpj),
  };
}

/** [SONDA] Taxa do gateway: só se o detalhe trouxer `fee`. Senão, desconhecida. */
export function lerTaxa(venda: VendaGreenn): { valor: number; origem: VendaImportada["taxa_gateway_origem"] } {
  if (venda.fee !== undefined && venda.fee !== null && venda.fee !== "") {
    return { valor: valorMonetario(venda.fee), origem: "gateway" };
  }
  return { valor: 0, origem: "desconhecida" };
}

/** [SONDA] Comissões: `participants` (coprodutores) e `affiliate` com valores, se vierem. */
export function lerComissoes(venda: VendaGreenn): ComissaoImportada[] {
  const saida: ComissaoImportada[] = [];
  const lista = Array.isArray(venda.participants) ? venda.participants : [];
  for (const item of lista) {
    const p = objeto(item);
    if (!p) continue;
    const valor = valorMonetario(p.amount ?? p.value ?? p.commission ?? p.commission_amount);
    if (valor <= 0) continue;
    const tipoBruto = String(p.type ?? p.role ?? "").toLowerCase();
    saida.push({
      tipo: tipoBruto.includes("affil") ? "afiliado" : tipoBruto.includes("co") ? "coprodutor" : "outro",
      parceiro_id_externo: texto(p.id ?? p.user_id),
      parceiro_nome: texto(p.name ?? p.email),
      valor,
    });
  }
  const afiliado = objeto(venda.affiliate);
  if (afiliado) {
    const valor = valorMonetario(afiliado.amount ?? afiliado.value ?? afiliado.commission ?? afiliado.commission_amount);
    if (valor > 0 && !saida.some((c) => c.tipo === "afiliado")) {
      saida.push({
        tipo: "afiliado",
        parceiro_id_externo: texto(afiliado.id ?? venda.affiliate_id),
        parceiro_nome: texto(afiliado.name ?? afiliado.email),
        valor,
      });
    }
  }
  return saida;
}

/** UTMs em saleMetas ([{meta_key, meta_value}]) ou objeto, quando vierem. */
export function lerUtm(venda: VendaGreenn): Record<string, string> {
  const utm: Record<string, string> = {};
  const metas = venda.saleMetas ?? venda.sale_metas ?? venda.metas;
  if (Array.isArray(metas)) {
    for (const m of metas) {
      const o = objeto(m);
      const chave = texto(o?.meta_key ?? o?.key);
      const valor = texto(o?.meta_value ?? o?.value);
      if (chave && valor && /^utm_/i.test(chave)) utm[chave.toLowerCase()] = valor;
    }
  } else if (objeto(metas)) {
    for (const [k, v] of Object.entries(objeto(metas)!)) {
      if (/^utm_/i.test(k) && texto(v)) utm[k.toLowerCase()] = String(v);
    }
  }
  return utm;
}

/**
 * Venda (item da lista, enriquecido com o detalhe quando houver) → interno.
 * Devolve null quando a venda nunca foi paga ou não tem data de pagamento.
 */
export function traduzirVenda(venda: VendaGreenn): VendaImportada | null {
  const st = traduzirStatus(venda.status);
  if (!st) return null;
  const vendidaEm = texto(venda.paid_at) ?? texto(venda.created_at);
  if (!vendidaEm) return null;

  const taxa = lerTaxa(venda);
  const comissoes = lerComissoes(venda);
  const ehAssinatura = String(venda.type ?? "").toUpperCase() === "SUBSCRIPTION" || !!venda.subscription_id;
  // [SONDA] Renovação de assinatura: charge_number > 1 quando a API informar; senão, primeira cobrança.
  const renovacao = ehAssinatura && numero(venda.charge_number) > 1;

  return {
    id_externo: String(venda.id),
    cliente: lerCliente(venda),
    oferta_id_externo: venda.offer_id === undefined || venda.offer_id === null ? null : String(venda.offer_id),
    produto_id_externo: venda.product_id === undefined || venda.product_id === null ? null : String(venda.product_id),
    status: st.status,
    status_externo: String(venda.status ?? ""),
    reembolso_pendente: st.pendente,
    origem: !ehAssinatura ? "unica" : renovacao ? "recorrencia" : "assinatura_primeira",
    assinatura_id_externo: texto(venda.subscription_id ?? venda.contract_id),
    // [SONDA] `total` deve ser o valor pago (com juros de parcelamento); `amount` o preço da oferta.
    valor_bruto: valorMonetario(venda.total ?? venda.amount),
    taxa_gateway: taxa.valor,
    taxa_gateway_origem: taxa.origem,
    valor_parceiros: Math.round(comissoes.reduce((s, c) => s + c.valor, 0) * 100) / 100,
    moeda: (texto(venda.currency) ?? "BRL").toUpperCase().slice(0, 3),
    meio_pagamento: texto(venda.method),
    parcelas: Math.max(1, Math.round(numero(venda.installments) || 1)),
    cupom: texto(venda.coupon_code),
    afiliado_id_externo: texto(venda.affiliate_id),
    utm: lerUtm(venda),
    vendida_em: vendidaEm,
    criada_em: texto(venda.created_at),
    reembolsada_em:
      st.status === "aprovada" ? null : (texto(venda.refunded_at) ?? texto(venda.updated_at) ?? vendidaEm),
    comissoes,
    dados_brutos: venda,
  };
}

/** AAAA-MM-DD de uma data ISO ou Date. */
export function diaIso(d: Date | string): string {
  return (typeof d === "string" ? new Date(d) : d).toISOString().slice(0, 10);
}

export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return diaIso(d);
}
