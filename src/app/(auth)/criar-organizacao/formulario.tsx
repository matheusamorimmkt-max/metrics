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
import { criarOrganizacao } from "@/servidor/acoes/organizacao";

export function FormularioCriarOrganizacao() {
  const [resultado, acao] = useActionState(criarOrganizacao, RESULTADO_INICIAL);
  const erros = resultado.ok ? undefined : resultado.erros;

  return (
    <form action={acao} className="space-y-4">
      <ErroFormulario resultado={resultado} />
      <div className="space-y-2">
        <Label htmlFor="nome">Nome da empresa</Label>
        <Input id="nome" name="nome" maxLength={120} required autoFocus />
        <ErroCampo erros={erros} campo="nome" />
        <p className="text-muted-foreground text-xs">
          Você poderá renomear depois em Configurações. As categorias padrão (Iscas
          gratuitas, Front-end, Back-end e High-end) serão criadas automaticamente.
        </p>
      </div>
      <BotaoEnviar className="w-full" enviando="Criando…">
        Criar empresa
      </BotaoEnviar>
    </form>
  );
}
