"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  escreverSelecao,
  lerSelecao,
  selecaoVazia,
  type SelecaoFiltro,
} from "@/dominio/filtro-home";
import type { FunilInfo } from "@/servidor/consultas/home";
import { cn } from "@/lib/utils";

/** Caixa que aceita o estado "parte marcada" (categoria com só alguns funis). */
function Caixa({
  marcada,
  parcial = false,
  onChange,
  rotulo,
  className,
}: {
  marcada: boolean;
  parcial?: boolean;
  onChange: (marcar: boolean) => void;
  rotulo: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = parcial && !marcada;
  }, [parcial, marcada]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn("size-4", className)}
      checked={marcada}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={rotulo}
    />
  );
}

/**
 * Filtro da Home: negócio inteiro, categorias e funis em caixas de seleção. Marcar uma
 * categoria abre a sanfona com os funis dela; desmarcar um funil deixa a categoria
 * "parte marcada". A escolha vai para a URL (`filtro`) ao clicar em Aplicar.
 */
export function FiltroHome({
  filtroAtual,
  categorias,
  funis,
  base = "/",
  desabilitado = false,
}: {
  filtroAtual: string;
  categorias: { id: string; nome: string }[];
  funis: FunilInfo[];
  base?: string;
  desabilitado?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();
  const aplicada = lerSelecao(filtroAtual);
  const [aberto, setAberto] = useState(false);
  const [selecao, setSelecao] = useState<SelecaoFiltro>(aplicada);
  const [abertas, setAbertas] = useState<Set<string>>(new Set(aplicada.categorias));

  const funisDa = (categoriaId: string) => funis.filter((f) => f.categoria_id === categoriaId);

  function navegar(nova: SelecaoFiltro) {
    const novo = new URLSearchParams(params.toString());
    const texto = escreverSelecao(nova);
    if (texto) novo.set("filtro", texto);
    else novo.delete("filtro");
    iniciar(() => router.push(`${base}?${novo.toString()}`));
  }

  function abrir(valor: boolean) {
    if (valor) {
      setSelecao(aplicada);
      setAbertas(new Set(aplicada.categorias));
    }
    setAberto(valor);
  }

  function alternarCategoria(id: string, marcar: boolean) {
    const idsFunis = funisDa(id).map((f) => f.id);
    setSelecao((s) => ({
      categorias: marcar ? [...new Set([...s.categorias, id])] : s.categorias.filter((c) => c !== id),
      funis: s.funis.filter((f) => !idsFunis.includes(f)),
    }));
    if (marcar) setAbertas((a) => new Set([...a, id]));
  }

  function alternarFunil(categoriaId: string, funilId: string, marcar: boolean) {
    const irmaos = funisDa(categoriaId).map((f) => f.id);
    setSelecao((s) => {
      const categoriaMarcada = s.categorias.includes(categoriaId);
      let funisSel = s.funis.filter((f) => !irmaos.includes(f));
      const marcados = new Set(
        categoriaMarcada ? irmaos : s.funis.filter((f) => irmaos.includes(f)),
      );
      if (marcar) marcados.add(funilId);
      else marcados.delete(funilId);
      const todos = irmaos.length > 0 && irmaos.every((f) => marcados.has(f));
      const categorias = todos
        ? [...new Set([...s.categorias, categoriaId])]
        : s.categorias.filter((c) => c !== categoriaId);
      if (!todos) funisSel = [...funisSel, ...irmaos.filter((f) => marcados.has(f))];
      return { categorias, funis: funisSel };
    });
  }

  const chips = [
    ...aplicada.categorias.map((id) => ({
      chave: `categoria:${id}`,
      rotulo: categorias.find((c) => c.id === id)?.nome ?? "Categoria",
      remover: () => navegar({ ...aplicada, categorias: aplicada.categorias.filter((c) => c !== id) }),
    })),
    ...aplicada.funis.map((id) => ({
      chave: `funil:${id}`,
      rotulo: funis.find((f) => f.id === id)?.nome ?? "Funil",
      remover: () => navegar({ ...aplicada, funis: aplicada.funis.filter((f) => f !== id) }),
    })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dialog open={aberto} onOpenChange={abrir}>
        <DialogTrigger render={<Button variant="outline" disabled={desabilitado || pendente} />}>
          <SlidersHorizontal data-icon="inline-start" />
          Filtro
          {chips.length ? (
            <Badge variant="secondary" className="ml-1">
              {chips.length}
            </Badge>
          ) : null}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>O que você quer ver</DialogTitle>
            <DialogDescription>
              Marque o negócio inteiro, uma ou mais categorias ou um ou mais funis. Marcar
              uma categoria inclui todos os funis dela.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
            <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-muted">
              <Caixa
                marcada={selecaoVazia(selecao)}
                onChange={() => setSelecao({ categorias: [], funis: [] })}
                rotulo="Negócio inteiro"
              />
              Negócio inteiro
            </label>
            {categorias.map((c) => {
              const lista = funisDa(c.id);
              const marcada = selecao.categorias.includes(c.id);
              const parcial = !marcada && lista.some((f) => selecao.funis.includes(f.id));
              const aberta = abertas.has(c.id);
              return (
                <div key={c.id}>
                  <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                    <Caixa
                      marcada={marcada}
                      parcial={parcial}
                      onChange={(m) => alternarCategoria(c.id, m)}
                      rotulo={c.nome}
                    />
                    <button
                      type="button"
                      className="flex flex-1 items-center justify-between gap-2 text-left"
                      onClick={() =>
                        setAbertas((a) => {
                          const n = new Set(a);
                          if (n.has(c.id)) n.delete(c.id);
                          else n.add(c.id);
                          return n;
                        })
                      }
                      aria-expanded={aberta}
                      aria-label={`${aberta ? "Recolher" : "Mostrar"} funis de ${c.nome}`}
                    >
                      <span className="font-medium">{c.nome}</span>
                      <span className="text-muted-foreground flex items-center gap-1 text-xs">
                        {lista.length} {lista.length === 1 ? "funil" : "funis"}
                        {aberta ? (
                          <ChevronDown className="size-4" aria-hidden />
                        ) : (
                          <ChevronRight className="size-4" aria-hidden />
                        )}
                      </span>
                    </button>
                  </div>
                  {aberta ? (
                    <div className="ml-6 border-l pl-3">
                      {lista.length === 0 ? (
                        <p className="text-muted-foreground px-2 py-1 text-xs">
                          Nenhum funil nesta categoria.
                        </p>
                      ) : (
                        lista.map((f) => (
                          <label
                            key={f.id}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                          >
                            <Caixa
                              marcada={marcada || selecao.funis.includes(f.id)}
                              onChange={(m) => alternarFunil(c.id, f.id, m)}
                              rotulo={f.nome}
                            />
                            {f.nome}
                          </label>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelecao({ categorias: [], funis: [] })}
              disabled={selecaoVazia(selecao)}
            >
              Limpar
            </Button>
            <Button
              type="button"
              onClick={() => {
                setAberto(false);
                navegar(selecao);
              }}
            >
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {chips.map((chip) => (
        <button
          key={chip.chave}
          type="button"
          onClick={chip.remover}
          disabled={pendente}
          className="bg-muted hover:bg-muted/70 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
          title="Remover do filtro"
        >
          {chip.rotulo}
          <X className="size-3" aria-hidden />
        </button>
      ))}
    </div>
  );
}
