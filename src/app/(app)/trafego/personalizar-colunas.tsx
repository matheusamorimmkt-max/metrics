"use client";

import { useState, type DragEvent } from "react";
import { GripVertical, X } from "lucide-react";
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
import { cn } from "@/lib/utils";

const GRUPOS = [...new Set(METRICAS_TRAFEGO.map((m) => m.grupo))];

/**
 * "Adicionar métricas": à esquerda o usuário marca as métricas, à direita arrasta para
 * ordenar a sequência das colunas (como "Personalizar colunas" do Gerenciador).
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
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);

  function abrir(valor: boolean) {
    if (valor) setEscolha(colunas);
    setAberto(valor);
  }
  function alternar(chave: string) {
    setEscolha((atual) =>
      atual.includes(chave) ? atual.filter((c) => c !== chave) : [...atual, chave],
    );
  }
  function soltar(destino: string) {
    if (!arrastando || arrastando === destino) return;
    setEscolha((atual) => {
      const semOrigem = atual.filter((c) => c !== arrastando);
      const indice = semOrigem.indexOf(destino);
      semOrigem.splice(indice, 0, arrastando);
      return semOrigem;
    });
  }
  function permitir(e: DragEvent, chave: string) {
    e.preventDefault();
    if (sobre !== chave) setSobre(chave);
  }

  return (
    <Dialog open={aberto} onOpenChange={abrir}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Adicionar métricas
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Personalizar colunas</DialogTitle>
          <DialogDescription>
            Marque as métricas à esquerda. À direita, arraste para cima ou para baixo para
            definir a ordem das colunas.
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
              <ol className="space-y-1" onDragLeave={() => setSobre(null)}>
                {escolha.map((chave, i) => (
                  <li
                    key={chave}
                    draggable
                    onDragStart={(e) => {
                      setArrastando(chave);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => permitir(e, chave)}
                    onDrop={(e) => {
                      e.preventDefault();
                      soltar(chave);
                      setArrastando(null);
                      setSobre(null);
                    }}
                    onDragEnd={() => {
                      setArrastando(null);
                      setSobre(null);
                    }}
                    className={cn(
                      "bg-muted/40 flex cursor-grab items-center gap-1 rounded-md px-2 py-1.5 text-sm select-none active:cursor-grabbing",
                      arrastando === chave && "opacity-50",
                      sobre === chave && arrastando !== chave && "ring-primary ring-2",
                    )}
                  >
                    <GripVertical
                      className="text-muted-foreground size-4 shrink-0"
                      aria-hidden
                    />
                    <span className="text-muted-foreground w-5 tabular-nums">
                      {i + 1}.
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {metricaTrafego(chave)?.nome ?? chave}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remover ${metricaTrafego(chave)?.nome ?? chave}`}
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
