import type { NextRequest } from "next/server";
import { processarLinkDeEmail } from "@/servidor/links-email";

/**
 * Destino do link de recuperação de senha (pedido em /esqueci-senha).
 * Valida o link, cria a sessão e leva para /definir-senha.
 */
export async function GET(request: NextRequest) {
  return processarLinkDeEmail(
    request,
    () => "/definir-senha",
    "Este link de recuperação expirou ou já foi usado. Peça um novo em “Esqueci minha senha”.",
  );
}
