import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarMetrica } from "@/dominio/metricas";
import { CORES_GRUPOS, type GrupoPagamento } from "@/dominio/pagamentos";

/** Tabela de grupos (forma de pagamento ou país) com total no rodapé. */
export function TabelaGrupos({
  grupos,
  moeda,
  rotulo,
}: {
  grupos: GrupoPagamento[];
  moeda: string;
  rotulo: string;
}) {
  if (grupos.length === 0) return null;
  const total = grupos.reduce(
    (s, g) => ({
      transacoes: s.transacoes + g.transacoes,
      itens: s.itens + g.itens,
      faturamento: s.faturamento + g.faturamento,
    }),
    { transacoes: 0, itens: 0, faturamento: 0 },
  );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{rotulo}</TableHead>
          <TableHead className="text-right">Transações</TableHead>
          <TableHead className="text-right">Itens</TableHead>
          <TableHead className="text-right">Faturamento</TableHead>
          <TableHead className="text-right">Ticket médio</TableHead>
          <TableHead className="text-right">% do faturamento</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {grupos.map((g, i) => (
          <TableRow key={g.chave}>
            <TableCell className="font-medium">
              <span className="flex items-center gap-2">
                <span
                  className="inline-block size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: CORES_GRUPOS[i % CORES_GRUPOS.length] }}
                  aria-hidden
                />
                {g.nome}
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">{g.transacoes}</TableCell>
            <TableCell className="text-right tabular-nums">{g.itens}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatarMetrica(g.faturamento, "moeda", moeda)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatarMetrica(g.ticket_medio, "moeda", moeda)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatarMetrica(g.participacao, "percentual")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Total</TableCell>
          <TableCell className="text-right tabular-nums">{total.transacoes}</TableCell>
          <TableCell className="text-right tabular-nums">{total.itens}</TableCell>
          <TableCell className="text-right tabular-nums">
            {formatarMetrica(total.faturamento, "moeda", moeda)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {formatarMetrica(
              total.transacoes > 0 ? total.faturamento / total.transacoes : 0,
              "moeda",
              moeda,
            )}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {formatarMetrica(total.faturamento > 0 ? 1 : 0, "percentual")}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
