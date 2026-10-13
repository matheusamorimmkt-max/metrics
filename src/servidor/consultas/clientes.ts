import "server-only";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { tabelaAusente } from "@/servidor/supabase/erros";
import { somarDias, type Periodo } from "@/dominio/periodo";
import { deslocamento } from "./vendas";

export type RecompraPorFunil = {
  funil_entrada: string;
  clientes: number;
  recompraram: number;
  taxa: number | null;
  /** Para onde foram: funil da transação seguinte → quantidade. */
  destinos: { funil: string; quantidade: number }[];
  dias_ate_recompra_mediana: number | null;
};

export type ResumoClientes = {
  clientes_unicos: number;
  clientes_novos: number;
  transacoes: number;
  ticket_medio: number | null;
  recorrentes: number;
  taxa_recompra: number | null;
  dias_ate_recompra_mediana: number | null;
  por_funil_entrada: RecompraPorFunil[];
  truncado: boolean;
};

const LIMITE = 20_000;

function mediana(valores: number[]): number | null {
  if (!valores.length) return null;
  const v = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(v.length / 2);
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
}

/**
 * Aba Clientes: transações do período, clientes únicos e novos, ticket médio,
 * taxa de recompra e recompra dos front-ends com destino e tempo.
 */
export async function obterResumoClientes(
  organizacaoId: string,
  periodo: Periodo,
  fuso: string,
): Promise<ResumoClientes> {
  const supabase = await criarClienteServidor();
  const off = deslocamento(fuso);
  const inicio = `${periodo.de}T00:00:00${off}`;
  const fim = `${somarDias(periodo.ate, 1)}T00:00:00${off}`;

  const { data, error } = await supabase
    .from("transacoes")
    .select(
      "id, cliente_id, inicio, ordem, eh_recompra, valor_total, funil_id, funis(nome), clientes(primeira_compra_em, funil_entrada_id)",
    )
    .eq("organizacao_id", organizacaoId)
    .gte("inicio", inicio)
    .lt("inicio", fim)
    .order("inicio", { ascending: true })
    .limit(LIMITE);

  const vazio: ResumoClientes = {
    clientes_unicos: 0,
    clientes_novos: 0,
    transacoes: 0,
    ticket_medio: null,
    recorrentes: 0,
    taxa_recompra: null,
    dias_ate_recompra_mediana: null,
    por_funil_entrada: [],
    truncado: false,
  };
  if (error && tabelaAusente(error)) return vazio;
  if (error) throw new Error(`Falha ao carregar clientes: ${error.message}`);
  const transacoes = data ?? [];
  if (!transacoes.length) return vazio;

  // Nomes de funis para o funil de entrada (pode não aparecer nas transações do período)
  const funilIds = new Set<string>();
  for (const t of transacoes) {
    if (t.funil_id) funilIds.add(t.funil_id);
    if (t.clientes?.funil_entrada_id) funilIds.add(t.clientes.funil_entrada_id);
  }
  const { data: funis } = await supabase
    .from("funis")
    .select("id, nome")
    .eq("organizacao_id", organizacaoId)
    .in("id", [...funilIds]);
  const nomeFunil = new Map((funis ?? []).map((f) => [f.id, f.nome]));
  const nome = (id: string | null) => (id ? (nomeFunil.get(id) ?? "Funil") : "Sem funil");

  const clientes = new Set<string>();
  const porCliente = new Map<string, typeof transacoes>();
  let valorTotal = 0;
  let novos = 0;
  for (const t of transacoes) {
    clientes.add(t.cliente_id);
    valorTotal += Number(t.valor_total ?? 0);
    if (t.ordem === 1) novos += 1;
    porCliente.set(t.cliente_id, [...(porCliente.get(t.cliente_id) ?? []), t]);
  }

  // Recompra: clientes com transação de ordem ≥ 2 no período, agrupados pelo funil de entrada.
  const recorrentes = new Set<string>();
  const diasAteRecompra: number[] = [];
  const porEntrada = new Map<
    string,
    {
      clientes: Set<string>;
      recompraram: Set<string>;
      destinos: Map<string, number>;
      dias: number[];
    }
  >();
  for (const [clienteId, lista] of porCliente) {
    const entrada = nome(lista[0]?.clientes?.funil_entrada_id ?? null);
    const grupo = porEntrada.get(entrada) ?? {
      clientes: new Set<string>(),
      recompraram: new Set<string>(),
      destinos: new Map<string, number>(),
      dias: [],
    };
    grupo.clientes.add(clienteId);
    for (const t of lista) {
      if (!t.eh_recompra) continue;
      recorrentes.add(clienteId);
      grupo.recompraram.add(clienteId);
      const destino = nome(t.funil_id);
      grupo.destinos.set(destino, (grupo.destinos.get(destino) ?? 0) + 1);
      const primeira = t.clientes?.primeira_compra_em;
      if (primeira && t.ordem === 2) {
        const dias =
          (new Date(t.inicio).getTime() - new Date(primeira).getTime()) / 86_400_000;
        if (dias >= 0) {
          diasAteRecompra.push(dias);
          grupo.dias.push(dias);
        }
      }
    }
    porEntrada.set(entrada, grupo);
  }

  return {
    clientes_unicos: clientes.size,
    clientes_novos: novos,
    transacoes: transacoes.length,
    ticket_medio: transacoes.length ? valorTotal / transacoes.length : null,
    recorrentes: recorrentes.size,
    taxa_recompra: clientes.size ? recorrentes.size / clientes.size : null,
    dias_ate_recompra_mediana: mediana(diasAteRecompra),
    por_funil_entrada: [...porEntrada.entries()]
      .map(([funil_entrada, g]) => ({
        funil_entrada,
        clientes: g.clientes.size,
        recompraram: g.recompraram.size,
        taxa: g.clientes.size ? g.recompraram.size / g.clientes.size : null,
        destinos: [...g.destinos.entries()]
          .map(([funil, quantidade]) => ({ funil, quantidade }))
          .sort((a, b) => b.quantidade - a.quantidade),
        dias_ate_recompra_mediana: mediana(g.dias),
      }))
      .sort((a, b) => b.clientes - a.clientes),
    truncado: transacoes.length >= LIMITE,
  };
}
