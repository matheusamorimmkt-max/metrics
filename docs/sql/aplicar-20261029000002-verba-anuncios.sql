alter table public.campanhas
  add column if not exists verba_diaria numeric(14,2),
  add column if not exists verba_total numeric(14,2);
alter table public.conjuntos
  add column if not exists verba_diaria numeric(14,2),
  add column if not exists verba_total numeric(14,2);
comment on column public.campanhas.verba_diaria is 'Orçamento diário da campanha (null quando o orçamento é por conjunto ou total).';
comment on column public.campanhas.verba_total is 'Orçamento total (vitalício) da campanha, quando houver.';
comment on column public.conjuntos.verba_diaria is 'Orçamento diário do conjunto (null quando usa o orçamento da campanha).';
comment on column public.conjuntos.verba_total is 'Orçamento total (vitalício) do conjunto, quando houver.';

insert into supabase_migrations.schema_migrations (version, name) values ('20261029000002', 'verba_anuncios') on conflict do nothing;
