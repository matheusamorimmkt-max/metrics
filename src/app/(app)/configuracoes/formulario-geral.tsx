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
import {
  FUSOS_BRASIL,
  FUSOS_MUNDO,
  ordenarPorGmt,
  rotuloFuso,
} from "@/dominio/fuso-horario";
import { MOEDAS, rotuloMoeda } from "@/dominio/moedas";
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

  const conhecidos = [...FUSOS_BRASIL, ...FUSOS_MUNDO].some(
    (f) => f.id === organizacao.fuso_horario,
  );
  const mundo = ordenarPorGmt(FUSOS_MUNDO);
  const moedaConhecida = MOEDAS.some((m) => m.codigo === organizacao.moeda);

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
              rotulo="Imposto sobre anúncios (%)"
              erros={erros}
              ajuda="Imposto somado ao gasto do gerenciador para formar o investimento total. Padrão 12,15."
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
              ajuda="Define o que é “um dia” nos gráficos e nas notificações."
            >
              <Selecao
                id="fuso_horario"
                name="fuso_horario"
                defaultValue={organizacao.fuso_horario}
              >
                {!conhecidos ? (
                  <option value={organizacao.fuso_horario}>
                    {rotuloFuso({
                      id: organizacao.fuso_horario,
                      cidades: organizacao.fuso_horario,
                    })}
                  </option>
                ) : null}
                <optgroup label="Brasil">
                  {FUSOS_BRASIL.map((f) => (
                    <option key={f.id} value={f.id}>
                      {rotuloFuso(f)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Mundo">
                  {mundo.map((f) => (
                    <option key={f.id} value={f.id}>
                      {rotuloFuso(f)}
                    </option>
                  ))}
                </optgroup>
              </Selecao>
            </Campo>

            <Campo
              id="moeda"
              rotulo="Moeda"
              erros={erros}
              ajuda="Moeda em que os valores aparecem. Padrão BRL."
            >
              <Selecao id="moeda" name="moeda" defaultValue={organizacao.moeda}>
                {!moedaConhecida ? (
                  <option value={organizacao.moeda}>
                    {rotuloMoeda(organizacao.moeda)}
                  </option>
                ) : null}
                {MOEDAS.map((m) => (
                  <option key={m.codigo} value={m.codigo}>
                    {rotuloMoeda(m.codigo)}
                  </option>
                ))}
              </Selecao>
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
