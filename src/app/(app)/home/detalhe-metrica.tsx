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
import type { DetalheMetrica } from "@/dominio/detalhe-metrica";

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
        {detalhe.fatias.length === 0 || total <= 0 ? (
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
