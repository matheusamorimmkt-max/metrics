"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import { OpcoesBaseImposto } from "@/components/formulario/opcoes-base-imposto";
import {
  ErroCampo,
  ErroFormulario,
  RESULTADO_INICIAL,
} from "@/components/formulario/mensagens";
import { formatarPercentual, fracaoParaTexto } from "@/dominio/percentual";
import { ROTULO_BASE, type BaseImposto } from "@/dominio/schemas/produto";
import { salvarImpostoProduto } from "@/servidor/acoes/produtos";
import type { ProdutoResumo } from "@/servidor/consultas/produtos";

export function LinhaProduto({
  produto,
  padrao,
}: {
  produto: ProdutoResumo;
  /** Imposto padrão do negócio (Configurações → Geral). */
  padrao: { aliquota: number; base: BaseImposto };
}) {
  const [aberto, setAberto] = useState(false);
  const [personalizado, setPersonalizado] = useState(produto.imposto_personalizado);
  const [resultado, acao] = useActionState(salvarImpostoProduto, RESULTADO_INICIAL);
  const erros = resultado.ok ? undefined : resultado.erros;
  const ultimo = useRef(resultado);

  useEffect(() => {
    if (resultado === ultimo.current) return;
    ultimo.current = resultado;
    if (resultado.ok && resultado.mensagem) {
      toast.success(resultado.mensagem);
      // Fecha o diálogo fora do efeito, para não encadear renderizações.
      Promise.resolve().then(() => setAberto(false));
    }
  }, [resultado]);

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{produto.nome}</div>
        <div className="text-muted-foreground text-xs">
          {produto.plataforma} · {produto.id_externo}
          {!produto.ativo ? " · inativo" : ""}
        </div>
      </TableCell>
      <TableCell className="text-center tabular-nums">{produto.ofertas}</TableCell>
      <TableCell className="text-center tabular-nums">{produto.vendas_30d}</TableCell>
      <TableCell>
        <span className="tabular-nums">
          {formatarPercentual(produto.aliquota_imposto)}
        </span>{" "}
        <span className="text-muted-foreground text-xs">
          {ROTULO_BASE[produto.base_imposto].toLowerCase()}
        </span>{" "}
        <Badge variant={produto.imposto_personalizado ? "secondary" : "outline"}>
          {produto.imposto_personalizado ? "personalizado" : "padrão do negócio"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Dialog
          open={aberto}
          onOpenChange={(v) => {
            if (v) setPersonalizado(produto.imposto_personalizado);
            setAberto(v);
          }}
        >
          <DialogTrigger render={<Button variant="ghost" size="sm" />}>
            <Pencil data-icon="inline-start" />
            Imposto
          </DialogTrigger>
          <DialogContent>
            <form action={acao} className="space-y-4">
              <input type="hidden" name="produto_id" value={produto.id} />
              <input
                type="hidden"
                name="personalizado"
                value={personalizado ? "true" : "false"}
              />
              <DialogHeader>
                <DialogTitle>Imposto de {produto.nome}</DialogTitle>
                <DialogDescription>
                  O padrão do negócio é {formatarPercentual(padrao.aliquota)}{" "}
                  {ROTULO_BASE[padrao.base].toLowerCase()}. A mudança vale para todo o
                  histórico de vendas deste produto.
                </DialogDescription>
              </DialogHeader>
              <ErroFormulario resultado={resultado} />
              <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
                <input
                  type="checkbox"
                  className="accent-primary mt-0.5 size-4"
                  checked={personalizado}
                  onChange={(e) => setPersonalizado(e.target.checked)}
                />
                <span>
                  <span className="block font-medium">
                    Este produto tem imposto diferente
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    Desmarcado, o produto segue o padrão do negócio e acompanha quando o
                    padrão mudar.
                  </span>
                </span>
              </label>
              <div className="space-y-2">
                <Label htmlFor={`aliquota-${produto.id}`}>Alíquota (%)</Label>
                <Input
                  id={`aliquota-${produto.id}`}
                  name="aliquota_imposto"
                  inputMode="decimal"
                  defaultValue={fracaoParaTexto(
                    produto.imposto_personalizado
                      ? produto.aliquota_imposto
                      : padrao.aliquota,
                  )}
                  placeholder="6"
                  disabled={!personalizado}
                  required={personalizado}
                />
                <ErroCampo erros={erros} campo="aliquota_imposto" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Base de cálculo</p>
                <OpcoesBaseImposto
                  valorInicial={
                    produto.imposto_personalizado ? produto.base_imposto : padrao.base
                  }
                  disabled={!personalizado}
                />
                <ErroCampo erros={erros} campo="base_imposto" />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
                  Cancelar
                </Button>
                <BotaoEnviar>Salvar e aplicar ao histórico</BotaoEnviar>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}
