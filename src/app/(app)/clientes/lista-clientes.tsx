"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarMetrica } from "@/dominio/metricas";
import { dataHora, type ClienteResumido } from "@/dominio/clientes-periodo";
import { BotaoFichaCliente } from "./ficha-cliente";
import { cn } from "@/lib/utils";

type Coluna =
  | "nome"
  | "email"
  | "telefone"
  | "ultima_compra"
  | "produtos"
  | "total_transacoes"
  | "itens"
  | "gasto";

const COLUNAS: { chave: Coluna; rotulo: string; numerica?: boolean }[] = [
  { chave: "nome", rotulo: "Nome" },
  { chave: "email", rotulo: "E-mail" },
  { chave: "telefone", rotulo: "Telefone" },
  { chave: "ultima_compra", rotulo: "Última compra", numerica: true },
  { chave: "produtos", rotulo: "Produto(s) da última compra" },
  { chave: "total_transacoes", rotulo: "Transações", numerica: true },
  { chave: "itens", rotulo: "Itens", numerica: true },
  { chave: "gasto", rotulo: "Gasto", numerica: true },
];

type Tipo = "todos" | "novos" | "recorrentes";

function valorDe(c: ClienteResumido, coluna: Coluna): string | number {
  switch (coluna) {
    case "nome":
      return c.nome.toLowerCase();
    case "email":
      return c.email.toLowerCase();
    case "telefone":
      return c.telefone ?? "";
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

/**
 * Todos os clientes com transação no período: busca, filtros (mínimo de transações,
 * novos ou recorrentes) e ordenação clicando no cabeçalho. Texto ordena A→Z no
 * primeiro clique; número e data, do maior para o menor.
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
  const [tipo, setTipo] = useState<Tipo>("todos");
  const [ordem, setOrdem] = useState<{ coluna: Coluna; desc: boolean }>({
    coluna: "gasto",
    desc: true,
  });

  function ordenarPor(coluna: Coluna) {
    const numerica = COLUNAS.find((c) => c.chave === coluna)?.numerica ?? false;
    setOrdem((atual) =>
      atual.coluna === coluna
        ? { coluna, desc: !atual.desc }
        : { coluna, desc: numerica },
    );
  }

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const digitos = termo.replace(/\D/g, "");
    const filtrados = clientes.filter((c) => {
      if (tipo === "novos" && !c.novo) return false;
      if (tipo === "recorrentes" && !c.recorrente) return false;
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
  }, [clientes, busca, tipo, ordem]);

  function baixarCsv() {
    const cabecalho = [
      "Nome",
      "E-mail",
      "Telefone",
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
    const conteudo = "\ufeff" + [cabecalho.map(escapar).join(";"), ...linhas].join("\r\n");
    const url = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totais = visiveis.reduce(
    (s, c) => ({
      transacoes: s.transacoes + c.total_transacoes,
      itens: s.itens + c.itens,
      gasto: s.gasto + c.gasto,
    }),
    { transacoes: 0, itens: 0, gasto: 0 },
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-end">
        <label className="flex-1 space-y-1 text-sm">
          <span className="text-muted-foreground text-xs">Buscar</span>
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome, e-mail ou telefone"
            aria-label="Buscar cliente"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground text-xs">Tipo de cliente</span>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as Tipo)}
            aria-label="Tipo de cliente"
            className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm md:w-44"
          >
            <option value="todos">Todos</option>
            <option value="novos">Só novos (1ª compra no período)</option>
            <option value="recorrentes">Só recorrentes (recompraram)</option>
          </select>
        </label>
        <Button
          type="button"
          variant="outline"
          onClick={baixarCsv}
          disabled={visiveis.length === 0}
          title="Baixa os clientes listados, com os filtros aplicados"
        >
          <Download data-icon="inline-start" />
          Baixar CSV
        </Button>
      </div>

      <p className="text-muted-foreground text-sm">
        {visiveis.length === 0
          ? clientes.length === 0
            ? "Nenhum cliente com transação no período."
            : "Nenhum cliente com esses filtros."
          : `${formatarMetrica(visiveis.length, "inteiro")} ${visiveis.length === 1 ? "cliente" : "clientes"} · ${formatarMetrica(totais.transacoes, "inteiro")} transações · ${formatarMetrica(totais.itens, "inteiro")} itens · ${formatarMetrica(totais.gasto, "moeda", moeda)}`}
      </p>

      {visiveis.length ? (
        <div className="quadro-rolagem">
          <Table className="min-w-[1100px]">
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
                      className={cn(
                        "bg-card sticky top-0 z-10 p-0",
                        col.numerica && "text-right",
                      )}
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
                        <Icone
                          className={cn("size-3.5 shrink-0", !ativa && "opacity-40")}
                          aria-hidden
                        />
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
