import { formatarMetrica } from "@/dominio/metricas";
import type { Etapas } from "@/servidor/consultas/home";

type Etapa = { nome: string; valor: number; origem: "anuncios" | "gateway" };

/** Funil visual: cada etapa com o valor e a taxa de conversão em relação à anterior. */
export function EtapasFunil({ etapas, tipo }: { etapas: Etapas; tipo: string }) {
  const lista: Etapa[] =
    tipo === "isca"
      ? [
          { nome: "Impressões", valor: etapas.impressoes, origem: "anuncios" },
          { nome: "Cliques no link", valor: etapas.cliques_link, origem: "anuncios" },
          {
            nome: "Visualizações de página",
            valor: etapas.visualizacoes_pagina,
            origem: "anuncios",
          },
          { nome: "Leads", valor: etapas.leads, origem: "anuncios" },
        ]
      : [
          { nome: "Impressões", valor: etapas.impressoes, origem: "anuncios" },
          { nome: "Cliques no link", valor: etapas.cliques_link, origem: "anuncios" },
          {
            nome: "Visualizações de página",
            valor: etapas.visualizacoes_pagina,
            origem: "anuncios",
          },
          {
            nome: "Inícios de checkout",
            valor: etapas.inicios_checkout,
            origem: "anuncios",
          },
          { nome: "Compras", valor: etapas.vendas, origem: "gateway" },
        ];

  const maior = Math.max(...lista.map((e) => e.valor), 1);
  if (lista.every((e) => e.valor === 0)) {
    return <p className="text-muted-foreground text-sm">Sem movimento no período.</p>;
  }

  return (
    <ol className="space-y-2">
      {lista.map((e, i) => {
        const anterior = i > 0 ? lista[i - 1].valor : null;
        const taxa = anterior && anterior > 0 ? e.valor / anterior : null;
        const largura = Math.max(4, Math.round((e.valor / maior) * 100));
        return (
          <li key={e.nome} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span>
                {e.nome}
                {e.origem === "gateway" ? (
                  <span className="text-muted-foreground ml-1 text-xs">(gateway)</span>
                ) : null}
              </span>
              <span className="tabular-nums">
                {formatarMetrica(e.valor, "inteiro")}
                {taxa !== null ? (
                  <span className="text-muted-foreground ml-2 text-xs">
                    {formatarMetrica(taxa, "percentual")} da anterior
                  </span>
                ) : null}
              </span>
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className={
                  e.origem === "gateway" ? "h-full bg-emerald-500" : "h-full bg-blue-500"
                }
                style={{ width: `${largura}%` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
