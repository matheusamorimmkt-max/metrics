"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { PAPEIS, ROTULO_PAPEL, type Papel } from "@/dominio/papeis";
import { RESULTADO_INICIAL } from "@/components/formulario/mensagens";
import { alterarPapelMembro } from "@/servidor/acoes/membros";

/** Caixa de seleção do papel: ao mudar, envia na hora. */
export function SeletorPapel({
  membroId,
  papel,
  travado,
  motivo,
}: {
  membroId: string;
  papel: Papel;
  travado: boolean;
  motivo?: string;
}) {
  const [resultado, acao, pendente] = useActionState(alterarPapelMembro, RESULTADO_INICIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const ultimo = useRef(resultado);

  useEffect(() => {
    if (resultado === ultimo.current) return;
    ultimo.current = resultado;
    if (resultado.ok && resultado.mensagem) toast.success(resultado.mensagem);
    if (!resultado.ok) {
      toast.error(resultado.erro ?? "Não foi possível alterar o papel.");
      formRef.current?.reset();
    }
  }, [resultado]);

  return (
    <form ref={formRef} action={acao}>
      <input type="hidden" name="id" value={membroId} />
      <select
        name="papel"
        defaultValue={papel}
        disabled={travado || pendente}
        title={motivo}
        aria-label="Papel"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="border-input bg-background h-8 rounded-md border px-2 text-sm disabled:opacity-60"
      >
        {PAPEIS.map((p) => (
          <option key={p} value={p}>
            {ROTULO_PAPEL[p]}
          </option>
        ))}
      </select>
    </form>
  );
}
