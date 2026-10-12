"use client";

import Link from "next/link";
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

export function FormularioRecuperarSenha() {
  const [resultado, acao] = useActionState(solicitarRecuperacaoSenha, RESULTADO_INICIAL);
  const erros = resultado.ok ? undefined : resultado.erros;

  if (resultado.ok && resultado.mensagem) {
    return (
      <div className="space-y-4">
        <Alert>
          <CheckCircle2 />
          <AlertTitle>E-mail enviado</AlertTitle>
          <AlertDescription>{resultado.mensagem}</AlertDescription>
        </Alert>
        <p className="text-center text-sm">
          <Link href="/login" className="underline underline-offset-4">
            Voltar para o login
          </Link>
        </p>
      </div>
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
          required
          autoFocus
        />
        <ErroCampo erros={erros} campo="email" />
      </div>

      <BotaoEnviar className="w-full" enviando="Enviando…">
        Enviar link de recuperação
      </BotaoEnviar>

      <p className="text-center text-sm">
        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
