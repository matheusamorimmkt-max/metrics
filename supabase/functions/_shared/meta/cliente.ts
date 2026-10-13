/**
 * Chamadas à Graph API do Meta com paginação e espera em limite de uso.
 * Sem Deno: usa só fetch, para ser testável fora do runtime.
 */
import type { AnuncioMeta, CampanhaMeta, ContaMeta, InsightMeta } from "./tradutor.ts";

export const VERSAO_GRAPH = "v23.0";
const BASE = `https://graph.facebook.com/${VERSAO_GRAPH}`;

/** Códigos de erro do Meta que significam "espere e tente de novo". */
const CODIGOS_LIMITE = new Set([4, 17, 32, 613, 80000, 80004]);

export class ErroMeta extends Error {
  constructor(
    message: string,
    public readonly codigo: number | null,
    public readonly http: number,
    public readonly tipo: string | null,
  ) {
    super(message);
    this.name = "ErroMeta";
  }
  /** Token inválido, expirado ou sem permissão: não adianta repetir. */
  get credencialInvalida() {
    return (
      this.http === 401 ||
      this.codigo === 190 ||
      this.codigo === 10 ||
      this.codigo === 200
    );
  }
}

type RespostaPaginada<T> = { data: T[]; paging?: { next?: string } };

export type OpcoesCliente = {
  token: string;
  fetch?: typeof fetch;
  /** Espera entre tentativas, em ms (padrão 2^n s, teto 60 s). Testes passam 0. */
  esperar?: (ms: number) => Promise<void>;
};

export class ClienteMeta {
  private readonly token: string;
  private readonly fetchFn: typeof fetch;
  private readonly esperar: (ms: number) => Promise<void>;

  constructor(opcoes: OpcoesCliente) {
    this.token = opcoes.token;
    this.fetchFn = opcoes.fetch ?? fetch;
    this.esperar = opcoes.esperar ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  async get<T>(url: string): Promise<T> {
    return this.chamar<T>(url);
  }

  /** POST com corpo em formulário (a Graph API aceita os campos na query ou no corpo). */
  async post<T>(url: string, campos: Record<string, string>): Promise<T> {
    return this.chamar<T>(url, campos);
  }

  private async chamar<T>(url: string, corpoPost?: Record<string, string>): Promise<T> {
    const completa = url.startsWith("http") ? url : `${BASE}${url}`;
    const separador = completa.includes("?") ? "&" : "?";
    // paging.next já vem com access_token: não duplicar.
    const comToken = completa.includes("access_token=")
      ? completa
      : `${completa}${separador}access_token=${encodeURIComponent(this.token)}`;

    for (let tentativa = 0; tentativa < 6; tentativa++) {
      const resposta = await this.fetchFn(
        comToken,
        corpoPost
          ? {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams(corpoPost).toString(),
            }
          : { headers: { Accept: "application/json" } },
      );
      const texto = await resposta.text();
      let corpo: unknown = null;
      try {
        corpo = JSON.parse(texto);
      } catch {
        corpo = null;
      }

      if (resposta.ok && corpo && typeof corpo === "object") return corpo as T;

      const erro = (
        corpo as { error?: { message?: string; code?: number; type?: string } } | null
      )?.error;
      const codigo = erro?.code ?? null;
      const limite =
        resposta.status === 429 || (codigo !== null && CODIGOS_LIMITE.has(codigo));
      if (limite && tentativa < 5) {
        await this.esperar(Math.min(60_000, 2 ** (tentativa + 1) * 1000));
        continue;
      }
      throw new ErroMeta(
        erro?.message ?? `HTTP ${resposta.status} em ${url}`,
        codigo,
        resposta.status,
        erro?.type ?? null,
      );
    }
    throw new ErroMeta(`Limite de tentativas em ${url}`, null, 429, "limite");
  }

  /** Percorre todas as páginas (paging.next) e chama `aoReceber` com cada lote. */
  async paginar<T>(
    url: string,
    aoReceber: (lote: T[]) => Promise<void>,
  ): Promise<number> {
    let proxima: string | undefined = url;
    let total = 0;
    while (proxima) {
      const pagina: RespostaPaginada<T> = await this.get<RespostaPaginada<T>>(proxima);
      const lote = pagina.data ?? [];
      total += lote.length;
      if (lote.length) await aoReceber(lote);
      proxima = pagina.paging?.next;
    }
    return total;
  }

  conta(contaId: string): Promise<ContaMeta> {
    return this.get<ContaMeta>(
      `/${contaId}?fields=id,account_id,name,currency,timezone_name`,
    );
  }

  campanhas(
    contaId: string,
    aoReceber: (lote: CampanhaMeta[]) => Promise<void>,
  ): Promise<number> {
    return this.paginar<CampanhaMeta>(
      `/${contaId}/campaigns?fields=id,name,status,effective_status,objective&limit=200`,
      aoReceber,
    );
  }

  anuncios(
    contaId: string,
    aoReceber: (lote: AnuncioMeta[]) => Promise<void>,
  ): Promise<number> {
    const campos = [
      "id",
      "name",
      "status",
      "effective_status",
      "campaign_id",
      "adset_id",
      "adset{id,name}",
      "creative{id,thumbnail_url,image_url,video_id,instagram_permalink_url,object_type,object_story_spec}",
    ].join(",");
    return this.paginar<AnuncioMeta>(
      `/${contaId}/ads?fields=${campos}&limit=200`,
      aoReceber,
    );
  }

  /** URL de reprodução de um vídeo de anúncio. Null se o token não tiver acesso. */
  async videoUrl(
    videoId: string,
  ): Promise<{ source: string | null; permalink: string | null }> {
    try {
      const v = await this.get<{ source?: string; permalink_url?: string }>(
        `/${videoId}?fields=source,permalink_url`,
      );
      return { source: v.source ?? null, permalink: v.permalink_url ?? null };
    } catch {
      return { source: null, permalink: null };
    }
  }

  /** Liga (ACTIVE) ou pausa (PAUSED) uma campanha. Exige a permissão ads_management. */
  async alterarStatusCampanha(
    campanhaId: string,
    status: "ACTIVE" | "PAUSED",
  ): Promise<void> {
    await this.post<{ success?: boolean }>(`/${campanhaId}`, { status });
  }

  insights(
    contaId: string,
    desde: string,
    ate: string,
    aoReceber: (lote: InsightMeta[]) => Promise<void>,
  ): Promise<number> {
    const campos = [
      "campaign_id",
      "campaign_name",
      "adset_id",
      "adset_name",
      "ad_id",
      "ad_name",
      "spend",
      "impressions",
      "reach",
      "clicks",
      "inline_link_clicks",
      "actions",
    ].join(",");
    const intervalo = encodeURIComponent(JSON.stringify({ since: desde, until: ate }));
    return this.paginar<InsightMeta>(
      `/${contaId}/insights?level=ad&fields=${campos}&time_increment=1&time_range=${intervalo}&limit=500`,
      aoReceber,
    );
  }
}
