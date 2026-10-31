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
import type {
  DetalheMetrica,
  TabelaDetalhe as DadosTabela,
} from "@/dominio/detalhe-metrica";
import { cn } from "@/lib/utils";
import { BotaoFichaCliente } from "../clientes/ficha-cliente";

/** Ícone de olho no card: abre a pizza com as parcelas que compõem o número. */
export function BotaoDetalheMetrica({
  detalhe,
  moeda,
  fuso,
}: {
  detalhe: DetalheMetrica;
  moeda: string;
  /** Fuso da organização, para as fichas de cliente abertas a partir da lista. */
  fuso?: string;
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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{detalhe.titulo}</DialogTitle>
          <DialogDescription>{detalhe.descricao}</DialogDescription>
        </DialogHeader>
        {detalhe.tabela ? (
          detalhe.tabela.linhas.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {detalhe.tabela.vazio}
            </p>
          ) : (
            <TabelaDetalhe dados={detalhe.tabela} fuso={fuso} />
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
        {detalhe.tabelas_extras?.map((extra) => (
          <div key={extra.titulo} className="space-y-2">
            <h3 className="text-sm font-medium">{extra.titulo}</h3>
            {extra.tabela.linhas.length === 0 ? (
              <p className="text-muted-foreground text-sm">{extra.tabela.vazio}</p>
            ) : (
              <TabelaDetalhe dados={extra.tabela} fuso={fuso} />
            )}
          </div>
        ))}
        {detalhe.nota ? (
          <p className="text-muted-foreground text-xs">{detalhe.nota}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Tabela genérica: primeira coluna à esquerda, demais à direita; linha de total em negrito. */
function TabelaDetalhe({ dados, fuso }: { dados: DadosTabela; fuso?: string }) {
  return (
    <div className="max-h-[60vh] overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-background sticky top-0">
          <tr className="text-muted-foreground text-xs">
            {dados.cabecalho.map((c, i) => (
              <th
                key={i}
                className={cn("pb-1 font-medium", i === 0 ? "text-left" : "text-right")}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.linhas.map((l, li) => (
            <tr
              key={li}
              className={cn(
                l.total
                  ? "border-t-2 font-semibold"
                  : l.grupo
                    ? "bg-muted/50 font-semibold"
                    : "border-b border-dashed",
              )}
            >
              {l.celulas.map((c, ci) => (
                <td
                  key={ci}
                  className={cn(
                    "py-1.5 align-top whitespace-nowrap",
                    ci === 0
                      ? "max-w-72 pr-3 break-words whitespace-normal"
                      : "pl-3 text-right tabular-nums",
                    // Coluna de texto no meio (produto, por exemplo): quebra linha em vez de vazar.
                    c.alinhar === "left" && "max-w-64 text-left break-words whitespace-normal",
                    c.alinhar === "right" && "text-right",
                    c.cor === "negativo" && "text-red-600",
                    c.cor === "positivo" && "text-emerald-600",
                    c.cor === "discreto" && "text-muted-foreground",
                  )}
                >
                  {c.cliente_id ? (
                    <BotaoFichaCliente
                      id={c.cliente_id}
                      nome={c.texto}
                      fuso={fuso ?? "America/Sao_Paulo"}
                    />
                  ) : (
                    c.texto
                  )}
                  {c.detalhe ? (
                    <span className="text-muted-foreground block text-xs font-normal">
                      {c.detalhe}
                    </span>
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
