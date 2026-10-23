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
import { obterResumoVendas, type Agrupado } from "@/servidor/consultas/vendas";
import { SeletorHome } from "../home/seletor";

export const metadata: Metadata = { title: "Vendas" };

export default async function PaginaVendas({ searchParams }: PageProps<"/vendas">) {
  const params = await searchParams;
  const { organizacao, podeEditar } = await obterContexto();
  const periodo = await periodoDaUrl(organizacao, params);
  const r = await obterResumoVendas(organizacao.id, periodo, organizacao.fuso_horario);
  const moeda = organizacao.moeda;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vendas</h1>
        <p className="text-muted-foreground">
          Vendas por oferta e produto, reembolsos e chargebacks, meios de pagamento,
          parcelamento e valores pagos a parceiros.
        </p>
      </div>

      <SeletorHome
        periodo={periodo}
        filtroAtual=""
        categorias={[]}
        funis={[]}
        base="/vendas"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Resumo nome="Vendas" valor={formatarMetrica(r.total_vendas, "inteiro")} />
        <Resumo
          nome="Faturamento bruto"
          valor={formatarMetrica(r.faturamento_bruto, "moeda", moeda)}
        />
        <Resumo
          nome="Reembolsos"
          valor={formatarMetrica(r.reembolsos.valor, "moeda", moeda)}
          detalhe={`${r.reembolsos.quantidade} no período`}
        />
        <Resumo
          nome="Chargebacks"
          valor={formatarMetrica(r.chargebacks.valor, "moeda", moeda)}
          detalhe={`${r.chargebacks.quantidade} no período`}
        />
        <Resumo
          nome="Taxas e parceiros"
          valor={formatarMetrica(r.taxas_gateway + r.parceiros, "moeda", moeda)}
          detalhe={`taxas ${formatarMetrica(r.taxas_gateway, "moeda", moeda)} · parceiros ${formatarMetrica(r.parceiros, "moeda", moeda)}`}
        />
      </div>

      {r.total_vendas === 0 ? (
        <p className="text-muted-foreground text-sm">
          Sem vendas no período.{" "}
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
        <div className="grid gap-4 lg:grid-cols-2">
          <Tabela
            titulo="Por oferta"
            linhas={r.por_oferta}
            moeda={moeda}
            total={r.faturamento_bruto}
          />
          <Tabela
            titulo="Por produto"
            linhas={r.por_produto}
            moeda={moeda}
            total={r.faturamento_bruto}
          />
          <Tabela
            titulo="Meios de pagamento"
            linhas={r.por_meio_pagamento}
            moeda={moeda}
            total={r.faturamento_bruto}
          />
          <Tabela
            titulo="Parcelamento"
            linhas={r.por_parcelas}
            moeda={moeda}
            total={r.faturamento_bruto}
          />
          <Tabela
            titulo="Parceiros"
            linhas={r.por_parceiro}
            moeda={moeda}
            total={r.parceiros}
            rotuloValor="Comissão"
          />
        </div>
      )}
      {r.truncado ? (
        <p className="text-muted-foreground text-xs">
          Período muito grande: considera só as primeiras 20 mil vendas. Reduza o período.
        </p>
      ) : null}
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

function Tabela({
  titulo,
  linhas,
  moeda,
  total,
  rotuloValor = "Faturamento",
}: {
  titulo: string;
  linhas: Agrupado[];
  moeda: string;
  total: number;
  rotuloValor?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {linhas.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nada no período.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{titulo.replace("Por ", "")}</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">{rotuloValor}</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.slice(0, 50).map((l) => (
                <TableRow key={l.chave}>
                  <TableCell>
                    <div className="font-medium">{l.nome}</div>
                    {l.detalhe ? (
                      <div className="text-muted-foreground text-xs">{l.detalhe}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{l.vendas}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatarMetrica(l.valor, "moeda", moeda)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatarMetrica(total > 0 ? l.valor / total : null, "percentual")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
