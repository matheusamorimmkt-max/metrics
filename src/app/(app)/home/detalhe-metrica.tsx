"use client";

import { Eye } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatarMetrica } from "@/dominio/metricas";
import type { DetalheMetrica, LinhaDetalhe } from "@/dominio/detalhe-metrica";
import { cn } from "@/lib/utils";

/** Ícone de olho no card: abre a pizza com as parcelas que compõem o número. */
export function BotaoDetalheMetrica({
  detalhe,
  moeda,
}: {
  detalhe: DetalheMetrica;
  moeda: string;
}) {
  const total = detalhe.fatias.reduce((s, f) => s + f.valor, 0);
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Ver composição de ${detalhe.titulo}`}
            title="Ver composição"
          />
        }
      >
        <Eye aria-hidden />
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{detalhe.titulo}</DialogTitle>
          <DialogDescription>{detalhe.descricao}</DialogDescription>
        </DialogHeader>
        {detalhe.linhas ? (
          detalhe.linhas.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Sem reembolsos no período.
            </p>
          ) : (
            <TabelaDetalhe
              linhas={detalhe.linhas}
              colunas={detalhe.colunas}
              moeda={moeda}
            />
          )
        ) : detalhe.fatias.length === 0 || total <= 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Sem movimento no período.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={detalhe.fatias}
                  dataKey="valor"
                  nameKey="nome"
                  innerRadius={48}
                  outerRadius={90}
                  paddingAngle={2}
                  isAnimationActive={false}
                  // Sem foco inicial nas fatias: o pop-up abria com a primeira já "selecionada".
                  tabIndex={-1}
                >
                  {detalhe.fatias.map((f) => (
                    <Cell key={f.nome} fill={f.cor} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) =>
                    `${formatarMetrica(Number(v), "moeda", moeda)} · ${formatarMetrica(Number(v) / total, "percentual")}`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="min-w-0 space-y-1.5 text-sm">
              {detalhe.fatias.map((f) => (
                <li key={f.nome} className="flex items-center gap-2">
                  <span
                    className="inline-block size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: f.cor }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate" title={f.nome}>
                    {f.nome}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatarMetrica(f.valor, "moeda", moeda)}
                  </span>
                  <span className="text-muted-foreground w-14 shrink-0 text-right tabular-nums">
                    {formatarMetrica(f.valor / total, "percentual")}
                  </span>
                </li>
              ))}
              <li className="flex items-center gap-2 border-t pt-1.5 font-medium">
                <span className="size-2.5 shrink-0" aria-hidden />
                <span className="flex-1">Total</span>
                <span className="tabular-nums">
                  {formatarMetrica(total, "moeda", moeda)}
                </span>
                <span className="w-14" />
              </li>
            </ul>
          </div>
        )}
        {detalhe.nota ? (
          <p className="text-muted-foreground text-xs">{detalhe.nota}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Tabela com sinal, valor e percentual; a linha de total ganha separador e negrito. */
function TabelaDetalhe({
  linhas,
  colunas,
  moeda,
}: {
  linhas: LinhaDetalhe[];
  colunas?: [string, string, string];
  moeda: string;
}) {
  return (
    <table className="w-full text-sm">
      {colunas ? (
        <thead>
          <tr className="text-muted-foreground text-xs">
            <th className="pb-1 text-left font-medium">{colunas[0]}</th>
            <th className="pb-1 text-right font-medium">{colunas[1]}</th>
            <th className="w-28 pb-1 text-right font-medium">{colunas[2]}</th>
          </tr>
        </thead>
      ) : null}
      <tbody>
        {linhas.map((l) => (
          <tr
            key={l.nome}
            className={cn(
              l.total && "border-t-2 font-semibold",
              !l.total && "border-b border-dashed",
            )}
          >
            <td className="py-1.5 pr-2">
              {l.nome}
              {l.detalhe ? (
                <span className="text-muted-foreground ml-2 text-xs font-normal">
                  {l.detalhe}
                </span>
              ) : null}
            </td>
            <td
              className={cn(
                "py-1.5 text-right whitespace-nowrap tabular-nums",
                l.sinal === "-" && "text-red-600",
                l.sinal === "+" && "text-emerald-600",
              )}
            >
              {l.sinal}
              {formatarMetrica(l.valor, "moeda", moeda)}
            </td>
            <td className="text-muted-foreground py-1.5 text-right tabular-nums">
              {formatarMetrica(l.pct, "percentual")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
