"use server";

import { revalidatePath } from "next/cache";
import { obterContexto } from "@/servidor/sessao";
import { criarClienteAdmin } from "@/servidor/supabase/admin";
import { listarIntegracoes } from "@/servidor/consultas/integracoes";
import { obterEstadoSincronizacao } from "@/servidor/consultas/sincronizacoes";
import { falha, sucesso, type Resultado } from "./resultado";

/** Conectores que já existem, por tipo de integração. */
const CONECTORES: Record<string, string> = { meta: "meta-sync", greenn: "greenn-sync" };

const MINUTOS_ENTRE_CICLOS = 1;
const MINUTOS_CICLO_AUTOMATICO = 15;

type RespostaConector = {
  status: string;
  erro?: string;
  registros?: number;
  retroativa_pendente?: boolean;
};

/**
 * Dispara um ciclo para todas as integrações configuradas da organização, com o
 * mesmo ciclo_id e o mesmo corte (princípio: Meta e gateway juntos).
 * Só o servidor chama os conectores; o app nunca fala com as plataformas.
 */
async function dispararCiclo(
  organizacaoId: string,
  origem: "login" | "botao",
): Promise<{ resultados: Record<string, RespostaConector>; nenhum: boolean }> {
  const integracoes = await listarIntegracoes(organizacaoId);
  const admin = criarClienteAdmin();
  const cicloId = crypto.randomUUID();
  const corte = new Date().toISOString();
  const resultados: Record<string, RespostaConector> = {};

  for (const integracao of Object.values(integracoes)) {
    const funcao = CONECTORES[integracao.tipo];
    if (!funcao || integracao.status === "desconectada") continue;

    const { data: linha } = await admin
      .from("integracoes")
      .select("importacao_concluida_em")
      .eq("id", integracao.id)
      .single();
    const modo = linha?.importacao_concluida_em ? "incremental" : "retroativa";

    const { data, error } = await admin.functions.invoke<RespostaConector>(funcao, {
      body: { organizacao_id: organizacaoId, modo, origem, ciclo_id: cicloId, corte },
    });
    if (error) {
      // O conector devolve JSON mesmo em 4xx/5xx; tenta ler a mensagem.
      let mensagem = error.message;
      const contexto = (error as { context?: Response }).context;
      if (contexto && typeof contexto.json === "function") {
        try {
          const corpo = (await contexto.json()) as RespostaConector;
          mensagem = corpo.erro ?? corpo.status ?? mensagem;
        } catch {
          /* mantém a mensagem padrão */
        }
      }
      resultados[integracao.tipo] = { status: "falhou", erro: mensagem };
    } else {
      resultados[integracao.tipo] = data ?? { status: "desconhecido" };
    }
  }

  return { resultados, nenhum: Object.keys(resultados).length === 0 };
}

/** Botão "Atualizar agora". */
export async function atualizarAgora(): Promise<Resultado> {
  const { organizacao } = await obterContexto();

  const estado = await obterEstadoSincronizacao(organizacao.id);
  if (estado.executando) return falha("Já existe uma atualização em andamento.");
  if (
    estado.ultimo_fim_em &&
    Date.now() - new Date(estado.ultimo_fim_em).getTime() < MINUTOS_ENTRE_CICLOS * 60_000
  ) {
    return falha("Aguarde 1 minuto entre atualizações.");
  }

  const { resultados, nenhum } = await dispararCiclo(organizacao.id, "botao");
  revalidatePath("/", "layout");

  if (nenhum)
    return falha("Nenhuma integração com conector disponível está configurada.");

  const falhas = Object.entries(resultados).filter(([, r]) => r.status === "falhou");
  if (falhas.length) {
    return falha(falhas.map(([tipo, r]) => `${tipo}: ${r.erro ?? "falhou"}`).join(" · "));
  }
  const pendente = Object.values(resultados).some((r) => r.retroativa_pendente);
  return sucesso(
    pendente
      ? "Atualizado. A importação do histórico continua nas próximas atualizações."
      : "Atualizado.",
  );
}

/**
 * Ao entrar: se a última atualização tem mais de 15 min, dispara um ciclo em segundo
 * plano. Nunca lança erro, para não derrubar a página.
 */
export async function dispararCicloSeNecessario(organizacaoId: string): Promise<void> {
  try {
    const estado = await obterEstadoSincronizacao(organizacaoId);
    if (estado.executando) return;
    const ultima = estado.ultimo_fim_em ? new Date(estado.ultimo_fim_em).getTime() : 0;
    if (Date.now() - ultima < MINUTOS_CICLO_AUTOMATICO * 60_000) return;
    await dispararCiclo(organizacaoId, "login");
  } catch (erro) {
    console.error("ciclo automático falhou", erro instanceof Error ? erro.message : erro);
  }
}
