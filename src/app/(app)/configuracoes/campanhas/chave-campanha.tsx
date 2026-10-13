"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { alterarStatusCampanha } from "@/servidor/acoes/campanhas";

/** Chave liga/desliga da campanha, como no Gerenciador de Anúncios. */
export function ChaveCampanha({
  campanhaId,
  nome,
  ativa,
  size = "default",
}: {
  campanhaId: string;
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
      const r = await alterarStatusCampanha(campanhaId, novo);
      if (!r.ok) {
        setLigada(anterior);
        toast.error(r.erro ?? "Não foi possível alterar a campanha.");
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
      aria-label={`${ligada ? "Desativar" : "Ligar"} campanha ${nome}`}
      title={
        ligada
          ? "Campanha ligada. Clique para desativar."
          : "Campanha desativada. Clique para ligar."
      }
    />
  );
}
