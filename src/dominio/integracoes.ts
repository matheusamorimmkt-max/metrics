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
  /** Campo de várias linhas (lista de IDs, por exemplo). */
  multilinha?: boolean;
};

export type SecaoIntegracao = "gateway" | "trafego";

export const SECOES_INTEGRACAO: {
  chave: SecaoIntegracao;
  titulo: string;
  descricao: string;
}[] = [
  {
    chave: "gateway",
    titulo: "Gateways de pagamento",
    descricao:
      "De onde vêm as vendas, os reembolsos e os clientes. A receita do painel vem só daqui.",
  },
  {
    chave: "trafego",
    titulo: "Fontes de tráfego",
    descricao: "De onde vem o gasto em anúncios, por campanha, conjunto e anúncio.",
  },
];

export type DefinicaoIntegracao = {
  tipo: TipoIntegracao;
  nome: string;
  categoria: string;
  secao: SecaoIntegracao;
  /** Caminho do logo em /public. */
  logo: string;
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
    secao: "gateway",
    logo: "/logos/greenn.png",
    descricao:
      "Vendas, ofertas, produtos, clientes, reembolsos e chargebacks. É a única fonte de receita do painel.",
    credencial: {
      rotulo: "Token da API",
      ajuda:
        "Na Greenn: Configurações do sistema → Integrações e Tokens → API → gerar um token com as permissões de leitura sales:read, products:read e offers:read. O token certo começa com grn_live_ (o token de webhook, que parece $2y$10$…, não serve).",
      placeholder: "grn_live_…",
    },
    config: [],
  },
  meta: {
    tipo: "meta",
    nome: "Meta Ads",
    categoria: "Fonte de tráfego",
    secao: "trafego",
    logo: "/logos/meta.svg",
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
        nome: "contas_anuncios_ids",
        rotulo: "Contas de anúncios",
        ajuda:
          "Uma ou mais contas, separadas por vírgula ou uma por linha. O ID fica no Gerenciador de Anúncios, em Configurações da conta: só números, com ou sem o prefixo act_. O token precisa ter acesso a todas.",
        placeholder: "act_1234567890, act_9876543210",
        multilinha: true,
      },
    ],
  },
};

/** Plataformas que aparecem na tela mas ainda não têm conector. */
export type PlataformaPrevista = {
  chave: string;
  nome: string;
  secao: SecaoIntegracao;
  logo: string;
  descricao: string;
};

export const PLATAFORMAS_PREVISTAS: PlataformaPrevista[] = [
  {
    chave: "hotmart",
    nome: "Hotmart",
    secao: "gateway",
    logo: "/logos/hotmart.png",
    descricao: "Vendas, reembolsos e compradores da Hotmart.",
  },
  {
    chave: "kiwify",
    nome: "Kiwify",
    secao: "gateway",
    logo: "/logos/kiwify.png",
    descricao: "Vendas, reembolsos e compradores da Kiwify.",
  },
  {
    chave: "eduzz",
    nome: "Eduzz",
    secao: "gateway",
    logo: "/logos/eduzz.png",
    descricao: "Vendas, reembolsos e compradores da Eduzz.",
  },
  {
    chave: "google",
    nome: "Google Ads",
    secao: "trafego",
    logo: "/logos/googleads.svg",
    descricao: "Gasto, impressões, cliques e conversões por campanha e por dia.",
  },
];

export const ROTULO_STATUS: Record<StatusIntegracao, string> = {
  desconectada: "Não conectada",
  configurada: "Credenciais salvas",
  conectada: "Conectada",
  erro: "Com erro",
};

export function ehTipoIntegracao(valor: string): valor is TipoIntegracao {
  return (TIPOS_INTEGRACAO as readonly string[]).includes(valor);
}
