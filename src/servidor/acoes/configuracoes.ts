"use server";

import { revalidatePath } from "next/cache";
import { schemaConfiguracoesGerais } from "@/dominio/schemas/organizacao";
import { textoParaFracao } from "@/dominio/percentual";
import { fusoValido } from "@/dominio/fuso-horario";
import { obterContexto } from "@/servidor/sessao";
import { criarClienteServidor } from "@/servidor/supabase/servidor";
import { falha, falhaValidacao, sucesso, texto, type Resultado } from "./resultado";

export async function atualizarConfiguracoesGerais(
  _anterior: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const { organizacao } = await obterContexto();

  const taxa = textoParaFracao(texto(formData, "taxa_anuncios"));
  const janela = Number.parseInt(texto(formData, "janela_transacao_min"), 10);

  const parse = schemaConfiguracoesGerais.safeParse({
    nome: texto(formData, "nome"),
    taxa_anuncios: taxa ?? Number.NaN,
    janela_transacao_min: Number.isNaN(janela) ? Number.NaN : janela,
    fuso_horario: texto(formData, "fuso_horario"),
    moeda: texto(formData, "moeda"),
  });
  if (!parse.success) return falhaValidacao(parse.error);
  if (!fusoValido(parse.data.fuso_horario)) {
    return { ok: false, erros: { fuso_horario: ["Fuso horário desconhecido."] } };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("organizacoes")
    .update(parse.data)
    .eq("id", organizacao.id);
  if (error) return falha(`Não foi possível salvar: ${error.message}`);

  revalidatePath("/", "layout");
  return sucesso("Configurações salvas.");
}
