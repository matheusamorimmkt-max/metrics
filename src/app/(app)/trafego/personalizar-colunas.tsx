"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
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
  COLUNAS_PADRAO_TRAFEGO,
  METRICAS_TRAFEGO,
  metricaTrafego,
} from "@/dominio/metricas-trafego";

const GRUPOS = [...new Set(METRICAS_TRAFEGO.map((m) => m.grupo))];

/**
 * Botão "+" da tabela de tráfego: à esquerda o usuário marca as métricas, à direita
 * ordena a sequência das colunas (como "Personalizar colunas" do Gerenciador).
 */
export function PersonalizarColunas({
  colunas,
  aoSalvar,
}: {
  colunas: string[];
  aoSalvar: (colunas: string[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [escolha, setEscolha] = useState<string[]>(colunas);

  function abrir(valor: boolean) {
    if (valor) setEscolha(colunas);
    setAberto(valor);
  }
  function alternar(chave: string) {
    setEscolha((atual) =>
      atual.includes(chave) ? atual.filter((c) => c !== chave) : [...atual, chave],
    );
  }
  function mover(indice: number, delta: number) {
    setEscolha((atual) => {
      const destino = indice + delta;
      if (destino < 0 || destino >= atual.length) return atual;
      const copia = [...atual];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={abrir}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" aria-label="Adicionar métricas" />}
      >
        <Plus data-icon="inline-start" />
        Métricas
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Personalizar colunas</DialogTitle>
          <DialogDescription>
            Marque as métricas à esquerda e ordene a sequência das colunas à direita.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
            {GRUPOS.map((grupo) => (
              <fieldset key={grupo} className="space-y-1">
                <legend className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                  {grupo}
                </legend>
                {METRICAS_TRAFEGO.filter((m) => m.grupo === grupo).map((m) => (
                  <label
                    key={m.chave}
                    className="hover:bg-muted/60 flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5"
                  >
                    <input
                      type="checkbox"
                      className="accent-primary mt-0.5 size-4"
                      checked={escolha.includes(m.chave)}
                      onChange={() => alternar(m.chave)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{m.nome}</span>
                      <span className="text-muted-foreground block text-xs">
                        {m.descricao}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Ordem das colunas ({escolha.length})
            </p>
            {escolha.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhuma métrica marcada. Sem escolha, a tabela mostra as colunas padrão.
              </p>
            ) : (
              <ol className="space-y-1">
                {escolha.map((chave, i) => (
                  <li
                    key={chave}
                    className="bg-muted/40 flex items-center gap-1 rounded-md px-2 py-1 text-sm"
                  >
                    <span className="text-muted-foreground w-5 tabular-nums">
                      {i + 1}.
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {metricaTrafego(chave)?.nome ?? chave}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Mover para cima"
                      disabled={i === 0}
                      onClick={() => mover(i, -1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Mover para baixo"
                      disabled={i === escolha.length - 1}
                      onClick={() => mover(i, 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remover"
                      onClick={() => alternar(chave)}
                    >
                      <X />
                    </Button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => setEscolha([...COLUNAS_PADRAO_TRAFEGO])}>
            Voltar ao padrão
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                aoSalvar(escolha);
                setAberto(false);
              }}
            >
              Aplicar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
