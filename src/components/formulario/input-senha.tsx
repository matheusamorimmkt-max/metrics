"use client";

import {
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type CSSProperties,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<typeof Input>, "type"> & {
  /**
   * `senha` (padrão): senha de login; o navegador pode salvar e preencher.
   * `token`: credencial de API; o campo é mascarado sem ser type="password",
   * para o gerenciador de senhas do navegador não preencher com o login do usuário.
   */
  finalidade?: "senha" | "token";
};

/** Campo de senha ou token com botão para mostrar ou ocultar o que está sendo digitado. */
export function InputSenha({ className, finalidade = "senha", ...props }: Props) {
  const [visivel, setVisivel] = useState(false);
  // Mascarar via CSS só funciona onde o navegador suporta -webkit-text-security
  // (Chrome, Edge, Safari). Nos demais, cai para type="password" sem autopreencher.
  const mascaraCss = useSyncExternalStore(
    () => () => {},
    () => typeof CSS !== "undefined" && CSS.supports("-webkit-text-security", "disc"),
    () => false,
  );

  const ehToken = finalidade === "token";
  const type = visivel ? "text" : ehToken && mascaraCss ? "text" : "password";
  const rotulo = ehToken ? "token" : "senha";

  return (
    <div className="relative">
      <Input
        {...props}
        type={type}
        autoComplete={ehToken ? "off" : props.autoComplete}
        data-1p-ignore={ehToken ? "" : undefined}
        data-lpignore={ehToken ? "true" : undefined}
        data-bwignore={ehToken ? "" : undefined}
        data-form-type={ehToken ? "other" : undefined}
        spellCheck={ehToken ? false : props.spellCheck}
        style={
          ehToken && mascaraCss && !visivel
            ? ({ WebkitTextSecurity: "disc", ...props.style } as CSSProperties)
            : props.style
        }
        className={cn("pr-9", className)}
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? `Ocultar ${rotulo}` : `Mostrar ${rotulo}`}
        aria-pressed={visivel}
        title={visivel ? `Ocultar ${rotulo}` : `Mostrar ${rotulo}`}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg outline-none focus-visible:ring-3"
      >
        {visivel ? (
          <EyeOff className="size-4" aria-hidden />
        ) : (
          <Eye className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
