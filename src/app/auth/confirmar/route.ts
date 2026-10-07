import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { criarClienteServidor } from "@/servidor/supabase/servidor";

/**
 * Destino dos links de e-mail do Supabase (convite, recuperação de senha, confirmação).
 * Aceita dois formatos:
 *  - ?token_hash=...&type=invite   (template de e-mail apontando para {{ .SiteURL }}/auth/confirmar)
 *  - ?code=...                     (fluxo PKCE)
 * Depois de validar, manda para /definir-senha (convite e recuperação) ou para a Home.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const proximo = searchParams.get("proximo");

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
    url.searchParams.set(
      "erro",
      "Este link expirou ou já foi usado. Peça um novo convite.",
    );
    return NextResponse.redirect(url);
  }

  const precisaSenha = tipo === "invite" || tipo === "recovery";
  const destino =
    proximo && proximo.startsWith("/") && !proximo.startsWith("//")
      ? proximo
      : precisaSenha
        ? "/definir-senha"
        : "/";
  return NextResponse.redirect(new URL(destino, origin));
}
