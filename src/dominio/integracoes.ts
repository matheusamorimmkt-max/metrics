/**
 * Catálogo dos conectores que uma organização pode ligar na tela de Integrações.
 * Cada organização conecta a própria conta; não existe credencial global.
 * Telas e cálculos só conhecem este catálogo, nunca a API de origem.
 */
export type TipoIntegracao = "greenn" | "meta";

export const TIPOS_INTEGRACAO = ["greenn", "meta"] as const;

export type StatusIntegracao = "desconectada" | "configurada" | "conectada" | "erro";

export type CampoConfig = {
  nome: string;
  rotulo: string;
  ajuda: string;
  placeholder: string;
};

export type DefinicaoIntegracao = {
  tipo: TipoIntegracao;
  nome: string;
  categoria: string;
  descricao: string;
  /** Rótulo, ajuda e exemplo do campo secreto (token). */
  credencial: { rotulo: string; ajuda: string; placeholder: string };
  /** Campos não secretos, guardados em `integracoes.config`. */
  config: CampoConfig[];
};

export const INTEGRACOES: Record<TipoIntegracao, DefinicaoIntegracao> = {
  greenn: {
    tipo: "greenn",
    nome: "Greenn",
    categoria: "Gateway de pagamento",
    descricao:
      "Vendas, ofertas, produtos, clientes, reembolsos e chargebacks. É a única fonte de receita do painel.",
    credencial: {
      rotulo: "Token da API",
      ajuda:
        "Na Greenn: Configurações do sistema → Integrações e Tokens → gerar token com as permissões de leitura sales:read, products:read e offers:read.",
      placeholder: "grn_live_…",
    },
    config: [],
  },
  meta: {
    tipo: "meta",
    nome: "Meta Ads",
    categoria: "Anúncios",
    descricao:
      "Gasto, impressões, cliques e resultados por campanha e por dia. Só permissão de leitura.",
    credencial: {
      rotulo: "Token de acesso",
      ajuda:
        "No Meta Business: Configurações do negócio → Usuários → Usuários do sistema → gerar token com a permissão ads_read para a conta de anúncios.",
      placeholder: "EAAB…",
    },
    config: [
      {
        nome: "conta_anuncios_id",
        rotulo: "ID da conta de anúncios",
        ajuda:
          "No Gerenciador de Anúncios, em Configurações da conta. Só números, com ou sem o prefixo act_.",
        placeholder: "act_1234567890",
      },
    ],
  },
};

export const ROTULO_STATUS: Record<StatusIntegracao, string> = {
  desconectada: "Não conectada",
  configurada: "Credenciais salvas",
  conectada: "Conectada",
  erro: "Com erro",
};

export function ehTipoIntegracao(valor: string): valor is TipoIntegracao {
  return (TIPOS_INTEGRACAO as readonly string[]).includes(valor);
}
