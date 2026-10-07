"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
import {
  DESCRICAO_TIPO_FUNIL,
  ROTULO_TIPO_FUNIL,
  TIPOS_FUNIL,
  type TipoFunil,
} from "@/dominio/schemas/funil";
import { fracaoParaTexto } from "@/dominio/percentual";
import type { Resultado } from "@/servidor/acoes/resultado";
import type { FunilResumo } from "@/servidor/consultas/funis";

type Acao = (anterior: Resultado, formData: FormData) => Promise<Resultado>;

export function FormularioFunil({
  acao,
  categorias,
  inicial,
  titulo,
  descricao,
  textoBotao,
}: {
  acao: Acao;
  categorias: { id: string; nome: string; tem_semaforo: boolean }[];
  inicial?: FunilResumo;
  titulo: string;
  descricao: string;
  textoBotao: string;
}) {
  const [resultado, dispatch] = useActionState(acao, RESULTADO_INICIAL);
  const erros = resultado.ok ? undefined : resultado.erros;
  const ultimo = useRef(resultado);
  const [tipo, setTipo] = useState<TipoFunil>(inicial?.tipo ?? "venda_direta");
  const [categoriaId, setCategoriaId] = useState(
    inicial?.categoria_id ?? categorias[0]?.id ?? "",
  );

  useEffect(() => {
    if (resultado === ultimo.current) return;
    ultimo.current = resultado;
    if (resultado.ok && resultado.mensagem) toast.success(resultado.mensagem);
  }, [resultado]);

  const categoriaTemSemaforo =
    categorias.find((c) => c.id === categoriaId)?.tem_semaforo ?? false;

  return (
    <form action={dispatch}>
      <Card>
        <CardHeader>
          <CardTitle>{titulo}</CardTitle>
          <CardDescription>{descricao}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ErroFormulario resultado={resultado} />

          <Campo
            id="nome"
            rotulo="Nome do funil"
            erros={erros}
            ajuda="Ex.: Funil Desafio, Imersão X, Mentoria Elite."
          >
            <Input
              id="nome"
              name="nome"
              defaultValue={inicial?.nome}
              maxLength={120}
              required
              autoFocus
            />
          </Campo>

          <div className="grid gap-6 sm:grid-cols-2">
            <Campo id="categoria_id" rotulo="Categoria" erros={erros}>
              <Selecao
                id="categoria_id"
                name="categoria_id"
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                required
              >
                {categorias.length === 0 ? (
                  <option value="">Crie uma categoria antes</option>
                ) : null}
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>

            <Campo
              id="tipo"
              rotulo="Tipo"
              erros={erros}
              ajuda={DESCRICAO_TIPO_FUNIL[tipo]}
            >
              <Selecao
                id="tipo"
                name="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoFunil)}
                required
              >
                {TIPOS_FUNIL.map((t) => (
                  <option key={t} value={t}>
                    {ROTULO_TIPO_FUNIL[t]}
                  </option>
                ))}
              </Selecao>
            </Campo>

            {tipo === "lancamento" ? (
              <>
                <Campo id="data_inicio" rotulo="Início do lançamento" erros={erros}>
                  <Input
                    id="data_inicio"
                    name="data_inicio"
                    type="date"
                    defaultValue={inicial?.data_inicio ?? ""}
                    required
                  />
                </Campo>
                <Campo id="data_fim" rotulo="Fim do lançamento" erros={erros}>
                  <Input
                    id="data_fim"
                    name="data_fim"
                    type="date"
                    defaultValue={inicial?.data_fim ?? ""}
                    required
                  />
                </Campo>
              </>
            ) : null}

            <Campo
              id="meta_roi"
              rotulo="Meta de ROI (%)"
              erros={erros}
              ajuda={
                categoriaTemSemaforo
                  ? "Acima da meta: verde. Entre 0% e a meta: amarelo. Abaixo de 0%: vermelho. Padrão 20."
                  : "Usada pelo semáforo; esta categoria não mostra semáforo, mas o valor fica guardado."
              }
            >
              <Input
                id="meta_roi"
                name="meta_roi"
                inputMode="decimal"
                defaultValue={fracaoParaTexto(inicial?.meta_roi ?? 0.2)}
                required
              />
            </Campo>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <BotaoEnviar disabled={categorias.length === 0}>{textoBotao}</BotaoEnviar>
        </CardFooter>
      </Card>
    </form>
  );
}
