"use client";

import { useState, type PointerEvent } from "react";
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
import { CLASSE_COR_STATUS, traduzirStatusCampanha } from "@/dominio/status-campanha";
import type { LinhaTrafego } from "@/servidor/consultas/trafego";
import { cn } from "@/lib/utils";
import { ChaveVeiculacao } from "../configuracoes/campanhas/chave-campanha";
import { CaixaSelecao } from "./selecao";
import { useColunasTrafego, useLargurasTrafego } from "./colunas";
import { PersonalizarColunas } from "./personalizar-colunas";
import { MiniaturaCriativo } from "./criativo";

type Ordenacao = { chave: string; direcao: "asc" | "desc" };

const LARGURA_MINIMA = 72;
const LARGURA_PADRAO_METRICA = 120;
const LARGURA_PADRAO_NOME = 320;
const LARGURA_SELECAO = 40;
/** Célula fixa à esquerda: fundo opaco que acompanha o hover e a seleção da linha. */
const CELULA_FIXA =
  "bg-card sticky z-10 group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted";

/**
 * Tabela do relatório de tráfego: colunas escolhidas pelo usuário, cabeçalhos clicáveis
 * para ordenar, largura ajustável arrastando a borda, seleção em cascata, chave
 * liga/desliga nas campanhas e criativo nos anúncios.
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
  const [larguras, definirLargura] = useLargurasTrafego();
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
  const largura = (chave: string, padrao: number) => larguras[chave] ?? padrao;
  const esquerdaNome = selecao ? LARGURA_SELECAO : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          Clique no cabeçalho para ordenar; arraste a borda do cabeçalho para ajustar a
          largura.
        </p>
        <PersonalizarColunas colunas={colunas} aoSalvar={definirColunas} />
      </div>
      {/* Rolagem vertical e horizontal no mesmo quadro; cabeçalho fixo no topo e a
          coluna do nome (com a caixa de seleção) fixa à esquerda. */}
      <div className="[&_[data-slot=table-container]]:max-h-[70vh] [&_[data-slot=table-container]]:overflow-auto [&_[data-slot=table-container]]:rounded-md [&_[data-slot=table-container]]:border">
        <Table className="w-max min-w-full table-fixed">
          <colgroup>
            {selecao ? <col style={{ width: LARGURA_SELECAO }} /> : null}
            <col style={{ width: largura("nome", LARGURA_PADRAO_NOME) }} />
            {metricas.map((m) => (
              <col
                key={m.chave}
                style={{ width: largura(m.chave, LARGURA_PADRAO_METRICA) }}
              />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow>
              {selecao ? (
                <TableHead className="bg-card sticky top-0 left-0 z-30 shadow-[inset_-1px_0_0_var(--border)]" />
              ) : null}
              <Cabecalho
                rotulo={rotuloNivel}
                chave="nome"
                ordem={ordem}
                aoClicar={alternarOrdem}
                alinhar="left"
                largura={largura("nome", LARGURA_PADRAO_NOME)}
                aoRedimensionar={(l) => definirLargura("nome", l)}
                fixaEsquerda={esquerdaNome}
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
                  largura={largura(m.chave, LARGURA_PADRAO_METRICA)}
                  aoRedimensionar={(l) => definirLargura(m.chave, l)}
                />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenadas.map((l) => {
              const status = l.veiculacao
                ? traduzirStatusCampanha(l.veiculacao.status)
                : null;
              return (
                <TableRow
                  key={l.chave}
                  className="group/row"
                  data-state={
                    selecao?.selecionados.includes(l.chave) ? "selected" : undefined
                  }
                >
                  {selecao ? (
                    <TableCell className={cn(CELULA_FIXA, "left-0")}>
                      <CaixaSelecao
                        chave={l.chave}
                        parametro={selecao.parametro}
                        selecionados={selecao.selecionados}
                        rotulo={l.nome}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell
                    className={cn(
                      CELULA_FIXA,
                      "overflow-hidden shadow-[inset_-1px_0_0_var(--border)]",
                    )}
                    style={{ left: esquerdaNome }}
                  >
                    <div className="flex items-center gap-3">
                      {l.veiculacao ? (
                        <ChaveVeiculacao
                          nivel={l.nivel}
                          id={l.veiculacao.id}
                          nome={l.nome}
                          ativa={l.veiculacao.ativa}
                          size="sm"
                        />
                      ) : (
                        <span
                          className="bg-muted inline-block h-3.5 w-6 shrink-0 rounded-full opacity-50"
                          title="Ainda não importado: clique em Atualizar agora."
                          aria-hidden
                        />
                      )}
                      {l.nivel === "anuncio" ? (
                        <MiniaturaCriativo criativo={l.criativo} nome={l.nome} />
                      ) : null}
                      <div className="min-w-0">
                        <div className="truncate font-medium" title={l.nome}>
                          {l.nome}
                        </div>
                        <div className="text-muted-foreground flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs">
                          {status && status.rotulo !== "—" ? (
                            <Badge
                              variant="outline"
                              className={cn("h-5 px-1.5", CLASSE_COR_STATUS[status.cor])}
                            >
                              {status.rotulo}
                            </Badge>
                          ) : null}
                          {l.pai && nomePai[l.pai] ? (
                            <span className="truncate">{nomePai[l.pai]}</span>
                          ) : null}
                          {l.funil_nome ? (
                            <Badge variant="outline" className="h-5 px-1.5">
                              {l.funil_nome}
                            </Badge>
                          ) : (
                            <span>não vinculada</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  {metricas.map((m) => (
                    <TableCell key={m.chave} className="truncate text-right tabular-nums">
                      {formatarMetrica(m.calcular(l), m.formato, moeda)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
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
  largura,
  aoRedimensionar,
  fixaEsquerda,
}: {
  rotulo: string;
  titulo?: string;
  chave: string;
  ordem: Ordenacao;
  aoClicar: (chave: string) => void;
  alinhar: "left" | "right";
  largura: number;
  aoRedimensionar: (largura: number) => void;
  /** Deslocamento à esquerda quando a coluna fica fixa na rolagem horizontal. */
  fixaEsquerda?: number;
}) {
  const ativa = ordem.chave === chave;
  const Icone = !ativa ? ArrowUpDown : ordem.direcao === "asc" ? ArrowUp : ArrowDown;

  function iniciarArrasto(e: PointerEvent<HTMLSpanElement>) {
    e.preventDefault();
    const inicioX = e.clientX;
    const inicial = largura;
    const alvo = e.currentTarget;
    alvo.setPointerCapture(e.pointerId);
    const mover = (ev: globalThis.PointerEvent) => {
      aoRedimensionar(Math.max(LARGURA_MINIMA, inicial + ev.clientX - inicioX));
    };
    const soltar = () => {
      alvo.removeEventListener("pointermove", mover);
      alvo.removeEventListener("pointerup", soltar);
      alvo.removeEventListener("pointercancel", soltar);
    };
    alvo.addEventListener("pointermove", mover);
    alvo.addEventListener("pointerup", soltar);
    alvo.addEventListener("pointercancel", soltar);
  }

  return (
    <TableHead
      className={cn(
        "bg-card sticky top-0 z-20",
        alinhar === "right" && "text-right",
        fixaEsquerda !== undefined && "z-30 shadow-[inset_-1px_0_0_var(--border)]",
      )}
      style={fixaEsquerda !== undefined ? { left: fixaEsquerda } : undefined}
      aria-sort={ativa ? (ordem.direcao === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => aoClicar(chave)}
        title={titulo}
        className={cn(
          "hover:text-foreground inline-flex max-w-full items-center gap-1",
          alinhar === "right" && "flex-row-reverse",
          ativa && "text-foreground font-semibold",
        )}
      >
        <span className="truncate">{rotulo}</span>
        <Icone className={cn("size-3.5 shrink-0", !ativa && "opacity-40")} aria-hidden />
      </button>
      <span
        role="separator"
        aria-orientation="vertical"
        aria-label={`Ajustar largura de ${rotulo}`}
        onPointerDown={iniciarArrasto}
        className="hover:bg-primary/60 absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none select-none"
      />
    </TableHead>
  );
}
