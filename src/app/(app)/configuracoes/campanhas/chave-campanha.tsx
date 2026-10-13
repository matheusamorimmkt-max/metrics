"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { alterarStatusVeiculacao } from "@/servidor/acoes/campanhas";

type Nivel = "campanha" | "conjunto" | "anuncio";
const ROTULO: Record<Nivel, string> = {
  campanha: "campanha",
  conjunto: "conjunto",
  anuncio: "anúncio",
};

/** Chave liga/desliga de campanha, conjunto ou anúncio, como no Gerenciador de Anúncios. */
export function ChaveVeiculacao({
  nivel,
  id,
  nome,
  ativa,
  size = "default",
}: {
  nivel: Nivel;
  id: string;
  nome: string;
  ativa: boolean;
  size?: "default" | "sm";
}) {
  const [ligada, setLigada] = useState(ativa);
  const [pendente, iniciar] = useTransition();

  function mudar(novo: boolean) {
    const anterior = ligada;
    setLigada(novo);
    iniciar(async () => {
      const r = await alterarStatusVeiculacao(nivel, id, novo);
      if (!r.ok) {
        setLigada(anterior);
        toast.error(r.erro ?? "Não foi possível alterar.");
      } else if (r.mensagem) {
        toast.success(r.mensagem);
      }
    });
  }

  return (
    <Switch
      checked={ligada}
      onCheckedChange={mudar}
      disabled={pendente}
      size={size}
      aria-label={`${ligada ? "Pausar" : "Voltar a veicular"} ${ROTULO[nivel]} ${nome}`}
      title={
        ligada
          ? "Em veiculação. Clique para pausar."
          : "Pausado. Clique para voltar a veicular."
      }
    />
  );
}

/** Compatibilidade: chave de campanha. */
export function ChaveCampanha(props: {
  campanhaId: string;
  nome: string;
  ativa: boolean;
  size?: "default" | "sm";
}) {
  return <ChaveVeiculacao nivel="campanha" id={props.campanhaId} {...props} />;
}
