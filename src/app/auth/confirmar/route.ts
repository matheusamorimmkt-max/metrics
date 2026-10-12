import type { NextRequest } from "next/server";
import { caminhoInterno, processarLinkDeEmail } from "@/servidor/links-email";

/**
 * Destino dos links de convite e confirmação de e-mail do Supabase.
 * Convite e recuperação vão para /definir-senha; o resto, para a Home.
 * Para o link de recuperação de senha, ver /auth/recuperar.
 */
export async function GET(request: NextRequest) {
  const proximo = caminhoInterno(request.nextUrl.searchParams.get("proximo"));
  return processarLinkDeEmail(
    request,
    (tipo) =>
      proximo ?? (tipo === "invite" || tipo === "recovery" ? "/definir-senha" : "/"),
    "Este link expirou ou já foi usado. Peça um novo convite.",
  );
}
