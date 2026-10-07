"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./tipos-banco";

/**
 * Cliente Supabase para Client Components. Usado só onde o navegador precisa falar
 * direto com o Auth (por exemplo, concluir um convite que chega com tokens na URL).
 */
export function criarClienteNavegador() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
