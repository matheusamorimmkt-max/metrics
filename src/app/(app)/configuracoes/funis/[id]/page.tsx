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
import { atualizarFunil } from "@/servidor/acoes/funis";
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
  const [funil, categorias] = await Promise.all([
    obterFunil(organizacao.id, id),
    listarCategorias(organizacao.id),
  ]);
  if (!funil) notFound();

  return (
    <div className="space-y-6">
      {busca.criado ? (
        <Alert>
          <AlertTitle>Funil criado</AlertTitle>
          <AlertDescription>
            Quando a Greenn estiver conectada, as ofertas aparecerão aqui para você
            definir qual é o front, quais são os bumps e os upsells.
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
            Front (1 ou mais), order bumps, upsells e downsells, cada um com o ID da
            oferta no gateway.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
            As ofertas serão importadas da Greenn na próxima fase. Depois disso, o sistema
            sugere a estrutura a partir do histórico de vendas e você confirma.
          </div>
        </CardContent>
      </Card>

      <AcoesFunil funil={funil} />
    </div>
  );
}
