"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatarMetrica } from "@/dominio/metricas";
import { diaCurto } from "@/dominio/periodo";
import type { Composicao, PontoSerie } from "@/servidor/consultas/home";

const CORES = {
  investimento: "#2563eb",
  faturamento: "#0d9488",
  lucro: "#16a34a",
  prejuizo: "#dc2626",
  parceiros: "#9333ea",
  taxas: "#d97706",
  impostos: "#64748b",
  reembolsos: "#e11d48",
};

function moeda(v: number, moedaOrg: string) {
  return formatarMetrica(v, "moeda", moedaOrg);
}

/** Pizza "Para onde foi o dinheiro". Em prejuízo, vira barras com o prejuízo em destaque. */
export function GraficoComposicao({
  composicao,
  moeda: moedaOrg,
}: {
  composicao: Composicao;
  moeda: string;
}) {
  const fatias = [
    { nome: "Investimento", valor: composicao.investimento, cor: CORES.investimento },
    { nome: "Parceiros", valor: composicao.parceiros, cor: CORES.parceiros },
    { nome: "Taxas do gateway", valor: composicao.taxas_gateway, cor: CORES.taxas },
    { nome: "Impostos", valor: composicao.impostos, cor: CORES.impostos },
    { nome: "Reembolsos", valor: composicao.reembolsos, cor: CORES.reembolsos },
    { nome: "Lucro", valor: composicao.lucro, cor: CORES.lucro },
  ];
  const total = fatias.reduce((s, f) => s + Math.max(f.valor, 0), 0);

  if (total === 0) {
    return (
      <p className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        Sem movimento no período.
      </p>
    );
  }

  if (composicao.lucro < 0) {
    const barras = fatias.map((f) => ({
      nome: f.nome === "Lucro" ? "Prejuízo" : f.nome,
      valor: Math.abs(f.valor),
      cor: f.nome === "Lucro" ? CORES.prejuizo : f.cor,
    }));
    return (
      <ResponsiveContainer width="100%" height={256}>
        <BarChart data={barras} layout="vertical" margin={{ left: 8, right: 16 }}>
          <XAxis
            type="number"
            tickFormatter={(v) => moeda(Number(v), moedaOrg)}
            fontSize={11}
          />
          <YAxis type="category" dataKey="nome" width={110} fontSize={11} />
          <Tooltip formatter={(v) => moeda(Number(v), moedaOrg)} />
          <Bar dataKey="valor">
            {barras.map((b) => (
              <Cell key={b.nome} fill={b.cor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const positivas = fatias.filter((f) => f.valor > 0);
  return (
    <ResponsiveContainer width="100%" height={256}>
      <PieChart>
        <Pie
          data={positivas}
          dataKey="valor"
          nameKey="nome"
          innerRadius={55}
          outerRadius={95}
          paddingAngle={2}
        >
          {positivas.map((f) => (
            <Cell key={f.nome} fill={f.cor} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => moeda(Number(v), moedaOrg)} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Linha por dia: investimento × faturamento × lucro. */
export function GraficoSerie({
  serie,
  moeda: moedaOrg,
}: {
  serie: PontoSerie[];
  moeda: string;
}) {
  const dados = serie.map((p) => ({ ...p, dia: diaCurto(p.data) }));
  const temMovimento = serie.some(
    (p) => p.investimento || p.faturamento_bruto || p.lucro,
  );
  if (!temMovimento) {
    return (
      <p className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        Sem movimento no período.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={256}>
      <LineChart data={dados} margin={{ left: 8, right: 16, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
        <XAxis dataKey="dia" fontSize={11} minTickGap={24} />
        <YAxis
          tickFormatter={(v) => moeda(Number(v), moedaOrg)}
          fontSize={11}
          width={88}
        />
        <Tooltip formatter={(v) => moeda(Number(v), moedaOrg)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="investimento"
          name="Investimento"
          stroke={CORES.investimento}
          dot={false}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="faturamento_bruto"
          name="Faturamento"
          stroke={CORES.faturamento}
          dot={false}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="lucro"
          name="Lucro"
          stroke={CORES.lucro}
          dot={false}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
