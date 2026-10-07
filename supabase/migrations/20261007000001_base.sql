-- Fase 1 / Etapa 1 — Base
-- Extensões e funções utilitárias compartilhadas por todas as tabelas.

-- btree_gist permite a restrição "sem sobreposição de vigências" em historico_aliquotas.
create extension if not exists btree_gist with schema extensions;

-- Mantém updated_at sempre atualizado.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger BEFORE UPDATE: grava now() em updated_at.';
