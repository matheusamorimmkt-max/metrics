import "server-only";
import { createClient } from "@supabase/supabase-js";
import { envServidor } from "@/servidor/env";
import type { Database } from "./tipos-banco";

/**
 * Cliente com a chave service_role: ignora o RLS.
 * Só para operações administrativas no servidor (convidar usuário, por exemplo).
 * Nunca importar em código que vá para o navegador.
 */
export function criarClienteAdmin() {
  const env = envServidor();
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
