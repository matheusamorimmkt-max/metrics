/** Ficha completa de um cliente: tudo que o sistema sabe sobre ele. */

export type StatusVenda = "aprovada" | "reembolsada" | "chargeback";
export type OrigemVenda = "unica" | "assinatura_primeira" | "recorrencia";

export type VendaFicha = {
  id: string;
  id_externo: string;
  plataforma: string;
  vendida_em: string;
  produto: string;
  oferta: string;
  valor_bruto: number;
  moeda: string;
  status: StatusVenda;
  reembolsada_em: string | null;
  meio_pagamento: string | null;
  parcelas: number;
  origem: OrigemVenda;
  cupom: string | null;
  taxa_gateway: number;
  valor_parceiros: number;
  utm: Record<string, string>;
  comissoes: { tipo: string; parceiro: string; valor: number }[];
};

export type TransacaoFicha = {
  id: string;
  inicio: string;
  ordem: number;
  eh_recompra: boolean;
  funil: string | null;
  valor_total: number;
  quantidade_vendas: number;
  vendas: VendaFicha[];
};

export type FichaCliente = {
  id: string;
  nome: string | null;
  email: string;
  telefone: string | null;
  cpf: string | null;
  plataforma: string | null;
  id_externo: string | null;
  cadastrado_em: string;
  primeira_compra_em: string | null;
  funil_entrada: string | null;
  totais: {
    transacoes: number;
    itens: number;
    gasto: number;
    cobrancas_recorrentes: number;
    reembolsos: { quantidade: number; valor: number };
    taxas_gateway: number;
    parceiros: number;
  };
  transacoes: TransacaoFicha[];
  /** Vendas sem transação (renovação sem a primeira cobrança importada, por exemplo). */
  vendas_soltas: VendaFicha[];
};

export const ROTULO_STATUS_VENDA: Record<StatusVenda, string> = {
  aprovada: "Paga",
  reembolsada: "Reembolsada",
  chargeback: "Chargeback",
};

export function rotuloOrigem(origem: OrigemVenda): string {
  if (origem === "recorrencia") return "Cobrança recorrente";
  if (origem === "assinatura_primeira") return "Assinatura (1ª cobrança)";
  return "Compra";
}

/** 12345678901 → 123.456.789-01; CNPJ (14 dígitos) → 12.345.678/0001-90. */
export function formatarDocumento(cpf: string | null): string {
  if (!cpf) return "—";
  const d = cpf.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14)
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return cpf;
}

/** Monta os totais e agrupa as vendas por transação. */
export function montarFicha(
  cliente: Omit<FichaCliente, "totais" | "transacoes" | "vendas_soltas">,
  transacoes: Omit<TransacaoFicha, "vendas">[],
  vendas: (VendaFicha & { transacao_id: string | null })[],
): FichaCliente {
  const porTransacao = new Map<string, VendaFicha[]>();
  const soltas: VendaFicha[] = [];
  for (const v of vendas) {
    const { transacao_id, ...venda } = v;
    if (transacao_id) {
      porTransacao.set(transacao_id, [...(porTransacao.get(transacao_id) ?? []), venda]);
    } else {
      soltas.push(venda);
    }
  }
  const ordenar = (lista: VendaFicha[]) =>
    [...lista].sort((a, b) => a.vendida_em.localeCompare(b.vendida_em));
  const completas: TransacaoFicha[] = [...transacoes]
    .sort((a, b) => b.inicio.localeCompare(a.inicio))
    .map((t) => ({ ...t, vendas: ordenar(porTransacao.get(t.id) ?? []) }));

  const reembolsadas = vendas.filter((v) => v.status !== "aprovada");
  return {
    ...cliente,
    totais: {
      transacoes: transacoes.length,
      itens: transacoes.reduce((s, t) => s + t.quantidade_vendas, 0),
      gasto: vendas.reduce((s, v) => s + v.valor_bruto, 0),
      cobrancas_recorrentes: vendas.filter((v) => v.origem === "recorrencia").length,
      reembolsos: {
        quantidade: reembolsadas.length,
        valor: reembolsadas.reduce((s, v) => s + v.valor_bruto, 0),
      },
      taxas_gateway: vendas.reduce((s, v) => s + v.taxa_gateway, 0),
      parceiros: vendas.reduce((s, v) => s + v.valor_parceiros, 0),
    },
    transacoes: completas,
    vendas_soltas: ordenar(soltas).reverse(),
  };
}
