import type { ComponentProps } from "react";
import { DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Conteúdo de pop-up que cabe na tela: altura máxima da janela (com margem) e rolagem
 * interna. O `DialogContent` do shadcn centraliza sem limitar a altura; no celular,
 * um conteúdo alto saía da tela e, com a página travada atrás, não dava para rolar
 * nem fechar. Não editamos `components/ui`: envolvemos aqui.
 */
export function ConteudoDialogo({ className, ...props }: ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn("max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain", className)}
      {...props}
    />
  );
}
