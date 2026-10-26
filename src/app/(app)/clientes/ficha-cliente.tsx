"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatarMetrica } from "@/dominio/metricas";
import { rotuloMeioPagamento } from "@/dominio/pagamentos";
import { dataCurta, dataHora } from "@/dominio/clientes-periodo";
import {
  ROTULO_STATUS_VENDA,
  formatarDocumento,
  rotuloOrigem,
  type FichaCliente,
  type VendaFicha,
} from "@/dominio/ficha-cliente";
import { carregarFichaCliente } from "@/servidor/acoes/clientes";
import { cn } from "@/lib/utils";

/**
 * Nome do cliente como botão: ao clicar, abre o pop-up com a ficha completa,
 * carregada na hora pela Server Action.
 */
export function BotaoFichaCliente({
  id,
  nome,
  fuso,
  className,
}: {
  id: string;
  nome: string;
  fuso: string;
  className?: string;
}) {
  const [ficha, setFicha] = useState<FichaCliente | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function abrir(aberto: boolean) {
    if (!aberto || ficha) return;
    iniciar(async () => {
      const r = await carregarFichaCliente(id);
      if (r.ok && r.dados) setFicha(r.dados);
      else setErro(r.ok ? "Sem dados." : (r.erro ?? "Não foi possível carregar."));
    });
  }

  return (
    <Dialog onOpenChange={abrir}>
      <DialogTrigger
        render={
          <button
            type="button"
            className={cn(
              "cursor-pointer text-left font-medium underline-offset-4 hover:underline",
              className,
            )}
            title="Ver ficha completa"
          />
        }
      >
        {nome}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{ficha?.nome?.trim() || nome}</DialogTitle>
          <DialogDescription>
            Tudo que o sistema sabe sobre este cliente: contato, totais da vida e cada
            compra.
          </DialogDescription>
        </DialogHeader>
        {erro ? (
          <p className="text-destructive text-sm">{erro}</p>
        ) : !ficha || pendente ? (
          <p className="text-muted-foreground py-8 text-center text-sm">Carregando…</p>
        ) : (
          <ConteudoFicha ficha={ficha} fuso={fuso} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConteudoFicha({ ficha, fuso }: { ficha: FichaCliente; fuso: string }) {
  const moeda = ficha.transacoes[0]?.vendas[0]?.moeda ?? ficha.vendas_soltas[0]?.moeda ?? "BRL";
  const m = (v: number) => formatarMetrica(v, "moeda", moeda);
  return (
    <div className="space-y-6 text-sm">
      <section className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <Dado rotulo="Nome" valor={ficha.nome?.trim() || "—"} />
        <Dado rotulo="E-mail" valor={ficha.email} />
        <Dado rotulo="Telefone" valor={ficha.telefone || "—"} />
        <Dado rotulo="CPF/CNPJ" valor={formatarDocumento(ficha.cpf)} />
        <Dado
          rotulo="Cadastro no gateway"
          valor={
            ficha.plataforma
              ? `${ficha.plataforma} · id ${ficha.id_externo ?? "—"}`
              : "—"
          }
        />
        <Dado rotulo="Primeira compra" valor={dataHora(ficha.primeira_compra_em ?? "", fuso)} />
        <Dado rotulo="Funil de entrada" valor={ficha.funil_entrada ?? "Sem funil"} />
      </section>

      <section className="grid gap-3 rounded-md border p-3 sm:grid-cols-3 lg:grid-cols-5">
        <Total rotulo="Transações" valor={formatarMetrica(ficha.totais.transacoes, "inteiro")} />
        <Total rotulo="Itens" valor={formatarMetrica(ficha.totais.itens, "inteiro")} />
        <Total rotulo="Total gasto" valor={m(ficha.totais.gasto)} destaque />
        <Total
          rotulo="Cobranças recorrentes"
          valor={formatarMetrica(ficha.totais.cobrancas_recorrentes, "inteiro")}
        />
        <Total
          rotulo="Reembolsos"
          valor={`${formatarMetrica(ficha.totais.reembolsos.quantidade, "inteiro")} · ${m(ficha.totais.reembolsos.valor)}`}
        />
      </section>

      <section className="space-y-4">
        <h3 className="font-semibold">Histórico de compras</h3>
        {ficha.transacoes.length === 0 && ficha.vendas_soltas.length === 0 ? (
          <p className="text-muted-foreground">Nenhuma compra registrada.</p>
        ) : null}
        {ficha.transacoes.map((t) => (
          <div key={t.id} className="rounded-md border">
            <div className="bg-muted/40 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
              <span className="font-medium">
                {t.ordem}ª transação · {dataHora(t.inicio, fuso)}
              </span>
              {t.eh_recompra ? <Badge variant="secondary">Recompra</Badge> : null}
              <span className="text-muted-foreground">
                {t.funil ? `Funil: ${t.funil}` : "Sem funil"}
              </span>
              <span className="ml-auto font-medium tabular-nums">{m(t.valor_total)}</span>
            </div>
            <ListaVendas vendas={t.vendas} fuso={fuso} />
          </div>
        ))}
        {ficha.vendas_soltas.length ? (
          <div className="rounded-md border">
            <div className="bg-muted/40 px-3 py-2 font-medium">
              Cobranças sem transação
              <span className="text-muted-foreground ml-2 font-normal">
                (renovação cuja primeira cobrança não foi importada)
              </span>
            </div>
            <ListaVendas vendas={ficha.vendas_soltas} fuso={fuso} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ListaVendas({ vendas, fuso }: { vendas: VendaFicha[]; fuso: string }) {
  if (vendas.length === 0)
    return <p className="text-muted-foreground px-3 py-2 text-xs">Sem itens.</p>;
  return (
    <ul className="divide-y">
      {vendas.map((v) => {
        const extras = [
          rotuloOrigem(v.origem),
          rotuloMeioPagamento(v.meio_pagamento),
          v.parcelas > 1 ? `${v.parcelas}x` : "à vista",
          v.cupom ? `cupom ${v.cupom}` : null,
          ...v.comissoes.map(
            (c) => `${c.tipo} ${c.parceiro}: ${formatarMetrica(c.valor, "moeda", v.moeda)}`,
          ),
          ...Object.entries(v.utm).map(([k, val]) => `${k}=${val}`),
          `id ${v.plataforma} ${v.id_externo}`,
        ].filter(Boolean);
        return (
          <li key={v.id} className="grid gap-1 px-3 py-2 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
            <span className="text-muted-foreground tabular-nums">{dataHora(v.vendida_em, fuso)}</span>
            <span className="min-w-0">
              <span className="font-medium">{v.produto}</span>
              {v.oferta !== v.produto ? (
                <span className="text-muted-foreground"> · {v.oferta}</span>
              ) : null}
              <span className="text-muted-foreground block text-xs">{extras.join(" · ")}</span>
            </span>
            <span className="text-right tabular-nums">
              {formatarMetrica(v.valor_bruto, "moeda", v.moeda)}
              {v.status !== "aprovada" ? (
                <span className="text-destructive block text-xs">
                  {ROTULO_STATUS_VENDA[v.status]}
                  {v.reembolsada_em ? ` em ${dataCurta(v.reembolsada_em, fuso)}` : ""}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{rotulo}</dt>
      <dd className="font-medium break-words">{valor}</dd>
    </div>
  );
}

function Total({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs">{rotulo}</div>
      <div className={cn("font-semibold tabular-nums", destaque && "text-emerald-600")}>{valor}</div>
    </div>
  );
}
