import type { PostgrestError } from "@supabase/supabase-js";

/**
 * A migration ainda não foi aplicada no projeto (tabela ou view inexistente).
 * Postgres: 42P01. PostgREST: PGRST205 (não está no cache de schema).
 */
export function tabelaAusente(error: PostgrestError | null): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

/**
 * A coluna ainda não existe no projeto (migration pendente).
 * Postgres: 42703. PostgREST: PGRST204 (coluna fora do cache de schema).
 */
export function colunaAusente(error: PostgrestError | null): boolean {
  return error?.code === "42703" || error?.code === "PGRST204";
}
