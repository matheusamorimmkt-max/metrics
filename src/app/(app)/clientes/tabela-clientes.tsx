import { Fragment } from "react";
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
import { dataHora, type ClienteResumido } from "@/dominio/clientes-periodo";
import { cn } from "@/lib/utils";
import { BotaoFichaCliente } from "./ficha-cliente";

const CABECALHO = "bg-card sticky top-0 z-10";

/**
 * Top 10 de clientes em tabela com rolagem vertical e lateral. No modo "transacoes",
 * cada cliente abre as próprias transações (produtos, itens e valor) logo abaixo.
 */
export function TabelaClientes({
  titulo,
  descricao,
  clientes,
  moeda,
  fuso,
  modo = "resumo",
}: {
  titulo: string;
  descricao: string;
  clientes: ClienteResumido[];
  moeda: string;
  fuso: string;
  modo?: "resumo" | "transacoes";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent>
        {clientes.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sem transações no período.</p>
        ) : (
          <div className="quadro-rolagem">
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow>
                  <TableHead className={cn(CABECALHO, "w-10")}>#</TableHead>
                  <TableHead className={CABECALHO}>Nome</TableHead>
                  <TableHead className={CABECALHO}>Telefone</TableHead>
                  <TableHead className={CABECALHO}>E-mail</TableHead>
                  <TableHead className={CABECALHO}>Última compra</TableHead>
                  <TableHead className={CABECALHO}>
                    {modo === "transacoes" ? "Produtos (última compra)" : "Produto(s)"}
                  </TableHead>
                  <TableHead className={cn(CABECALHO, "text-right")}>Transações</TableHead>
                  <TableHead className={cn(CABECALHO, "text-right")}>Itens</TableHead>
                  <TableHead className={cn(CABECALHO, "text-right")}>Gasto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((c, i) => (
                  <Fragment key={c.id}>
                    <TableRow className={modo === "transacoes" ? "bg-muted/30" : undefined}>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {i + 1}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <BotaoFichaCliente id={c.id} nome={c.nome} fuso={fuso} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{c.telefone || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{c.email || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {dataHora(c.ultima_compra, fuso)}
                      </TableCell>
                      <TableCell className="max-w-72 truncate" title={c.produtos_ultima.join(", ")}>
                        {c.produtos_ultima.join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatarMetrica(c.total_transacoes, "inteiro")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatarMetrica(c.itens, "inteiro")}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatarMetrica(c.gasto, "moeda", moeda)}
                      </TableCell>
                    </TableRow>
                    {modo === "transacoes"
                      ? [...c.transacoes].reverse().map((t, j) => (
                          <TableRow key={t.id} className="text-muted-foreground text-xs">
                            <TableCell />
                            <TableCell className="whitespace-nowrap" colSpan={3}>
                              ↳ {c.transacoes.length - j}ª transação
                              {t.eh_recompra ? " · recompra" : ""}
                            </TableCell>
                            <TableCell className="whitespace-nowrap tabular-nums">
                              {dataHora(t.inicio, fuso)}
                            </TableCell>
                            <TableCell className="max-w-72 truncate" title={t.produtos.join(", ")}>
                              {t.produtos.join(", ") || "—"}
                            </TableCell>
                            <TableCell />
                            <TableCell className="text-right tabular-nums">
                              {formatarMetrica(t.itens, "inteiro")}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatarMetrica(t.valor, "moeda", moeda)}
                            </TableCell>
                          </TableRow>
                        ))
                      : null}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
