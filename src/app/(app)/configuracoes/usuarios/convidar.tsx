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
import { convidarMembro } from "@/servidor/acoes/membros";

export function Convidar() {
  const [resultado, acao] = useActionState(convidarMembro, RESULTADO_INICIAL);
  const erros = resultado.ok ? undefined : resultado.erros;
  const formRef = useRef<HTMLFormElement>(null);
  const ultimo = useRef(resultado);

  useEffect(() => {
    if (resultado === ultimo.current) return;
    ultimo.current = resultado;
    if (resultado.ok && resultado.mensagem) {
      toast.success(resultado.mensagem, { duration: 8000 });
      formRef.current?.reset();
    }
  }, [resultado]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convidar diretor</CardTitle>
        <CardDescription>
          A pessoa recebe um e-mail com um link para definir a senha. Se já tiver conta,
          passa a ver esta organização no próximo acesso.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={acao} className="space-y-4">
          <ErroFormulario resultado={resultado} />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="convite-email">E-mail</Label>
              <Input id="convite-email" name="email" type="email" required />
              <ErroCampo erros={erros} campo="email" />
            </div>
            <BotaoEnviar enviando="Enviando…">Enviar convite</BotaoEnviar>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
