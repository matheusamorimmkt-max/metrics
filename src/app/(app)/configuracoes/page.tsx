import type { Metadata } from "next";
import { obterContexto } from "@/servidor/sessao";
import { FormularioGeral } from "./formulario-geral";
import { FormularioImposto } from "./formulario-imposto";

export const metadata: Metadata = { title: "Configurações gerais" };

export default async function PaginaConfiguracoesGerais() {
  const { organizacao } = await obterContexto();
  return (
    <div className="space-y-6">
      <FormularioGeral organizacao={organizacao} />
      <FormularioImposto organizacao={organizacao} />
    </div>
  );
}
