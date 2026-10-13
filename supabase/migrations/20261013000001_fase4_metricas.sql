-- Fase 4 / Etapa 1 — Métricas diárias por funil
--
-- Uma única visão alimenta a Home, as categorias e os funis: cada linha é um
-- (organização, dia no fuso da organização, funil ou null = não vinculado) com
-- gasto, faturamento, reembolsos, taxas, parceiros, impostos, transações e
-- clientes novos. O app soma as linhas do período e aplica o modelo financeiro
-- (src/dominio/metricas.ts). Regras:
--   - venda aprovada entra no dia da venda; reembolso e chargeback entram no dia
--     em que acontecem (negativos para o imposto);
--   - imposto venda a venda, pela alíquota vigente na data da venda e pela base
--     do produto (bruto ou líquido); venda anterior à primeira vigência usa a
--     primeira alíquota conhecida;
--   - recompra é atribuída ao funil da primeira transação do cliente;
--   - gasto de campanha sem funil fica em funil_id null (entra no total).
-- Decisão: view comum (não materializada) enquanto o volume permitir.

create view public.metricas_diarias
with (security_invoker = true)
as
with vendas_base as (
  select
    v.organizacao_id,
    org.fuso_horario,
    v.vendida_em,
    v.reembolsada_em,
    v.status,
    v.valor_bruto,
    v.taxa_gateway,
    v.valor_parceiros,
    -- Funil da venda: recompra vai para o funil de entrada do cliente; senão, o da oferta.
    case
      when t.eh_recompra then c.funil_entrada_id
      else coalesce(fo.funil_id, t.funil_id)
    end as funil_id,
    coalesce(h.aliquota, 0) as aliquota,
    coalesce(h.base, 'bruto') as base
  from public.vendas v
  join public.organizacoes org on org.id = v.organizacao_id
  left join public.transacoes t on t.id = v.transacao_id
  left join public.clientes c on c.id = v.cliente_id
  left join public.funil_ofertas fo on fo.oferta_id = v.oferta_id and fo.status = 'confirmado'
  -- Vigência da alíquota na data da venda. Produtos importados nascem depois das vendas
  -- antigas: quando nenhuma vigência cobre a data, vale a mais próxima (a primeira conhecida).
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
  -- Dia da venda
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
    1::bigint as vendas,
    0::bigint as transacoes, 0::bigint as recompras, 0::bigint as clientes_novos
  from vendas_base
  union all
  -- Dia do reembolso ou chargeback
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
    0, 0, 0, 0
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
    0::bigint, 0::bigint, 0::bigint, 0::bigint
  from public.metricas_anuncio_diarias m
  left join public.funil_campanhas fc on fc.campanha_id = m.campanha_id
),
transacoes_dia as (
  select
    t.organizacao_id,
    (t.inicio at time zone org.fuso_horario)::date,
    case when t.eh_recompra then c.funil_entrada_id else t.funil_id end,
    0::numeric(14,2), 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint,
    0::numeric(14,2), 0::numeric(14,2), 0::numeric(14,2), 0::numeric(14,2), 0::numeric(14,2),
    0::bigint,
    1::bigint,
    case when t.eh_recompra then 1 else 0 end::bigint,
    case when t.ordem = 1 then 1 else 0 end::bigint
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
  sum(clientes_novos)::bigint                      as clientes_novos
from tudo
group by organizacao_id, data, funil_id;

comment on view public.metricas_diarias is
  'Métricas por dia (fuso da organização) e funil (null = não vinculado). A Home, as categorias e os funis somam estas linhas.';

revoke all on public.metricas_diarias from anon;
grant select on public.metricas_diarias to authenticated, service_role;
