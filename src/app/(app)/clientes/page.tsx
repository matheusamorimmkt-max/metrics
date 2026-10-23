import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarMetrica } from "@/dominio/metricas";
import { obterContexto } from "@/servidor/sessao";
import { periodoDaUrl } from "@/servidor/consultas/periodo";
import {
  obterDestaquesClientes,
  obterResumoClientes,
} from "@/servidor/consultas/clientes";
import { DestaquesClientes } from "./destaques";
import { SeletorHome } from "../home/seletor";

export const metadata: Metadata = { title: "Clientes" };

function dias(valor: number | null): string {
  if (valor === null) return "—";
  if (valor < 1) return "mesmo dia";
  return `${Math.round(valor)} ${Math.round(valor) === 1 ? "dia" : "dias"}`;
}

export default async function PaginaClientes({ searchParams }: PageProps<"/clientes">) {
  const params = await searchParams;
  const { organizacao, podeEditar } = await obterContexto();
  const periodo = await periodoDaUrl(organizacao, params);
  const [r, destaques] = await Promise.all([
    obterResumoClientes(organizacao.id, periodo, organizacao.fuso_horario),
    obterDestaquesClientes(organizacao.id, periodo, organizacao.fuso_horario),
  ]);
  const moeda = organizacao.moeda;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground">
          Clientes únicos, transações, ticket médio, taxa de recompra e para onde os
          clientes de cada front-end ascendem.
        </p>
      </div>

      <SeletorHome
        periodo={periodo}
        filtroAtual=""
        categorias={[]}
        funis={[]}
        base="/clientes"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Resumo
          nome="Clientes únicos"
          valor={formatarMetrica(r.clientes_unicos, "inteiro")}
        />
        <Resumo
          nome="Clientes novos"
          valor={formatarMetrica(r.clientes_novos, "inteiro")}
        />
        <Resumo nome="Transações" valor={formatarMetrica(r.transacoes, "inteiro")} />
        <Resumo
          nome="Ticket médio"
          valor={formatarMetrica(r.ticket_medio, "moeda", moeda)}
        />
        <Resumo
          nome="Taxa de recompra"
          valor={formatarMetrica(r.taxa_recompra, "percentual")}
          detalhe={`${r.recorrentes} recorrentes`}
        />
        <Resumo
          nome="Tempo até a recompra"
          valor={dias(r.dias_ate_recompra_mediana)}
          detalhe="mediana"
        />
      </div>

      <DestaquesClientes
        titulo="Clientes mais recentes"
        descricao="Os últimos a comprar no período."
        clientes={destaques.recentes}
        moeda={moeda}
        destaque="ultima_compra"
        fuso={organizacao.fuso_horario}
      />
      <DestaquesClientes
        titulo="Clientes mais frequentes"
        descricao="Os que mais registraram transações no período."
        clientes={destaques.frequentes}
        moeda={moeda}
        destaque="transacoes"
        fuso={organizacao.fuso_horario}
      />
      <DestaquesClientes
        titulo="Clientes de maior valor"
        descricao="Os que mais gastaram no período, só transações pagas."
        clientes={destaques.maior_valor}
        moeda={moeda}
        destaque="gasto"
        fuso={organizacao.fuso_horario}
      />

      <Card>
        <CardHeader>
          <CardTitle>Recompra por funil de entrada</CardTitle>
          <CardDescription>
            Clientes que entraram por cada funil, quantos compraram de novo e para onde
            foram.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {r.por_funil_entrada.length === 0 ? (
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funil de entrada</TableHead>
                  <TableHead className="text-right">Clientes</TableHead>
                  <TableHead className="text-right">Recompraram</TableHead>
                  <TableHead className="text-right">Taxa</TableHead>
                  <TableHead className="text-right">Tempo até a recompra</TableHead>
                  <TableHead>Destino da ascensão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.por_funil_entrada.map((f) => (
                  <TableRow key={f.funil_entrada}>
                    <TableCell className="font-medium">{f.funil_entrada}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {f.clientes}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {f.recompraram}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatarMetrica(f.taxa, "percentual")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {dias(f.dias_ate_recompra_mediana)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {f.destinos.length
                        ? f.destinos
                            .map((d) => `${d.funil} (${d.quantidade})`)
                            .join(" · ")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {r.truncado ? (
            <p className="text-muted-foreground mt-2 text-xs">
              Período muito grande: considera só as primeiras 20 mil transações.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Resumo({
  nome,
  valor,
  detalhe,
}: {
  nome: string;
  valor: string;
  detalhe?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{nome}</CardDescription>
        <CardTitle className="text-xl tabular-nums">{valor}</CardTitle>
      </CardHeader>
      {detalhe ? (
        <CardContent>
          <p className="text-muted-foreground text-xs">{detalhe}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}
