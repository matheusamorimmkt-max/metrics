"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Unplug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import { FormAcao } from "@/components/formulario/form-acao";
import { InputSenha } from "@/components/formulario/input-senha";
import {
  ErroCampo,
  ErroFormulario,
  RESULTADO_INICIAL,
} from "@/components/formulario/mensagens";
import { ROTULO_STATUS, type DefinicaoIntegracao } from "@/dominio/integracoes";
import { conectarIntegracao, desconectarIntegracao } from "@/servidor/acoes/integracoes";
import type { Integracao } from "@/servidor/consultas/integracoes";
import { formatarDataHora } from "@/lib/datas";
import { Logo } from "./logo";

const VARIANTE_STATUS = {
  desconectada: "outline",
  configurada: "secondary",
  conectada: "default",
  erro: "destructive",
} as const;

export function CartaoIntegracao({
  definicao,
  integracao,
  fuso,
}: {
  definicao: DefinicaoIntegracao;
  integracao?: Integracao;
  fuso: string;
}) {
  const status = integracao?.status ?? "desconectada";
  const temCredencial =
    status !== "desconectada" && Boolean(integracao?.credencial_sufixo);
  const [trocando, setTrocando] = useState(false);
  const mostrarFormulario = !temCredencial || trocando;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Logo src={definicao.logo} nome={definicao.nome} />
            {definicao.nome}
            <span className="text-muted-foreground text-xs font-normal">
              {definicao.categoria}
            </span>
          </span>
          <Badge variant={VARIANTE_STATUS[status]}>{ROTULO_STATUS[status]}</Badge>
        </CardTitle>
        <CardDescription>{definicao.descricao}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {temCredencial && integracao ? (
          <ResumoConexao definicao={definicao} integracao={integracao} fuso={fuso} />
        ) : null}

        {mostrarFormulario ? (
          <FormularioConexao
            definicao={definicao}
            trocando={temCredencial}
            aoConcluir={() => setTrocando(false)}
            aoCancelar={temCredencial ? () => setTrocando(false) : undefined}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setTrocando(true)}>
              <KeyRound data-icon="inline-start" />
              Trocar credenciais
            </Button>
            <BotaoDesconectar definicao={definicao} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResumoConexao({
  definicao,
  integracao,
  fuso,
}: {
  definicao: DefinicaoIntegracao;
  integracao: Integracao;
  fuso: string;
}) {
  return (
    <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
      <dt className="text-muted-foreground">{definicao.credencial.rotulo}</dt>
      <dd>
        termina em <code className="font-mono">••••{integracao.credencial_sufixo}</code>
        {integracao.credenciais_atualizadas_em ? (
          <span className="text-muted-foreground">
            {" "}
            · salvo em {formatarDataHora(integracao.credenciais_atualizadas_em, fuso)}
          </span>
        ) : null}
      </dd>
      {definicao.config.map((campo) => (
        <CampoResumo
          key={campo.nome}
          rotulo={campo.rotulo}
          valor={integracao.config[campo.nome] ?? ""}
        />
      ))}
      <dt className="text-muted-foreground">Última sincronização</dt>
      <dd>
        {integracao.ultima_sincronizacao
          ? formatarDataHora(integracao.ultima_sincronizacao, fuso)
          : "ainda não aconteceu; a primeira confirma se o acesso está correto"}
      </dd>
      {integracao.erro ? (
        <>
          <dt className="text-destructive">Último erro</dt>
          <dd className="text-destructive">{integracao.erro}</dd>
        </>
      ) : null}
    </dl>
  );
}

function CampoResumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd>
        <code className="font-mono">{valor || "—"}</code>
      </dd>
    </>
  );
}

function FormularioConexao({
  definicao,
  trocando,
  aoConcluir,
  aoCancelar,
}: {
  definicao: DefinicaoIntegracao;
  trocando: boolean;
  aoConcluir: () => void;
  aoCancelar?: () => void;
}) {
  const [resultado, acao] = useActionState(conectarIntegracao, RESULTADO_INICIAL);
  const erros = resultado.ok ? undefined : resultado.erros;
  const formRef = useRef<HTMLFormElement>(null);
  const ultimo = useRef(resultado);

  useEffect(() => {
    if (resultado === ultimo.current) return;
    ultimo.current = resultado;
    if (resultado.ok && resultado.mensagem) {
      toast.success(resultado.mensagem, { duration: 8000 });
      formRef.current?.reset();
      aoConcluir();
    }
  }, [resultado, aoConcluir]);

  const prefixo = `${definicao.tipo}-`;

  return (
    <form ref={formRef} action={acao} className="space-y-4" autoComplete="off">
      <input type="hidden" name="tipo" value={definicao.tipo} />
      <ErroFormulario resultado={resultado} />

      <div className="space-y-2">
        <Label htmlFor={`${prefixo}credencial`}>
          {trocando
            ? `Novo ${definicao.credencial.rotulo.toLowerCase()}`
            : definicao.credencial.rotulo}
        </Label>
        <InputSenha
          id={`${prefixo}credencial`}
          name="credencial"
          finalidade="token"
          placeholder={definicao.credencial.placeholder}
          required
        />
        <p className="text-muted-foreground text-xs">{definicao.credencial.ajuda}</p>
        <ErroCampo erros={erros} campo="credencial" />
      </div>

      {definicao.config.map((campo) => (
        <div key={campo.nome} className="space-y-2">
          <Label htmlFor={`${prefixo}${campo.nome}`}>{campo.rotulo}</Label>
          <Input
            id={`${prefixo}${campo.nome}`}
            name={campo.nome}
            placeholder={campo.placeholder}
            autoComplete="off"
            data-1p-ignore=""
            data-lpignore="true"
            data-form-type="other"
            required
          />
          <p className="text-muted-foreground text-xs">{campo.ajuda}</p>
          <ErroCampo erros={erros} campo={campo.nome} />
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <BotaoEnviar enviando="Guardando…">
          {trocando ? "Salvar novas credenciais" : `Conectar ${definicao.nome}`}
        </BotaoEnviar>
        {aoCancelar ? (
          <Button type="button" variant="ghost" onClick={aoCancelar}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function BotaoDesconectar({ definicao }: { definicao: DefinicaoIntegracao }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>
        <Unplug data-icon="inline-start" />
        Desconectar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desconectar {definicao.nome}?</AlertDialogTitle>
          <AlertDialogDescription>
            A credencial é apagada do cofre e as sincronizações param. Os dados já
            importados continuam no painel. Dá para conectar de novo quando quiser.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <FormAcao acao={desconectarIntegracao}>
            <input type="hidden" name="tipo" value={definicao.tipo} />
            <AlertDialogAction type="submit" variant="destructive">
              Desconectar
            </AlertDialogAction>
          </FormAcao>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
