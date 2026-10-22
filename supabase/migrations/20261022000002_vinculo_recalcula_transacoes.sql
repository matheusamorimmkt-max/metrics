-- Vincular (ou desvincular) uma oferta a um funil muda o funil das transações e o
-- funil de entrada dos clientes. Até aqui isso só era recalculado no próximo ciclo do
-- conector, e só para clientes com venda nova: transações antigas ficavam sem funil
-- (55 clientes contra 187 itens no mesmo funil, em 2026-10-22). Agora qualquer
-- mudança em funil_ofertas recalcula as transações da organização inteira.

create or replace function public.recalcular_transacoes_apos_vinculo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := coalesce(new.organizacao_id, old.organizacao_id);
begin
  perform public.recalcular_transacoes(v_org, null);
  return null;
end;
$$;
revoke all on function public.recalcular_transacoes_apos_vinculo() from public, anon, authenticated;

create trigger funil_ofertas_recalcula_transacoes
  after insert or update or delete on public.funil_ofertas
  for each row execute function public.recalcular_transacoes_apos_vinculo();
