"use client";

import { Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConteudoDialogo } from "@/components/formulario/dialogo";
import { formatarMetrica } from "@/dominio/metricas";
import {
  ROTULO_TIPO_VERBA,
  textoParaVerba,
  verbaParaTexto,
  type TipoVerba,
} from "@/dominio/verba";
import { alterarVerbaVeiculacao } from "@/servidor/acoes/campanhas";
import type { Verba } from "@/servidor/consultas/trafego";

const TIPOS: TipoVerba[] = ["diaria", "total"];

/**
 * Orçamento de campanha ou conjunto com lápis para editar, como no Gerenciador de
 * Anúncios. Mostra o valor atual; o pop-up pede o valor novo e se é diário ou total.
 * Conjunto que usa o orçamento da campanha não é editável aqui (edita-se a campanha).
 */
export function EditorVerba({
  nivel,
  id,
  nome,
  verba,
  moeda,
}: {
  nivel: "campanha" | "conjunto";
  id: string;
  nome: string;
  verba: Verba | null;
  moeda: string;
}) {
  const atual = verba && verba.tipo !== "da_campanha" ? verba : null;
  const [aberto, setAberto] = useState(false);
  const [exibida, setExibida] = useState(atual);
  const [tipo, setTipo] = useState<TipoVerba>(atual?.tipo ?? "diaria");
  const [texto, setTexto] = useState(atual ? verbaParaTexto(atual.valor) : "");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function abrir(novo: boolean) {
    if (novo) {
      setTipo(exibida?.tipo ?? "diaria");
      setTexto(exibida ? verbaParaTexto(exibida.valor) : "");
      setErro(null);
    }
    setAberto(novo);
  }

  function salvar() {
    const valor = textoParaVerba(texto);
    if (valor === null) {
      setErro("Informe um valor maior que zero, por exemplo 150,00.");
      return;
    }
    iniciar(async () => {
      const r = await alterarVerbaVeiculacao(nivel, id, tipo, valor);
      if (!r.ok) {
        setErro(r.erro ?? "Não foi possível alterar o orçamento.");
        return;
      }
      setExibida({ tipo, valor });
      setAberto(false);
      toast.success(r.mensagem ?? "Orçamento atualizado.");
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={abrir}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="group/verba hover:bg-muted -mx-1 inline-flex items-center gap-1.5 rounded px-1 text-right"
            title="Editar orçamento"
            aria-label={`Editar orçamento de ${nome}`}
          />
        }
      >
        <span>
          {exibida ? (
            <>
              <div>{formatarMetrica(exibida.valor, "moeda", moeda)}</div>
              <div className="text-muted-foreground text-xs">{ROTULO_TIPO_VERBA[exibida.tipo]}</div>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
        <Pencil
          className="text-muted-foreground size-3 shrink-0 opacity-50 group-hover/verba:opacity-100"
          aria-hidden
        />
      </DialogTrigger>
      <ConteudoDialogo className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Orçamento</DialogTitle>
          <DialogDescription className="truncate">{nome}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="flex gap-2" role="radiogroup" aria-label="Tipo de orçamento">
              {TIPOS.map((t) => (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  variant={tipo === t ? "default" : "outline"}
                  role="radio"
                  aria-checked={tipo === t}
                  onClick={() => setTipo(t)}
                >
                  {ROTULO_TIPO_VERBA[t]}
                </Button>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              {tipo === "diaria"
                ? "Quanto gastar por dia, em média."
                : "Quanto gastar no total, até o fim da veiculação. Trocar de diário para total (ou o contrário) segue as regras do Meta e pode ser recusado."}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`verba-${id}`}>Valor ({moeda})</Label>
            <Input
              id={`verba-${id}`}
              inputMode="decimal"
              autoFocus
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setErro(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  salvar();
                }
              }}
              placeholder="150,00"
            />
            {erro ? <p className="text-destructive text-sm">{erro}</p> : null}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setAberto(false)} disabled={pendente}>
            Cancelar
          </Button>
          <Button type="button" onClick={salvar} disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </ConteudoDialogo>
    </Dialog>
  );
}
