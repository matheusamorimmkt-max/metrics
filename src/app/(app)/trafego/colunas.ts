"use client";

import { useCallback, useSyncExternalStore } from "react";
import { COLUNAS_PADRAO_TRAFEGO, normalizarColunas } from "@/dominio/metricas-trafego";

const CHAVE = "trafego.colunas";
const EVENTO = "trafego-colunas";
const PADRAO = COLUNAS_PADRAO_TRAFEGO.join(",");

function ler(): string {
  try {
    return window.localStorage.getItem(CHAVE) ?? PADRAO;
  } catch {
    return PADRAO;
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

/** Colunas escolhidas pelo usuário na aba Tráfego, guardadas no navegador. */
export function useColunasTrafego(): [string[], (colunas: string[]) => void] {
  const texto = useSyncExternalStore(assinar, ler, () => PADRAO);
  const colunas = normalizarColunas(texto.split(",").filter(Boolean));
  const definir = useCallback((novas: string[]) => {
    try {
      window.localStorage.setItem(CHAVE, normalizarColunas(novas).join(","));
    } catch {
      /* navegador sem armazenamento: a escolha vale só até recarregar */
    }
    window.dispatchEvent(new Event(EVENTO));
  }, []);
  return [colunas, definir];
}
