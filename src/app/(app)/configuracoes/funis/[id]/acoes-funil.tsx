"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { definirAtivoFunil, excluirFunil } from "@/servidor/acoes/funis";
import type { FunilResumo } from "@/servidor/consultas/funis";

export function AcoesFunil({ funil }: { funil: FunilResumo }) {
  const [pendente, iniciar] = useTransition();

  function alternarAtivo() {
    iniciar(async () => {
      const r = await definirAtivoFunil(funil.id, !funil.ativo);
      if (r.ok && r.mensagem) toast.success(r.mensagem);
      if (!r.ok) toast.error(r.erro ?? "Não foi possível alterar.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Arquivar ou excluir</CardTitle>
        <CardDescription>
          Arquivar tira o funil das telas, mas preserva o histórico. Excluir apaga o funil
          e os vínculos de ofertas; as vendas em si continuam no sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={alternarAtivo} disabled={pendente}>
          {funil.ativo ? "Arquivar funil" : "Reativar funil"}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="destructive" />}>
            Excluir funil
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir “{funil.nome}”?</AlertDialogTitle>
              <AlertDialogDescription>
                {funil.total_ofertas > 0
                  ? `As ${funil.total_ofertas} ofertas vinculadas ficarão como “não vinculadas”. `
                  : ""}
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <FormAcao acao={excluirFunil}>
                <input type="hidden" name="id" value={funil.id} />
                <AlertDialogAction type="submit" variant="destructive">
                  Excluir
                </AlertDialogAction>
              </FormAcao>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
