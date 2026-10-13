import "server-only";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { tabelaAusente } from "@/servidor/supabase/erros";
import { hojeNoFuso, resolverPeriodo, type Periodo } from "@/dominio/periodo";

type Params = Record<string, string | string[] | undefined>;

function texto(params: Params, chave: string): string | undefined {
  const v = params[chave];
  return typeof v === "string" ? v : undefined;
}

/** Primeiro dia com dado da organização (venda ou métrica de anúncio), no fuso dela. */
export async function obterInicioDados(
  organizacaoId: string,
  fuso: string,
): Promise<string | null> {
  const supabase = await criarClienteServidor();
  const [venda, anuncio] = await Promise.all([
    supabase
      .from("vendas")
      .select("vendida_em")
      .eq("organizacao_id", organizacaoId)
      .order("vendida_em", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("metricas_anuncio_diarias")
      .select("data")
      .eq("organizacao_id", organizacaoId)
      .order("data", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  if (venda.error && !tabelaAusente(venda.error)) {
    throw new Error(`Falha ao consultar vendas: ${venda.error.message}`);
  }
  if (anuncio.error && !tabelaAusente(anuncio.error)) {
    throw new Error(`Falha ao consultar métricas: ${anuncio.error.message}`);
  }
  const datas = [
    venda.data?.vendida_em ? hojeNoFuso(fuso, new Date(venda.data.vendida_em)) : null,
    anuncio.data?.data ?? null,
  ].filter((d): d is string => Boolean(d));
  return datas.length ? datas.sort()[0] : null;
}

/**
 * Período vindo da URL (periodo, de, ate). Só consulta o banco quando o usuário
 * escolhe "Todo o período", para descobrir onde os dados começam.
 */
export async function periodoDaUrl(
  organizacao: { id: string; fuso_horario: string },
  params: Params,
): Promise<Periodo> {
  const chave = texto(params, "periodo");
  const inicioDados =
    chave === "todo"
      ? await obterInicioDados(organizacao.id, organizacao.fuso_horario)
      : null;
  return resolverPeriodo(
    organizacao.fuso_horario,
    { periodo: chave, de: texto(params, "de"), ate: texto(params, "ate") },
    new Date(),
    inicioDados,
  );
}
