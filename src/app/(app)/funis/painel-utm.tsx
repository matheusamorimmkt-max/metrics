"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CAMPOS_UTM, type CampoUtm, type ResumoUtm } from "@/dominio/utm";
import { BarrasPaises } from "./graficos-pagamentos";
import { TabelaGrupos } from "./tabela-grupos";

/** Origem das vendas por UTM: escolha o campo, veja barras e tabela. */
export function PainelUtm({ utm, moeda }: { utm: ResumoUtm; moeda: string }) {
  const [campo, setCampo] = useState<CampoUtm>("utm_source");
  const grupos = utm.por_campo[campo];
  const rotulo = CAMPOS_UTM.find((c) => c.chave === campo)?.rotulo ?? campo;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Campo da UTM">
        {CAMPOS_UTM.map((c) => (
          <Button
            key={c.chave}
            size="sm"
            variant={c.chave === campo ? "default" : "ghost"}
            onClick={() => setCampo(c.chave)}
          >
            {c.rotulo}
          </Button>
        ))}
      </div>
      <BarrasPaises grupos={grupos} moeda={moeda} />
      <TabelaGrupos grupos={grupos} moeda={moeda} rotulo={rotulo} />
    </div>
  );
}
