"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Selecao } from "@/components/formulario/selecao";
import { PERIODOS, type Periodo } from "@/dominio/periodo";
import type { FunilInfo } from "@/servidor/consultas/home";

/** Seletor de período e filtro Negócio / Categoria / Funil. Tudo vive na URL. */
export function SeletorHome({
  periodo,
  filtroAtual,
  categorias,
  funis,
}: {
  periodo: Periodo;
  filtroAtual: string;
  categorias: { id: string; nome: string }[];
  funis: FunilInfo[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();

  function navegar(mudancas: Record<string, string | null>) {
    const novo = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(mudancas)) {
      if (v === null || v === "") novo.delete(k);
      else novo.set(k, v);
    }
    iniciar(() => router.push(`/?${novo.toString()}`));
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

      <Selecao
        value={filtroAtual}
        onChange={(e) => navegar({ filtro: e.target.value || null })}
        disabled={pendente}
        className="md:w-64"
        aria-label="Filtro"
      >
        <option value="">Negócio inteiro</option>
        {categorias.length ? (
          <optgroup label="Categorias">
            {categorias.map((c) => (
              <option key={c.id} value={`categoria:${c.id}`}>
                {c.nome}
              </option>
            ))}
          </optgroup>
        ) : null}
        {funis.length ? (
          <optgroup label="Funis">
            {funis.map((f) => (
              <option key={f.id} value={`funil:${f.id}`}>
                {f.categoria_nome} · {f.nome}
              </option>
            ))}
          </optgroup>
        ) : null}
      </Selecao>
    </div>
  );
}
