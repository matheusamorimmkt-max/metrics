"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Selecao } from "@/components/formulario/selecao";
import { formatarMetrica } from "@/dominio/metricas";
import { vincularCampanha } from "@/servidor/acoes/campanhas";
import type { CampanhaResumo, FunilOpcao } from "@/servidor/consultas/campanhas";

export function LinhaCampanha({
  campanha,
  funis,
}: {
  campanha: CampanhaResumo;
  funis: FunilOpcao[];
}) {
  const [funilId, setFunilId] = useState(campanha.funil_id ?? "");
  const [pendente, iniciar] = useTransition();

  function mudar(novo: string) {
    const anterior = funilId;
    setFunilId(novo);
    iniciar(async () => {
      const r = await vincularCampanha(campanha.id, novo || null);
      if (!r.ok) {
        setFunilId(anterior);
        toast.error(r.erro ?? "Não foi possível salvar o vínculo.");
      }
    });
  }

  return (
    <TableRow className={!funilId ? "bg-amber-50/60 dark:bg-amber-950/20" : undefined}>
      <TableCell>
        <div className="font-medium">{campanha.nome || campanha.id_externo}</div>
        <div className="text-muted-foreground text-xs">
          {campanha.conta_nome} · {campanha.id_externo}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={campanha.ativo ? "default" : "outline"}>
          {campanha.status ?? "—"}
        </Badge>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatarMetrica(campanha.gasto_30d, "moeda", campanha.moeda)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatarMetrica(campanha.gasto_total, "moeda", campanha.moeda)}
      </TableCell>
      <TableCell>
        <Selecao
          value={funilId}
          onChange={(e) => mudar(e.target.value)}
          disabled={pendente}
          aria-label={`Funil da campanha ${campanha.nome}`}
        >
          <option value="">Não vinculada</option>
          {funis.map((f) => (
            <option key={f.id} value={f.id}>
              {f.categoria ? `${f.categoria} · ${f.nome}` : f.nome}
            </option>
          ))}
        </Selecao>
      </TableCell>
    </TableRow>
  );
}
