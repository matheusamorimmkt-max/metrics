import type { Metadata } from "next";
import { obterContexto } from "@/servidor/sessao";
import { FormularioGeral } from "./formulario-geral";

export const metadata: Metadata = { title: "Configurações gerais" };

export default async function PaginaConfiguracoesGerais() {
  const { organizacao } = await obterContexto();
  return <FormularioGeral organizacao={organizacao} />;
}
