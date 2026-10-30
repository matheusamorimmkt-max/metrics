/**
 * Formas de pagamento e países das vendas. Independente de plataforma: cada conector
 * grava `meio_pagamento` (código da plataforma) e `moeda` (ISO 4217) na venda.
 */

export const ROTULO_MEIO_PAGAMENTO: Record<string, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  TWO_CREDIT_CARDS: "Dois cartões de crédito",
  DEBIT_CARD: "Cartão de débito",
  BOLETO: "Boleto",
  PAYPAL: "PayPal",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
  PICPAY: "PicPay",
  NUPAY: "NuPay",
  SAFETYPAY: "SafetyPay",
  BANK_TRANSFER: "Transferência bancária",
  OXXO: "OXXO",
  EFECTY: "Efecty",
  PAGOEFECTIVO: "PagoEfectivo",
  SEPA: "Débito SEPA",
};

export function rotuloMeioPagamento(codigo: string | null | undefined): string {
  if (!codigo) return "Não informado";
  return ROTULO_MEIO_PAGAMENTO[codigo] ?? codigo.replace(/_/g, " ").toLowerCase();
}

/**
 * A API da Greenn não informa o país do comprador; a moeda da venda é a melhor pista
 * disponível (um estrangeiro pagando em real aparece como Brasil). Moedas de uso
 * compartilhado (dólar, euro) viram "Dólar (país não informado)" etc.
 */
export const PAIS_POR_MOEDA: Record<string, string> = {
  BRL: "Brasil",
  PYG: "Paraguai",
  ARS: "Argentina",
  CLP: "Chile",
  COP: "Colômbia",
  PEN: "Peru",
  UYU: "Uruguai",
  BOB: "Bolívia",
  MXN: "México",
  VES: "Venezuela",
  GTQ: "Guatemala",
  DOP: "República Dominicana",
  CRC: "Costa Rica",
  HNL: "Honduras",
  NIO: "Nicarágua",
  CAD: "Canadá",
  GBP: "Reino Unido",
  CHF: "Suíça",
  JPY: "Japão",
  AUD: "Austrália",
  NZD: "Nova Zelândia",
  AOA: "Angola",
  MZN: "Moçambique",
  USD: "Dólar (país não informado)",
  EUR: "Euro (país não informado)",
};

export function paisDaMoeda(moeda: string | null | undefined): string {
  const codigo = (moeda ?? "").trim().toUpperCase();
  if (!codigo) return "Não informado";
  return PAIS_POR_MOEDA[codigo] ?? `Moeda ${codigo}`;
}

/** Linha mínima de venda usada pelos agrupamentos (o que a consulta devolve). */
export type VendaParaAgrupar = {
  meio_pagamento: string | null;
  moeda: string | null;
  valor_bruto: number;
  transacao_id: string | null;
  /** Usado como transação quando a venda ainda não foi agrupada. */
  id: string;
  /** Falso para cobrança recorrente de assinatura: soma no valor, não conta item. */
  conta_item?: boolean;
};

export type GrupoPagamento = {
  chave: string;
  nome: string;
  transacoes: number;
  itens: number;
  faturamento: number;
  ticket_medio: number;
  /** Fração do faturamento total do conjunto (0–1). */
  participacao: number;
};

export function agruparVendas(
  vendas: VendaParaAgrupar[],
  chaveDe: (v: VendaParaAgrupar) => string,
  nomeDe: (chave: string) => string,
): GrupoPagamento[] {
  const grupos = new Map<string, { itens: number; faturamento: number; transacoes: Set<string> }>();
  let total = 0;
  for (const v of vendas) {
    const chave = chaveDe(v);
    const g = grupos.get(chave) ?? { itens: 0, faturamento: 0, transacoes: new Set<string>() };
    if (v.conta_item !== false) g.itens += 1;
    g.faturamento += v.valor_bruto;
    g.transacoes.add(v.transacao_id ?? v.id);
    grupos.set(chave, g);
    total += v.valor_bruto;
  }
  return [...grupos.entries()]
    .map(([chave, g]) => ({
      chave,
      nome: nomeDe(chave),
      transacoes: g.transacoes.size,
      itens: g.itens,
      faturamento: g.faturamento,
      ticket_medio: g.transacoes.size > 0 ? g.faturamento / g.transacoes.size : 0,
      participacao: total > 0 ? g.faturamento / total : 0,
    }))
    .sort((a, b) => b.faturamento - a.faturamento || b.itens - a.itens);
}

/** Vendas por forma de pagamento, da maior para a menor em faturamento. */
export function agruparPorMeioPagamento(vendas: VendaParaAgrupar[]): GrupoPagamento[] {
  return agruparVendas(
    vendas,
    (v) => v.meio_pagamento ?? "",
    (chave) => rotuloMeioPagamento(chave || null),
  );
}

/** Vendas por país (estimado pela moeda), da maior para a menor em faturamento. */
export function agruparPorPais(vendas: VendaParaAgrupar[]): GrupoPagamento[] {
  return agruparVendas(
    vendas,
    (v) => (v.moeda ?? "").trim().toUpperCase(),
    (chave) => paisDaMoeda(chave || null),
  );
}

/** Cores fixas por posição, para pizza e barras baterem com a tabela. */
export const CORES_GRUPOS = [
  "#2563eb",
  "#0d9488",
  "#d97706",
  "#9333ea",
  "#e11d48",
  "#64748b",
  "#16a34a",
  "#0891b2",
];
