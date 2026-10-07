"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import {
  ErroCampo,
  ErroFormulario,
  RESULTADO_INICIAL,
} from "@/components/formulario/mensagens";
import { criarCategoria } from "@/servidor/acoes/categorias";

export function NovaCategoria() {
  const [resultado, acao] = useActionState(criarCategoria, RESULTADO_INICIAL);
  const erros = resultado.ok ? undefined : resultado.erros;
  const formRef = useRef<HTMLFormElement>(null);
  const ultimo = useRef(resultado);

  useEffect(() => {
    if (resultado === ultimo.current) return;
    ultimo.current = resultado;
    if (resultado.ok && resultado.mensagem) {
      toast.success(resultado.mensagem);
      formRef.current?.reset();
    }
  }, [resultado]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova categoria</CardTitle>
        <CardDescription>Ex.: “Eventos presenciais”, “Assinaturas”.</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={acao} className="space-y-4">
          <ErroFormulario resultado={resultado} />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="nova-nome">Nome</Label>
              <Input id="nova-nome" name="nome" maxLength={80} required />
              <ErroCampo erros={erros} campo="nome" />
            </div>
            <label className="flex h-9 items-center gap-2 text-sm">
              <input type="checkbox" name="tem_semaforo" className="size-4" />
              Mostrar semáforo
            </label>
            <BotaoEnviar enviando="Criando…">Criar categoria</BotaoEnviar>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
