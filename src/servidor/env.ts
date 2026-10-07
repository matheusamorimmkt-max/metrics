import { z } from "zod";

/**
 * Variáveis de ambiente lidas no servidor. Falha cedo e com mensagem clara quando falta algo.
 * As NEXT_PUBLIC_* também são lidas literalmente no cliente (ver supabase/navegador.ts).
 */
const schemaPublico = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL deve ser uma URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY está vazia"),
});

const schemaServidor = schemaPublico.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY está vazia"),
});

function formatarErro(erro: z.ZodError) {
  return erro.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
}

export function envPublico() {
  const resultado = schemaPublico.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!resultado.success) {
    throw new Error(
      `Variáveis de ambiente do Supabase ausentes ou inválidas:\n${formatarErro(resultado.error)}\nVeja .env.example.`,
    );
  }
  return resultado.data;
}

export function envServidor() {
  const resultado = schemaServidor.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!resultado.success) {
    throw new Error(
      `Variáveis de ambiente do Supabase ausentes ou inválidas:\n${formatarErro(resultado.error)}\nVeja .env.example.`,
    );
  }
  return resultado.data;
}
