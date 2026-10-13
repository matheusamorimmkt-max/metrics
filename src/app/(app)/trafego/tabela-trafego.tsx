"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarMetrica } from "@/dominio/metricas";
import { metricaTrafego } from "@/dominio/metricas-trafego";
import type { LinhaTrafego } from "@/servidor/consultas/trafego";
import { cn } from "@/lib/utils";
import { CaixaSelecao } from "./selecao";
import { useColunasTrafego } from "./colunas";
import { PersonalizarColunas } from "./personalizar-colunas";

type Ordenacao = { chave: string; direcao: "asc" | "desc" };

/**
 * Tabela do relatório de tráfego: colunas escolhidas pelo usuário (botão Métricas),
 * cabeçalhos clicáveis para ordenar, seleção em cascata nas campanhas e conjuntos.
 */
export function TabelaTrafego({
  linhas,
  nomePai,
  moeda,
  rotuloNivel,
  selecao,
}: {
  linhas: LinhaTrafego[];
  nomePai: Record<string, string>;
  moeda: string;
  rotuloNivel: string;
  selecao?: { parametro: "campanhas" | "conjuntos"; selecionados: string[] };
}) {
  const [colunas, definirColunas] = useColunasTrafego();
  const [ordem, setOrdem] = useState<Ordenacao>({ chave: "gasto", direcao: "desc" });

  const metricas = colunas
    .map((c) => metricaTrafego(c))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));
  const metricaOrdem = metricaTrafego(ordem.chave);
  const ordenadas = [...linhas].sort((a, b) => {
    if (ordem.chave === "nome") {
      const r = a.nome.localeCompare(b.nome, "pt-BR");
      return ordem.direcao === "asc" ? r : -r;
    }
    const va = metricaOrdem?.calcular(a) ?? null;
    const vb = metricaOrdem?.calcular(b) ?? null;
    // Sem valor ("—") vai sempre para o fim.
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    return ordem.direcao === "asc" ? va - vb : vb - va;
  });

  function alternarOrdem(chave: string) {
    setOrdem((atual) =>
      atual.chave === chave
        ? { chave, direcao: atual.direcao === "desc" ? "asc" : "desc" }
        : { chave, direcao: chave === "nome" ? "asc" : "desc" },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          Clique no cabeçalho de uma coluna para ordenar.
        </p>
        <PersonalizarColunas colunas={colunas} aoSalvar={definirColunas} />
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {selecao ? <TableHead className="w-8" /> : null}
              <Cabecalho
                rotulo={rotuloNivel}
                chave="nome"
                ordem={ordem}
                aoClicar={alternarOrdem}
                alinhar="left"
              />
              {metricas.map((m) => (
                <Cabecalho
                  key={m.chave}
                  rotulo={m.nome}
                  titulo={m.descricao}
                  chave={m.chave}
                  ordem={ordem}
                  aoClicar={alternarOrdem}
                  alinhar="right"
                />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenadas.map((l) => (
              <TableRow
                key={l.chave}
                data-state={
                  selecao?.selecionados.includes(l.chave) ? "selected" : undefined
                }
              >
                {selecao ? (
                  <TableCell>
                    <CaixaSelecao
                      chave={l.chave}
                      parametro={selecao.parametro}
                      selecionados={selecao.selecionados}
                      rotulo={l.nome}
                    />
                  </TableCell>
                ) : null}
                <TableCell>
                  <div className="font-medium">{l.nome}</div>
                  <div className="text-muted-foreground text-xs">
                    {l.pai && nomePai[l.pai] ? `${nomePai[l.pai]} · ` : ""}
                    {l.funil_nome ? (
                      <Badge variant="outline">{l.funil_nome}</Badge>
                    ) : (
                      "não vinculada"
                    )}
                  </div>
                </TableCell>
                {metricas.map((m) => (
                  <TableCell key={m.chave} className="text-right tabular-nums">
                    {formatarMetrica(m.calcular(l), m.formato, moeda)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Cabecalho({
  rotulo,
  titulo,
  chave,
  ordem,
  aoClicar,
  alinhar,
}: {
  rotulo: string;
  titulo?: string;
  chave: string;
  ordem: Ordenacao;
  aoClicar: (chave: string) => void;
  alinhar: "left" | "right";
}) {
  const ativa = ordem.chave === chave;
  const Icone = !ativa ? ArrowUpDown : ordem.direcao === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={cn(alinhar === "right" && "text-right")}
      aria-sort={ativa ? (ordem.direcao === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => aoClicar(chave)}
        title={titulo}
        className={cn(
          "hover:text-foreground inline-flex items-center gap-1 whitespace-nowrap",
          alinhar === "right" && "flex-row-reverse",
          ativa && "text-foreground font-semibold",
        )}
      >
        {rotulo}
        <Icone className={cn("size-3.5", !ativa && "opacity-40")} aria-hidden />
      </button>
    </TableHead>
  );
}
