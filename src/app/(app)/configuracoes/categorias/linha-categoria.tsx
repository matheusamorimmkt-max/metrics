"use client";

import { useCallback, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FormAcao } from "@/components/formulario/form-acao";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import {
  definirSemaforo,
  excluirCategoria,
  moverCategoria,
  renomearCategoria,
} from "@/servidor/acoes/categorias";
import type { CategoriaComContagem } from "@/servidor/consultas/categorias";
import type { Resultado } from "@/servidor/acoes/resultado";

export function LinhaCategoria({
  categoria,
  primeira,
  ultima,
}: {
  categoria: CategoriaComContagem;
  primeira: boolean;
  ultima: boolean;
}) {
  const [renomeando, setRenomeando] = useState(false);
  const [pendente, iniciar] = useTransition();
  const [semaforo, setSemaforo] = useState(categoria.tem_semaforo);

  const fecharAoSalvar = useCallback((r: Resultado) => {
    if (r.ok) setRenomeando(false);
  }, []);

  function alternarSemaforo(ligado: boolean) {
    setSemaforo(ligado);
    iniciar(async () => {
      const r = await definirSemaforo(categoria.id, ligado);
      if (!r.ok) {
        setSemaforo(!ligado);
        toast.error(r.erro ?? "Não foi possível alterar o semáforo.");
      }
    });
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-1">
          <FormAcao acao={moverCategoria}>
            <input type="hidden" name="id" value={categoria.id} />
            <input type="hidden" name="direcao" value="cima" />
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              disabled={primeira}
              aria-label="Mover para cima"
            >
              <ArrowUp />
            </Button>
          </FormAcao>
          <FormAcao acao={moverCategoria}>
            <input type="hidden" name="id" value={categoria.id} />
            <input type="hidden" name="direcao" value="baixo" />
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              disabled={ultima}
              aria-label="Mover para baixo"
            >
              <ArrowDown />
            </Button>
          </FormAcao>
        </div>
      </TableCell>
      <TableCell className="font-medium">{categoria.nome}</TableCell>
      <TableCell className="text-center">{categoria.total_funis}</TableCell>
      <TableCell className="text-center">
        <Switch
          checked={semaforo}
          onCheckedChange={alternarSemaforo}
          disabled={pendente}
          aria-label={`Semáforo de ${categoria.nome}`}
        />
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          <Dialog open={renomeando} onOpenChange={setRenomeando}>
            <DialogTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label="Renomear" />}
            >
              <Pencil />
            </DialogTrigger>
            <DialogContent>
              <FormAcao
                acao={renomearCategoria}
                aoConcluir={fecharAoSalvar}
                className="space-y-4"
              >
                <DialogHeader>
                  <DialogTitle>Renomear categoria</DialogTitle>
                  <DialogDescription>
                    Os funis continuam onde estão; só o nome muda.
                  </DialogDescription>
                </DialogHeader>
                <input type="hidden" name="id" value={categoria.id} />
                <div className="space-y-2">
                  <Label htmlFor={`nome-${categoria.id}`}>Nome</Label>
                  <Input
                    id={`nome-${categoria.id}`}
                    name="nome"
                    defaultValue={categoria.nome}
                    maxLength={80}
                    required
                    autoFocus
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRenomeando(false)}
                  >
                    Cancelar
                  </Button>
                  <BotaoEnviar>Salvar</BotaoEnviar>
                </DialogFooter>
              </FormAcao>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Excluir"
                  disabled={categoria.total_funis > 0}
                  title={
                    categoria.total_funis > 0
                      ? "Mova ou exclua os funis desta categoria antes."
                      : undefined
                  }
                />
              }
            >
              <Trash2 />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir “{categoria.nome}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <FormAcao acao={excluirCategoria}>
                  <input type="hidden" name="id" value={categoria.id} />
                  <AlertDialogAction type="submit" variant="destructive">
                    Excluir
                  </AlertDialogAction>
                </FormAcao>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
