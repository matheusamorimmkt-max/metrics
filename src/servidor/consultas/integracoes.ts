import "server-only";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import type { StatusIntegracao, TipoIntegracao } from "@/dominio/integracoes";
import { ehTipoIntegracao } from "@/dominio/integracoes";

export type Integracao = {
  id: string;
  tipo: TipoIntegracao;
  status: StatusIntegracao;
  credencial_sufixo: string | null;
  credenciais_atualizadas_em: string | null;
  ultima_sincronizacao: string | null;
  erro: string | null;
  config: Record<string, string>;
};

/** Integrações da organização, indexadas por tipo. A credencial em si nunca sai do banco. */
export async function listarIntegracoes(
  organizacaoId: string,
): Promise<Partial<Record<TipoIntegracao, Integracao>>> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("integracoes")
    .select(
      "id, tipo, status, credencial_sufixo, credenciais_atualizadas_em, ultima_sincronizacao, erro, config",
    )
    .eq("organizacao_id", organizacaoId);
  if (error) throw new Error(`Falha ao carregar integrações: ${error.message}`);

  const porTipo: Partial<Record<TipoIntegracao, Integracao>> = {};
  for (const linha of data) {
    if (!ehTipoIntegracao(linha.tipo)) continue;
    const config =
      linha.config && typeof linha.config === "object" && !Array.isArray(linha.config)
        ? Object.fromEntries(
            Object.entries(linha.config).map(([k, v]) => [
              k,
              // Lista (contas de anúncios) vira "a, b"; outros valores só se forem texto.
              Array.isArray(v) ? v.map(String).join(", ") : typeof v === "string" ? v : "",
            ]),
          )
        : {};
    porTipo[linha.tipo] = {
      id: linha.id,
      tipo: linha.tipo,
      status: linha.status as StatusIntegracao,
      credencial_sufixo: linha.credencial_sufixo,
      credenciais_atualizadas_em: linha.credenciais_atualizadas_em,
      ultima_sincronizacao: linha.ultima_sincronizacao,
      erro: linha.erro,
      config,
    };
  }
  return porTipo;
}
