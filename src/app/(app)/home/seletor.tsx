"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PERIODOS, type Periodo } from "@/dominio/periodo";
import type { FunilInfo } from "@/servidor/consultas/home";
import { FiltroHome } from "./filtro-home";

/** Seletor de período e filtro (negócio, categorias e funis). Tudo vive na URL. */
export function SeletorHome({
  periodo,
  filtroAtual,
  categorias,
  funis,
  base = "/",
}: {
  periodo: Periodo;
  filtroAtual: string;
  categorias: { id: string; nome: string }[];
  funis: FunilInfo[];
  /** Rota que recebe os parâmetros (Home, /funis ou /funis/[id]). */
  base?: string;
}) {
  const mostrarFiltro = base === "/";
  const router = useRouter();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();

  function navegar(mudancas: Record<string, string | null>) {
    const novo = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(mudancas)) {
      if (v === null || v === "") novo.delete(k);
      else novo.set(k, v);
    }
    iniciar(() => router.push(`${base}?${novo.toString()}`));
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div
        className="flex flex-wrap items-center gap-1"
        role="group"
        aria-label="Período"
      >
        {PERIODOS.map((p) => (
          <Button
            key={p.chave}
            size="sm"
            variant={periodo.chave === p.chave ? "default" : "ghost"}
            disabled={pendente}
            onClick={() =>
              navegar(
                p.chave === "personalizado"
                  ? { periodo: p.chave, de: periodo.de, ate: periodo.ate }
                  : { periodo: p.chave, de: null, ate: null },
              )
            }
          >
            {p.rotulo}
          </Button>
        ))}
        {periodo.chave === "personalizado" ? (
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              navegar({ de: String(f.get("de")), ate: String(f.get("ate")) });
            }}
          >
            <Input
              type="date"
              name="de"
              defaultValue={periodo.de}
              className="w-36"
              aria-label="De"
            />
            <span className="text-muted-foreground text-xs">a</span>
            <Input
              type="date"
              name="ate"
              defaultValue={periodo.ate}
              className="w-36"
              aria-label="Até"
            />
            <Button type="submit" size="sm" variant="outline" disabled={pendente}>
              Aplicar
            </Button>
          </form>
        ) : null}
      </div>

      {mostrarFiltro ? (
        <FiltroHome
          filtroAtual={filtroAtual}
          categorias={categorias}
          funis={funis}
          base={base}
          desabilitado={pendente}
        />
      ) : null}
    </div>
  );
}
