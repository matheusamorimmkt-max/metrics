"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import {
  ErroCampo,
  ErroFormulario,
  RESULTADO_INICIAL,
} from "@/components/formulario/mensagens";
import { definirSenha } from "@/servidor/acoes/auth";

export function FormularioDefinirSenha() {
  const [resultado, acao] = useActionState(definirSenha, RESULTADO_INICIAL);
  const erros = resultado.ok ? undefined : resultado.erros;

  return (
    <form action={acao} className="space-y-4">
      <ErroFormulario resultado={resultado} />
      <div className="space-y-2">
        <Label htmlFor="senha">Nova senha</Label>
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          autoFocus
        />
        <ErroCampo erros={erros} campo="senha" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmacao">Repita a senha</Label>
        <Input
          id="confirmacao"
          name="confirmacao"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <ErroCampo erros={erros} campo="confirmacao" />
      </div>
      <BotaoEnviar className="w-full">Salvar e entrar</BotaoEnviar>
    </form>
  );
}
