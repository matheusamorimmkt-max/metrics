"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Button> & {
  /** Texto exibido enquanto a ação roda. */
  enviando?: string;
};

/** Botão de submit que desabilita e mostra progresso enquanto a Server Action executa. */
export function BotaoEnviar({
  children,
  enviando = "Salvando…",
  disabled,
  ...props
}: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          {enviando}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
