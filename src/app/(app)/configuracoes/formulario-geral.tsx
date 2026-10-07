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
import { Selecao } from "@/components/formulario/selecao";
import { ErroFormulario, RESULTADO_INICIAL } from "@/components/formulario/mensagens";
import { fracaoParaTexto } from "@/dominio/percentual";
import { FUSOS_SUGERIDOS } from "@/dominio/fuso-horario";
import { atualizarConfiguracoesGerais } from "@/servidor/acoes/configuracoes";
import type { Organizacao } from "@/servidor/sessao";

export function FormularioGeral({ organizacao }: { organizacao: Organizacao }) {
  const [resultado, acao] = useActionState(
    atualizarConfiguracoesGerais,
    RESULTADO_INICIAL,
  );
  const erros = resultado.ok ? undefined : resultado.erros;
  const ultimo = useRef(resultado);

  useEffect(() => {
    if (resultado === ultimo.current) return;
    ultimo.current = resultado;
    if (resultado.ok && resultado.mensagem) toast.success(resultado.mensagem);
  }, [resultado]);

  const fusos = FUSOS_SUGERIDOS.includes(
    organizacao.fuso_horario as (typeof FUSOS_SUGERIDOS)[number],
  )
    ? [...FUSOS_SUGERIDOS]
    : [organizacao.fuso_horario, ...FUSOS_SUGERIDOS];

  return (
    <form action={acao}>
      <Card>
        <CardHeader>
          <CardTitle>Geral</CardTitle>
          <CardDescription>
            Nome da empresa e os dois parâmetros que entram em todos os cálculos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ErroFormulario resultado={resultado} />

          <Campo id="nome" rotulo="Nome da empresa" erros={erros}>
            <Input
              id="nome"
              name="nome"
              defaultValue={organizacao.nome}
              maxLength={120}
              required
            />
          </Campo>

          <div className="grid gap-6 sm:grid-cols-2">
            <Campo
              id="taxa_anuncios"
              rotulo="Taxa sobre anúncios (%)"
              erros={erros}
              ajuda="Percentual somado ao gasto do gerenciador para formar o investimento total. Padrão 12,15."
            >
              <Input
                id="taxa_anuncios"
                name="taxa_anuncios"
                inputMode="decimal"
                defaultValue={fracaoParaTexto(organizacao.taxa_anuncios)}
                required
              />
            </Campo>

            <Campo
              id="janela_transacao_min"
              rotulo="Janela de transação (minutos)"
              erros={erros}
              ajuda="Compras do mesmo cliente dentro desta janela contam como uma transação. Padrão 5."
            >
              <Input
                id="janela_transacao_min"
                name="janela_transacao_min"
                type="number"
                min={1}
                max={1440}
                step={1}
                defaultValue={organizacao.janela_transacao_min}
                required
              />
            </Campo>

            <Campo
              id="fuso_horario"
              rotulo="Fuso horário"
              erros={erros}
              ajuda="Define o que é “um dia” nos gráficos e no semáforo."
            >
              <Selecao
                id="fuso_horario"
                name="fuso_horario"
                defaultValue={organizacao.fuso_horario}
              >
                {fusos.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Selecao>
            </Campo>

            <Campo
              id="moeda"
              rotulo="Moeda"
              erros={erros}
              ajuda="Código de 3 letras. Padrão BRL."
            >
              <Input
                id="moeda"
                name="moeda"
                defaultValue={organizacao.moeda}
                maxLength={3}
                className="uppercase"
                required
              />
            </Campo>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <BotaoEnviar>Salvar</BotaoEnviar>
        </CardFooter>
      </Card>
    </form>
  );
}
