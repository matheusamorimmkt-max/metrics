"use server";

import { revalidatePath } from "next/cache";
import { schemaImpostoProduto } from "@/dominio/schemas/produto";
import { textoParaFracao } from "@/dominio/percentual";
import { obterContexto } from "@/servidor/sessao";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { falha, falhaValidacao, sucesso, texto, type Resultado } from "./resultado";

const CAMINHO = "/configuracoes/produtos";

/**
 * Alíquota e base do imposto do produto. "Só daqui para frente": o trigger do banco
 * fecha a vigência atual e abre outra. "Recalcular histórico": a função do banco
 * substitui todas as vigências por uma só, desde a primeira venda.
 */
export async function salvarImpostoProduto(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { organizacao } = await obterContexto();
  const parse = schemaImpostoProduto.safeParse({
    produto_id: texto(formData, "produto_id"),
    aliquota_imposto: textoParaFracao(texto(formData, "aliquota_imposto")) ?? Number.NaN,
    base_imposto: texto(formData, "base_imposto"),
    modo: texto(formData, "modo") || "daqui_para_frente",
  });
  if (!parse.success) return falhaValidacao(parse.error);

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("produtos")
    .update({
      aliquota_imposto: parse.data.aliquota_imposto,
      base_imposto: parse.data.base_imposto,
    })
    .eq("id", parse.data.produto_id)
    .eq("organizacao_id", organizacao.id)
    .select("id")
    .maybeSingle();
  if (error) return falha(`Não foi possível salvar: ${error.message}`);
  if (!data) return falha("Produto não encontrado.");

  if (parse.data.modo === "recalcular_historico") {
    const { error: erroRecalculo } = await supabase.rpc("recalcular_aliquota_historico", {
      p_produto_id: parse.data.produto_id,
    });
    if (erroRecalculo) {
      return falha(
        `Alíquota salva, mas o histórico não foi recalculado: ${erroRecalculo.message}`,
      );
    }
  }

  revalidatePath(CAMINHO);
  revalidatePath("/");
  return sucesso(
    parse.data.modo === "recalcular_historico"
      ? "Imposto salvo e aplicado a todo o histórico."
      : "Imposto salvo. Vale para as vendas a partir de agora.",
  );
}
