import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarMetrica } from "@/dominio/metricas";
import type { RecompraPorFunil } from "@/servidor/consultas/clientes";

function dias(valor: number | null): string {
  if (valor === null) return "—";
  if (valor < 1) return "mesmo dia";
  return `${Math.round(valor)} ${Math.round(valor) === 1 ? "dia" : "dias"}`;
}

/** Recompra por funil de entrada (antes na aba Clientes; hoje no fim da Home). */
export function TabelaRecompraEntrada({
  linhas,
  moeda,
}: {
  linhas: RecompraPorFunil[];
  moeda: string;
}) {
  if (linhas.length === 0) {
    return <p className="text-muted-foreground text-sm">Sem transações no período.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Funil de entrada</TableHead>
          <TableHead className="text-right">Clientes</TableHead>
          <TableHead className="text-right">Recompraram</TableHead>
          <TableHead className="text-right">Taxa</TableHead>
          <TableHead className="text-right">Tempo até a recompra</TableHead>
          <TableHead className="text-right">Receita adicional</TableHead>
          <TableHead>Destino da ascensão</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {linhas.map((f) => (
          <TableRow key={f.funil_entrada_id ?? "sem-funil"}>
            <TableCell className="font-medium">{f.funil_entrada}</TableCell>
            <TableCell className="text-right tabular-nums">{f.clientes}</TableCell>
            <TableCell className="text-right tabular-nums">{f.recompraram}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatarMetrica(f.taxa, "percentual")}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {dias(f.dias_ate_recompra_mediana)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatarMetrica(f.receita_adicional, "moeda", moeda)}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {f.destinos.length
                ? f.destinos.map((d) => `${d.funil} (${d.quantidade})`).join(" · ")
                : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
