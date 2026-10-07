import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { envPublico } from "@/servidor/env";
import type { Database } from "./tipos-banco";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Usa a chave pública: o RLS garante que o usuário só veja a própria organização.
 */
export async function criarClienteServidor() {
  const env = envPublico();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(paraGravar) {
          try {
            paraGravar.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado a partir de um Server Component, onde não se grava cookie.
            // O proxy (src/proxy.ts) renova a sessão, então pode ignorar.
          }
        },
      },
    },
  );
}

export type ClienteSupabase = Awaited<ReturnType<typeof criarClienteServidor>>;
