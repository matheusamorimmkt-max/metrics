"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
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
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import {
  ErroCampo,
  ErroFormulario,
  RESULTADO_INICIAL,
} from "@/components/formulario/mensagens";
import { DESCRICAO_PAPEL, PAPEIS, ROTULO_PAPEL } from "@/dominio/papeis";
import { convidarMembro, type ResultadoConvite } from "@/servidor/acoes/membros";
import type { Resultado } from "@/servidor/acoes/resultado";

export function Convidar() {
  const [resultado, acao] = useActionState(
    convidarMembro,
    RESULTADO_INICIAL as Resultado<ResultadoConvite>,
  );
  const erros = resultado.ok ? undefined : resultado.erros;
  const formRef = useRef<HTMLFormElement>(null);
  const ultimo = useRef(resultado);
  const link = resultado.ok ? (resultado.dados?.link ?? null) : null;

  useEffect(() => {
    if (resultado === ultimo.current) return;
    ultimo.current = resultado;
    if (resultado.ok && resultado.mensagem) {
      toast.success(resultado.mensagem, { duration: 8000 });
      formRef.current?.reset();
    }
  }, [resultado]);

  async function copiar() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie à mão.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convidar usuário</CardTitle>
        <CardDescription>
          A pessoa recebe um e-mail com um link para definir a senha. Se já tiver conta,
          recebe um link para entrar e passa a ver esta organização.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form ref={formRef} action={acao} className="space-y-4">
          <ErroFormulario resultado={resultado} />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="convite-email">E-mail</Label>
              <Input id="convite-email" name="email" type="email" required />
              <ErroCampo erros={erros} campo="email" />
            </div>
            <BotaoEnviar enviando="Enviando…">Enviar convite</BotaoEnviar>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Papel</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {PAPEIS.map((p) => (
                <label
                  key={p}
                  className="hover:bg-muted/50 has-checked:border-primary flex cursor-pointer gap-3 rounded-md border p-3 text-sm"
                >
                  <input
                    type="radio"
                    name="papel"
                    value={p}
                    defaultChecked={p === "administrador"}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">{ROTULO_PAPEL[p]}</span>
                    <span className="text-muted-foreground block">{DESCRICAO_PAPEL[p]}</span>
                  </span>
                </label>
              ))}
            </div>
            <ErroCampo erros={erros} campo="papel" />
          </fieldset>
        </form>

        {link ? (
          <div className="bg-muted/50 space-y-2 rounded-md border p-3 text-sm">
            <p className="font-medium">Link de acesso</p>
            <p className="text-muted-foreground">
              O e-mail não saiu. Envie este link só para a pessoa convidada: ele vale por
              1 hora e funciona uma única vez.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
              <Button type="button" variant="outline" onClick={copiar}>
                <Copy aria-hidden /> Copiar
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
