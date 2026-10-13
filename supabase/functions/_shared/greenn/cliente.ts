/**
 * Chamadas à API Pública Greenn v1 (docs/greenn-api.md): Bearer grn_live_…,
 * 100 requisições por minuto por token, paginação page/per_page com meta.last_page,
 * 429 com Retry-After. Nunca em paralelo. Sem Deno: só fetch.
 */

export const BASE_GREENN = "https://apiadm.greenn.com.br/api/v1";
const POR_PAGINA = 100;

export class ErroGreenn extends Error {
  constructor(
    message: string,
    public readonly http: number,
    public readonly codigo: string | null,
  ) {
    super(message);
    this.name = "ErroGreenn";
  }
  /** Token inválido ou sem escopo: não adianta repetir. */
  get credencialInvalida() {
    return this.http === 401 || this.http === 403;
  }
}

export type Paginado<T> = {
  data: T[];
  meta?: { current_page?: number; per_page?: number; total?: number; last_page?: number };
};

export type OpcoesCliente = {
  token: string;
  base?: string;
  fetch?: typeof fetch;
  esperar?: (ms: number) => Promise<void>;
  agora?: () => number;
};

export class ClienteGreenn {
  private readonly token: string;
  private readonly base: string;
  private readonly fetchFn: typeof fetch;
  private readonly esperar: (ms: number) => Promise<void>;
  private readonly agora: () => number;
  /** Carimbos (ms) das últimas chamadas, para não passar de 100 por minuto. */
  private carimbos: number[] = [];
  public chamadas = 0;

  constructor(opcoes: OpcoesCliente) {
    this.token = opcoes.token;
    this.base = (opcoes.base ?? BASE_GREENN).replace(/\/+$/, "");
    this.fetchFn = opcoes.fetch ?? fetch;
    this.esperar = opcoes.esperar ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.agora = opcoes.agora ?? (() => Date.now());
  }

  /** Espera o necessário para ficar abaixo de 95 chamadas por minuto (folga sobre o limite de 100). */
  private async respeitarLimite() {
    const agora = this.agora();
    this.carimbos = this.carimbos.filter((t) => agora - t < 60_000);
    if (this.carimbos.length >= 95) {
      const maisAntigo = this.carimbos[0];
      await this.esperar(60_000 - (agora - maisAntigo) + 100);
    }
    this.carimbos.push(this.agora());
  }

  async get<T>(caminho: string): Promise<T> {
    const url = `${this.base}${caminho}`;
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      await this.respeitarLimite();
      this.chamadas += 1;
      const resposta = await this.fetchFn(url, {
        headers: { Authorization: `Bearer ${this.token}`, Accept: "application/json" },
      });
      const texto = await resposta.text();
      let corpo: unknown = null;
      try {
        corpo = JSON.parse(texto);
      } catch {
        corpo = null;
      }
      if (resposta.ok && corpo && typeof corpo === "object") return corpo as T;

      if (resposta.status === 429 || resposta.status >= 500) {
        const retryAfter = Number(resposta.headers.get("retry-after") ?? "0");
        const espera =
          retryAfter > 0
            ? retryAfter * 1000
            : Math.min(60_000, 2 ** (tentativa + 1) * 1000);
        if (tentativa < 4) {
          await this.esperar(espera);
          continue;
        }
      }
      const erro = corpo as {
        error?: { code?: string; message?: string };
        message?: string;
      } | null;
      throw new ErroGreenn(
        erro?.error?.message ?? erro?.message ?? `HTTP ${resposta.status} em ${caminho}`,
        resposta.status,
        erro?.error?.code ?? null,
      );
    }
    throw new ErroGreenn(`Limite de tentativas em ${caminho}`, 429, "limite");
  }

  /**
   * Percorre as páginas a partir de `paginaInicial` e chama `aoReceber` com cada lote.
   * Para quando `aoReceber` devolve false (orçamento de tempo esgotado) ou na última página.
   * Devolve a próxima página a buscar, ou null se terminou.
   */
  async paginar<T>(
    caminho: string,
    aoReceber: (lote: T[], pagina: number, ultima: number) => Promise<boolean | void>,
    paginaInicial = 1,
  ): Promise<number | null> {
    let pagina = paginaInicial;
    for (;;) {
      const sep = caminho.includes("?") ? "&" : "?";
      const resposta = await this.get<Paginado<T>>(
        `${caminho}${sep}page=${pagina}&per_page=${POR_PAGINA}`,
      );
      const lote = resposta.data ?? [];
      const ultima =
        resposta.meta?.last_page ?? (lote.length < POR_PAGINA ? pagina : pagina + 1);
      const continuar = await aoReceber(lote, pagina, ultima);
      if (pagina >= ultima || lote.length === 0) return null;
      pagina += 1;
      if (continuar === false) return pagina;
    }
  }

  produtos<T>(aoReceber: (lote: T[]) => Promise<void>) {
    return this.paginar<T>("/products", async (l) => {
      await aoReceber(l);
    });
  }

  ofertas<T>(aoReceber: (lote: T[]) => Promise<void>) {
    return this.paginar<T>("/offers", async (l) => {
      await aoReceber(l);
    });
  }

  /** Lista de vendas com filtros no formato filter[campo]=valor (datas AAAA-MM-DD). */
  vendas<T>(
    filtros: Record<string, string>,
    aoReceber: (lote: T[], pagina: number, ultima: number) => Promise<boolean | void>,
    paginaInicial = 1,
  ) {
    const query = Object.entries(filtros)
      .map(([k, v]) => `filter[${encodeURIComponent(k)}]=${encodeURIComponent(v)}`)
      .join("&");
    return this.paginar<T>(`/sales?${query}&sort=paid_at`, aoReceber, paginaInicial);
  }

  venda<T>(id: string | number) {
    return this.get<T>(`/sales/${id}`);
  }
}
