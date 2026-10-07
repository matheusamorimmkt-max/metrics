"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import type { Resultado } from "@/servidor/acoes/resultado";
import { RESULTADO_INICIAL } from "./mensagens";

type Acao = (anterior: Resultado, formData: FormData) => Promise<Resultado>;

/**
 * Formulário pequeno (um botão, campos ocultos) que mostra o resultado da ação como toast.
 * Para formulários grandes, use useActionState direto e mostre os erros nos campos.
 */
export function FormAcao({
  acao,
  children,
  className,
  aoConcluir,
}: {
  acao: Acao;
  children: ReactNode;
  className?: string;
  aoConcluir?: (resultado: Resultado) => void;
}) {
  const [resultado, dispatch] = useActionState(acao, RESULTADO_INICIAL);
  const ultimo = useRef(resultado);

  useEffect(() => {
    if (resultado === ultimo.current) return;
    ultimo.current = resultado;
    if (resultado.ok && resultado.mensagem) toast.success(resultado.mensagem);
    if (!resultado.ok) toast.error(resultado.erro ?? "Não foi possível concluir.");
    aoConcluir?.(resultado);
  }, [resultado, aoConcluir]);

  return (
    <form action={dispatch} className={className}>
      {children}
    </form>
  );
}
