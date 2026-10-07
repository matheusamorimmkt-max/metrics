import type { Metadata } from "next";
import { obterContexto } from "@/servidor/sessao";
import { listarCategorias } from "@/servidor/consultas/categorias";
import { criarFunil } from "@/servidor/acoes/funis";
import { FormularioFunil } from "../formulario-funil";

export const metadata: Metadata = { title: "Novo funil" };

export default async function PaginaNovoFunil() {
  const { organizacao } = await obterContexto();
  const categorias = await listarCategorias(organizacao.id);

  return (
    <FormularioFunil
      acao={criarFunil}
      categorias={categorias}
      titulo="Novo funil"
      descricao="Depois de salvar, você poderá vincular as ofertas quando a Greenn estiver conectada."
      textoBotao="Criar funil"
    />
  );
}
