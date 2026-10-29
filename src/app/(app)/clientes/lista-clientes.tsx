"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarMetrica } from "@/dominio/metricas";
import { dataCurta, dataHora, type ClienteResumido } from "@/dominio/clientes-periodo";
import { BotaoFichaCliente } from "./ficha-cliente";
import { cn } from "@/lib/utils";

type Coluna =
  | "nome"
  | "email"
  | "telefone"
  | "primeira_compra"
  | "ultima_compra"
  | "produtos"
  | "total_transacoes"
  | "itens"
  | "gasto";

const COLUNAS: { chave: Coluna; rotulo: string; numerica?: boolean }[] = [
  { chave: "nome", rotulo: "Nome" },
  { chave: "email", rotulo: "E-mail" },
  { chave: "telefone", rotulo: "Telefone" },
  { chave: "primeira_compra", rotulo: "Primeira compra", numerica: true },
  { chave: "ultima_compra", rotulo: "Última compra", numerica: true },
  { chave: "produtos", rotulo: "Produto(s) da última compra" },
  { chave: "total_transacoes", rotulo: "Transações", numerica: true },
  { chave: "itens", rotulo: "Itens", numerica: true },
  { chave: "gasto", rotulo: "Gasto", numerica: true },
];

type Tipo = "todos" | "novos" | "recorrentes";

type Filtros = {
  tipo: Tipo;
  /** Nome do produto comprado no período; "" = qualquer. */
  produto: string;
  gastoMin: string;
  gastoMax: string;
};

const SEM_FILTROS: Filtros = { tipo: "todos", produto: "", gastoMin: "", gastoMax: "" };

const ROTULO_TIPO: Record<Tipo, string> = {
  todos: "Todos",
  novos: "Só novos",
  recorrentes: "Só recorrentes",
};

function valorDe(c: ClienteResumido, coluna: Coluna): string | number {
  switch (coluna) {
    case "nome":
      return c.nome.toLowerCase();
    case "email":
      return c.email.toLowerCase();
    case "telefone":
      return c.telefone ?? "";
    case "primeira_compra":
      return c.primeira_compra_em ?? "";
    case "ultima_compra":
      return c.ultima_compra;
    case "produtos":
      return c.produtos_ultima.join(", ").toLowerCase();
    case "total_transacoes":
      return c.total_transacoes;
    case "itens":
      return c.itens;
    case "gasto":
      return c.gasto;
  }
}

function numeroOuNulo(texto: string): number | null {
  const n = Number(texto.replace(",", "."));
  return texto.trim() === "" || Number.isNaN(n) ? null : n;
}

/**
 * Todos os clientes com transação no período: busca sempre visível; os demais filtros
 * (tipo, produto comprado, faixa de gasto) ficam num pop-up. Cabeçalho clicável ordena:
 * texto A→Z no primeiro clique; número e data, do maior para o menor; o segundo inverte.
 */
