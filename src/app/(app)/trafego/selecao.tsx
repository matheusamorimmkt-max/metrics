"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { lerLista } from "@/dominio/lista-url";

function useNavegarSelecao() {
  const router = useRouter();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();
  function aplicar(mudancas: Record<string, string[] | null>) {
    const novo = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(mudancas)) {
      if (!v || v.length === 0) novo.delete(k);
      else novo.set(k, v.join(","));
    }
    iniciar(() => router.push(`/trafego?${novo.toString()}`));
  }
  return { aplicar, pendente, params };
}

/**
 * Caixa de seleção de uma campanha ("campanhas") ou conjunto ("conjuntos"). Igual ao
 * Gerenciador de Anúncios: selecionar campanhas restringe os conjuntos; selecionar
 * conjuntos restringe os anúncios. Desmarcar uma campanha solta os conjuntos dela.
 */
export function CaixaSelecao({
  chave,
  parametro,
  selecionados,
  rotulo,
}: {
  chave: string;
  parametro: "campanhas" | "conjuntos";
  selecionados: string[];
  rotulo: string;
}) {
  const { aplicar, pendente, params } = useNavegarSelecao();
  const marcado = selecionados.includes(chave);
  return (
    <input
      type="checkbox"
      className="accent-primary size-4 cursor-pointer"
      checked={marcado}
      disabled={pendente}
      aria-label={`Selecionar ${rotulo}`}
      onChange={() => {
        const lista = marcado
          ? selecionados.filter((c) => c !== chave)
          : [...selecionados, chave];
        const mudancas: Record<string, string[] | null> = { [parametro]: lista };
        if (parametro === "campanhas" && marcado) {
          const campanhaId = chave.slice(2);
          const conjuntos = lerLista(params.get("conjuntos")).filter(
            (c) => !c.startsWith(`s:${campanhaId}:`),
          );
          mudancas.conjuntos = conjuntos;
        }
        aplicar(mudancas);
      }}
    />
  );
}

/** Resumo da seleção atual com botão para limpar. */
export function BarraSelecao({
  campanhas,
  conjuntos,
}: {
  campanhas: number;
  conjuntos: number;
}) {
  const { aplicar, pendente } = useNavegarSelecao();
  if (!campanhas && !conjuntos) return null;
  const partes = [
    campanhas ? `${campanhas} ${campanhas === 1 ? "campanha" : "campanhas"}` : null,
    conjuntos ? `${conjuntos} ${conjuntos === 1 ? "conjunto" : "conjuntos"}` : null,
  ].filter(Boolean);
  return (
    <div className="bg-muted/60 flex flex-wrap items-center gap-2 rounded-md px-3 py-1.5 text-sm">
      <span>
        Filtrando por {partes.join(" e ")} selecionad
        {campanhas + conjuntos === 1 ? "o" : "os"}.
      </span>
      <Button
        variant="link"
        size="sm"
        className="h-auto p-0"
        disabled={pendente}
        onClick={() => aplicar({ campanhas: null, conjuntos: null })}
      >
        Limpar seleção
      </Button>
    </div>
  );
}
