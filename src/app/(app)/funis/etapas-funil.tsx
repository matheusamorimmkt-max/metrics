import { ArrowRight } from "lucide-react";
import { formatarMetrica } from "@/dominio/metricas";
import type { Etapas } from "@/servidor/consultas/home";
import { cn } from "@/lib/utils";

type Etapa = { nome: string; valor: number; origem: "anuncios" | "gateway" };

/**
 * Etapas do funil em destaque: a taxa de conversão em relação à etapa anterior é o
 * número grande; a quantidade fica menor e mais clara. A primeira etapa mostra a
 * quantidade em destaque, porque não tem etapa anterior.
 */
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

  if (lista.every((e) => e.valor === 0)) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Sem movimento no período.
      </p>
    );
  }
  const primeira = lista[0].valor;
  const ultima = lista[lista.length - 1];
  const taxaTotal = primeira > 0 ? ultima.valor / primeira : null;

  return (
    <div className="space-y-4">
      <ol
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${lista.length}, minmax(0, 1fr))` }}
      >
        {lista.map((e, i) => {
          const anterior = i > 0 ? lista[i - 1].valor : null;
          const taxa =
            anterior !== null ? (anterior > 0 ? e.valor / anterior : null) : null;
          return (
            <li
              key={e.nome}
              className={cn(
                "relative rounded-lg border p-4",
                e.origem === "gateway" &&
                  "border-emerald-300 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30",
              )}
            >
              {i > 0 ? (
                <ArrowRight
                  className="text-muted-foreground absolute top-1/2 -left-3 hidden size-4 -translate-y-1/2 bg-background md:block"
                  aria-hidden
                />
              ) : null}
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {e.nome}
                {e.origem === "gateway" ? (
                  <span className="ml-1 normal-case tracking-normal">(gateway)</span>
                ) : null}
              </p>
              {i === 0 ? (
                <>
                  <p className="mt-1 text-3xl font-semibold tabular-nums">
                    {formatarMetrica(e.valor, "inteiro")}
                  </p>
                  <p className="text-muted-foreground text-xs">início do funil</p>
                </>
              ) : (
                <>
                  <p
                    className={cn(
                      "mt-1 text-3xl font-semibold tabular-nums",
                      e.origem === "gateway" && "text-emerald-700 dark:text-emerald-300",
                    )}
                  >
                    {formatarMetrica(taxa, "percentual")}
                  </p>
                  <p className="text-muted-foreground text-sm tabular-nums">
                    {formatarMetrica(e.valor, "inteiro")}{" "}
                    <span className="text-xs">da etapa anterior</span>
                  </p>
                </>
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-muted-foreground text-xs">
        Conversão total: {formatarMetrica(taxaTotal, "percentual")} de{" "}
        {lista[0].nome.toLowerCase()} até {ultima.nome.toLowerCase()}. Anúncios até o
        checkout vêm do Meta; compras vêm do gateway.
      </p>
    </div>
  );
}
