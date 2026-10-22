"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import { Campo } from "@/components/formulario/campo";
import { OpcoesBaseImposto } from "@/components/formulario/opcoes-base-imposto";
import {
  ErroCampo,
  ErroFormulario,
  RESULTADO_INICIAL,
} from "@/components/formulario/mensagens";
import { fracaoParaTexto } from "@/dominio/percentual";
import type { BaseImposto } from "@/dominio/schemas/produto";
import { salvarImpostoOrganizacao } from "@/servidor/acoes/configuracoes";
import type { Organizacao } from "@/servidor/sessao";

/** Imposto sobre as vendas do negócio: vale para todos os produtos não personalizados. */
export function FormularioImposto({ organizacao }: { organizacao: Organizacao }) {
  const [resultado, acao] = useActionState(salvarImpostoOrganizacao, RESULTADO_INICIAL);
  const erros = resultado.ok ? undefined : resultado.erros;
  const ultimo = useRef(resultado);

  useEffect(() => {
    if (resultado === ultimo.current) return;
    ultimo.current = resultado;
    if (resultado.ok && resultado.mensagem) toast.success(resultado.mensagem);
  }, [resultado]);

  return (
    <form action={acao}>
      <Card>
        <CardHeader>
          <CardTitle>Imposto sobre as vendas</CardTitle>
          <CardDescription>
            Alíquota do negócio, aplicada a todos os produtos e a todo o histórico de
            vendas. Produto com alíquota diferente pode ser personalizado em Configurações
            → Produtos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ErroFormulario resultado={resultado} />
          <Campo
            id="aliquota_imposto"
            rotulo="Alíquota (%)"
            erros={erros}
            ajuda="Percentual de imposto sobre as vendas. Ex.: 6 para 6%."
          >
            <Input
              id="aliquota_imposto"
              name="aliquota_imposto"
              inputMode="decimal"
              defaultValue={fracaoParaTexto(organizacao.aliquota_imposto)}
              className="max-w-40"
              required
            />
          </Campo>
          <div className="space-y-2">
            <p className="text-sm font-medium">Base de cálculo</p>
            <OpcoesBaseImposto valorInicial={organizacao.base_imposto as BaseImposto} />
            <ErroCampo erros={erros} campo="base_imposto" />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <BotaoEnviar>Salvar e aplicar a todo o histórico</BotaoEnviar>
        </CardFooter>
      </Card>
    </form>
  );
}
