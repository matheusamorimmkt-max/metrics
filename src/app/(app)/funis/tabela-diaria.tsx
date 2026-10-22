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
import type { PontoSerie } from "@/servidor/consultas/home";
import { cn } from "@/lib/utils";

/**
 * Dia a dia em tabela: do dia mais recente ao mais antigo, com investimento,
 * faturamento, lucro (vermelho quando negativo), ROAS e ROI, e a soma no rodapé.
 * Mais de 30 dias rola dentro do quadro.
 */
export function TabelaDiaria({ serie, moeda }: { serie: PontoSerie[]; moeda: string }) {
  const linhas = [...serie].reverse();
  const totalInvestimento = serie.reduce((s, p) => s + p.investimento, 0);
  const totalFaturamento = serie.reduce((s, p) => s + p.faturamento_bruto, 0);
  const totalLucro = serie.reduce((s, p) => s + p.lucro, 0);
  // ROAS e ROI do total são recalculados sobre as somas, não somados dia a dia.
  const total = {
    roas: totalInvestimento > 0 ? totalFaturamento / totalInvestimento : null,
    roi: totalInvestimento > 0 ? totalLucro / totalInvestimento : null,
  };
  const data = (iso: string) =>
    `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

  return (
    <div
      className={cn(
        "rounded-md border",
        linhas.length > 30 && "max-h-[60vh] overflow-auto",
      )}
    >
      <Table>
        <TableHeader className="bg-card sticky top-0 z-10">
          <TableRow>
            <TableHead>Dia</TableHead>
            <TableHead className="text-right">Investimento</TableHead>
            <TableHead className="text-right">Faturamento</TableHead>
            <TableHead className="text-right">Lucro</TableHead>
            <TableHead className="text-right">ROAS</TableHead>
            <TableHead className="text-right">ROI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((p) => (
            <TableRow key={p.data}>
              <TableCell className="tabular-nums">{data(p.data)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatarMetrica(p.investimento, "moeda", moeda)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatarMetrica(p.faturamento_bruto, "moeda", moeda)}
              </TableCell>
              <TableCell
                className={cn("text-right tabular-nums", p.lucro < 0 && "text-red-600")}
              >
                {formatarMetrica(p.lucro, "moeda", moeda)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatarMetrica(p.roas, "multiplicador")}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatarMetrica(p.roi, "multiplicador")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter className="bg-card sticky bottom-0 z-10">
          <TableRow className="font-semibold">
            <TableCell>
              Total ({linhas.length} {linhas.length === 1 ? "dia" : "dias"})
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatarMetrica(totalInvestimento, "moeda", moeda)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatarMetrica(totalFaturamento, "moeda", moeda)}
            </TableCell>
            <TableCell
              className={cn("text-right tabular-nums", totalLucro < 0 && "text-red-600")}
            >
              {formatarMetrica(totalLucro, "moeda", moeda)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatarMetrica(total.roas, "multiplicador")}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatarMetrica(total.roi, "multiplicador")}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
