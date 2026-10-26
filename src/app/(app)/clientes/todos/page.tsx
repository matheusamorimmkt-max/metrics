import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { dataHora } from "@/dominio/clientes-periodo";
import { obterContexto } from "@/servidor/sessao";
import { listarTodosClientes } from "@/servidor/consultas/clientes";
import { BotaoFichaCliente } from "../ficha-cliente";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Todos os clientes" };

const POR_PAGINA = 100;
const CABECALHO = "bg-card sticky top-0 z-10";

export default async function PaginaTodosClientes({
  searchParams,
}: PageProps<"/clientes/todos">) {
  const params = await searchParams;
  const busca = typeof params.q === "string" ? params.q : "";
  const pagina = Math.max(1, Number(params.pagina) || 1);
  const { organizacao } = await obterContexto();
  const { clientes, truncado } = await listarTodosClientes(organizacao.id, busca);
  const totalPaginas = Math.max(1, Math.ceil(clientes.length / POR_PAGINA));
  const visiveis = clientes.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const fuso = organizacao.fuso_horario;
  const linkPagina = (p: number) =>
    `/clientes/todos?${new URLSearchParams({ ...(busca ? { q: busca } : {}), pagina: String(p) })}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link href="/clientes" className="hover:underline">
            Clientes
          </Link>{" "}
          · Todos
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Todos os clientes</h1>
        <p className="text-muted-foreground">
          Lista completa, do maior gasto para o menor. Clique no nome para abrir a ficha com
          todos os dados e o histórico de compras.
        </p>
      </div>

      <form action="/clientes/todos" className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="q"
          defaultValue={busca}
          placeholder="Buscar por nome, e-mail ou telefone"
          aria-label="Buscar cliente"
          className="sm:max-w-md"
        />
        <Button type="submit" variant="outline">
          Buscar
        </Button>
        {busca ? (
          <Button variant="ghost" render={<Link href="/clientes/todos" />}>
            Limpar
          </Button>
        ) : null}
      </form>

      <p className="text-muted-foreground text-sm">
        {clientes.length === 0
          ? busca
            ? "Nenhum cliente encontrado para essa busca."
            : "Nenhum cliente importado ainda."
          : `${formatarMetrica(clientes.length, "inteiro")} ${clientes.length === 1 ? "cliente" : "clientes"}${busca ? " encontrados" : ""}.`}
        {truncado ? " Mostrando os 5 mil primeiros." : ""}
      </p>

      {visiveis.length ? (
        <div className="quadro-rolagem">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow>
                <TableHead className={cn(CABECALHO, "w-12")}>#</TableHead>
                <TableHead className={CABECALHO}>Nome</TableHead>
                <TableHead className={CABECALHO}>E-mail</TableHead>
                <TableHead className={CABECALHO}>Telefone</TableHead>
                <TableHead className={CABECALHO}>Funil de entrada</TableHead>
                <TableHead className={CABECALHO}>Primeira compra</TableHead>
                <TableHead className={CABECALHO}>Última compra</TableHead>
                <TableHead className={cn(CABECALHO, "text-right")}>Transações</TableHead>
                <TableHead className={cn(CABECALHO, "text-right")}>Itens</TableHead>
                <TableHead className={cn(CABECALHO, "text-right")}>Total gasto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((c, i) => (
                <TableRow key={c.id}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {(pagina - 1) * POR_PAGINA + i + 1}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <BotaoFichaCliente id={c.id} nome={c.nome} fuso={fuso} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{c.email}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.telefone || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.funil_entrada ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {dataHora(c.primeira_compra_em ?? "", fuso)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {dataHora(c.ultima_compra_em ?? "", fuso)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatarMetrica(c.transacoes, "inteiro")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatarMetrica(c.itens, "inteiro")}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatarMetrica(c.gasto, "moeda", organizacao.moeda)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {totalPaginas > 1 ? (
        <nav className="flex items-center gap-2 text-sm" aria-label="Páginas">
          <Button
            variant="outline"
            size="sm"
            disabled={pagina <= 1}
            render={pagina > 1 ? <Link href={linkPagina(pagina - 1)} /> : undefined}
          >
            Anterior
          </Button>
          <span className="text-muted-foreground">
            Página {pagina} de {totalPaginas}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagina >= totalPaginas}
            render={pagina < totalPaginas ? <Link href={linkPagina(pagina + 1)} /> : undefined}
          >
            Próxima
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
