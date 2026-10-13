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
import { Selecao } from "@/components/formulario/selecao";
import {
  ErroCampo,
  ErroFormulario,
  RESULTADO_INICIAL,
} from "@/components/formulario/mensagens";
import { formatarPercentual, fracaoParaTexto } from "@/dominio/percentual";
import { BASES_IMPOSTO, ROTULO_BASE } from "@/dominio/schemas/produto";
import { salvarImpostoProduto } from "@/servidor/acoes/produtos";
import type { ProdutoResumo } from "@/servidor/consultas/produtos";

export function LinhaProduto({ produto }: { produto: ProdutoResumo }) {
  const [aberto, setAberto] = useState(false);
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
        <Badge variant="outline">
          {produto.base_imposto === "bruto" ? "sobre o bruto" : "sobre o líquido"}
        </Badge>
        {produto.vigencias > 1 ? (
          <span className="text-muted-foreground ml-2 text-xs">
            {produto.vigencias} vigências
          </span>
        ) : null}
      </TableCell>
      <TableCell className="text-right">
        <Dialog open={aberto} onOpenChange={setAberto}>
          <DialogTrigger render={<Button variant="ghost" size="sm" />}>
            <Pencil data-icon="inline-start" />
            Imposto
          </DialogTrigger>
          <DialogContent>
            <form action={acao} className="space-y-4">
              <input type="hidden" name="produto_id" value={produto.id} />
              <DialogHeader>
                <DialogTitle>Imposto de {produto.nome}</DialogTitle>
                <DialogDescription>
                  Calculado venda a venda, com a alíquota vigente na data da venda.
                </DialogDescription>
              </DialogHeader>
              <ErroFormulario resultado={resultado} />
              <div className="space-y-2">
                <Label htmlFor={`aliquota-${produto.id}`}>Alíquota (%)</Label>
                <Input
                  id={`aliquota-${produto.id}`}
                  name="aliquota_imposto"
                  inputMode="decimal"
                  defaultValue={fracaoParaTexto(produto.aliquota_imposto)}
                  placeholder="6"
                  required
                />
                <ErroCampo erros={erros} campo="aliquota_imposto" />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`base-${produto.id}`}>Base</Label>
                <Selecao
                  id={`base-${produto.id}`}
                  name="base_imposto"
                  defaultValue={produto.base_imposto}
                >
                  {BASES_IMPOSTO.map((b) => (
                    <option key={b} value={b}>
                      {ROTULO_BASE[b]}
                    </option>
                  ))}
                </Selecao>
                <ErroCampo erros={erros} campo="base_imposto" />
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">A mudança vale para</legend>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="modo"
                    value="daqui_para_frente"
                    defaultChecked
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">Só daqui para frente.</span>{" "}
                    <span className="text-muted-foreground">
                      As vendas antigas continuam com a alíquota de antes.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="modo"
                    value="recalcular_historico"
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">Todo o histórico.</span>{" "}
                    <span className="text-muted-foreground">
                      Recalcula o imposto de todas as vendas deste produto com esta
                      alíquota.
                    </span>
                  </span>
                </label>
                <ErroCampo erros={erros} campo="modo" />
              </fieldset>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
                  Cancelar
                </Button>
                <BotaoEnviar>Salvar</BotaoEnviar>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}
