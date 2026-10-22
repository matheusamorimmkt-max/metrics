"use client";

import { useState } from "react";
import {
  BASES_IMPOSTO,
  EXPLICACAO_BASE,
  ROTULO_BASE,
  type BaseImposto,
} from "@/dominio/schemas/produto";
import { cn } from "@/lib/utils";

/**
 * As duas bases de cálculo do imposto como caixas de seleção excludentes, cada uma
 * com a explicação. O valor escolhido vai no campo escondido `name`.
 */
export function OpcoesBaseImposto({
  name = "base_imposto",
  valorInicial,
  disabled,
}: {
  name?: string;
  valorInicial: BaseImposto;
  disabled?: boolean;
}) {
  const [valor, setValor] = useState<BaseImposto>(valorInicial);
  return (
    <div className={cn("space-y-2", disabled && "opacity-50")}>
      <input type="hidden" name={name} value={valor} />
      {BASES_IMPOSTO.map((b) => (
        <label
          key={b}
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm",
            valor === b && "border-primary bg-primary/5",
          )}
        >
          <input
            type="checkbox"
            className="accent-primary mt-0.5 size-4"
            checked={valor === b}
            disabled={disabled}
            onChange={() => setValor(b)}
            aria-label={ROTULO_BASE[b]}
          />
          <span>
            <span className="block font-medium">{ROTULO_BASE[b]}</span>
            <span className="text-muted-foreground block text-xs">
              {EXPLICACAO_BASE[b]}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}
