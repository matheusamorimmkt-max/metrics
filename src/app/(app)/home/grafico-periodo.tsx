"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { formatarMetrica } from "@/dominio/metricas";
import { diaCurto } from "@/dominio/periodo";
import { serieDiaria, serieMensal } from "@/dominio/serie";
import type { PontoSerie } from "@/servidor/consultas/home";

const CORES = { faturamento: "#99d6ce", lucro: "#16a34a", prejuizo: "#dc2626" };

/**
 * Faturamento e lucro em barras sobrepostas (lucro na frente, mais estreito), por dia
 * ou por mês. Dois eixos X iguais fazem as barras ocuparem a mesma posição.
 */
export function GraficoPeriodo({ serie, moeda }: { serie: PontoSerie[]; moeda: string }) {
  const [modo, setModo] = useState<"dia" | "mes">("dia");
  const dados = modo === "dia" ? serieDiaria(serie, diaCurto) : serieMensal(serie);
  const temMovimento = serie.some((p) => p.faturamento_bruto || p.lucro);
  const m = (v: number) => formatarMetrica(v, "moeda", moeda);

  return (
    <div className="space-y-3">
      <div className="flex gap-1" role="group" aria-label="Agrupar por">
        <Button
          size="sm"
          variant={modo === "dia" ? "default" : "ghost"}
          onClick={() => setModo("dia")}
        >
          Dia a dia
        </Button>
        <Button
          size="sm"
          variant={modo === "mes" ? "default" : "ghost"}
          onClick={() => setModo("mes")}
        >
          Mês a mês
        </Button>
      </div>
      {!temMovimento ? (
        <p className="text-muted-foreground flex h-64 items-center justify-center text-sm">
          Sem movimento no período.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={288}>
          <BarChart data={dados} margin={{ left: 8, right: 16, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
            <XAxis dataKey="rotulo" xAxisId="faturamento" fontSize={11} minTickGap={16} />
            <XAxis dataKey="rotulo" xAxisId="lucro" hide />
            <YAxis tickFormatter={(v) => m(Number(v))} fontSize={11} width={88} />
            <Tooltip
              formatter={(v, nome) => [m(Number(v)), nome === "lucro" ? "Lucro" : "Faturamento"]}
              cursor={{ fill: "currentColor", fillOpacity: 0.04 }}
            />
            <Bar
              xAxisId="faturamento"
              dataKey="faturamento_bruto"
              name="faturamento_bruto"
              fill={CORES.faturamento}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
            <Bar
              xAxisId="lucro"
              dataKey="lucro"
              name="lucro"
              barSize={modo === "dia" ? 10 : 28}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            >
              {dados.map((d) => (
                <Cell key={d.chave} fill={d.lucro < 0 ? CORES.prejuizo : CORES.lucro} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
      <div className="text-muted-foreground flex flex-wrap gap-4 text-xs" aria-label="Legenda">
        {[
          ["Faturamento", CORES.faturamento],
          ["Lucro", CORES.lucro],
          ["Prejuízo", CORES.prejuizo],
        ].map(([nome, cor]) => (
          <span key={nome} className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-sm" style={{ background: cor }} />
            {nome}
          </span>
        ))}
      </div>
    </div>
  );
}
