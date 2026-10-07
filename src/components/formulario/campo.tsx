import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { ErroCampo } from "./mensagens";

/** Rótulo + controle + ajuda + erro, no espaçamento padrão dos formulários. */
export function Campo({
  id,
  rotulo,
  ajuda,
  erros,
  children,
}: {
  id: string;
  rotulo: string;
  ajuda?: ReactNode;
  erros?: Record<string, string[]>;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
      {ajuda ? <p className="text-muted-foreground text-xs">{ajuda}</p> : null}
      <ErroCampo erros={erros} campo={id} />
    </div>
  );
}
