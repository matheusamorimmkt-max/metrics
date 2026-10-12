import "server-only";
import { headers } from "next/headers";

/**
 * URL pública do app (sem barra no fim), usada nos links de e-mail do Supabase
 * (convite e recuperação de senha) para voltarem para cá.
 * Prefere NEXT_PUBLIC_SITE_URL; sem ela, deduz dos cabeçalhos da requisição.
 */
export async function origemDoApp(): Promise<string> {
  const configurada = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configurada) return configurada.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
