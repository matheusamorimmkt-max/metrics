import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardAction,
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
  listarClientesDoPeriodo,
  obterResumoClientes,
} from "@/servidor/consultas/clientes";
import {
  CARDS_CLIENTES,
  montarDetalhesClientes,
  resumirCliente,
  topClientes,
} from "@/dominio/clientes-periodo";
import { BotaoDetalheMetrica } from "../home/detalhe-metrica";
import { TabelaClientes } from "./tabela-clientes";
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
  const [r, lista] = await Promise.all([
    obterResumoClientes(organizacao.id, periodo, organizacao.fuso_horario),
    listarClientesDoPeriodo(organizacao.id, periodo, organizacao.fuso_horario),
  ]);
  const moeda = organizacao.moeda;
  const clientes = lista.clientes.map(resumirCliente);
  const detalhes = montarDetalhesClientes(clientes, {
    moeda,
    fuso: organizacao.fuso_horario,
  });
  const valores: Record<(typeof CARDS_CLIENTES)[number]["chave"], string> = {
    clientes_unicos: formatarMetrica(r.clientes_unicos, "inteiro"),
    clientes_novos: formatarMetrica(r.clientes_novos, "inteiro"),
    recorrentes: formatarMetrica(r.recorrentes, "inteiro"),
    transacoes: formatarMetrica(r.transacoes, "inteiro"),
    taxa_recompra: formatarMetrica(r.taxa_recompra, "percentual"),
    tempo_recompra: dias(r.dias_ate_recompra_mediana),
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground">
          Clientes únicos, novos e recorrentes, transações, taxa de recompra e para onde
          os clientes de cada front-end ascendem. O olho de cada card mostra quem são.
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
        {CARDS_CLIENTES.map((card) => (
          <Card key={card.chave}>
            <CardHeader>
              <CardDescription>{card.nome}</CardDescription>
              <CardAction>
                <BotaoDetalheMetrica detalhe={detalhes[card.chave]} moeda={moeda} />
              </CardAction>
              <CardTitle className="text-xl tabular-nums">{valores[card.chave]}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">{card.descricao}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <TabelaClientes
        titulo="Clientes mais recentes"
        descricao="Os 10 últimos a comprar no período."
        clientes={topClientes(clientes, "recentes")}
        moeda={moeda}
        fuso={organizacao.fuso_horario}
      />
      <TabelaClientes
        titulo="Clientes mais frequentes"
        descricao="Os 10 com mais transações no período, com cada transação aberta."
        clientes={topClientes(clientes, "frequentes")}
        moeda={moeda}
        fuso={organizacao.fuso_horario}
        modo="transacoes"
      />
      <TabelaClientes
        titulo="Clientes de maior valor"
        descricao="Os 10 que mais gastaram no período, só transações pagas."
        clientes={topClientes(clientes, "maior_valor")}
        moeda={moeda}
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