export function ListaClientes({
  clientes,
  moeda,
  fuso,
}: {
  clientes: ClienteResumido[];
  moeda: string;
  fuso: string;
}) {
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState<Filtros>(SEM_FILTROS);
  const [ordem, setOrdem] = useState<{ coluna: Coluna; desc: boolean }>({
    coluna: "gasto",
    desc: true,
  });

  const produtos = useMemo(
    () =>
      [...new Set(clientes.flatMap((c) => c.transacoes.flatMap((t) => t.produtos)))].sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [clientes],
  );

  function ordenarPor(coluna: Coluna) {
    const numerica = COLUNAS.find((c) => c.chave === coluna)?.numerica ?? false;
    setOrdem((atual) =>
      atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: numerica },
    );
  }

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const digitos = termo.replace(/\D/g, "");
    const min = numeroOuNulo(filtros.gastoMin);
    const max = numeroOuNulo(filtros.gastoMax);
    const filtrados = clientes.filter((c) => {
      if (filtros.tipo === "novos" && !c.novo) return false;
      if (filtros.tipo === "recorrentes" && !c.recorrente) return false;
      if (filtros.produto && !c.transacoes.some((t) => t.produtos.includes(filtros.produto)))
        return false;
      if (min !== null && c.gasto < min) return false;
      if (max !== null && c.gasto > max) return false;
      if (!termo) return true;
      return (
        c.nome.toLowerCase().includes(termo) ||
        c.email.toLowerCase().includes(termo) ||
        (digitos.length > 0 && (c.telefone ?? "").replace(/\D/g, "").includes(digitos))
      );
    });
    const sinal = ordem.desc ? -1 : 1;
    return [...filtrados].sort((a, b) => {
      const va = valorDe(a, ordem.coluna);
      const vb = valorDe(b, ordem.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "pt-BR");
      return cmp * sinal || b.gasto - a.gasto;
    });
  }, [clientes, busca, filtros, ordem]);

  const totais = visiveis.reduce(
    (s, c) => ({
      transacoes: s.transacoes + c.total_transacoes,
      itens: s.itens + c.itens,
      gasto: s.gasto + c.gasto,
    }),
    { transacoes: 0, itens: 0, gasto: 0 },
  );

  const chips: { chave: keyof Filtros; rotulo: string }[] = [];
  if (filtros.tipo !== "todos") chips.push({ chave: "tipo", rotulo: ROTULO_TIPO[filtros.tipo] });
  if (filtros.produto) chips.push({ chave: "produto", rotulo: `Comprou ${filtros.produto}` });
  if (numeroOuNulo(filtros.gastoMin) !== null)
    chips.push({
      chave: "gastoMin",
      rotulo: `Gastou a partir de ${formatarMetrica(numeroOuNulo(filtros.gastoMin)!, "moeda", moeda)}`,
    });
  if (numeroOuNulo(filtros.gastoMax) !== null)
    chips.push({
      chave: "gastoMax",
      rotulo: `Gastou até ${formatarMetrica(numeroOuNulo(filtros.gastoMax)!, "moeda", moeda)}`,
    });

  function baixarCsv() {
    const cabecalho = [
      "Nome",
      "E-mail",
      "Telefone",
      "Primeira compra",
      "Última compra",
      "Produtos da última compra",
      "Transações",
      "Itens",
      "Gasto",
      "Novo",
      "Recorrente",
    ];
    const escapar = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const linhas = visiveis.map((c) =>
      [
        c.nome,
        c.email,
        c.telefone ?? "",
        dataCurta(c.primeira_compra_em, fuso),
        dataHora(c.ultima_compra, fuso),
        c.produtos_ultima.join(", "),
        c.total_transacoes,
        c.itens,
        c.gasto.toFixed(2).replace(".", ","),
        c.novo ? "sim" : "não",
        c.recorrente ? "sim" : "não",
      ]
        .map(escapar)
        .join(";"),
    );
    // BOM + ponto e vírgula: o Excel em português abre direto com as colunas certas.
    const conteudo = "﻿" + [cabecalho.map(escapar).join(";"), ...linhas].join("\r\n");
    const url = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone"
          aria-label="Buscar cliente"
          className="md:max-w-md"
        />
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>
            <SlidersHorizontal data-icon="inline-start" />
            Filtros
            {chips.length ? (
              <Badge variant="secondary" className="ml-1">
                {chips.length}
              </Badge>
            ) : null}
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Filtrar clientes</DialogTitle>
              <DialogDescription>
                Os filtros valem para a lista, os totais e o CSV.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="filtro-tipo">Tipo de cliente</Label>
                <select
                  id="filtro-tipo"
                  value={filtros.tipo}
                  onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value as Tipo })}
                  className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                >
                  <option value="todos">Todos</option>
                  <option value="novos">Só novos (1ª compra no período)</option>
                  <option value="recorrentes">Só recorrentes (recompraram)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filtro-produto">Comprou o produto</Label>
                <select
                  id="filtro-produto"
                  value={filtros.produto}
                  onChange={(e) => setFiltros({ ...filtros, produto: e.target.value })}
                  className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                >
                  <option value="">Qualquer produto</option>
                  {produtos.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="filtro-gasto-min">Gastou a partir de</Label>
                  <Input
                    id="filtro-gasto-min"
                    inputMode="decimal"
                    placeholder="0"
                    value={filtros.gastoMin}
                    onChange={(e) => setFiltros({ ...filtros, gastoMin: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filtro-gasto-max">Gastou até</Label>
                  <Input
                    id="filtro-gasto-max"
                    inputMode="decimal"
                    placeholder="Sem limite"
                    value={filtros.gastoMax}
                    onChange={(e) => setFiltros({ ...filtros, gastoMax: e.target.value })}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFiltros(SEM_FILTROS)}
                disabled={chips.length === 0}
              >
                Limpar filtros
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Button
          type="button"
          variant="outline"
          onClick={baixarCsv}
          disabled={visiveis.length === 0}
          title="Baixa os clientes listados, com os filtros aplicados"
          className="md:ml-auto"
        >
          <Download data-icon="inline-start" />
          Baixar CSV
        </Button>
      </div>

      {chips.length ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.chave}
              type="button"
              onClick={() => setFiltros({ ...filtros, [chip.chave]: SEM_FILTROS[chip.chave] })}
              className="bg-muted hover:bg-muted/70 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
              title="Remover este filtro"
            >
              {chip.rotulo}
              <X className="size-3" aria-hidden />
            </button>
          ))}
        </div>
      ) : null}

      <p className="text-muted-foreground text-sm">
        {visiveis.length === 0
          ? clientes.length === 0
            ? "Nenhum cliente com transação no período."
            : "Nenhum cliente com esses filtros."
          : `${formatarMetrica(visiveis.length, "inteiro")} ${visiveis.length === 1 ? "cliente" : "clientes"} · ${formatarMetrica(totais.transacoes, "inteiro")} transações · ${formatarMetrica(totais.itens, "inteiro")} itens · ${formatarMetrica(totais.gasto, "moeda", moeda)}`}
      </p>

      {visiveis.length ? (
        <div className="quadro-rolagem">
          <Table className="min-w-[1250px]">
            <TableHeader>
              <TableRow>
                <TableHead className="bg-card sticky top-0 z-10 w-10">#</TableHead>
                {COLUNAS.map((col) => {
                  const ativa = ordem.coluna === col.chave;
                  const Icone = !ativa ? ArrowUpDown : ordem.desc ? ArrowDown : ArrowUp;
                  return (
                    <TableHead
                      key={col.chave}
                      aria-sort={ativa ? (ordem.desc ? "descending" : "ascending") : "none"}
                      className={cn("bg-card sticky top-0 z-10 p-0", col.numerica && "text-right")}
                    >
                      <button
                        type="button"
                        onClick={() => ordenarPor(col.chave)}
                        className={cn(
                          "hover:bg-muted/60 flex h-full w-full items-center gap-1 px-2 py-2 whitespace-nowrap",
                          col.numerica && "justify-end",
                          ativa && "text-foreground font-semibold",
                        )}
                        title={`Ordenar por ${col.rotulo.toLowerCase()}`}
                      >
                        {col.rotulo}
                        <Icone className={cn("size-3.5 shrink-0", !ativa && "opacity-40")} aria-hidden />
                      </button>
                    </TableHead>
                  );
                })}
                <TableHead className="bg-card sticky top-0 z-10">Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((c, i) => (
                <TableRow key={c.id}>
                  <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <BotaoFichaCliente id={c.id} nome={c.nome} fuso={fuso} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{c.email || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.telefone || "—"}</TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">
                    {dataCurta(c.primeira_compra_em, fuso)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">
                    {dataHora(c.ultima_compra, fuso)}
                  </TableCell>
                  <TableCell className="max-w-72 truncate" title={c.produtos_ultima.join(", ")}>
                    {c.produtos_ultima.join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatarMetrica(c.total_transacoes, "inteiro")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatarMetrica(c.itens, "inteiro")}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatarMetrica(c.gasto, "moeda", moeda)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {c.novo ? <Badge variant="outline">Novo</Badge> : null}{" "}
                    {c.recorrente ? <Badge variant="secondary">Recorrente</Badge> : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
