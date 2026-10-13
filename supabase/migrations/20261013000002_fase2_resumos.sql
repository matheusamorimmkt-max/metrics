-- Fase 2 / Etapa 4 — Visões de apoio das telas de Produtos e Ofertas
-- security_invoker: respeitam o RLS de quem consulta.

create view public.ofertas_resumo
with (security_invoker = true)
as
select
  o.id,
  o.organizacao_id,
  o.plataforma,
  o.id_externo,
  o.nome,
  o.preco,
  o.ativo,
  o.produto_id,
  p.nome  as produto_nome,
  fo.funil_id,
  f.nome  as funil_nome,
  fo.papel,
  fo.status as vinculo_status,
  count(v.id) filter (where v.status = 'aprovada')                              as vendas,
  coalesce(sum(v.valor_bruto) filter (where v.status = 'aprovada'), 0)::numeric(14,2) as faturamento,
  max(v.vendida_em)                                                             as ultima_venda
from public.ofertas o
join public.produtos p on p.id = o.produto_id
left join public.funil_ofertas fo on fo.oferta_id = o.id
left join public.funis f on f.id = fo.funil_id
left join public.vendas v on v.oferta_id = o.id
group by o.id, p.nome, fo.funil_id, f.nome, fo.papel, fo.status;

comment on view public.ofertas_resumo is
  'Ofertas com produto, funil/papel e faturamento acumulado. Sem funil = "não vinculada".';

create view public.produtos_resumo
with (security_invoker = true)
as
select
  p.id,
  p.organizacao_id,
  p.plataforma,
  p.id_externo,
  p.nome,
  p.aliquota_imposto,
  p.base_imposto,
  p.ativo,
  (select count(*) from public.ofertas o where o.produto_id = p.id)                 as ofertas,
  (select count(*) from public.vendas v
    where v.produto_id = p.id and v.status = 'aprovada'
      and v.vendida_em >= now() - interval '30 days')                             as vendas_30d,
  (select count(*) from public.historico_aliquotas h where h.produto_id = p.id)   as vigencias
from public.produtos p;

comment on view public.produtos_resumo is
  'Produtos com contagem de ofertas, vendas dos últimos 30 dias e vigências de alíquota.';

revoke all on public.ofertas_resumo, public.produtos_resumo from anon;
grant select on public.ofertas_resumo, public.produtos_resumo to authenticated, service_role;
