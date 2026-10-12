"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import {
  ErroCampo,
  ErroFormulario,
  RESULTADO_INICIAL,
} from "@/components/formulario/mensagens";
import { solicitarRecuperacaoSenha } from "@/servidor/acoes/auth";

export function FormularioEsqueciSenha({ email }: { email?: string }) {
  const [resultado, acao] = useActionState(solicitarRecuperacaoSenha, RESULTADO_INICIAL);
  const erros = resultado.ok ? undefined : resultado.erros;

  if (resultado.ok && resultado.mensagem) {
    return (
      <Alert>
        <CheckCircle2 />
        <AlertTitle>E-mail enviado</AlertTitle>
        <AlertDescription>{resultado.mensagem}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={acao} className="space-y-4">
      <ErroFormulario resultado={resultado} />

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={email}
          required
          autoFocus
        />
        <ErroCampo erros={erros} campo="email" />
      </div>

      <BotaoEnviar className="w-full" enviando="Enviando…">
        Enviar link de recuperação
      </BotaoEnviar>
    </form>
  );
}
