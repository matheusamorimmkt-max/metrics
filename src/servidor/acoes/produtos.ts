"use server";

import { revalidatePath } from "next/cache";
import { schemaImpostoProduto } from "@/dominio/schemas/produto";
import { textoParaFracao } from "@/dominio/percentual";
import { obterContexto } from "@/servidor/sessao";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { falha, falhaValidacao, sucesso, texto, type Resultado, semPermissao } from "./resultado";

const CAMINHO = "/configuracoes/produtos";

/**
 * Imposto do produto: segue o padrão do negócio ou tem alíquota e base próprias.
 * Qualquer mudança vale para todo o histórico (a função do banco refaz a vigência).
 */
export async function salvarImpostoProduto(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const contexto = await obterContexto();
  if (!contexto.podeEditar) return semPermissao();
  const { organizacao } = contexto;
  const personalizado = texto(formData, "personalizado") === "true";
  const parse = schemaImpostoProduto.safeParse({
    produto_id: texto(formData, "produto_id"),
    personalizado,
    aliquota_imposto: personalizado
      ? (textoParaFracao(texto(formData, "aliquota_imposto")) ?? Number.NaN)
      : undefined,
    base_imposto: personalizado ? texto(formData, "base_imposto") : undefined,
  });
  if (!parse.success) return falhaValidacao(parse.error);

  const supabase = await criarClienteServidor();
  const { data: produto } = await supabase
    .from("produtos")
    .select("id")
    .eq("id", parse.data.produto_id)
    .eq("organizacao_id", organizacao.id)
    .maybeSingle();
  if (!produto) return falha("Produto não encontrado.");

  const { error } = await supabase.rpc("definir_imposto_produto", {
    p_produto_id: parse.data.produto_id,
    p_personalizado: parse.data.personalizado,
    p_aliquota: parse.data.aliquota_imposto,
    p_base: parse.data.base_imposto,
  });
  if (error) return falha(`Não foi possível salvar: ${error.message}`);

  revalidatePath(CAMINHO);
  revalidatePath("/", "layout");
  return sucesso(
    parse.data.personalizado
      ? "Imposto do produto salvo e aplicado a todo o histórico."
      : "Produto voltou ao imposto padrão do negócio, em todo o histórico.",
  );
}
