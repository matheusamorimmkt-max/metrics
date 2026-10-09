import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Roda antes de toda rota (Next.js 16 chama isto de "proxy", antes era "middleware").
 * 1. Renova o token do Supabase e repassa os cookies atualizados.
 * 2. Manda quem não está logado para /login e quem está logado para fora de /login.
 */
const ROTAS_PUBLICAS = ["/login", "/esqueci-senha", "/auth"];

export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(paraGravar) {
          paraGravar.forEach(({ name, value }) => request.cookies.set(name, value));
          resposta = NextResponse.next({ request });
          paraGravar.forEach(({ name, value, options }) =>
            resposta.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims valida o JWT e renova a sessão quando necessário. Não remover: sem esta
  // chamada os cookies de sessão nunca são renovados em Server Components.
  const { data } = await supabase.auth.getClaims();
  const autenticado = Boolean(data?.claims);

  const caminho = request.nextUrl.pathname;
  const ehPublica = ROTAS_PUBLICAS.some(
    (r) => caminho === r || caminho.startsWith(`${r}/`),
  );

  if (!autenticado && !ehPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = caminho !== "/" ? `?proximo=${encodeURIComponent(caminho)}` : "";
    return NextResponse.redirect(url);
  }

  if (autenticado && (caminho === "/login" || caminho === "/esqueci-senha")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return resposta;
}

export const config = {
  matcher: [
    // Tudo, exceto arquivos estáticos e imagens.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
};
