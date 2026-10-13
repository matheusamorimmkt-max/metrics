-- Fase 4 — Visões de apoio da tela de Funis
-- Desempenho por oferta e por campanha, por dia (fuso da organização).

create view public.vendas_oferta_diarias
with (security_invoker = true)
as
select
  v.organizacao_id,
  (v.vendida_em at time zone org.fuso_horario)::date as data,
  v.oferta_id,
  count(*)::bigint                                                   as vendas,
  coalesce(sum(v.valor_bruto), 0)::numeric(14,2)                     as faturamento_bruto,
  count(*) filter (where v.status <> 'aprovada')::bigint             as reembolsadas,
  coalesce(sum(v.valor_bruto) filter (where v.status <> 'aprovada'), 0)::numeric(14,2) as valor_reembolsado
from public.vendas v
join public.organizacoes org on org.id = v.organizacao_id
group by v.organizacao_id, (v.vendida_em at time zone org.fuso_horario)::date, v.oferta_id;

comment on view public.vendas_oferta_diarias is
  'Vendas por oferta e dia da venda (fuso da organização). Reembolsos aqui contam na data da venda, só para a leitura por oferta.';

create view public.metricas_campanha_diarias
with (security_invoker = true)
as
select
  m.organizacao_id,
  m.data,
  m.campanha_id,
  sum(m.gasto)::numeric(14,2)         as gasto,
  sum(m.impressoes)::bigint           as impressoes,
  sum(m.cliques)::bigint              as cliques,
  sum(m.cliques_link)::bigint         as cliques_link,
  sum(m.visualizacoes_pagina)::bigint as visualizacoes_pagina,
  sum(m.inicios_checkout)::bigint     as inicios_checkout,
  sum(m.leads)::bigint                as leads,
  sum(m.compras_plataforma)::bigint   as compras_plataforma
from public.metricas_anuncio_diarias m
group by m.organizacao_id, m.data, m.campanha_id;

comment on view public.metricas_campanha_diarias is
  'Métricas de anúncio somadas por campanha e dia (alcance fica de fora: não é somável).';

revoke all on public.vendas_oferta_diarias, public.metricas_campanha_diarias from anon;
grant select on public.vendas_oferta_diarias, public.metricas_campanha_diarias to authenticated, service_role;
