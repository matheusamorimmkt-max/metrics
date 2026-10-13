"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Selecao } from "@/components/formulario/selecao";
import { formatarMetrica } from "@/dominio/metricas";
import {
  PAPEIS_OFERTA,
  ROTULO_PAPEL,
  type PapelOferta,
} from "@/dominio/schemas/funil-oferta";
import {
  confirmarSugestao,
  descartarSugestao,
  removerOfertaDoFunil,
  vincularOferta,
} from "@/servidor/acoes/funil-ofertas";
import type { OfertaResumo } from "@/servidor/consultas/ofertas";

export function EditorOfertas({
  funilId,
  ofertas,
  disponiveis,
  moeda,
  greennConectada,
}: {
  funilId: string;
  ofertas: OfertaResumo[];
  disponiveis: OfertaResumo[];
  moeda: string;
  greennConectada: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [novaOferta, setNovaOferta] = useState("");
  const [novoPapel, setNovoPapel] = useState<PapelOferta>(
    ofertas.some((o) => o.papel === "front" && o.vinculo_status === "confirmado")
      ? "bump"
      : "front",
  );

  function rodar(fn: () => Promise<{ ok: boolean; erro?: string; mensagem?: string }>) {
    iniciar(async () => {
      const r = await fn();
      if (r.ok) toast.success(r.mensagem ?? "Salvo.");
      else toast.error(r.erro ?? "Não foi possível concluir.");
    });
  }

  const temFront = ofertas.some(
    (o) => o.papel === "front" && o.vinculo_status === "confirmado",
  );

  return (
    <div className="space-y-4">
      {!temFront ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Este funil ainda não tem uma oferta front confirmada. Sem front, as vendas não
          são atribuídas a ele.
        </p>
      ) : null}

      {ofertas.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Oferta</TableHead>
              <TableHead className="w-40">Papel</TableHead>
              <TableHead className="text-right">Faturamento</TableHead>
              <TableHead className="w-44" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ofertas.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <div className="font-medium">{o.nome}</div>
                  <div className="text-muted-foreground text-xs">
                    {o.produto_nome} · {formatarMetrica(o.preco, "moeda", moeda)}
                  </div>
                </TableCell>
                <TableCell>
                  <Selecao
                    value={o.papel ?? "front"}
                    disabled={pendente}
                    aria-label={`Papel de ${o.nome}`}
                    onChange={(e) =>
                      rodar(() =>
                        o.vinculo_status === "sugerido"
                          ? confirmarSugestao(o.id, e.target.value)
                          : vincularOferta(o.id, funilId, e.target.value),
                      )
                    }
                  >
                    {PAPEIS_OFERTA.map((p) => (
                      <option key={p} value={p}>
                        {ROTULO_PAPEL[p]}
                      </option>
                    ))}
                  </Selecao>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatarMetrica(o.faturamento, "moeda", moeda)}
                </TableCell>
                <TableCell className="text-right">
                  {o.vinculo_status === "sugerido" ? (
                    <div className="flex items-center justify-end gap-1">
                      <Badge variant="secondary">sugestão</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pendente}
                        onClick={() => rodar(() => confirmarSugestao(o.id))}
                      >
                        <Check data-icon="inline-start" />
                        Confirmar
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={pendente}
                        aria-label="Descartar sugestão"
                        onClick={() => rodar(() => descartarSugestao(o.id))}
                      >
                        <X />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pendente}
                      onClick={() => rodar(() => removerOfertaDoFunil(o.id))}
                    >
                      <Trash2 data-icon="inline-start" />
                      Remover
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-muted-foreground text-sm">Nenhuma oferta neste funil ainda.</p>
      )}

      {disponiveis.length > 0 ? (
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!novaOferta) return;
            rodar(async () => {
              const r = await vincularOferta(novaOferta, funilId, novoPapel);
              if (r.ok) setNovaOferta("");
              return r;
            });
          }}
        >
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium" htmlFor="nova-oferta">
              Adicionar oferta
            </label>
            <Selecao
              id="nova-oferta"
              value={novaOferta}
              onChange={(e) => setNovaOferta(e.target.value)}
              disabled={pendente}
            >
              <option value="">Escolha uma oferta sem funil…</option>
              {disponiveis.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome} · {o.produto_nome} · {formatarMetrica(o.preco, "moeda", moeda)}
                </option>
              ))}
            </Selecao>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="novo-papel">
              Papel
            </label>
            <Selecao
              id="novo-papel"
              value={novoPapel}
              onChange={(e) => setNovoPapel(e.target.value as PapelOferta)}
              disabled={pendente}
              className="sm:w-40"
            >
              {PAPEIS_OFERTA.map((p) => (
                <option key={p} value={p}>
                  {ROTULO_PAPEL[p]}
                </option>
              ))}
            </Selecao>
          </div>
          <Button type="submit" disabled={pendente || !novaOferta}>
            <Plus data-icon="inline-start" />
            Adicionar
          </Button>
        </form>
      ) : (
        <p className="text-muted-foreground text-sm">
          {greennConectada
            ? "Todas as ofertas importadas já estão em algum funil."
            : "As ofertas chegam pela Greenn. Conecte em "}
          {!greennConectada ? (
            <Link
              href="/configuracoes/integracoes"
              className="underline underline-offset-4"
            >
              Integrações
            </Link>
          ) : null}
          {!greennConectada ? "." : ""}
        </p>
      )}
    </div>
  );
}
