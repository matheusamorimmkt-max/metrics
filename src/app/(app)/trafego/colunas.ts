"use client";

import { useCallback, useSyncExternalStore } from "react";
import { COLUNAS_PADRAO_TRAFEGO, normalizarColunas } from "@/dominio/metricas-trafego";

const EVENTO = "trafego-preferencias";

function ler(chave: string, padrao: string): string {
  try {
    return window.localStorage.getItem(chave) ?? padrao;
  } catch {
    return padrao;
  }
}

function assinar(aoMudar: () => void) {
  window.addEventListener(EVENTO, aoMudar);
  window.addEventListener("storage", aoMudar);
  return () => {
    window.removeEventListener(EVENTO, aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

/** Preferência guardada no navegador, como texto. */
function usePreferencia(
  chave: string,
  padrao: string,
): [string, (valor: string) => void] {
  const valor = useSyncExternalStore(
    assinar,
    () => ler(chave, padrao),
    () => padrao,
  );
  const definir = useCallback(
    (novo: string) => {
      try {
        window.localStorage.setItem(chave, novo);
      } catch {
        /* navegador sem armazenamento: a escolha vale só até recarregar */
      }
      window.dispatchEvent(new Event(EVENTO));
    },
    [chave],
  );
  return [valor, definir];
}

/** Colunas escolhidas pelo usuário na aba Tráfego. */
export function useColunasTrafego(): [string[], (colunas: string[]) => void] {
  const [texto, definir] = usePreferencia(
    "trafego.colunas",
    COLUNAS_PADRAO_TRAFEGO.join(","),
  );
  const colunas = normalizarColunas(texto.split(",").filter(Boolean));
  const definirColunas = useCallback(
    (novas: string[]) => definir(normalizarColunas(novas).join(",")),
    [definir],
  );
  return [colunas, definirColunas];
}

/** Largura (px) de cada coluna, ajustada arrastando a borda do cabeçalho. */
export function useLargurasTrafego(): [
  Record<string, number>,
  (chave: string, largura: number) => void,
] {
  const [texto, definir] = usePreferencia("trafego.larguras", "{}");
  let larguras: Record<string, number> = {};
  try {
    larguras = JSON.parse(texto) as Record<string, number>;
  } catch {
    larguras = {};
  }
  const definirLargura = useCallback(
    (chave: string, largura: number) => {
      const atual = (() => {
        try {
          return JSON.parse(ler("trafego.larguras", "{}")) as Record<string, number>;
        } catch {
          return {};
        }
      })();
      definir(JSON.stringify({ ...atual, [chave]: Math.round(largura) }));
    },
    [definir],
  );
  return [larguras, definirLargura];
}
