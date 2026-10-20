import "server-only";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { tabelaAusente } from "@/servidor/supabase/erros";

export type EstadoSincronizacao = {
  /** Última sincronização concluída (fim), em ISO. */
  ultima_concluida_em: string | null;
  /** Há um ciclo executando agora. */
  executando: boolean;
  /** Fim do último ciclo (qualquer status), para o bloqueio de 1 minuto do botão. */
  ultimo_fim_em: string | null;
  /** Integrações cujo último ciclo falhou, com a mensagem. */
  falhas: { integracao: string; erro: string | null }[];
};

export async function obterEstadoSincronizacao(
  organizacaoId: string,
): Promise<EstadoSincronizacao> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("sincronizacoes")
    .select("status, inicio, fim, erro, integracoes(tipo)")
    .eq("organizacao_id", organizacaoId)
    .order("inicio", { ascending: false })
    .limit(20);
  // Antes da migration da Fase 2 estar aplicada, a tabela não existe: trata como "nunca rodou".
  if (error && tabelaAusente(error)) {
    return {
      ultima_concluida_em: null,
      executando: false,
      ultimo_fim_em: null,
      falhas: [],
    };
  }
  if (error) throw new Error(`Falha ao carregar sincronizações: ${error.message}`);

  const concluida = data.find((s) => s.status === "concluida");
  const comFim = data.find((s) => s.fim);
  const vistos = new Set<string>();
  const falhas: EstadoSincronizacao["falhas"] = [];
  for (const s of data) {
    const tipo = s.integracoes?.tipo ?? "";
    if (vistos.has(tipo)) continue;
    vistos.add(tipo);
    if (s.status === "falhou") falhas.push({ integracao: tipo, erro: s.erro });
  }

  return {
    ultima_concluida_em: concluida?.fim ?? null,
    // Ciclo "executando" há mais de 10 min é um conector que morreu: não bloqueia.
    executando: data.some(
      (s) =>
        s.status === "executando" &&
        Date.now() - new Date(s.inicio).getTime() < 10 * 60_000,
    ),
    ultimo_fim_em: comFim?.fim ?? null,
    falhas,
  };
}
