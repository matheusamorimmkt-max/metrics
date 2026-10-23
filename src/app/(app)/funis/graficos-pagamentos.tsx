"use client";

import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatarMetrica } from "@/dominio/metricas";
import { CORES_GRUPOS, type GrupoPagamento } from "@/dominio/pagamentos";

function corDe(indice: number) {
  return CORES_GRUPOS[indice % CORES_GRUPOS.length];
}

/** Pizza das formas de pagamento por faturamento. */
export function PizzaPagamentos({
  grupos,
  moeda,
}: {
  grupos: GrupoPagamento[];
  moeda: string;
}) {
  const fatias = grupos
    .map((g, i) => ({ nome: g.nome, valor: g.faturamento, cor: corDe(i) }))
    .filter((f) => f.valor > 0);
  if (fatias.length === 0) {
    return (
      <p className="text-muted-foreground flex h-56 items-center justify-center text-sm">
        Sem vendas no período.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={224}>
      <PieChart>
        <Pie
          data={fatias}
          dataKey="valor"
          nameKey="nome"
          innerRadius={50}
          outerRadius={85}
          paddingAngle={2}
          tabIndex={-1}
        >
          {fatias.map((f) => (
            <Cell key={f.nome} fill={f.cor} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => formatarMetrica(Number(v), "moeda", moeda)} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Barras horizontais dos países com mais faturamento. */
export function BarrasPaises({
  grupos,
  moeda,
  maximo = 8,
}: {
  grupos: GrupoPagamento[];
  moeda: string;
  maximo?: number;
}) {
  const barras = grupos.slice(0, maximo).map((g, i) => ({
    nome: g.nome,
    valor: g.faturamento,
    itens: g.itens,
    cor: corDe(i),
  }));
  if (barras.length === 0) {
    return (
      <p className="text-muted-foreground flex h-56 items-center justify-center text-sm">
        Sem vendas no período.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, 40 * barras.length + 40)}>
      <BarChart data={barras} layout="vertical" margin={{ left: 8, right: 24 }}>
        <XAxis
          type="number"
          tickFormatter={(v) => formatarMetrica(Number(v), "moeda", moeda)}
          fontSize={11}
        />
        <YAxis type="category" dataKey="nome" width={150} fontSize={11} />
        <Tooltip
          formatter={(v, _n, item) => [
            `${formatarMetrica(Number(v), "moeda", moeda)} · ${item.payload.itens} itens`,
            "Faturamento",
          ]}
        />
        <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
          {barras.map((b) => (
            <Cell key={b.nome} fill={b.cor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
