"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Selecao } from "@/components/formulario/selecao";
import { formatarMetrica } from "@/dominio/metricas";
import {
  PAPEIS_OFERTA,
  ROTULO_PAPEL,
  type PapelOferta,
} from "@/dominio/schemas/funil-oferta";
import { removerOfertaDoFunil, vincularOferta } from "@/servidor/acoes/funil-ofertas";
import type { OfertaResumo } from "@/servidor/consultas/ofertas";
import type { FunilOpcao } from "@/servidor/consultas/campanhas";
import { cn } from "@/lib/utils";

export function LinhaOferta({
  oferta,
  funis,
  moeda,
  selecionada,
  aoSelecionar,
}: {
  oferta: OfertaResumo;
  funis: FunilOpcao[];
  moeda: string;
  selecionada: boolean;
  aoSelecionar: (marcar: boolean) => void;
}) {
  const [funilId, setFunilId] = useState(oferta.funil_id ?? "");
  const [papel, setPapel] = useState<PapelOferta>(oferta.papel ?? "front");
  const [pendente, iniciar] = useTransition();

  function aplicar(novoFunil: string, novoPapel: PapelOferta) {
    const anterior = { funilId, papel };
    setFunilId(novoFunil);
    setPapel(novoPapel);
    iniciar(async () => {
      const r = novoFunil
        ? await vincularOferta(oferta.id, novoFunil, novoPapel)
        : await removerOfertaDoFunil(oferta.id);
      if (!r.ok) {
        setFunilId(anterior.funilId);
        setPapel(anterior.papel);
        toast.error(r.erro ?? "Não foi possível salvar o vínculo.");
      }
    });
  }

  return (
    <TableRow className={!funilId ? "bg-amber-50/60 dark:bg-amber-950/20" : undefined}>
      <TableCell>
        <input
          type="checkbox"
          checked={selecionada}
          onChange={(e) => aoSelecionar(e.target.checked)}
          aria-label={`Selecionar ${oferta.nome}`}
          className="size-4"
        />
      </TableCell>
      <TableCell>
        <div className="font-medium">{oferta.nome}</div>
        <div className="text-muted-foreground text-xs">
          {oferta.produto_nome} · {oferta.id_externo}
          {!oferta.ativo ? " · inativa" : ""}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatarMetrica(oferta.preco, "moeda", moeda)}
      </TableCell>
      <TableCell
        className={cn(
          "text-right tabular-nums",
          oferta.vendas_mes > 0 ? "font-medium text-emerald-700" : "text-muted-foreground",
        )}
      >
        {oferta.vendas_mes}
      </TableCell>
      <TableCell
        className={cn(
          "text-right tabular-nums",
          oferta.faturamento_mes > 0 ? "font-medium text-emerald-700" : "text-muted-foreground",
        )}
      >
        {formatarMetrica(oferta.faturamento_mes, "moeda", moeda)}
      </TableCell>
      <TableCell className="text-right tabular-nums">{oferta.vendas}</TableCell>
      <TableCell className="text-right tabular-nums">
        {formatarMetrica(oferta.faturamento, "moeda", moeda)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Selecao
            value={funilId}
            onChange={(e) => aplicar(e.target.value, papel)}
            disabled={pendente}
            aria-label={`Funil da oferta ${oferta.nome}`}
          >
            <option value="">Não vinculada</option>
            {funis.map((f) => (
              <option key={f.id} value={f.id}>
                {f.categoria ? `${f.categoria} · ${f.nome}` : f.nome}
              </option>
            ))}
          </Selecao>
          {funilId ? (
            <Selecao
              value={papel}
              onChange={(e) => aplicar(funilId, e.target.value as PapelOferta)}
              disabled={pendente}
              className="w-32"
              aria-label={`Papel da oferta ${oferta.nome}`}
            >
              {PAPEIS_OFERTA.map((p) => (
                <option key={p} value={p}>
                  {ROTULO_PAPEL[p]}
                </option>
              ))}
            </Selecao>
          ) : null}
        </div>
        {oferta.vinculo_status === "sugerido" && oferta.funil_id ? (
          <div className="mt-1 text-xs">
            <Badge variant="secondary">sugestão</Badge>{" "}
            <Link
              href={`/configuracoes/funis/${oferta.funil_id}`}
              className="underline underline-offset-4"
            >
              confirmar ou descartar no funil
            </Link>
          </div>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
