import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Resultado } from "@/servidor/acoes/resultado";

/** Erro de um campo específico, logo abaixo do input. */
export function ErroCampo({
  erros,
  campo,
}: {
  erros?: Record<string, string[]>;
  campo: string;
}) {
  const lista = erros?.[campo];
  if (!lista?.length) return null;
  return (
    <p className="text-destructive text-sm" role="alert">
      {lista[0]}
    </p>
  );
}

/** Erro geral do formulário (quando não é de um campo). */
export function ErroFormulario({ resultado }: { resultado: Resultado<unknown> }) {
  if (resultado.ok || !resultado.erro) return null;
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>Não deu certo</AlertTitle>
      <AlertDescription>{resultado.erro}</AlertDescription>
    </Alert>
  );
}

export const RESULTADO_INICIAL: Resultado = { ok: true };
