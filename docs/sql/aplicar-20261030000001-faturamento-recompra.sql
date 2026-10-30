create or replace view public.metricas_diarias
with (security_invoker = true)
as
with vendas_base as (
  select
    v.organizacao_id,
    org.fuso_horario,
    v.vendida_em,
    v.reembolsada_em,
    v.status,
    v.origem,
    v.valor_bruto,
    v.taxa_gateway,
    v.valor_parceiros,
    coalesce(fo.funil_id, t.funil_id) as funil_id,
    coalesce(t.eh_recompra, false) as eh_recompra,
    coalesce(h.aliquota, 0) as aliquota,
    coalesce(h.base, 'bruto') as base
  from public.vendas v
  join public.organizacoes org on org.id = v.organizacao_id
  left join public.transacoes t on t.id = v.transacao_id
  left join public.clientes c on c.id = v.cliente_id
  left join public.funil_ofertas fo on fo.oferta_id = v.oferta_id and fo.status = 'confirmado'
  left join lateral (
    select h.aliquota, h.base
    from public.historico_aliquotas h
    where h.produto_id = v.produto_id
    order by (h.vigencia_inicio <= v.vendida_em) desc,
             abs(extract(epoch from h.vigencia_inicio - v.vendida_em))
    limit 1
  ) h on true
),
vendas_dia as (
  select
    organizacao_id,
    (vendida_em at time zone fuso_horario)::date as data,
    funil_id,
    0::numeric(14,2) as gasto,
    0::bigint as impressoes, 0::bigint as cliques_link, 0::bigint as visualizacoes_pagina,
    0::bigint as inicios_checkout, 0::bigint as leads,
    valor_bruto as faturamento_bruto,
    0::numeric(14,2) as reembolsos,
    taxa_gateway as taxas_gateway,
    valor_parceiros as parceiros,
    (aliquota * case when base = 'bruto' then valor_bruto
                     else valor_bruto - taxa_gateway - valor_parceiros end)::numeric(14,2) as impostos,
    (case when origem = 'recorrencia' then 0 else 1 end)::bigint as vendas,
    0::bigint as transacoes, 0::bigint as recompras, 0::bigint as clientes_novos,
    (case when eh_recompra then valor_bruto else 0 end)::numeric(14,2) as faturamento_recompra
  from vendas_base
  union all
  select
    organizacao_id,
    (reembolsada_em at time zone fuso_horario)::date,
    funil_id,
    0, 0, 0, 0, 0, 0,
    0,
    valor_bruto,
    0, 0,
    -(aliquota * case when base = 'bruto' then valor_bruto
                      else valor_bruto - taxa_gateway - valor_parceiros end)::numeric(14,2),
    0, 0, 0, 0,
    0::numeric(14,2)
  from vendas_base
  where status <> 'aprovada' and reembolsada_em is not null
),
gasto_dia as (
  select
    m.organizacao_id,
    m.data,
    fc.funil_id,
    m.gasto,
    m.impressoes, m.cliques_link, m.visualizacoes_pagina, m.inicios_checkout, m.leads,
    0::numeric(14,2), 0::numeric(14,2), 0::numeric(14,2), 0::numeric(14,2), 0::numeric(14,2),
    0::bigint, 0::bigint, 0::bigint, 0::bigint,
    0::numeric(14,2)
  from public.metricas_anuncio_diarias m
  left join public.funil_campanhas fc on fc.campanha_id = m.campanha_id
),
transacoes_dia as (
  select
    t.organizacao_id,
    (t.inicio at time zone org.fuso_horario)::date,
    t.funil_id,
    0::numeric(14,2), 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint,
    0::numeric(14,2), 0::numeric(14,2), 0::numeric(14,2), 0::numeric(14,2), 0::numeric(14,2),
    0::bigint,
    1::bigint,
    case when t.eh_recompra then 1 else 0 end::bigint,
    case when t.ordem = 1 then 1 else 0 end::bigint,
    0::numeric(14,2)
  from public.transacoes t
  join public.organizacoes org on org.id = t.organizacao_id
  join public.clientes c on c.id = t.cliente_id
),
tudo as (
  select * from vendas_dia
  union all select * from gasto_dia
  union all select * from transacoes_dia
)
select
  organizacao_id,
  data,
  funil_id,
  sum(gasto)::numeric(14,2)                as gasto,
  sum(impressoes)::bigint                          as impressoes,
  sum(cliques_link)::bigint                        as cliques_link,
  sum(visualizacoes_pagina)::bigint                as visualizacoes_pagina,
  sum(inicios_checkout)::bigint                    as inicios_checkout,
  sum(leads)::bigint                               as leads,
  sum(faturamento_bruto)::numeric(14,2)    as faturamento_bruto,
  sum(reembolsos)::numeric(14,2)           as reembolsos,
  sum(taxas_gateway)::numeric(14,2)        as taxas_gateway,
  sum(parceiros)::numeric(14,2)            as parceiros,
  sum(impostos)::numeric(14,2)             as impostos,
  sum(vendas)::bigint                              as vendas,
  sum(transacoes)::bigint                          as transacoes,
  sum(recompras)::bigint                           as recompras,
  sum(clientes_novos)::bigint                      as clientes_novos,
  sum(faturamento_recompra)::numeric(14,2)  as faturamento_recompra
from tudo
group by organizacao_id, data, funil_id;

insert into supabase_migrations.schema_migrations (version, name) values ('20261030000001', 'faturamento_recompra') on conflict do nothing;
