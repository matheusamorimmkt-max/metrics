import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { criarClienteServidor } from "@/servidor/supabase/servidor";

/**
 * Valida um link vindo de e-mail do Supabase (convite, recuperação de senha, confirmação)
 * e cria a sessão. Aceita dois formatos:
 *  - ?token_hash=...&type=recovery   (template de e-mail apontando para {{ .RedirectTo }}
 *                                     ou {{ .SiteURL }}/auth/...; funciona em qualquer navegador)
 *  - ?code=...                       (template padrão, fluxo PKCE; só funciona no mesmo
 *                                     navegador que pediu o link)
 * Depois de validar, redireciona para `destino`.
 */
export async function processarLinkDeEmail(
  request: NextRequest,
  decidirDestino: (tipo: EmailOtpType | null) => string,
  mensagemDeErro: string,
): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await criarClienteServidor();

  let erro: string | null = null;
  if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: tipo,
    });
    erro = error?.message ?? null;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    erro = error?.message ?? null;
  } else {
    erro = "Link inválido ou incompleto.";
  }

  if (erro) {
    const url = new URL("/login", origin);
    url.searchParams.set("erro", mensagemDeErro);
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(decidirDestino(tipo), origin));
}

/** Só aceita caminhos internos como destino depois de validar um link. */
export function caminhoInterno(valor: string | null | undefined): string | null {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//")) return null;
  return valor;
}
