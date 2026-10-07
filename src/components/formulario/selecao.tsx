import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** <select> nativo com o mesmo visual do Input. Funciona em formulários sem JavaScript. */
export function Selecao({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50",
        "h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
