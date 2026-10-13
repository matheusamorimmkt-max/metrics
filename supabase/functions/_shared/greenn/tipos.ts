/**
 * Formato interno do conector da Greenn. Telas e cálculos só conhecem isto;
 * o que vem da API fica em tradutor.ts.
 */

export type ProdutoImportado = {
  id_externo: string;
  nome: string;
  ativo: boolean;
};

export type OfertaImportada = {
  id_externo: string;
  produto_id_externo: string;
  nome: string;
  preco: number;
  ativo: boolean;
};

export type ClienteImportado = {
  id_externo: string | null;
  email: string | null;
  nome: string | null;
  cpf: string | null;
};

export type ComissaoImportada = {
  tipo: "afiliado" | "coprodutor" | "outro";
  parceiro_id_externo: string | null;
  parceiro_nome: string | null;
  valor: number;
};

export type StatusVenda = "aprovada" | "reembolsada" | "chargeback";

export type VendaImportada = {
  id_externo: string;
  cliente: ClienteImportado;
  oferta_id_externo: string | null;
  produto_id_externo: string | null;
  status: StatusVenda;
  status_externo: string;
  reembolso_pendente: boolean;
  origem: "unica" | "assinatura_primeira" | "recorrencia";
  assinatura_id_externo: string | null;
  valor_bruto: number;
  taxa_gateway: number;
  taxa_gateway_origem: "gateway" | "estimada" | "desconhecida";
  valor_parceiros: number;
  moeda: string;
  meio_pagamento: string | null;
  parcelas: number;
  cupom: string | null;
  afiliado_id_externo: string | null;
  utm: Record<string, string>;
  vendida_em: string;
  criada_em: string | null;
  reembolsada_em: string | null;
  comissoes: ComissaoImportada[];
  dados_brutos: unknown;
};

export type ModoSincronizacao = "retroativa" | "incremental" | "reconsulta";
