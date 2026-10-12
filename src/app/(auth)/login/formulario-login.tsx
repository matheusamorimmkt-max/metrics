"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import { InputSenha } from "@/components/formulario/input-senha";
import {
  ErroCampo,
  ErroFormulario,
  RESULTADO_INICIAL,
} from "@/components/formulario/mensagens";
import { entrar } from "@/servidor/acoes/auth";

export function FormularioLogin({
  proximo,
  erroExterno,
}: {
  proximo?: string;
  erroExterno?: string;
}) {
  const [resultado, acao] = useActionState(entrar, RESULTADO_INICIAL);
  const erros = resultado.ok ? undefined : resultado.erros;

  return (
    <form action={acao} className="space-y-4">
      {proximo ? <input type="hidden" name="proximo" value={proximo} /> : null}

      {erroExterno && resultado.ok ? (
        <ErroFormulario resultado={{ ok: false, erro: erroExterno }} />
      ) : null}
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="senha">Senha</Label>
          <Link
            href="/esqueci-senha"
            className="text-muted-foreground hover:text-foreground text-xs underline"
          >
            Esqueci minha senha
          </Link>
        </div>
        <InputSenha id="senha" name="senha" autoComplete="current-password" required />
        <ErroCampo erros={erros} campo="senha" />
      </div>

      <BotaoEnviar className="w-full" enviando="Entrando…">
        Entrar
      </BotaoEnviar>

      <p className="text-muted-foreground text-center text-xs">
        Sem acesso? Peça um convite a um diretor da sua empresa.
      </p>
    </form>
  );
}
