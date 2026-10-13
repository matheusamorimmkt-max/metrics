import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { obterContexto } from "@/servidor/sessao";
import { listarCategorias } from "@/servidor/consultas/categorias";
import { obterFunil } from "@/servidor/consultas/funis";
import {
  listarOfertasDoFunil,
  listarOfertasSemFunil,
} from "@/servidor/consultas/ofertas";
import { listarIntegracoes } from "@/servidor/consultas/integracoes";
import { atualizarFunil } from "@/servidor/acoes/funis";
import { EditorOfertas } from "./editor-ofertas";
import { FormularioFunil } from "../formulario-funil";
import { AcoesFunil } from "./acoes-funil";

export const metadata: Metadata = { title: "Editar funil" };

export default async function PaginaEditarFunil({
  params,
  searchParams,
}: PageProps<"/configuracoes/funis/[id]">) {
  const { id } = await params;
  const busca = await searchParams;
  const { organizacao } = await obterContexto();
  const [funil, categorias, ofertas, disponiveis, integracoes] = await Promise.all([
    obterFunil(organizacao.id, id),
    listarCategorias(organizacao.id),
    listarOfertasDoFunil(organizacao.id, id),
    listarOfertasSemFunil(organizacao.id),
    listarIntegracoes(organizacao.id),
  ]);
  if (!funil) notFound();
  const greennConectada = Boolean(
    integracoes.greenn && integracoes.greenn.status !== "desconectada",
  );

  return (
    <div className="space-y-6">
      {busca.criado ? (
        <Alert>
          <AlertTitle>Funil criado</AlertTitle>
          <AlertDescription>
            Agora defina as ofertas do funil: qual é o front, quais são os bumps e os
            upsells. O sistema também sugere pelo histórico de vendas.
          </AlertDescription>
        </Alert>
      ) : null}

      <FormularioFunil
        acao={atualizarFunil.bind(null, funil.id)}
        categorias={categorias}
        inicial={funil}
        titulo={funil.nome}
        descricao="Nome, categoria, tipo e meta de ROI do funil."
        textoBotao="Salvar"
      />

      <Card>
        <CardHeader>
          <CardTitle>Ofertas do funil</CardTitle>
          <CardDescription>
            Front (1 ou mais), order bumps, upsells e downsells. Sugestões vêm do
            histórico de vendas: confirme ou descarte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditorOfertas
            funilId={funil.id}
            ofertas={ofertas}
            disponiveis={disponiveis}
            moeda={organizacao.moeda}
            greennConectada={greennConectada}
          />
        </CardContent>
      </Card>

      <AcoesFunil funil={funil} />
    </div>
  );
}
