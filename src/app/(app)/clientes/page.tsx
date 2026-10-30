import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { obterContexto } from "@/servidor/sessao";
import { periodoDaUrl } from "@/servidor/consultas/periodo";
import { listarClientesDoPeriodo } from "@/servidor/consultas/clientes";
import { resumirCliente } from "@/dominio/clientes-periodo";
import { ListaClientes } from "./lista-clientes";
import { SeletorHome } from "../home/seletor";

export const metadata: Metadata = { title: "Clientes" };

export default async function PaginaClientes({ searchParams }: PageProps<"/clientes">) {
  const params = await searchParams;
  const { organizacao, podeEditar } = await obterContexto();
  const periodo = await periodoDaUrl(organizacao, params);
  const lista = await listarClientesDoPeriodo(
    organizacao.id,
    periodo,
    organizacao.fuso_horario,
  );
  const moeda = organizacao.moeda;
  const clientes = lista.clientes.map(resumirCliente);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground">
          Todos os clientes que compraram no período, com busca, filtros, ordenação e
          CSV. Clique no nome de um cliente para abrir a ficha completa. Os indicadores
          de clientes e a recompra por funil de entrada ficam na Home.
        </p>
      </div>

      <SeletorHome
        periodo={periodo}
        filtroAtual=""
        categorias={[]}
        funis={[]}
        base="/clientes"
      />

      <Card>
        <CardHeader>
          <CardTitle>Todos os clientes do período</CardTitle>
          <CardDescription>
            Quem fez pelo menos uma transação no período selecionado. Clique no cabeçalho
            para ordenar; clique de novo para inverter.
            {lista.truncado
              ? " Período muito grande: considera só as primeiras 20 mil transações."
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {clientes.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Sem transações no período.{" "}
              {podeEditar ? (
                <>
                  As vendas chegam pela Greenn em{" "}
                  <Link
                    href="/configuracoes/integracoes"
                    className="underline underline-offset-4"
                  >
                    Integrações
                  </Link>
                  .
                </>
              ) : (
                "As vendas chegam pela Greenn, conectada por um administrador."
              )}
            </p>
          ) : (
            <ListaClientes clientes={clientes} moeda={moeda} fuso={organizacao.fuso_horario} />
          )}
        </CardContent>
      </Card>

    </div>
  );
}
